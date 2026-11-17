import { 
  AdminUser, AiEvaluationAudit, AdminSystemStats, AdminRole,
  Stage, Milestone, MilestoneQuest, MilestoneWhitelistData,
  VocabularyItem, GrammarItem, KanjiDictionary, JlptExam,
  StudentDossierData, LearningAnalyticsData, MilestoneFunnelStep, KillerKnowledgeItem
} from '../types/adminTypes';
import { db, firebaseConfig } from '../../config/firebase';
import { collection, getDocs, getDoc, setDoc, deleteDoc, doc, updateDoc, query, where, limit } from 'firebase/firestore';
import { hashPassword } from '../../user/services/authService';

// Cờ kiểm tra nhanh nếu chưa cấu hình Firebase thực tế
const isFirestoreDummy =
  !db ||
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === 'dummy_api_key_for_ui_testing' ||
  firebaseConfig.apiKey === 'your_firebase_api_key_here';

async function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  if (isFirestoreDummy) {
    throw new Error('FIRESTORE_CONFIG_MISSING');
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
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function safeFirestoreWrite(writePromiseFactory: () => Promise<any>): Promise<void> {
  if (isFirestoreDummy) return;
  try {
    await withFirestoreTimeout(writePromiseFactory(), 10000);
  } catch (e) {
    console.warn('[AdminService] Firestore write error:', e);
    throw e;
  }
}

async function fetchCollectionData<T>(collectionName: string, queryLimit: number = 0): Promise<T[]> {
  if (isFirestoreDummy) return [];
  try {
    const colRef = collection(db, collectionName);
    const q = queryLimit > 0 ? query(colRef, limit(queryLimit)) : query(colRef);
    const snap = await withFirestoreTimeout(getDocs(q), 15000);
    const list: T[] = [];
    if (!snap.empty) {
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as unknown as T));
    }
    return list;
  } catch (e) {
    console.warn(`[AdminService] Firestore collection '${collectionName}' error/timeout:`, e);
    return [];
  }
}

export const adminService = {
  fetchCollectionData,

  async getSystemStats(): Promise<AdminSystemStats> {
    try {
      const allUsers = await fetchCollectionData<AdminUser>('users');
      const users = allUsers.filter(u => !u.isDeleted);
      const audits = await fetchCollectionData<AiEvaluationAudit>('ai_evaluation_audits');
      const stages = await fetchCollectionData<Stage>('stages');
      const milestones = await fetchCollectionData<Milestone>('milestones');
      const exams = await fetchCollectionData<JlptExam>('jlpt_exam_catalog');

      const totalAdmins = users.filter(u => u.role === 'ROLE_ADMIN').length;
      const totalLearners = users.filter(u => u.role !== 'ROLE_ADMIN').length;
      const pendingAudits = audits.filter(a => a.status === 'PENDING').length;

      return {
        totalLearners,
        totalAdmins,
        totalExamsAvailable: exams.length,
        totalStages: stages.length,
        totalMilestones: milestones.length,
        pendingAiAudits: pendingAudits,
        serverStatus: 'HEALTHY'
      };
    } catch (e) {
      console.error("Error fetching stats", e);
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

  async getUsers(): Promise<AdminUser[]> {
    const all = await fetchCollectionData<AdminUser>('users');
    if (all.length > 0) {
      return all.filter(u => !u.isDeleted);
    }
    try {
      const localReg: AdminUser[] = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
      return localReg.filter(u => !u.isDeleted);
    } catch {
      return [];
    }
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

    await safeFirestoreWrite(() => setDoc(doc(db, 'users', userId), newUser));
    return newUser;
  },

  async updateUser(userId: string, updates: Partial<AdminUser>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      delete payload.id;
      await safeFirestoreWrite(() => updateDoc(doc(db, 'users', userId), payload));
      return true;
    } catch (e) {
      console.error('Error updating user:', e);
      return false;
    }
  },

  async updateUserRole(userId: string, newRole: AdminRole): Promise<boolean> {
    return this.updateUser(userId, { role: newRole });
  },

  async updateUserStatus(userId: string, active: boolean): Promise<boolean> {
    return this.updateUser(userId, {
      status: active ? 'ACTIVE' : 'BANNED',
      enabled: active
    });
  },

  async softDeleteUser(userId: string): Promise<boolean> {
    return this.updateUser(userId, {
      isDeleted: true,
      status: 'DELETED',
      enabled: false
    });
  },

  async resetUserStreak(userId: string): Promise<boolean> {
    try {
      const ok = await this.updateUser(userId, { currentStreak: 0 });
      await safeFirestoreWrite(() =>
        updateDoc(doc(db, 'leaderboard', userId), {
          currentStreak: 0,
          updatedAt: new Date().toISOString()
        })
      );
      return ok;
    } catch {
      return false;
    }
  },

  async adjustUserActivePoints(userId: string, currentPoints: number, delta: number, reason?: string): Promise<number | null> {
    try {
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
      );
      return newPoints;
    } catch {
      return null;
    }
  },

  async getStudentDossier(user: AdminUser): Promise<StudentDossierData> {
    let progress: StudentDossierData['progress'] = null;
    let srsItems: StudentDossierData['srsItems'] = [];

    if (!isFirestoreDummy) {
      try {
        const progSnap = await withFirestoreTimeout(getDoc(doc(db, 'user_progress', user.id)), 8000);
        if (progSnap.exists()) {
          progress = progSnap.data() as StudentDossierData['progress'];
        }
      } catch {}

      try {
        const srsQuery = query(collection(db, 'user_srs_items'), where('userId', '==', user.id), limit(100));
        const srsSnap = await withFirestoreTimeout(getDocs(srsQuery), 8000);
        if (!srsSnap.empty) {
          srsSnap.forEach(d => srsItems.push({ id: d.id, ...d.data() }));
        }
      } catch {}
    }

    return {
      user,
      progress,
      srsItems
    };
  },

  async getAiAudits(): Promise<AiEvaluationAudit[]> {
    return await fetchCollectionData<AiEvaluationAudit>('ai_evaluation_audits');
  },

  async getStages(): Promise<Stage[]> {
    const list = await fetchCollectionData<Stage>('stages');
    return list.sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'stages', id), newStage));
    sessionStorage.removeItem('kizuna_stages_cache');
    return newStage;
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
      await safeFirestoreWrite(() => setDoc(doc(db, 'stages', stageId), payload, { merge: true }));
      sessionStorage.removeItem('kizuna_stages_cache');
      return true;
    } catch (e) {
      console.error('Error updating stage:', e);
      return false;
    }
  },

  async deleteStage(stageId: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'stages', stageId)));
      sessionStorage.removeItem('kizuna_stages_cache');
      return true;
    } catch (e) {
      console.error('Error deleting stage:', e);
      return false;
    }
  },

  async getMilestones(): Promise<Milestone[]> {
    const list = await fetchCollectionData<Milestone>('milestones');
    return list.sort((a, b) => ((a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0)));
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'milestones', id), newMilestone));
    return newMilestone;
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
      await safeFirestoreWrite(() => setDoc(doc(db, 'milestones', milestoneId), payload, { merge: true }));
      return true;
    } catch (e) {
      console.error('Error updating milestone:', e);
      return false;
    }
  },

  async deleteMilestone(milestoneId: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'milestones', milestoneId)));
      return true;
    } catch (e) {
      console.error('Error deleting milestone:', e);
      return false;
    }
  },

  async toggleMilestoneStatus(milestoneId: string, isActive: boolean): Promise<boolean> {
    return this.updateMilestone(milestoneId, { isActive, active: isActive });
  },

  async updateMilestoneGameplayConfig(
    milestoneId: string,
    config: { xpReward: number; activePointsReward: number; prerequisiteMilestoneId: string | null }
  ): Promise<boolean> {
    return this.updateMilestone(milestoneId, {
      xpReward: Number(config.xpReward),
      activePointsReward: Number(config.activePointsReward),
      prerequisiteMilestoneId: config.prerequisiteMilestoneId || null
    });
  },

  async getMilestoneQuests(milestoneId: string): Promise<MilestoneQuest[]> {
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
    const payload: MilestoneQuest = {
      ...quest,
      id,
      stepIndex: Number(quest.stepIndex || 1),
      xpReward: Number(quest.xpReward ?? 50),
      activePointsReward: Number(quest.activePointsReward ?? 25),
      updatedAt: new Date().toISOString()
    };
    await safeFirestoreWrite(() => setDoc(doc(db, 'milestone_quests', id), payload, { merge: true }));
    return payload;
  },

  async deleteMilestoneQuest(questId: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'milestone_quests', questId)));
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

    if (!isFirestoreDummy) {
      try {
        if (vocabList.length === 0) {
          const qV = query(collection(db, 'vocabulary_items'), where('milestoneId', '==', milestoneId));
          const sV = await withFirestoreTimeout(getDocs(qV), 10000);
          sV.forEach(d => vocabList.push({ id: d.id, ...d.data() }));
        }
        if (kanjiList.length === 0) {
          const qK = query(collection(db, 'kanji_dictionary'), where('milestoneId', '==', milestoneId));
          const sK = await withFirestoreTimeout(getDocs(qK), 10000);
          sK.forEach(d => kanjiList.push({ id: d.id, ...d.data() }));
        }
        if (grammarList.length === 0) {
          const qG = query(collection(db, 'grammar_items'), where('milestoneId', '==', milestoneId));
          const sG = await withFirestoreTimeout(getDocs(qG), 10000);
          sG.forEach(d => grammarList.push({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.warn('Error querying milestone whitelist:', e);
      }
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', id), newDoc));
    return newDoc;
  },

  async getVocabulary(): Promise<VocabularyItem[]> {
    return await fetchCollectionData<VocabularyItem>('vocabulary_items');
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', id), newDoc));
    return newDoc;
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
      await safeFirestoreWrite(() => setDoc(doc(db, 'vocabulary_items', id), payload, { merge: true }));
      return true;
    } catch (e) {
      console.error('Error updating vocabulary:', e);
      return false;
    }
  },

  async deleteVocabulary(id: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'vocabulary_items', id)));
      return true;
    } catch {
      return false;
    }
  },

  async getGrammar(): Promise<GrammarItem[]> {
    return await fetchCollectionData<GrammarItem>('grammar_items');
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'grammar_items', id), newDoc));
    return newDoc;
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
      await safeFirestoreWrite(() => setDoc(doc(db, 'grammar_items', id), payload, { merge: true }));
      return true;
    } catch (e) {
      console.error('Error updating grammar:', e);
      return false;
    }
  },

  async deleteGrammar(id: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'grammar_items', id)));
      return true;
    } catch {
      return false;
    }
  },

  async getKanji(): Promise<KanjiDictionary[]> {
    return await fetchCollectionData<KanjiDictionary>('kanji_dictionary');
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'kanji_dictionary', id), newDoc));
    return newDoc;
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
      await safeFirestoreWrite(() => setDoc(doc(db, 'kanji_dictionary', id), payload, { merge: true }));
      return true;
    } catch (e) {
      console.error('Error updating kanji:', e);
      return false;
    }
  },

  async deleteKanji(id: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'kanji_dictionary', id)));
      return true;
    } catch {
      return false;
    }
  },

  async getExams(): Promise<JlptExam[]> {
    return await fetchCollectionData<JlptExam>('jlpt_exam_catalog');
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
    await safeFirestoreWrite(() => setDoc(doc(db, 'jlpt_exam_catalog', id), newDoc));
    return newDoc;
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
      await safeFirestoreWrite(() => setDoc(doc(db, 'jlpt_exam_catalog', id), payload, { merge: true }));
      return true;
    } catch (e) {
      console.error('Error updating exam:', e);
      return false;
    }
  },

  async deleteExam(id: string): Promise<boolean> {
    try {
      await safeFirestoreWrite(() => deleteDoc(doc(db, 'jlpt_exam_catalog', id)));
      return true;
    } catch {
      return false;
    }
  },

  async reviewAiAudit(auditId: string, decision: 'APPROVED' | 'REJECTED'): Promise<boolean> {
    try {
      await safeFirestoreWrite(() =>
        updateDoc(doc(db, 'ai_evaluation_audits', auditId), {
          status: decision,
          reviewedAt: new Date().toISOString()
        })
      );
      return true;
    } catch {
      return false;
    }
  },

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

    // 1. Sắp xếp các cột mốc theo thứ tự Chặng -> Thứ tự Mốc
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

    // Map user_progress theo userId
    const progressByUser = new Map<string, any>();
    progressDocs.forEach(p => {
      const uid = p.userId || p.id;
      if (uid) progressByUser.set(uid, p);
    });

    // Tính toán phễu dựa trên 100% dữ liệu thực tế từ user_progress
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

    // 2. Thống kê SRS thực tế từ `user_srs_items` (CHỈ lấy dữ liệu đã có trong Firestore, KHÔNG dùng mock hay hash)
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

    // 3. Top Từ vựng "Tử thần" thực tế (CHỈ lấy các từ thực sự có trong Firestore và có lượt làm sai > 0)
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

    // 4. Top Kanji "Tử thần" thực tế (CHỈ lấy các chữ Hán thực sự có trong Firestore và có lượt làm sai > 0)
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
