import {
  AdminUser, AiEvaluationAudit, AdminSystemStats, AdminRole,
  Stage, Milestone, MilestoneQuest, MilestoneWhitelistData,
  VocabularyItem, GrammarItem, KanjiDictionary, JlptExam,
  StudentDossierData, LearningAnalyticsData, MilestoneFunnelStep, KillerKnowledgeItem,
  AiPlacementMonitorData, AiRuntimeConfig, AiTelemetryEvent,
  AntiCheatAnomaly, AdminActivityLog, SystemSettings, BackendConnectionStatus
} from '../types/adminTypes';
import { db, firebaseConfig } from '../../config/firebase';
import { collection, getDocs, getDoc, setDoc, deleteDoc, doc, updateDoc, query, where, limit } from 'firebase/firestore';
import { hashPassword, authService } from '../../user/services/authService';
import { adminApiClient } from './adminApiClient';
import { STAGES_CATALOG, MILESTONES_CATALOG } from '../../user/data/roadmapCatalog';
import { shouldSkipFirestore, handleFirestoreError } from '../../user/utils/firestoreGuard';
import {
  FALLBACK_EXAMS,
  FALLBACK_VOCABULARY,
  FALLBACK_GRAMMAR,
  FALLBACK_KANJI,
  FALLBACK_AI_AUDITS,
  ROOT_ADMIN_USER
} from '../data/adminFallbackData';

const isFirestoreDummy =
  !db ||
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === 'dummy_api_key_for_ui_testing' ||
  firebaseConfig.apiKey === 'your_firebase_api_key_here';

const DEFAULT_AI_CONFIG: AiRuntimeConfig = {
  model: 'gemini-3.5-flash-lite',
  dailyLimit: 100,
  timeoutSeconds: 15,
  maxConcurrency: 2,
  senseiEnabled: true,
  senseiSystemPrompt:
    'Bạn là AI Sensei tiếng Nhật của hệ thống KIZUNA. Chấm câu viết tiếng Nhật của học viên dựa trên Whitelist từ vựng và ngữ pháp của cột mốc, phát hiện lỗi trợ từ (は/が/を/に/で/へ/の), trả về điểm thang 10 và gợi ý diễn đạt tự nhiên.'
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  maintenanceMessage:
    'Hệ thống KIZUNA đang được bảo trì và cập nhật nội dung giáo trình. Vui lòng quay lại sau ít phút.',
  allowNewRegistrations: true,
  aiSenseiEnabled: true
};

const LOCAL_LOGS_KEY = 'kizuna_admin_activity_logs';
const LOCAL_SETTINGS_KEY = 'kizuna_system_settings';
const LOCAL_AI_CONFIG_KEY = 'kizuna_ai_runtime_config';

async function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  if (isFirestoreDummy || shouldSkipFirestore()) {
    throw new Error('FIRESTORE_CONFIG_MISSING_OR_QUOTA_EXHAUSTED');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('FIRESTORE_TIMEOUT'));
        }, timeoutMs);
      })
    ]);
  } catch (e: any) {
    handleFirestoreError(e);
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function safeFirestoreWrite(writePromiseFactory: () => Promise<any>): Promise<void> {
  if (isFirestoreDummy || shouldSkipFirestore()) return;
  try {
    await withFirestoreTimeout(writePromiseFactory(), 10000);
  } catch (e) {
    console.warn('[AdminService] Firestore write error:', e);
    throw e;
  }
}

async function fetchCollectionData<T>(collectionName: string, queryLimit: number = 0): Promise<T[]> {
  if (isFirestoreDummy || shouldSkipFirestore()) return [];
  try {
    const colRef = collection(db, collectionName);
    // Bảo vệ Quota: Giới hạn an toàn mặc định cho các collection kích thước lớn
    const effectiveLimit = queryLimit > 0
      ? queryLimit
      : (['vocabulary_items', 'kanji_dictionary', 'grammar_items', 'user_srs_items', 'user_progress'].includes(collectionName) ? 100 : 0);

    const q = effectiveLimit > 0 ? query(colRef, limit(effectiveLimit)) : query(colRef);
    const snap = await withFirestoreTimeout(getDocs(q), 15000);
    const list: T[] = [];
    if (!snap.empty) {
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as unknown as T));
    }
    return list;
  } catch (e) {
    console.warn(`[AdminService] Firestore collection '${collectionName}' error/timeout:`, e);
    handleFirestoreError(e);
    return [];
  }
}

function invalidateUserCurriculumCache(milestoneId?: string) {
  try {
    const keys = [
      'kizuna_stages_cache',
      'kizuna_milestones_cache_all'
    ];
    if (milestoneId) {
      keys.push(
        `kizuna_quests_${milestoneId}`,
        `kizuna_quests_v2_${milestoneId}`,
        `kizuna_vocab_ms_${milestoneId}`,
        `kizuna_kanji_unit_${milestoneId}`,
        `kizuna_grammar_ms_${milestoneId}`,
        `kizuna_grammar_unit_${milestoneId}`
      );
    }
    keys.forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(`offline_${k}`);
    });
  } catch {}
}

function getCurrentAdminName(): string {
  const u = authService.getCurrentUser();
  return u?.username || u?.email || u?.fullName || 'admin';
}

function pushLocalActivityLog(entry: AdminActivityLog) {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    const existing: AdminActivityLog[] = raw ? JSON.parse(raw) : [];
    const next = [entry, ...existing.filter(item => item.id !== entry.id)].slice(0, 200);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(next));
  } catch {}
}

function scanAnomaliesLocally(users: AdminUser[]): AntiCheatAnomaly[] {
  const anomalies: AntiCheatAnomaly[] = [];
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  for (const u of users) {
    if (u.isDeleted || u.role === 'ROLE_ADMIN') continue;
    let riskScore = 0;
    const flags: string[] = [];
    const reasons: string[] = [];

    const ap = Number(u.activePoints || 0);
    const xp = Number(u.totalXp || 0);
    const streak = Number(u.currentStreak || 0);

    if (u.createdAt) {
      const createdMs = Date.parse(String(u.createdAt));
      if (!Number.isNaN(createdMs) && createdMs > 0) {
        const accountAgeDays = Math.max(1, Math.floor((nowMs - createdMs) / 86400000) + 1);
        if (streak > accountAgeDays + 2) {
          riskScore += 50;
          flags.push('STREAK_EXCEEDS_ACCOUNT_AGE');
          reasons.push(`Streak ${streak} ngày vượt quá tuổi tài khoản (${accountAgeDays} ngày) — nghi ngờ đổi giờ thiết bị.`);
        }
        const apPerDay = ap / accountAgeDays;
        if (ap >= 1200 && apPerDay >= 600) {
          riskScore += 45;
          flags.push('RAPID_AP_VELOCITY');
          reasons.push(`Tốc độ cày Điểm Năng Động bất thường (~${Math.round(apPerDay)} AP/ngày).`);
        }
      }
    }

    if (ap >= 1000 && (xp === 0 || ap / Math.max(1, xp) >= 2.2)) {
      riskScore += 40;
      flags.push('HIGH_AP_LOW_XP_RATIO');
      reasons.push(`Điểm Năng Động (${ap.toLocaleString()} AP) cao bất thường so với tổng XP (${xp.toLocaleString()} XP).`);
    }

    if (streak >= 14 && xp < 100) {
      riskScore += 35;
      flags.push('EXTREME_STREAK_NO_PROGRESS');
      reasons.push(`Chuỗi Streak ${streak} ngày nhưng tổng XP chỉ đạt ${xp} XP.`);
    }

    if (ap >= 2500 && (!u.level || u.level === 'Tân binh')) {
      riskScore += 30;
      flags.push('BEGINNER_AP_SPIKE');
      reasons.push(`Tài khoản bậc Tân binh có ${ap.toLocaleString()} AP — cần xác minh nguồn điểm.`);
    }

    if (u.lastAntiCheatNote && riskScore > 0) {
      riskScore += 15;
      flags.push('REPEAT_OFFENDER');
      reasons.push('Tài khoản từng có ghi nhận xử lý chống gian lận trước đó.');
    }

    if (riskScore >= 30) {
      const severity: AntiCheatAnomaly['severity'] = riskScore >= 70 ? 'HIGH' : riskScore >= 45 ? 'MEDIUM' : 'LOW';
      anomalies.push({
        userId: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        level: u.level,
        activePoints: ap,
        totalXp: xp,
        currentStreak: streak,
        enabled: u.enabled !== false && u.status !== 'BANNED',
        riskScore: Math.min(100, riskScore),
        severity,
        flags,
        reasons,
        detectedAt: nowIso
      });
    }
  }

  return anomalies.sort((a, b) => b.riskScore - a.riskScore);
}

export const adminService = {
  fetchCollectionData,

  getBackendStatus(): BackendConnectionStatus {
    return adminApiClient.getStatus();
  },

  subscribeBackendStatus(listener: (status: BackendConnectionStatus) => void): () => void {
    return adminApiClient.subscribeStatus(listener);
  },

  async recordActivityLog(action: string, targetType: string, targetId: string, details: string): Promise<AdminActivityLog> {
    const entry: AdminActivityLog = {
      id: `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      adminUsername: getCurrentAdminName(),
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };

    pushLocalActivityLog(entry);

    const apiRes = await adminApiClient.request<AdminActivityLog>('/api/v1/admin/activity-logs', {
      method: 'POST',
      body: { action, targetType, targetId, details, adminUsername: entry.adminUsername }
    });
    if (apiRes.ok && apiRes.data) {
      return apiRes.data;
    }

    if (!isFirestoreDummy) {
      safeFirestoreWrite(() => setDoc(doc(db, 'admin_activity_logs', entry.id), entry)).catch(() => {});
    }
    return entry;
  },

  async getActivityLogs(maxLimit = 100): Promise<AdminActivityLog[]> {
    const apiRes = await adminApiClient.request<AdminActivityLog[]>(`/api/v1/admin/activity-logs?limit=${maxLimit}`);
    const remoteLogs = await fetchCollectionData<AdminActivityLog>('admin_activity_logs', maxLimit);
    let localLogs: AdminActivityLog[] = [];
    try {
      localLogs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    } catch {}

    const mergedMap = new Map<string, AdminActivityLog>();
    for (const item of [...(apiRes.ok ? apiRes.data : []), ...remoteLogs, ...localLogs]) {
      if (item && item.id) {
        mergedMap.set(item.id, item);
      }
    }

    return [...mergedMap.values()]
      .sort((a, b) => (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0))
      .slice(0, maxLimit);
  },

  async getSystemStats(): Promise<AdminSystemStats> {
    try {
      const [users, audits, stages, milestones, exams] = await Promise.all([
        this.getUsers(),
        this.getAiAudits(),
        this.getStages(),
        this.getMilestones(),
        this.getExams()
      ]);

      return {
        totalLearners: users.filter(u => u.role !== 'ROLE_ADMIN').length,
        totalAdmins: users.filter(u => u.role === 'ROLE_ADMIN').length,
        totalExamsAvailable: exams.length,
        totalStages: stages.length,
        totalMilestones: milestones.length,
        pendingAiAudits: audits.filter(a => (a.status || 'PENDING').toUpperCase() === 'PENDING').length,
        serverStatus: 'HEALTHY'
      };
    } catch (e) {
      console.error('Error fetching stats', e);
      return {
        totalLearners: 0,
        totalAdmins: 0,
        totalExamsAvailable: 0,
        totalStages: 0,
        totalMilestones: 0,
        pendingAiAudits: 0,
        serverStatus: 'HEALTHY'
      };
    }
  },

  // =========================================================================
  // USERS CRUD & ANTI-CHEAT (Spring Boot API-First + Firestore Fallback)
  // =========================================================================
  async getUsers(): Promise<AdminUser[]> {
    const apiRes = await adminApiClient.request<AdminUser[]>('/api/v1/admin/users');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data.filter(u => !u.isDeleted);
    }
    const all = await fetchCollectionData<AdminUser>('users', 100);
    if (all.length > 0) {
      return all.filter(u => !u.isDeleted);
    }
    try {
      const localReg: AdminUser[] = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
      const filtered = localReg.filter(u => !u.isDeleted);
      if (filtered.length > 0) {
        if (!filtered.some(u => u.email === ROOT_ADMIN_USER.email || u.role === 'ROLE_ADMIN')) {
          return [ROOT_ADMIN_USER, ...filtered];
        }
        return filtered;
      }
    } catch {
      // fallback
    }
    return [ROOT_ADMIN_USER];
  },

  async createUser(payload: {
    fullName: string;
    email: string;
    password?: string;
    role: AdminRole;
    level?: string;
    totalXp?: number;
    activePoints?: number;
  }): Promise<AdminUser> {
    const emailClean = payload.email.trim().toLowerCase();
    const username = emailClean.split('@')[0];
    const userId = `usr_${Date.now().toString(36)}`;
    const fallbackRandom = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(payload.password || fallbackRandom);
    const nowIso = new Date().toISOString();

    const newUser: AdminUser = {
      id: userId,
      username,
      fullName: payload.fullName.trim(),
      email: emailClean,
      password: hashedPassword,
      role: payload.role || 'ROLE_USER',
      status: 'ACTIVE',
      enabled: true,
      isDeleted: false,
      level: payload.level || 'Tân binh',
      totalXp: Number(payload.totalXp) || 0,
      activePoints: Number(payload.activePoints) || 0,
      currentStreak: 0,
      avatarUrl: payload.role === 'ROLE_ADMIN'
        ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const apiRes = await adminApiClient.request<AdminUser>('/api/v1/admin/users', {
      method: 'POST',
      body: newUser
    });
    if (apiRes.ok && apiRes.data) {
      return apiRes.data;
    }

    await safeFirestoreWrite(() => setDoc(doc(db, 'users', userId), newUser));
    await this.recordActivityLog('USER_CREATE', 'USER', userId, `Tạo người dùng ${emailClean} (${newUser.role})`);
    return newUser;
  },

  async updateUser(userId: string, updates: Partial<AdminUser>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      delete payload.id;

      const apiRes = await adminApiClient.request<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: { id: userId, ...payload }
      });
      if (apiRes.ok) {
        if (!isFirestoreDummy) {
          safeFirestoreWrite(() => setDoc(doc(db, 'users', userId), payload, { merge: true })).catch(() => {});
        }
        return true;
      }

      await safeFirestoreWrite(() => updateDoc(doc(db, 'users', userId), payload));
      await this.recordActivityLog('USER_UPDATE', 'USER', userId, `Cập nhật hồ sơ người dùng ${updates.fullName || userId}`);
      return true;
    } catch (e) {
      console.error('Error updating user:', e);
      return false;
    }
  },

  async updateUserRole(userId: string, newRole: AdminRole): Promise<boolean> {
    const apiRes = await adminApiClient.request<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PUT',
      body: { role: newRole }
    });
    if (apiRes.ok) {
      if (!isFirestoreDummy) {
        safeFirestoreWrite(() => updateDoc(doc(db, 'users', userId), { role: newRole, updatedAt: new Date().toISOString() })).catch(() => {});
      }
      return true;
    }
    const ok = await this.updateUser(userId, { role: newRole });
    if (ok) {
      await this.recordActivityLog('USER_ROLE_UPDATE', 'USER', userId, `Đổi quyền thành ${newRole}`);
    }
    return ok;
  },

  async updateUserStatus(userId: string, active: boolean): Promise<boolean> {
    const apiRes = await adminApiClient.request<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PUT',
      body: { enabled: active }
    });
    if (apiRes.ok) {
      if (!isFirestoreDummy) {
        safeFirestoreWrite(() =>
          updateDoc(doc(db, 'users', userId), {
            status: active ? 'ACTIVE' : 'BANNED',
            enabled: active,
            updatedAt: new Date().toISOString()
          })
        ).catch(() => {});
      }
      return true;
    }
    const ok = await this.updateUser(userId, {
      status: active ? 'ACTIVE' : 'BANNED',
      enabled: active
    });
    if (ok) {
      await this.recordActivityLog(active ? 'USER_UNBAN' : 'USER_BAN', 'USER', userId, active ? 'Mở khóa tài khoản' : 'Khóa tài khoản vi phạm');
    }
    return ok;
  },

  async softDeleteUser(userId: string): Promise<boolean> {
    const apiRes = await adminApiClient.request<string>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (apiRes.ok) {
      if (!isFirestoreDummy) {
        safeFirestoreWrite(() =>
          updateDoc(doc(db, 'users', userId), {
            isDeleted: true,
            status: 'DELETED',
            enabled: false,
            updatedAt: new Date().toISOString()
          })
        ).catch(() => {});
      }
      return true;
    }
    const ok = await this.updateUser(userId, {
      isDeleted: true,
      status: 'DELETED',
      enabled: false
    });
    if (ok) {
      await this.recordActivityLog('USER_SOFT_DELETE', 'USER', userId, 'Xóa mềm người dùng (isDeleted=true)');
    }
    return ok;
  },

  async resetUserStreak(userId: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/reset-streak`, {
        method: 'POST'
      });
      if (apiRes.ok) {
        if (!isFirestoreDummy) {
          safeFirestoreWrite(() => updateDoc(doc(db, 'users', userId), { currentStreak: 0, updatedAt: new Date().toISOString() })).catch(() => {});
          safeFirestoreWrite(() => updateDoc(doc(db, 'leaderboard', userId), { currentStreak: 0, updatedAt: new Date().toISOString() })).catch(() => {});
        }
        return true;
      }

      const ok = await this.updateUser(userId, { currentStreak: 0 });
      await safeFirestoreWrite(() =>
        updateDoc(doc(db, 'leaderboard', userId), {
          currentStreak: 0,
          updatedAt: new Date().toISOString()
        })
      ).catch(() => {});
      if (ok) {
        await this.recordActivityLog('ANTI_CHEAT_RESET_STREAK', 'USER', userId, 'Reset chuỗi Streak về 0');
      }
      return ok;
    } catch {
      return false;
    }
  },

  async adjustUserActivePoints(userId: string, currentPoints: number, delta: number, reason?: string): Promise<number | null> {
    try {
      const apiRes = await adminApiClient.request<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/adjust-points`, {
        method: 'POST',
        body: { pointsAdjustment: Number(delta), reason: reason || 'Điều chỉnh bởi Admin' }
      });
      if (apiRes.ok && apiRes.data) {
        const updatedPoints = Number(apiRes.data.activePoints ?? Math.max(0, (Number(currentPoints) || 0) + Number(delta)));
        if (!isFirestoreDummy) {
          safeFirestoreWrite(() =>
            updateDoc(doc(db, 'users', userId), {
              activePoints: updatedPoints,
              lastAntiCheatNote: reason || 'Điều chỉnh bởi Admin',
              updatedAt: new Date().toISOString()
            })
          ).catch(() => {});
          safeFirestoreWrite(() =>
            updateDoc(doc(db, 'leaderboard', userId), {
              activePoints: updatedPoints,
              updatedAt: new Date().toISOString()
            })
          ).catch(() => {});
        }
        return updatedPoints;
      }

      const newPoints = Math.max(0, (Number(currentPoints) || 0) + Number(delta));
      await this.updateUser(userId, {
        activePoints: newPoints,
        lastAntiCheatNote: reason || 'Điều chỉnh bởi Admin'
      });
      await safeFirestoreWrite(() =>
        updateDoc(doc(db, 'leaderboard', userId), {
          activePoints: newPoints,
          updatedAt: new Date().toISOString()
        })
      ).catch(() => {});
      await this.recordActivityLog(
        'ANTI_CHEAT_ADJUST_POINTS',
        'USER',
        userId,
        `Điều chỉnh ${delta > 0 ? `+${delta}` : delta} AP (Mới: ${newPoints} AP). Lý do: ${reason || 'Admin'}`
      );
      return newPoints;
    } catch {
      return null;
    }
  },

  async scanAntiCheatAnomalies(users: AdminUser[]): Promise<AntiCheatAnomaly[]> {
    const apiRes = await adminApiClient.request<AntiCheatAnomaly[]>('/api/v1/admin/anti-cheat/anomalies');
    if (apiRes.ok && Array.isArray(apiRes.data)) {
      return apiRes.data;
    }
    return scanAnomaliesLocally(users);
  },

  async getStudentDossier(user: AdminUser): Promise<StudentDossierData> {
    let progress: StudentDossierData['progress'] = null;
    let srsItems: StudentDossierData['srsItems'] = [];
    let freshUser: AdminUser = user;

    const apiRes = await adminApiClient.request<any>(`/api/v1/admin/users/${encodeURIComponent(user.id)}/learning-dossier`);
    if (apiRes.ok && apiRes.data) {
      if (apiRes.data.user) {
        freshUser = { ...user, ...apiRes.data.user };
      }
      if (apiRes.data.placementDetails && !freshUser.placementDetails) {
        freshUser = { ...freshUser, placementDetails: apiRes.data.placementDetails };
      }
      if (Array.isArray(apiRes.data.srsItemsQueue) && apiRes.data.srsItemsQueue.length > 0) {
        srsItems = apiRes.data.srsItemsQueue;
      }
    }

    if (!isFirestoreDummy) {
      try {
        const userSnap = await withFirestoreTimeout(getDoc(doc(db, 'users', user.id)), 8000);
        if (userSnap.exists()) {
          freshUser = { ...freshUser, ...userSnap.data(), id: user.id };
        }
      } catch {}

      try {
        const progSnap = await withFirestoreTimeout(getDoc(doc(db, 'user_progress', user.id)), 8000);
        if (progSnap.exists()) {
          progress = progSnap.data() as StudentDossierData['progress'];
        }
      } catch {}

      if (srsItems.length === 0) {
        try {
          const srsQuery = query(collection(db, 'user_srs_items'), where('userId', '==', user.id), limit(100));
          const srsSnap = await withFirestoreTimeout(getDocs(srsQuery), 8000);
          if (!srsSnap.empty) {
            srsSnap.forEach(d => srsItems.push({ id: d.id, ...d.data() }));
          }
        } catch {}
      }
    }

    return {
      user: freshUser,
      progress,
      srsItems
    };
  },

  // =========================================================================
  // AI GOVERNANCE: PLACEMENT MONITOR, DYNAMIC CONFIG, AUDITS & SANDBOX
  // =========================================================================
  async getAiAudits(): Promise<AiEvaluationAudit[]> {
    const apiRes = await adminApiClient.request<AiEvaluationAudit[]>('/api/v1/admin/ai/audit-queue');
    const fsAudits = await fetchCollectionData<AiEvaluationAudit>('ai_evaluation_audits', 50);

    const rawList = [
      ...(apiRes.ok && Array.isArray(apiRes.data) ? apiRes.data : []),
      ...fsAudits
    ];
    const sourceList = rawList.length > 0 ? rawList : FALLBACK_AI_AUDITS;

    const map = new Map<string, AiEvaluationAudit>();
    for (const item of sourceList) {
      if (item && item.id) {
        map.set(item.id, {
          ...item,
          userSubmission: item.userSubmission || item.studentInput || '',
          aiFeedback: item.aiFeedback || item.aiResponse || '',
          studentAppealReason: item.studentAppealReason || item.studentReason || '',
          milestoneTitle: item.milestoneTitle || item.milestoneId || 'Cột mốc học tập',
          status: (item.status || 'PENDING').toUpperCase(),
          submittedAt: item.submittedAt || (item.createdAt ? new Date(item.createdAt).toISOString() : '')
        });
      }
    }

    return [...map.values()].sort((a, b) => {
      const ta = Date.parse(String(a.submittedAt || '')) || Number(a.createdAt || 0);
      const tb = Date.parse(String(b.submittedAt || '')) || Number(b.createdAt || 0);
      return tb - ta;
    });
  },

  async resolveAiAudit(
    audit: AiEvaluationAudit,
    decision: 'APPROVE' | 'REJECT',
    bonusPoints = 25,
    adminNote = ''
  ): Promise<AiEvaluationAudit | null> {
    const normalizedStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const nowIso = new Date().toISOString();
    const adminName = getCurrentAdminName();

    const apiRes = await adminApiClient.request<AiEvaluationAudit>(
      `/api/v1/admin/ai/audit-queue/${encodeURIComponent(audit.id)}/resolve`,
      {
        method: 'POST',
        body: { decision, bonusPoints: decision === 'APPROVE' ? bonusPoints : 0, adminNote }
      }
    );

    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() =>
        setDoc(
          doc(db, 'ai_evaluation_audits', audit.id),
          {
            status: normalizedStatus,
            adminNote,
            resolvedBy: adminName,
            bonusPointsAwarded: decision === 'APPROVE' ? bonusPoints : 0,
            reviewedAt: nowIso,
            resolvedAt: Date.now()
          },
          { merge: true }
        )
      ).catch(() => {});

      // Nếu không có backend API xử lý hoàn điểm, tự hoàn AP trên Firestore cho học viên
      if (!apiRes.ok && decision === 'APPROVE' && audit.userId && bonusPoints > 0) {
        try {
          const userSnap = await withFirestoreTimeout(getDoc(doc(db, 'users', audit.userId)), 6000);
          if (userSnap.exists()) {
            const currentAp = Number(userSnap.data()?.activePoints || 0);
            const nextAp = currentAp + bonusPoints;
            await safeFirestoreWrite(() =>
              updateDoc(doc(db, 'users', audit.userId!), {
                activePoints: nextAp,
                updatedAt: nowIso
              })
            );
            await safeFirestoreWrite(() =>
              updateDoc(doc(db, 'leaderboard', audit.userId!), {
                activePoints: nextAp,
                updatedAt: nowIso
              })
            ).catch(() => {});
          }
        } catch {}
      }
    }

    if (!apiRes.ok) {
      await this.recordActivityLog(
        `AI_AUDIT_${normalizedStatus}`,
        'AI_AUDIT',
        audit.id,
        `Phúc khảo khiếu nại @${audit.username || 'user'} -> ${normalizedStatus}${decision === 'APPROVE' ? ` (+${bonusPoints} AP)` : ''}`
      );
    }

    return apiRes.ok && apiRes.data
      ? apiRes.data
      : {
          ...audit,
          status: normalizedStatus,
          adminNote,
          resolvedBy: adminName,
          bonusPointsAwarded: decision === 'APPROVE' ? bonusPoints : 0,
          reviewedAt: nowIso
        };
  },

  async reviewAiAudit(auditId: string, decision: 'APPROVED' | 'REJECTED'): Promise<boolean> {
    const res = await this.resolveAiAudit(
      { id: auditId },
      decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
      25,
      ''
    );
    return Boolean(res);
  },

  async getAiConfig(): Promise<AiRuntimeConfig> {
    const apiRes = await adminApiClient.request<AiRuntimeConfig>('/api/v1/admin/ai/config');
    if (apiRes.ok && apiRes.data) {
      try {
        localStorage.setItem(LOCAL_AI_CONFIG_KEY, JSON.stringify(apiRes.data));
      } catch {}
      return apiRes.data;
    }

    if (!isFirestoreDummy) {
      try {
        const snap = await withFirestoreTimeout(getDoc(doc(db, 'system_config', 'ai_config')), 6000);
        if (snap.exists()) {
          return { ...DEFAULT_AI_CONFIG, ...(snap.data() as Partial<AiRuntimeConfig>) };
        }
      } catch {}
    }

    try {
      const local = localStorage.getItem(LOCAL_AI_CONFIG_KEY);
      if (local) return { ...DEFAULT_AI_CONFIG, ...JSON.parse(local) };
    } catch {}
    return DEFAULT_AI_CONFIG;
  },

  async updateAiConfig(updates: Partial<AiRuntimeConfig>): Promise<AiRuntimeConfig> {
    const payload = {
      model: updates.model,
      dailyLimit: updates.dailyLimit !== undefined ? Number(updates.dailyLimit) : undefined,
      timeoutSeconds: updates.timeoutSeconds !== undefined ? Number(updates.timeoutSeconds) : undefined,
      senseiEnabled: updates.senseiEnabled,
      senseiSystemPrompt: updates.senseiSystemPrompt
    };

    const apiRes = await adminApiClient.request<AiRuntimeConfig>('/api/v1/admin/ai/config', {
      method: 'PUT',
      body: payload
    });

    const current = await this.getAiConfig();
    const merged: AiRuntimeConfig = {
      ...current,
      ...updates,
      updatedBy: getCurrentAdminName(),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(LOCAL_AI_CONFIG_KEY, JSON.stringify(merged));
    } catch {}

    if (!isFirestoreDummy) {
      safeFirestoreWrite(() => setDoc(doc(db, 'system_config', 'ai_config'), merged, { merge: true })).catch(() => {});
    }

    if (!apiRes.ok) {
      await this.recordActivityLog(
        'AI_CONFIG_UPDATE',
        'AI_CONFIG',
        merged.model,
        `Cập nhật cấu hình AI: model=${merged.model}, dailyLimit=${merged.dailyLimit}, timeout=${merged.timeoutSeconds}s`
      );
    }

    return apiRes.ok && apiRes.data ? apiRes.data : merged;
  },

  async getAiPlacementMonitor(users: AdminUser[], audits: AiEvaluationAudit[] = []): Promise<AiPlacementMonitorData> {
    const apiRes = await adminApiClient.request<AiPlacementMonitorData>('/api/v1/admin/ai/placement-monitor');
    if (apiRes.ok && apiRes.data) {
      return apiRes.data;
    }

    // Fallback aggregation from real Firestore `users`, `ai_placement_logs`, and `system_config/ai_config`
    const [config, remoteLogs] = await Promise.all([
      this.getAiConfig(),
      fetchCollectionData<AiTelemetryEvent>('ai_placement_logs', 100)
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = remoteLogs.filter(e => e.timestamp && new Date(e.timestamp).toISOString().slice(0, 10) === todayStr);

    let high = 0;
    let moderate = 0;
    let low = 0;
    let totalPlacedUsers = 0;
    let aiAssistedPlacements = 0;
    const latencies: number[] = [];
    const levelDistribution: Record<string, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    const stageDistribution: Record<string, number> = {};
    const syntheticEvents: AiTelemetryEvent[] = [];

    users.forEach(u => {
      if (u.isDeleted || u.role === 'ROLE_ADMIN') return;
      const details = u.placementDetails;
      if (!details) return;
      totalPlacedUsers++;

      const rawLvl = String(details.recommendedLearningLevel || details.assignedLevel || 'N5').toUpperCase();
      if (levelDistribution[rawLvl] !== undefined) {
        levelDistribution[rawLvl]++;
      } else {
        levelDistribution.N5++;
      }

      if (details.recommendedStageTitle) {
        stageDistribution[details.recommendedStageTitle] =
          (stageDistribution[details.recommendedStageTitle] || 0) + 1;
      }

      if (details.aiAssessment) {
        aiAssistedPlacements++;
        const conf = String(details.aiAssessment.confidence || '').toUpperCase();
        if (conf === 'HIGH') high++;
        else if (conf === 'MODERATE') moderate++;
        else if (conf === 'LOW') low++;

        if (typeof details.aiAssessment.latencyMs === 'number' && details.aiAssessment.latencyMs > 0) {
          latencies.push(details.aiAssessment.latencyMs);
        }

        syntheticEvents.push({
          id: `usr_plc_${u.id}`,
          type: 'PLACEMENT',
          model: details.aiAssessment.model || config.model,
          confidence: conf || 'MODERATE',
          milestoneId: details.aiAssessment.milestoneId || details.recommendedMilestoneId || null,
          assignedLevel: rawLvl,
          latencyMs: Number(details.aiAssessment.latencyMs || 0),
          status: 'SUCCESS',
          httpStatus: 200,
          timestamp: details.testedAt ? Date.parse(details.testedAt) || Date.now() : Date.now()
        });
      }
    });

    remoteLogs.forEach(evt => {
      if (evt.latencyMs > 0) latencies.push(evt.latencyMs);
    });

    const mergedEvents = [...remoteLogs, ...syntheticEvents]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 25);

    const callsToday = Math.max(
      todayLogs.length,
      syntheticEvents.filter(e => new Date(e.timestamp).toISOString().slice(0, 10) === todayStr).length
    );
    const dailyLimit = config.dailyLimit;
    const remainingToday = Math.max(0, dailyLimit - callsToday);
    const quotaUsagePercent = dailyLimit > 0 ? Math.min(100, Math.round((callsToday / dailyLimit) * 1000) / 10) : 100;
    const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;
    const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0;
    const rateLimitErrors429Count = remoteLogs.filter(e => e.httpStatus === 429 || e.status === 'RATE_LIMITED').length;
    const fallbackOrErrorCount = remoteLogs.filter(e => e.status === 'FALLBACK' || e.status === 'ERROR').length;
    const successCount = mergedEvents.filter(e => e.status === 'SUCCESS').length;
    const totalRecordedCalls = mergedEvents.length;

    return {
      model: config.model,
      apiKeyConfigured: false,
      senseiEnabled: config.senseiEnabled,
      callsToday,
      dailyLimit,
      remainingToday,
      quotaUsagePercent,
      budgetDate: todayStr,
      inFlightActive: 0,
      inFlightMax: config.maxConcurrency || 2,
      timeoutSeconds: config.timeoutSeconds || 5,
      rateLimitErrors429Count,
      totalRecordedCalls,
      totalPlacementCalls: mergedEvents.filter(e => e.type === 'PLACEMENT').length,
      totalPlacedUsers,
      aiAssistedPlacements,
      successCount,
      fallbackOrErrorCount,
      successRatePercent: totalRecordedCalls > 0 ? Math.round((successCount / totalRecordedCalls) * 1000) / 10 : 100,
      averageLatencyMs: avgLatencyMs,
      minLatencyMs,
      maxLatencyMs,
      pendingAuditsCount: audits.filter(a => (a.status || 'PENDING').toUpperCase() === 'PENDING').length,
      confidenceDistribution: { HIGH: high, MODERATE: moderate, LOW: low },
      levelDistribution,
      stageDistribution,
      recentEvents: mergedEvents,
      config
    };
  },

  async runAiSandbox(payload: {
    milestoneId?: string;
    systemPrompt?: string;
    studentInput: string;
  }): Promise<any> {
    const apiRes = await adminApiClient.request<any>('/api/v1/admin/ai/sandbox-test', {
      method: 'POST',
      body: payload,
      timeoutMs: 10000
    });
    if (apiRes.ok && apiRes.data) {
      return apiRes.data;
    }

    // Fallback: call public Sensei endpoint or local simulation
    const publicRes = await adminApiClient.request<any>('/api/v1/ai/sensei/evaluate', {
      method: 'POST',
      allowAnonymous: true,
      body: {
        milestoneId: payload.milestoneId || '',
        studentInput: payload.studentInput
      },
      timeoutMs: 10000
    });
    if (publicRes.ok && publicRes.data) {
      return publicRes.data;
    }

    return {
      milestoneTitle: payload.milestoneId || 'Sandbox cục bộ',
      studentInput: payload.studentInput,
      evaluatedScore: payload.studentInput.includes('です') || payload.studentInput.includes('ます') ? 8 : 5,
      passed: payload.studentInput.includes('です') || payload.studentInput.includes('ます'),
      whitelistCompliant: true,
      particleErrors: [],
      pedagogicalFeedback: 'Đánh giá ngoại tuyến: câu viết có cấu trúc cơ bản hợp lệ (kết nối Backend Spring Boot để gọi live Gemini API).',
      naturalExpressionSuggestion: payload.studentInput.endsWith('。') ? payload.studentInput : `${payload.studentInput}。`,
      model: 'local-sandbox-fallback',
      latencyMs: 18
    };
  },

  // =========================================================================
  // SYSTEM SETTINGS & MAINTENANCE MODE
  // =========================================================================
  async getSystemSettings(): Promise<SystemSettings> {
    const apiRes = await adminApiClient.request<SystemSettings>('/api/v1/admin/settings');
    if (apiRes.ok && apiRes.data) {
      try {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(apiRes.data));
      } catch {}
      return apiRes.data;
    }

    if (!isFirestoreDummy) {
      try {
        const snap = await withFirestoreTimeout(getDoc(doc(db, 'system_config', 'settings')), 6000);
        if (snap.exists()) {
          return { ...DEFAULT_SYSTEM_SETTINGS, ...(snap.data() as Partial<SystemSettings>) };
        }
      } catch {}
    }

    try {
      const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (local) return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(local) };
    } catch {}
    return DEFAULT_SYSTEM_SETTINGS;
  },

  async updateSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    const apiRes = await adminApiClient.request<SystemSettings>('/api/v1/admin/settings', {
      method: 'PUT',
      body: settings
    });

    const next: SystemSettings = {
      ...settings,
      updatedBy: getCurrentAdminName(),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
    } catch {}

    if (!isFirestoreDummy) {
      safeFirestoreWrite(() => setDoc(doc(db, 'system_config', 'settings'), next, { merge: true })).catch(() => {});
    }

    if (!apiRes.ok) {
      await this.recordActivityLog(
        'SYSTEM_SETTINGS_UPDATE',
        'SYSTEM',
        'settings',
        `Cập nhật hệ thống: maintenanceMode=${next.maintenanceMode}, allowNewRegistrations=${next.allowNewRegistrations}`
      );
    }

    return apiRes.ok && apiRes.data ? apiRes.data : next;
  },

  // =========================================================================
  // STAGES & MILESTONES CRUD (Spring Boot API-First + Firestore Sync)
  // =========================================================================
  async getStages(): Promise<Stage[]> {
    const apiRes = await adminApiClient.request<Stage[]>('/api/v1/admin/stages');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data.sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
    }
    const fsList = await fetchCollectionData<Stage>('stages');
    if (fsList.length > 0) {
      return fsList.sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
    }
    return [...STAGES_CATALOG].sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
  },

  async createStage(payload: Partial<Stage>): Promise<Stage> {
    const id = payload.id?.trim() || `stage_${Date.now().toString(36)}`;
    const newStage: Stage = {
      id,
      title: payload.title?.trim() || 'Chặng mới',
      orderIndex: Number(payload.orderIndex ?? payload.order_index ?? 1),
      order_index: Number(payload.orderIndex ?? payload.order_index ?? 1),
      description: payload.description?.trim() || '',
      jlptLevel: payload.jlptLevel || 'N5',
      themeColor: payload.themeColor || (payload.colorGradient?.[0] || '#ef4444'),
      colorGradient: payload.colorGradient || ['#ef4444', '#f97316'],
      updatedAt: new Date().toISOString()
    };

    const apiRes = await adminApiClient.request<Stage>('/api/v1/admin/stages', {
      method: 'POST',
      body: newStage
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'stages', newStage.id), newStage)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('STAGE_CREATE', 'STAGE', newStage.id, `Tạo chặng học: ${newStage.title}`);
    }
    sessionStorage.removeItem('kizuna_stages_cache');
    return apiRes.ok && apiRes.data ? { ...newStage, ...apiRes.data } : newStage;
  },

  async updateStage(stageId: string, updates: Partial<Stage>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {
        ...updates,
        order_index: Number(updates.orderIndex ?? updates.order_index ?? 1),
        orderIndex: Number(updates.orderIndex ?? updates.order_index ?? 1),
        updatedAt: new Date().toISOString()
      };
      delete payload.id;

      const apiRes = await adminApiClient.request<Stage>(`/api/v1/admin/stages/${encodeURIComponent(stageId)}`, {
        method: 'PUT',
        body: { id: stageId, ...payload }
      });

      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => setDoc(doc(db, 'stages', stageId), payload, { merge: true })).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('STAGE_UPDATE', 'STAGE', stageId, `Cập nhật chặng: ${updates.title || stageId}`);
      }
      sessionStorage.removeItem('kizuna_stages_cache');
      return true;
    } catch (e) {
      console.error('Error updating stage:', e);
      return false;
    }
  },

  async deleteStage(stageId: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<string>(`/api/v1/admin/stages/${encodeURIComponent(stageId)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'stages', stageId))).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('STAGE_DELETE', 'STAGE', stageId, 'Xóa chặng học');
      }
      sessionStorage.removeItem('kizuna_stages_cache');
      return true;
    } catch (e) {
      console.error('Error deleting stage:', e);
      return false;
    }
  },

  async getMilestones(): Promise<Milestone[]> {
    const apiRes = await adminApiClient.request<Milestone[]>('/api/v1/admin/milestones');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data.sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
    }
    const fsList = await fetchCollectionData<Milestone>('milestones');
    if (fsList.length > 0) {
      return fsList.sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
    }
    return [...MILESTONES_CATALOG].sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
  },

  async createMilestone(payload: Partial<Milestone>): Promise<Milestone> {
    const id = payload.id?.trim() || `ms_${Date.now().toString(36)}`;
    const orderIdx = Number(payload.orderIndex ?? payload.order_index ?? 1);
    const stgId = payload.stageId || payload.stage_id || 'stage_01';
    const newMilestone: Milestone = {
      id,
      stageId: stgId,
      stage_id: stgId,
      title: payload.title?.trim() || 'Cột mốc mới',
      nejUnit: payload.nejUnit?.trim() || `Bài ${orderIdx}`,
      orderIndex: orderIdx,
      order_index: orderIdx,
      communicationContext: payload.communicationContext?.trim() || '',
      xpReward: Number(payload.xpReward ?? 50),
      activePointsReward: Number(payload.activePointsReward ?? 70),
      prerequisiteMilestoneId: payload.prerequisiteMilestoneId || null,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      active: payload.isActive !== undefined ? payload.isActive : true,
      updatedAt: new Date().toISOString()
    };

    const apiRes = await adminApiClient.request<Milestone>('/api/v1/admin/milestones', {
      method: 'POST',
      body: newMilestone
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'milestones', id), newMilestone)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('MILESTONE_CREATE', 'MILESTONE', id, `Tạo cột mốc: ${newMilestone.title}`);
    }
    return apiRes.ok && apiRes.data ? { ...newMilestone, ...apiRes.data } : newMilestone;
  },

  async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      if (updates.stageId !== undefined) payload.stage_id = updates.stageId;
      if (updates.orderIndex !== undefined) payload.order_index = Number(updates.orderIndex);
      if (updates.isActive !== undefined) payload.active = updates.isActive;
      delete payload.id;

      const apiRes = await adminApiClient.request<Milestone>(`/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}`, {
        method: 'PUT',
        body: { id: milestoneId, ...payload }
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => setDoc(doc(db, 'milestones', milestoneId), payload, { merge: true })).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('MILESTONE_UPDATE', 'MILESTONE', milestoneId, `Cập nhật mốc: ${updates.title || milestoneId}`);
      }
      return true;
    } catch (e) {
      console.error('Error updating milestone:', e);
      return false;
    }
  },

  async deleteMilestone(milestoneId: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<string>(`/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'milestones', milestoneId))).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('MILESTONE_DELETE', 'MILESTONE', milestoneId, 'Xóa cột mốc');
      }
      return true;
    } catch (e) {
      console.error('Error deleting milestone:', e);
      return false;
    }
  },

  async toggleMilestoneStatus(milestoneId: string, isActive: boolean): Promise<boolean> {
    const apiRes = await adminApiClient.request<Milestone>(
      `/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}/status`,
      { method: 'PATCH', body: { active: isActive } }
    );
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() =>
        setDoc(doc(db, 'milestones', milestoneId), { isActive, active: isActive, updatedAt: new Date().toISOString() }, { merge: true })
      ).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('MILESTONE_TOGGLE', 'MILESTONE', milestoneId, `Đổi hiển thị -> ${isActive ? 'ACTIVE' : 'HIDDEN'}`);
    }
    return true;
  },

  async updateMilestoneGameplayConfig(
    milestoneId: string,
    config: { xpReward: number; activePointsReward: number; prerequisiteMilestoneId: string | null }
  ): Promise<boolean> {
    const apiRes = await adminApiClient.request<Milestone>(
      `/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}/gameplay-config`,
      {
        method: 'PUT',
        body: {
          xpReward: Number(config.xpReward),
          activePointsReward: Number(config.activePointsReward),
          prerequisiteMilestoneId: config.prerequisiteMilestoneId || null
        }
      }
    );
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() =>
        setDoc(
          doc(db, 'milestones', milestoneId),
          {
            xpReward: Number(config.xpReward),
            activePointsReward: Number(config.activePointsReward),
            prerequisiteMilestoneId: config.prerequisiteMilestoneId || null,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      ).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog(
        'MILESTONE_GAMEPLAY',
        'MILESTONE',
        milestoneId,
        `Cân bằng gameplay: XP=${config.xpReward}, AP=${config.activePointsReward}`
      );
    }
    return true;
  },

  async getMilestoneQuests(milestoneId: string): Promise<MilestoneQuest[]> {
    const apiRes = await adminApiClient.request<MilestoneQuest[]>(
      `/api/v1/admin/quests?milestoneId=${encodeURIComponent(milestoneId)}`
    );
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data.sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0));
    }
    if (!isFirestoreDummy) {
      try {
        const q = query(collection(db, 'milestone_quests'), where('milestoneId', '==', milestoneId));
        const snap = await withFirestoreTimeout(getDocs(q), 10000);
        const list: MilestoneQuest[] = [];
        if (!snap.empty) {
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as MilestoneQuest));
        }
        return list.sort((a, b) => (a.stepIndex || 0) - (b.stepIndex || 0));
      } catch (e) {
        console.warn('Error fetching milestone_quests:', e);
      }
    }
    return [];
  },

  async saveMilestoneQuest(quest: MilestoneQuest): Promise<MilestoneQuest> {
    const id = quest.id?.trim() || `quest_${Date.now().toString(36)}`;
    const srsCards = Array.isArray(quest.srsCards) ? quest.srsCards : [];
    const srsCardIds = Array.isArray(quest.srsCardIds) && quest.srsCardIds.length > 0
      ? quest.srsCardIds
      : srsCards.map(c => c.sourceItemId || c.id).filter(Boolean);

    const payload: MilestoneQuest = {
      ...quest,
      id,
      stepIndex: Number(quest.stepIndex || 1),
      xpReward: Number(quest.xpReward ?? 50),
      activePointsReward: Number(quest.activePointsReward ?? 25),
      srsCardIds,
      srsCards,
      quizQuestions: Array.isArray(quest.quizQuestions) ? quest.quizQuestions : [],
      scrambleSentences: Array.isArray(quest.scrambleSentences) ? quest.scrambleSentences : [],
      roleplayDialogues: Array.isArray(quest.roleplayDialogues) ? quest.roleplayDialogues : [],
      updatedAt: new Date().toISOString()
    };

    const apiRes = await adminApiClient.request<MilestoneQuest>('/api/v1/admin/quests', {
      method: 'POST',
      body: payload
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'milestone_quests', id), payload, { merge: true })).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('QUEST_SAVE', 'QUEST', id, `Lưu bài học Quest: ${payload.title}`);
    }
    invalidateUserCurriculumCache(payload.milestoneId);
    return apiRes.ok && apiRes.data ? { ...payload, ...apiRes.data } : payload;
  },

  async deleteMilestoneQuest(questId: string, milestoneId?: string): Promise<boolean> {
    try {
      await adminApiClient.request<string>(`/api/v1/admin/quests/${encodeURIComponent(questId)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'milestone_quests', questId))).catch(() => {});
      }
      invalidateUserCurriculumCache(milestoneId);
      return true;
    } catch {
      return false;
    }
  },

  async getMilestoneWhitelist(
    milestoneId: string,
    cachedVocab: VocabularyItem[] = [],
    cachedKanji: KanjiDictionary[] = [],
    cachedGrammar: GrammarItem[] = []
  ): Promise<MilestoneWhitelistData> {
    let vocabList = cachedVocab.filter(v => (v.milestoneId || v.milestone_id) === milestoneId);
    let kanjiList = cachedKanji.filter(k => (k.milestoneId || k.milestone_id) === milestoneId);
    let grammarList = cachedGrammar.filter(g => (g.milestoneId || g.milestone_id) === milestoneId);

    if (vocabList.length === 0 && kanjiList.length === 0 && grammarList.length === 0) {
      const apiRes = await adminApiClient.request<any>(`/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}/whitelist`);
      if (apiRes.ok && apiRes.data) {
        vocabList = apiRes.data.vocabulary || [];
        kanjiList = apiRes.data.kanji || [];
        grammarList = apiRes.data.grammar || [];
      }
    }

    if (!isFirestoreDummy && !shouldSkipFirestore()) {
      try {
        if (vocabList.length === 0) {
          const qV = query(collection(db, 'vocabulary_items'), where('milestoneId', '==', milestoneId), limit(50));
          const sV = await withFirestoreTimeout(getDocs(qV), 10000);
          sV.forEach(d => vocabList.push({ id: d.id, ...d.data() }));
        }
        if (kanjiList.length === 0) {
          const qK = query(collection(db, 'kanji_dictionary'), where('milestoneId', '==', milestoneId), limit(50));
          const sK = await withFirestoreTimeout(getDocs(qK), 10000);
          sK.forEach(d => kanjiList.push({ id: d.id, ...d.data() }));
        }
        if (grammarList.length === 0) {
          const qG = query(collection(db, 'grammar_items'), where('milestoneId', '==', milestoneId), limit(50));
          const sG = await withFirestoreTimeout(getDocs(qG), 10000);
          sG.forEach(d => grammarList.push({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.warn('Error querying milestone whitelist:', e);
      }
    }

    if (vocabList.length === 0 && kanjiList.length === 0 && grammarList.length === 0) {
      const fbV = FALLBACK_VOCABULARY.filter(v => (v.milestoneId || v.milestone_id) === milestoneId);
      const fbK = FALLBACK_KANJI.filter(k => (k.milestoneId || k.milestone_id) === milestoneId);
      const fbG = FALLBACK_GRAMMAR.filter(g => (g.milestoneId || g.milestone_id) === milestoneId);
      vocabList = fbV.length > 0 ? fbV : FALLBACK_VOCABULARY.slice(0, 3);
      kanjiList = fbK.length > 0 ? fbK : FALLBACK_KANJI.slice(0, 2);
      grammarList = fbG.length > 0 ? fbG : FALLBACK_GRAMMAR.slice(0, 2);
    }

    return {
      milestoneId,
      vocabulary: vocabList,
      kanji: kanjiList,
      grammar: grammarList
    };
  },

  async addWhitelistVocabItem(
    milestoneId: string,
    item: {
      term: string;
      reading: string;
      sinoVietnamese?: string;
      vietnameseMeaning: string;
      wordType?: string;
      exampleSentenceJp?: string;
      exampleSentenceVi?: string;
      whitelistTier?: 'CORE' | 'SUPPLEMENTARY';
    }
  ): Promise<VocabularyItem> {
    const id = `vocab_${milestoneId}_${Date.now().toString(36)}`;
    const newDoc: VocabularyItem = {
      id,
      milestoneId,
      term: item.term.trim(),
      kanji: item.term.trim(),
      reading: item.reading.trim(),
      sinoVietnamese: (item.sinoVietnamese || '').trim().toUpperCase(),
      vietnameseMeaning: item.vietnameseMeaning.trim(),
      wordType: item.wordType || 'Danh từ',
      exampleSentenceJp: item.exampleSentenceJp?.trim() || '',
      exampleSentenceVi: item.exampleSentenceVi?.trim() || '',
      whitelistTier: item.whitelistTier || 'CORE',
      createdAt: new Date().toISOString()
    };

    const apiRes = await adminApiClient.request<VocabularyItem>(
      `/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}/whitelist/item`,
      { method: 'POST', body: newDoc }
    );
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', id), newDoc)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('WHITELIST_ADD', 'MILESTONE', milestoneId, `Thêm từ vào Whitelist: ${newDoc.term}`);
    }
    invalidateUserCurriculumCache(milestoneId);
    return apiRes.ok && apiRes.data ? { ...newDoc, ...apiRes.data } : newDoc;
  },

  // =========================================================================
  // VOCABULARY, GRAMMAR, KANJI, EXAMS CRUD + BULK CSV + BACKUP/RESTORE
  // =========================================================================
  async getVocabulary(): Promise<VocabularyItem[]> {
    const apiRes = await adminApiClient.request<VocabularyItem[]>('/api/v1/admin/vocabulary');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data;
    }
    const fsList = await fetchCollectionData<VocabularyItem>('vocabulary_items', 100);
    if (fsList.length > 0) return fsList;
    return FALLBACK_VOCABULARY;
  },

  async createVocabulary(payload: Partial<VocabularyItem>): Promise<VocabularyItem> {
    const id = payload.id?.trim() || `vocab_${Date.now().toString(36)}`;
    const term = (payload.term || payload.kanji || '').trim();
    const reading = (payload.reading || payload.kana || '').trim();
    const meaning = (payload.vietnameseMeaning || payload.meaning || '').trim();
    const level = (payload.level || payload.jlptLevel || 'N5').toUpperCase();
    const newDoc: VocabularyItem = {
      id,
      term,
      kanji: term,
      reading,
      kana: reading,
      sinoVietnamese: (payload.sinoVietnamese || '').trim().toUpperCase(),
      vietnameseMeaning: meaning,
      meaning,
      wordType: payload.wordType || 'Danh từ',
      level,
      jlptLevel: level,
      milestoneId: payload.milestoneId || '',
      exampleSentenceJp: payload.exampleSentenceJp?.trim() || '',
      exampleSentenceVi: payload.exampleSentenceVi?.trim() || '',
      updatedAt: new Date().toISOString()
    };
    const apiRes = await adminApiClient.request<VocabularyItem>('/api/v1/admin/vocabulary', {
      method: 'POST',
      body: newDoc
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', id), newDoc)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('VOCAB_CREATE', 'VOCABULARY', id, `Thêm từ vựng: ${term}`);
    }
    return apiRes.ok && apiRes.data ? { ...newDoc, ...apiRes.data } : newDoc;
  },

  async bulkImportVocabulary(items: Array<Partial<VocabularyItem>>): Promise<VocabularyItem[]> {
    const prepared: VocabularyItem[] = items
      .filter(i => (i.term || i.kanji || '').trim().length > 0)
      .map((i, idx) => {
        const term = (i.term || i.kanji || '').trim();
        const reading = (i.reading || i.kana || term).trim();
        const meaning = (i.vietnameseMeaning || i.meaning || '').trim();
        const level = (i.level || i.jlptLevel || 'N5').toUpperCase();
        return {
          id: i.id?.trim() || `vocab_csv_${Date.now().toString(36)}_${idx}`,
          term,
          kanji: term,
          reading,
          kana: reading,
          sinoVietnamese: (i.sinoVietnamese || '').trim().toUpperCase(),
          vietnameseMeaning: meaning,
          meaning,
          wordType: i.wordType?.trim() || 'Danh từ',
          level,
          jlptLevel: level,
          milestoneId: i.milestoneId?.trim() || '',
          exampleSentenceJp: i.exampleSentenceJp?.trim() || '',
          exampleSentenceVi: i.exampleSentenceVi?.trim() || '',
          updatedAt: new Date().toISOString()
        };
      });

    if (prepared.length === 0) return [];

    const apiRes = await adminApiClient.request<{ importedCount: number; items: VocabularyItem[] }>(
      '/api/v1/admin/vocabulary/bulk',
      { method: 'POST', body: prepared, timeoutMs: 15000 }
    );

    if (!isFirestoreDummy) {
      await Promise.allSettled(
        prepared.map(v => safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', v.id), v)))
      );
    }

    if (!apiRes.ok) {
      await this.recordActivityLog('VOCAB_BULK_IMPORT', 'VOCABULARY', 'bulk', `Nhập hàng loạt ${prepared.length} từ vựng từ CSV`);
    }

    return apiRes.ok && Array.isArray(apiRes.data?.items) ? apiRes.data.items : prepared;
  },

  async updateVocabulary(id: string, updates: Partial<VocabularyItem>): Promise<boolean> {
    try {
      const term = (updates.term || updates.kanji || '').trim();
      const reading = (updates.reading || updates.kana || '').trim();
      const meaning = (updates.vietnameseMeaning || updates.meaning || '').trim();
      const level = (updates.level || updates.jlptLevel || 'N5').toUpperCase();
      const payload: Record<string, any> = {
        ...updates,
        term,
        kanji: term,
        reading,
        kana: reading,
        vietnameseMeaning: meaning,
        meaning,
        level,
        jlptLevel: level,
        updatedAt: new Date().toISOString()
      };
      delete payload.id;
      const apiRes = await adminApiClient.request<VocabularyItem>(`/api/v1/admin/vocabulary/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: { id, ...payload }
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', id), payload, { merge: true })).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('VOCAB_UPDATE', 'VOCABULARY', id, `Cập nhật từ vựng: ${term}`);
      }
      return true;
    } catch (e) {
      console.error('Error updating vocabulary:', e);
      return false;
    }
  },

  async deleteVocabulary(id: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<string>(`/api/v1/admin/vocabulary/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'vocabulary_items', id))).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('VOCAB_DELETE', 'VOCABULARY', id, 'Xóa từ vựng');
      }
      return true;
    } catch {
      return false;
    }
  },

  async getGrammar(): Promise<GrammarItem[]> {
    const apiRes = await adminApiClient.request<GrammarItem[]>('/api/v1/admin/grammar');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data;
    }
    const fsList = await fetchCollectionData<GrammarItem>('grammar_items', 100);
    if (fsList.length > 0) return fsList;
    return FALLBACK_GRAMMAR;
  },

  async createGrammar(payload: Partial<GrammarItem>): Promise<GrammarItem> {
    const id = payload.id?.trim() || `gram_${Date.now().toString(36)}`;
    const pattern = (payload.pattern || payload.title || '').trim();
    const titleVi = (payload.titleVi || payload.meaning || '').trim();
    const level = (payload.level || payload.jlptLevel || 'N5').toUpperCase();
    const newDoc: GrammarItem = {
      id,
      pattern,
      title: pattern,
      titleVi,
      meaning: titleVi,
      explanation: (payload.explanation || titleVi).trim(),
      nuanceReason: payload.nuanceReason?.trim() || '',
      masterExampleJp: payload.masterExampleJp?.trim() || '',
      masterExampleVi: payload.masterExampleVi?.trim() || '',
      level,
      jlptLevel: level,
      milestoneId: payload.milestoneId || '',
      updatedAt: new Date().toISOString()
    };
    const apiRes = await adminApiClient.request<GrammarItem>('/api/v1/admin/grammar', {
      method: 'POST',
      body: newDoc
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'grammar_items', id), newDoc)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('GRAMMAR_CREATE', 'GRAMMAR', id, `Thêm ngữ pháp: ${pattern}`);
    }
    return apiRes.ok && apiRes.data ? { ...newDoc, ...apiRes.data } : newDoc;
  },

  async updateGrammar(id: string, updates: Partial<GrammarItem>): Promise<boolean> {
    try {
      const pattern = (updates.pattern || updates.title || '').trim();
      const titleVi = (updates.titleVi || updates.meaning || '').trim();
      const level = (updates.level || updates.jlptLevel || 'N5').toUpperCase();
      const payload: Record<string, any> = {
        ...updates,
        pattern,
        title: pattern,
        titleVi,
        meaning: titleVi,
        level,
        jlptLevel: level,
        updatedAt: new Date().toISOString()
      };
      delete payload.id;
      const apiRes = await adminApiClient.request<GrammarItem>(`/api/v1/admin/grammar/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: { id, ...payload }
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => setDoc(doc(db, 'grammar_items', id), payload, { merge: true })).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('GRAMMAR_UPDATE', 'GRAMMAR', id, `Cập nhật ngữ pháp: ${pattern}`);
      }
      return true;
    } catch (e) {
      console.error('Error updating grammar:', e);
      return false;
    }
  },

  async deleteGrammar(id: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<string>(`/api/v1/admin/grammar/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'grammar_items', id))).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('GRAMMAR_DELETE', 'GRAMMAR', id, 'Xóa ngữ pháp');
      }
      return true;
    } catch {
      return false;
    }
  },

  async getKanji(): Promise<KanjiDictionary[]> {
    const apiRes = await adminApiClient.request<KanjiDictionary[]>('/api/v1/admin/kanji');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data;
    }
    const fsList = await fetchCollectionData<KanjiDictionary>('kanji_dictionary', 100);
    if (fsList.length > 0) return fsList;
    return FALLBACK_KANJI;
  },

  async createKanji(payload: Partial<KanjiDictionary>): Promise<KanjiDictionary> {
    const kanjiChar = (payload.kanji || payload.id || '').trim();
    const id = payload.id?.trim() || `kanji_${Date.now().toString(36)}`;
    const sinoVi = (payload.sinoVietnamese || payload.hanviet || '').trim().toUpperCase();
    const meaningVi = (payload.vietnameseMeaning || payload.meaning || '').trim();
    const level = (payload.level || payload.jlptLevel || 'N5').toUpperCase();
    const newDoc: KanjiDictionary = {
      id,
      kanji: kanjiChar,
      sinoVietnamese: sinoVi,
      hanviet: sinoVi,
      vietnameseMeaning: meaningVi,
      meaning: meaningVi,
      onyomi: payload.onyomi?.trim() || '',
      kunyomi: payload.kunyomi?.trim() || '',
      strokeCount: Number(payload.strokeCount || 1),
      radicals: payload.radicals?.trim() || '',
      mnemonicStory: payload.mnemonicStory?.trim() || '',
      level,
      jlptLevel: level,
      milestoneId: payload.milestoneId || '',
      updatedAt: new Date().toISOString()
    };
    const apiRes = await adminApiClient.request<KanjiDictionary>('/api/v1/admin/kanji', {
      method: 'POST',
      body: newDoc
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'kanji_dictionary', id), newDoc)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('KANJI_CREATE', 'KANJI', id, `Thêm Kanji: ${kanjiChar}`);
    }
    return apiRes.ok && apiRes.data ? { ...newDoc, ...apiRes.data } : newDoc;
  },

  async bulkImportKanji(items: Array<Partial<KanjiDictionary>>): Promise<KanjiDictionary[]> {
    const prepared: KanjiDictionary[] = items
      .filter(i => (i.kanji || '').trim().length > 0)
      .map((i, idx) => {
        const kanjiChar = (i.kanji || '').trim();
        const sinoVi = (i.sinoVietnamese || i.hanviet || '').trim().toUpperCase();
        const meaningVi = (i.vietnameseMeaning || i.meaning || '').trim();
        const level = (i.level || i.jlptLevel || 'N5').toUpperCase();
        return {
          id: i.id?.trim() || `kanji_csv_${Date.now().toString(36)}_${idx}`,
          kanji: kanjiChar,
          sinoVietnamese: sinoVi,
          hanviet: sinoVi,
          vietnameseMeaning: meaningVi,
          meaning: meaningVi,
          onyomi: i.onyomi?.trim() || '',
          kunyomi: i.kunyomi?.trim() || '',
          strokeCount: Number(i.strokeCount || 4),
          radicals: i.radicals?.trim() || '',
          mnemonicStory: i.mnemonicStory?.trim() || '',
          level,
          jlptLevel: level,
          milestoneId: i.milestoneId?.trim() || '',
          updatedAt: new Date().toISOString()
        };
      });

    if (prepared.length === 0) return [];

    const apiRes = await adminApiClient.request<{ importedCount: number; items: KanjiDictionary[] }>(
      '/api/v1/admin/kanji/bulk',
      { method: 'POST', body: prepared, timeoutMs: 15000 }
    );

    if (!isFirestoreDummy) {
      await Promise.allSettled(
        prepared.map(k => safeFirestoreWrite(() => setDoc(doc(db, 'kanji_dictionary', k.id), k)))
      );
    }

    if (!apiRes.ok) {
      await this.recordActivityLog('KANJI_BULK_IMPORT', 'KANJI', 'bulk', `Nhập hàng loạt ${prepared.length} chữ Hán từ CSV`);
    }

    return apiRes.ok && Array.isArray(apiRes.data?.items) ? apiRes.data.items : prepared;
  },

  async updateKanji(id: string, updates: Partial<KanjiDictionary>): Promise<boolean> {
    try {
      const sinoVi = (updates.sinoVietnamese || updates.hanviet || '').trim().toUpperCase();
      const meaningVi = (updates.vietnameseMeaning || updates.meaning || '').trim();
      const level = (updates.level || updates.jlptLevel || 'N5').toUpperCase();
      const payload: Record<string, any> = {
        ...updates,
        sinoVietnamese: sinoVi,
        hanviet: sinoVi,
        vietnameseMeaning: meaningVi,
        meaning: meaningVi,
        strokeCount: Number(updates.strokeCount || 1),
        level,
        jlptLevel: level,
        updatedAt: new Date().toISOString()
      };
      delete payload.id;
      const apiRes = await adminApiClient.request<KanjiDictionary>(`/api/v1/admin/kanji/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: { id, ...payload }
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => setDoc(doc(db, 'kanji_dictionary', id), payload, { merge: true })).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('KANJI_UPDATE', 'KANJI', id, `Cập nhật Kanji: ${updates.kanji || id}`);
      }
      return true;
    } catch (e) {
      console.error('Error updating kanji:', e);
      return false;
    }
  },

  async deleteKanji(id: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<string>(`/api/v1/admin/kanji/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'kanji_dictionary', id))).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('KANJI_DELETE', 'KANJI', id, 'Xóa Kanji');
      }
      return true;
    } catch {
      return false;
    }
  },

  async getExams(): Promise<JlptExam[]> {
    const apiRes = await adminApiClient.request<JlptExam[]>('/api/v1/admin/exams');
    if (apiRes.ok && Array.isArray(apiRes.data) && apiRes.data.length > 0) {
      return apiRes.data;
    }
    const fsList = await fetchCollectionData<JlptExam>('jlpt_exam_catalog', 50);
    if (fsList.length > 0) return fsList;
    return FALLBACK_EXAMS;
  },

  async createExam(payload: Partial<JlptExam>): Promise<JlptExam> {
    const id = payload.id?.trim() || `ex_${Date.now().toString(36)}`;
    const label = (payload.label || payload.title || 'Đề thi JLPT mới').trim();
    const level = String(payload.level || 'N5').toUpperCase();
    const durationMinutes = Number(payload.durationMinutes || 105);
    const totalQuestions = Number(payload.totalQuestions ?? payload.questionCount ?? 50);
    const newDoc: JlptExam = {
      id,
      label,
      title: label,
      level,
      type: `jlpt-${level.toLowerCase()}`,
      durationMinutes,
      totalQuestions,
      questionCount: totalQuestions,
      actualQuestionCount: Number(payload.actualQuestionCount ?? totalQuestions),
      year: Number(payload.year || new Date().getFullYear()),
      month: Number(payload.month || 7),
      audioUrl: payload.audioUrl?.trim() || '',
      explanationCount: Number(payload.explanationCount ?? 0),
      updatedAt: new Date().toISOString()
    };
    const apiRes = await adminApiClient.request<JlptExam>('/api/v1/admin/exams', {
      method: 'POST',
      body: newDoc
    });
    if (!isFirestoreDummy) {
      await safeFirestoreWrite(() => setDoc(doc(db, 'jlpt_exam_catalog', id), newDoc)).catch(() => {});
    }
    if (!apiRes.ok) {
      await this.recordActivityLog('EXAM_CREATE', 'EXAM', id, `Tạo đề thi: ${label}`);
    }
    return apiRes.ok && apiRes.data ? { ...newDoc, ...apiRes.data } : newDoc;
  },

  async updateExam(id: string, updates: Partial<JlptExam>): Promise<boolean> {
    try {
      const label = (updates.label || updates.title || '').trim();
      const level = String(updates.level || 'N5').toUpperCase();
      const totalQuestions = Number(updates.totalQuestions ?? updates.questionCount ?? 50);
      const payload: Record<string, any> = {
        ...updates,
        label,
        title: label,
        level,
        type: `jlpt-${level.toLowerCase()}`,
        durationMinutes: Number(updates.durationMinutes || 105),
        totalQuestions,
        questionCount: totalQuestions,
        actualQuestionCount: Number(updates.actualQuestionCount ?? totalQuestions),
        year: Number(updates.year || new Date().getFullYear()),
        month: Number(updates.month || 7),
        explanationCount: Number(updates.explanationCount ?? 0),
        updatedAt: new Date().toISOString()
      };
      delete payload.id;
      const apiRes = await adminApiClient.request<JlptExam>(`/api/v1/admin/exams/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: { id, ...payload }
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => setDoc(doc(db, 'jlpt_exam_catalog', id), payload, { merge: true })).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('EXAM_UPDATE', 'EXAM', id, `Cập nhật đề thi: ${label}`);
      }
      return true;
    } catch (e) {
      console.error('Error updating exam:', e);
      return false;
    }
  },

  async deleteExam(id: string): Promise<boolean> {
    try {
      const apiRes = await adminApiClient.request<string>(`/api/v1/admin/exams/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!isFirestoreDummy) {
        await safeFirestoreWrite(() => deleteDoc(doc(db, 'jlpt_exam_catalog', id))).catch(() => {});
      }
      if (!apiRes.ok) {
        await this.recordActivityLog('EXAM_DELETE', 'EXAM', id, 'Xóa đề thi');
      }
      return true;
    } catch {
      return false;
    }
  },

  async exportCurriculumBackup(fallbackSnapshot: {
    stages: Stage[];
    milestones: Milestone[];
    vocabulary: VocabularyItem[];
    grammar: GrammarItem[];
    kanji: KanjiDictionary[];
    exams: JlptExam[];
  }): Promise<Record<string, any>> {
    const apiRes = await adminApiClient.request<Record<string, any>>('/api/v1/admin/curriculum/backup', {
      timeoutMs: 12000
    });
    if (apiRes.ok && apiRes.data) {
      return apiRes.data;
    }

    await this.recordActivityLog('CURRICULUM_BACKUP', 'SYSTEM', 'backup', 'Xuất bản sao lưu giáo trình JSON');
    return {
      exportedAt: new Date().toISOString(),
      source: 'KIZUNA_ADMIN_BACKUP',
      counts: {
        stages: fallbackSnapshot.stages.length,
        milestones: fallbackSnapshot.milestones.length,
        vocabulary: fallbackSnapshot.vocabulary.length,
        grammar: fallbackSnapshot.grammar.length,
        kanji: fallbackSnapshot.kanji.length,
        exams: fallbackSnapshot.exams.length
      },
      stages: fallbackSnapshot.stages,
      milestones: fallbackSnapshot.milestones,
      vocabulary_items: fallbackSnapshot.vocabulary,
      grammar_items: fallbackSnapshot.grammar,
      kanji_dictionary: fallbackSnapshot.kanji,
      jlpt_exam_catalog: fallbackSnapshot.exams
    };
  },

  async restoreSeedCurriculum(): Promise<{ ok: boolean; counts?: Record<string, number>; message: string }> {
    const apiRes = await adminApiClient.request<Record<string, number>>('/api/v1/admin/curriculum/restore-seed', {
      method: 'POST',
      timeoutMs: 20000
    });
    if (apiRes.ok) {
      sessionStorage.removeItem('kizuna_stages_cache');
      return {
        ok: true,
        counts: apiRes.data,
        message: 'Đã khôi phục toàn bộ giáo trình chuẩn gốc từ KIZUNA_NEJ_SEED_DATA.json trên Backend.'
      };
    }

    return {
      ok: false,
      message: 'Cần kết nối Backend Spring Boot (đăng nhập JWT hợp lệ) để khôi phục dữ liệu gốc KIZUNA_NEJ_SEED_DATA.json.'
    };
  },

  // =========================================================================
  // LEARNING ANALYTICS (Drop-off Funnel & Killer Knowledge)
  // =========================================================================
  async getLearningAnalytics(params: {
    users: AdminUser[];
    stages: Stage[];
    milestones: Milestone[];
    vocabulary: VocabularyItem[];
    kanji: KanjiDictionary[];
  }): Promise<LearningAnalyticsData> {
    const { users, stages, milestones, vocabulary, kanji } = params;
    const [progressDocs, srsDocs] = await Promise.all([
      fetchCollectionData<any>('user_progress'),
      fetchCollectionData<any>('user_srs_items')
    ]);

    const learners = users.filter(u => u.role !== 'ROLE_ADMIN');
    const totalLearners = learners.length;

    const stageOrderMap = new Map<string, { order: number; title: string }>();
    stages.forEach((s, idx) => {
      stageOrderMap.set(s.id, {
        order: Number(s.orderIndex ?? s.order_index ?? idx + 1),
        title: s.title || s.id
      });
    });

    const sortedMilestones = [...milestones].sort((a, b) => {
      const sa = stageOrderMap.get(a.stageId || a.stage_id || '')?.order ?? 99;
      const sb = stageOrderMap.get(b.stageId || b.stage_id || '')?.order ?? 99;
      if (sa !== sb) return sa - sb;
      return Number(a.orderIndex ?? a.order_index ?? 0) - Number(b.orderIndex ?? b.order_index ?? 0);
    });

    if (totalLearners === 0 || sortedMilestones.length === 0) {
      return {
        totalLearnersAnalyzed: totalLearners,
        avgFunnelRetention: 0,
        bottleneckMilestoneTitle: 'Chưa có dữ liệu học viên',
        bottleneckDropOffRate: 0,
        funnelSteps: [],
        killerVocabulary: [],
        killerKanji: []
      };
    }

    const progressByUser = new Map<string, any>();
    progressDocs.forEach(p => {
      const uid = p.userId || p.id;
      if (uid) progressByUser.set(uid, p);
    });

    let prevReached = totalLearners;
    let maxDropOff = -1;
    let bottleneckIdx = -1;

    const funnelSteps: MilestoneFunnelStep[] = sortedMilestones.map((ms, idx) => {
      const stageId = ms.stageId || ms.stage_id || 'stage_01';
      const stageTitle = stageOrderMap.get(stageId)?.title || stageId;

      let reachedCount = 0;
      let completedCount = 0;

      learners.forEach(u => {
        const prog = progressByUser.get(u.id);
        const completedList: string[] = Array.isArray(prog?.completedMilestones) ? prog.completedMilestones : [];
        const isCompleted = completedList.includes(ms.id);
        const isCurrent = prog?.currentMilestoneId === ms.id;

        if (isCompleted) {
          reachedCount++;
          completedCount++;
        } else if (isCurrent || idx === 0) {
          reachedCount++;
        }
      });

      const retentionRate = totalLearners > 0 ? Math.round((reachedCount / totalLearners) * 100) : 0;
      const dropOffRate = idx === 0
        ? (reachedCount > 0 ? Math.max(0, Math.round(((reachedCount - completedCount) / reachedCount) * 100)) : 0)
        : (prevReached > 0 ? Math.max(0, Math.round(((prevReached - reachedCount) / prevReached) * 100)) : 0);

      prevReached = reachedCount;

      const isBottleneck = dropOffRate >= 20 && dropOffRate > 0;
      if (dropOffRate > maxDropOff && dropOffRate > 0) {
        maxDropOff = dropOffRate;
        bottleneckIdx = idx;
      }

      return {
        milestoneId: ms.id,
        milestoneTitle: ms.title || `Cột mốc ${idx + 1}`,
        stageId,
        stageTitle,
        orderIndex: Number(ms.orderIndex ?? ms.order_index ?? idx + 1),
        reachedCount,
        completedCount,
        retentionRate,
        dropOffRate,
        isBottleneck
      };
    });

    if (bottleneckIdx >= 0 && funnelSteps[bottleneckIdx]) {
      funnelSteps[bottleneckIdx].isBottleneck = true;
    }

    const srsAggByKey = new Map<string, { wrongSum: number; attempts: number; easeSum: number; count: number; learners: Set<string> }>();
    srsDocs.forEach(item => {
      const key = String(item.itemId || item.term || item.id || '').trim();
      if (!key) return;
      const cur = srsAggByKey.get(key) || { wrongSum: 0, attempts: 0, easeSum: 0, count: 0, learners: new Set<string>() };
      const wrong = Number(item.wrongCount ?? (Number(item.easeFactor || 2.5) < 2.0 ? 1 : 0));
      const rep = Number(item.repetition ?? 1);
      cur.wrongSum += wrong;
      cur.attempts += Math.max(1, rep + wrong);
      cur.easeSum += Number(item.easeFactor || 2.5);
      cur.count += 1;
      if (item.userId) cur.learners.add(String(item.userId));
      srsAggByKey.set(key, cur);
    });

    const killerVocabulary: KillerKnowledgeItem[] = [];
    vocabulary.forEach(v => {
      const term = String(v.term || v.kanji || v.id || '');
      const reading = String(v.reading || v.kana || '');
      const meaning = String(v.vietnameseMeaning || v.meaning || '');
      const level = String(v.level || v.jlptLevel || 'N5').toUpperCase();
      const agg = srsAggByKey.get(v.id) || srsAggByKey.get(term);

      if (agg && agg.attempts > 0 && agg.wrongSum > 0) {
        const errorRate = Math.min(100, Math.round((agg.wrongSum / agg.attempts) * 100));
        killerVocabulary.push({
          id: v.id,
          type: 'VOCABULARY',
          term,
          reading,
          meaning,
          level,
          milestoneId: v.milestoneId || v.milestone_id,
          totalAttempts: agg.attempts,
          wrongCount: agg.wrongSum,
          errorRate,
          avgEaseFactor: Number((agg.easeSum / Math.max(1, agg.count)).toFixed(2)),
          affectedLearners: agg.learners.size,
          rawItem: v
        });
      }
    });
    killerVocabulary.sort((a, b) => b.errorRate - a.errorRate || b.wrongCount - a.wrongCount);

    const killerKanji: KillerKnowledgeItem[] = [];
    kanji.forEach(k => {
      const char = String(k.kanji || k.id || '');
      const reading = String(k.sinoVietnamese || k.hanviet || k.onyomi || 'N/A');
      const meaning = String(k.vietnameseMeaning || k.meaning || '');
      const level = String(k.level || k.jlptLevel || 'N5').toUpperCase();
      const agg = srsAggByKey.get(k.id) || srsAggByKey.get(char);

      if (agg && agg.attempts > 0 && agg.wrongSum > 0) {
        const errorRate = Math.min(100, Math.round((agg.wrongSum / agg.attempts) * 100));
        killerKanji.push({
          id: k.id,
          type: 'KANJI',
          term: char,
          reading,
          meaning,
          level,
          milestoneId: k.milestoneId || k.milestone_id,
          totalAttempts: agg.attempts,
          wrongCount: agg.wrongSum,
          errorRate,
          avgEaseFactor: Number((agg.easeSum / Math.max(1, agg.count)).toFixed(2)),
          affectedLearners: agg.learners.size,
          rawItem: k
        });
      }
    });
    killerKanji.sort((a, b) => b.errorRate - a.errorRate || b.wrongCount - a.wrongCount);

    const avgFunnelRetention = funnelSteps.length > 0
      ? Math.round(funnelSteps.reduce((acc, s) => acc + s.retentionRate, 0) / funnelSteps.length)
      : 0;

    const bottleneckStep = bottleneckIdx >= 0 ? funnelSteps[bottleneckIdx] : null;

    return {
      totalLearnersAnalyzed: totalLearners,
      avgFunnelRetention,
      bottleneckMilestoneTitle: bottleneckStep ? `${bottleneckStep.milestoneTitle} (${bottleneckStep.milestoneId})` : 'Chưa phát hiện điểm nghẽn',
      bottleneckDropOffRate: bottleneckStep ? bottleneckStep.dropOffRate : 0,
      funnelSteps,
      killerVocabulary: killerVocabulary.slice(0, 15),
      killerKanji: killerKanji.slice(0, 15)
    };
  }
};
