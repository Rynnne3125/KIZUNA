import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProgressData } from '../types/progress';
import { getLocalDateString, evaluateDailyStreak } from './authService';
import { getCurrentIsoWeekKey } from './dailyQuestService';
import { networkService } from './networkService';

export interface UserExamResult {
  userId: string;
  examId: string;
  examLabel: string;
  level: string;
  score: number;
  total: number;
  percentage: number;
  isPassed: boolean;
  timeSpentSeconds: number;
  answeredCount: number;
  totalQuestions: number;
  completedAt: string;
  userAnswers: Record<string, string>;
}

export interface OfflineSyncItem {
  id: string;
  type: 'vocab' | 'kanji' | 'grammar' | 'exam' | 'roadmap';
  amount: number;
  activePointsEarned: number;
  xpEarned?: number;
  createdAt: string;
}

export interface UserRoadmapProgress {
  userId: string;
  completedMilestones: string[];
  completedQuests: Record<string, number[]>;
  readingCompleted: string[];
  currentStageId?: string;
  currentMilestoneId?: string;
  lastStudiedAt?: string;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function withProgressTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Progress Firestore timeout')), ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

function isOfflineNow(): boolean {
  return networkService.isCurrentlyOffline();
}

const OFFLINE_PROGRESS_KEY = (userId: string) => `kizuna_offline_progress_${userId}`;
const SYNC_QUEUE_KEY = (userId: string) => `kizuna_offline_sync_queue_${userId}`;
const ROADMAP_OFFLINE_KEY = (userId: string) => `kizuna_roadmap_progress_offline_${userId}`;
const ROADMAP_DIRTY_KEY = (userId: string) => `kizuna_roadmap_dirty_${userId}`;
const EXAM_QUEUE_KEY = (userId: string) => `kizuna_exam_sync_queue_${userId}`;
const PROGRESS_PATCH_DIRTY_KEY = (userId: string) => `kizuna_user_progress_dirty_${userId}`;
const ARRAYS_DIRTY_KEY = (userId: string) => `kizuna_progress_arrays_dirty_${userId}`;

const VOCAB_UNITS_KEY = (userId: string) => `kizuna_vocab_completed_units_${userId}`;
const VOCAB_MODES_KEY = (userId: string) => `kizuna_vocab_completed_modes_${userId}`;
const VOCAB_LEARNED_IDS_KEY = (userId: string) => `kizuna_vocab_learned_ids_${userId}`;
const GRAMMAR_UNITS_KEY = (userId: string) => `kizuna_grammar_completed_units_${userId}`;
const GRAMMAR_MODES_KEY = (userId: string) => `kizuna_grammar_completed_modes_${userId}`;
const GRAMMAR_LEARNED_IDS_KEY = (userId: string) => `kizuna_grammar_learned_ids_${userId}`;
const KANJI_LEARNED_IDS_KEY = (userId: string) => `kizuna_kanji_learned_ids_${userId}`;
const KANJI_EXERCISES_KEY = (userId: string) => `kizuna_kanji_completed_exercises_${userId}`;

function readStringArray(key: string): string[] {
  try {
    return safeJsonParse<string[]>(localStorage.getItem(key), []);
  } catch {
    return [];
  }
}

function writeStringArray(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(items))));
  } catch {}
}

function mergeStringArray(key: string, remoteItems?: unknown): string[] {
  const localItems = readStringArray(key);
  if (!Array.isArray(remoteItems)) return localItems;
  const merged = Array.from(new Set([...localItems, ...remoteItems.map(String)]));
  writeStringArray(key, merged);
  return merged;
}

function syncUserToRegisteredCache(updatedUser: any): void {
  try {
    const regRaw = localStorage.getItem('kizuna_registered_users');
    if (!regRaw || !updatedUser) return;
    const regUsers = safeJsonParse<any[]>(regRaw, []);
    const idx = regUsers.findIndex(
      (u: any) =>
        u.id === updatedUser.id ||
        (u.email && updatedUser.email && u.email.toLowerCase() === updatedUser.email.toLowerCase())
    );
    if (idx >= 0) {
      regUsers[idx] = {
        ...regUsers[idx],
        activePoints: updatedUser.activePoints,
        totalXp: updatedUser.totalXp,
        currentStreak: updatedUser.currentStreak,
        streakFreezes: updatedUser.streakFreezes,
        weeklyActivePoints: updatedUser.weeklyActivePoints,
        weeklyPointsWeek: updatedUser.weeklyPointsWeek,
        weeklyXp: updatedUser.weeklyXp,
        weeklyXpWeek: updatedUser.weeklyXpWeek,
        lastActiveDate: updatedUser.lastActiveDate,
        lastStudiedAt: updatedUser.lastStudiedAt
      };
      localStorage.setItem('kizuna_registered_users', JSON.stringify(regUsers));
    }
  } catch {}
}

export const progressService = {
  /**
   * Đếm số lượng thay đổi đang chờ đồng bộ lên Firestore khi mất mạng
   */
  getPendingSyncCount(userId: string): number {
    if (!userId) return 0;
    let count = 0;
    try {
      const q = safeJsonParse<OfflineSyncItem[]>(localStorage.getItem(SYNC_QUEUE_KEY(userId)), []);
      count += q.length;
      if (localStorage.getItem(ROADMAP_DIRTY_KEY(userId))) count += 1;
      const eq = safeJsonParse<string[]>(localStorage.getItem(EXAM_QUEUE_KEY(userId)), []);
      count += eq.length;
      if (localStorage.getItem(PROGRESS_PATCH_DIRTY_KEY(userId))) count += 1;
      if (localStorage.getItem(ARRAYS_DIRTY_KEY(userId))) count += 1;
      if (localStorage.getItem(`kizuna_pending_shield_sync_${userId}`)) count += 1;
      const dq = safeJsonParse<string[]>(localStorage.getItem(`kizuna_pending_daily_quest_sync_${userId}`), []);
      count += dq.length;
    } catch {}
    return count;
  },

  /**
   * Lấy tiến trình học tập chuẩn thực tế của user từ Firestore (có lưu dự phòng Offline vào localStorage)
   */
  async getUserProgress(userId: string): Promise<UserProgressData | null> {
    if (!userId) return null;
    const CACHE_KEY = `kizuna_user_progress_${userId}`;
    const OFFLINE_KEY = OFFLINE_PROGRESS_KEY(userId);

    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = safeJsonParse<{ data: UserProgressData; exp: number } | null>(raw, null);
        if (parsed && Date.now() < parsed.exp) return parsed.data;
      }
    } catch {}

    const readLocalFallback = (): UserProgressData | null => {
      try {
        const offlineRaw = localStorage.getItem(OFFLINE_KEY);
        const parsedOffline = safeJsonParse<UserProgressData | null>(offlineRaw, null);
        if (parsedOffline) return parsedOffline;
      } catch {}
      return null;
    };

    if (isOfflineNow() || !db) {
      return (
        readLocalFallback() || {
          userId,
          stageCompletionPercentage: 0,
          vocabLearned: 0,
          kanjiLearned: 0,
          grammarLearned: 0,
          examsCompleted: 0,
        }
      );
    }

    try {
      const snap = await withProgressTimeout(getDoc(doc(db, 'user_progress', userId)));
      if (snap.exists()) {
        const data = snap.data() as any;

        // Hợp nhất các mảng tiến độ học tập từ Firestore về localStorage
        mergeStringArray(VOCAB_UNITS_KEY(userId), data.completedVocabUnits);
        mergeStringArray(VOCAB_MODES_KEY(userId), data.completedVocabModes);
        mergeStringArray(VOCAB_LEARNED_IDS_KEY(userId), data.learnedVocabIds);
        mergeStringArray(GRAMMAR_UNITS_KEY(userId), data.completedGrammarUnits);
        mergeStringArray(GRAMMAR_MODES_KEY(userId), data.completedGrammarModes);
        mergeStringArray(GRAMMAR_LEARNED_IDS_KEY(userId), data.learnedGrammarIds);
        mergeStringArray(KANJI_LEARNED_IDS_KEY(userId), data.learnedKanjiIds);
        mergeStringArray(KANJI_EXERCISES_KEY(userId), data.completedKanjiExercises);

        const localCached = readLocalFallback();
        const hasPendingQueue = safeJsonParse<OfflineSyncItem[]>(localStorage.getItem(SYNC_QUEUE_KEY(userId)), []).length > 0;

        const result: UserProgressData = {
          userId,
          currentStageId: data.currentStageId ?? localCached?.currentStageId,
          currentStageTitle: data.currentStageTitle ?? localCached?.currentStageTitle,
          currentMilestoneId: data.currentMilestoneId ?? localCached?.currentMilestoneId,
          currentMilestoneTitle: data.currentMilestoneTitle ?? localCached?.currentMilestoneTitle,
          currentMilestoneContext: data.currentMilestoneContext ?? localCached?.currentMilestoneContext,
          stageCompletionPercentage: typeof data.stageCompletionPercentage === 'number' ? data.stageCompletionPercentage : 0,
          vocabLearned: hasPendingQueue
            ? Math.max(typeof data.vocabLearned === 'number' ? data.vocabLearned : 0, localCached?.vocabLearned || 0)
            : (typeof data.vocabLearned === 'number' ? data.vocabLearned : 0),
          kanjiLearned: hasPendingQueue
            ? Math.max(typeof data.kanjiLearned === 'number' ? data.kanjiLearned : 0, localCached?.kanjiLearned || 0)
            : (typeof data.kanjiLearned === 'number' ? data.kanjiLearned : 0),
          grammarLearned: hasPendingQueue
            ? Math.max(typeof data.grammarLearned === 'number' ? data.grammarLearned : 0, localCached?.grammarLearned || 0)
            : (typeof data.grammarLearned === 'number' ? data.grammarLearned : 0),
          examsCompleted: hasPendingQueue
            ? Math.max(typeof data.examsCompleted === 'number' ? data.examsCompleted : 0, localCached?.examsCompleted || 0)
            : (typeof data.examsCompleted === 'number' ? data.examsCompleted : 0),
          lastStudiedAt: data.lastStudiedAt ?? localCached?.lastStudiedAt
        };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, exp: Date.now() + 10 * 60 * 1000 }));
          localStorage.setItem(OFFLINE_KEY, JSON.stringify(result));
        } catch {}
        return result;
      }
    } catch (e) {
      console.warn('[Progress] Lỗi lấy tiến độ từ Firestore, dùng bản lưu Offline:', e);
    }

    return readLocalFallback();
  },

  /**
   * Lưu hoặc cập nhật tiến trình học tập của user lên LocalStorage và Firestore (xếp hàng đợi nếu offline)
   */
  async saveUserProgress(userId: string, data: Partial<UserProgressData>): Promise<void> {
    if (!userId) return;
    const OFFLINE_KEY = OFFLINE_PROGRESS_KEY(userId);
    const nowIso = new Date().toISOString();
    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);
      const prevRaw = localStorage.getItem(OFFLINE_KEY);
      const prev: Partial<UserProgressData> = safeJsonParse<Partial<UserProgressData>>(prevRaw, { userId });
      const merged = {
        ...prev,
        ...data,
        userId,
        lastStudiedAt: nowIso
      };
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(merged));
    } catch {}

    const markProgressPatchDirty = () => {
      try {
        const prevDirty = safeJsonParse<Record<string, any>>(localStorage.getItem(PROGRESS_PATCH_DIRTY_KEY(userId)), {});
        localStorage.setItem(PROGRESS_PATCH_DIRTY_KEY(userId), JSON.stringify({
          ...prevDirty,
          ...data,
          userId,
          lastStudiedAt: nowIso
        }));
      } catch {}
    };

    if (!db || isOfflineNow()) {
      markProgressPatchDirty();
      return;
    }

    try {
      const ref = doc(db, 'user_progress', userId);
      await withProgressTimeout(setDoc(ref, {
        ...data,
        userId,
        lastStudiedAt: nowIso
      }, { merge: true }));
    } catch (e) {
      console.warn('[Progress] Lỗi cập nhật tiến trình lên Firestore, đã xếp vào hàng đợi:', e);
      markProgressPatchDirty();
    }
  },

  /**
   * Đồng bộ các mảng tiến độ học tập (từ vựng/ngữ pháp/kanji đã học) lên Firestore
   */
  async syncLearnedArraysToFirestore(userId: string): Promise<boolean> {
    if (!userId) return false;
    const payload = {
      userId,
      completedVocabUnits: readStringArray(VOCAB_UNITS_KEY(userId)),
      completedVocabModes: readStringArray(VOCAB_MODES_KEY(userId)),
      learnedVocabIds: readStringArray(VOCAB_LEARNED_IDS_KEY(userId)),
      completedGrammarUnits: readStringArray(GRAMMAR_UNITS_KEY(userId)),
      completedGrammarModes: readStringArray(GRAMMAR_MODES_KEY(userId)),
      learnedGrammarIds: readStringArray(GRAMMAR_LEARNED_IDS_KEY(userId)),
      learnedKanjiIds: readStringArray(KANJI_LEARNED_IDS_KEY(userId)),
      completedKanjiExercises: readStringArray(KANJI_EXERCISES_KEY(userId)),
      lastStudiedAt: new Date().toISOString()
    };

    if (!db || isOfflineNow()) {
      try {
        localStorage.setItem(ARRAYS_DIRTY_KEY(userId), '1');
      } catch {}
      return false;
    }

    try {
      await withProgressTimeout(setDoc(doc(db, 'user_progress', userId), payload, { merge: true }));
      localStorage.removeItem(ARRAYS_DIRTY_KEY(userId));
      return true;
    } catch {
      try {
        localStorage.setItem(ARRAYS_DIRTY_KEY(userId), '1');
      } catch {}
      return false;
    }
  },

  /**
   * Ghi nhận khi có sự thay đổi trong progress (từ vựng, chữ hán, ngữ pháp, lộ trình, đề thi...)
   * Tự động cộng điểm năng động (activePoints), XP và tính chuỗi ngày học Streak theo ngày thực tế.
   */
  async recordActivity(
    userId: string,
    type: 'vocab' | 'kanji' | 'grammar' | 'exam' | 'roadmap',
    amount = 1,
    activePointsEarned = 10,
    xpEarned?: number
  ): Promise<void> {
    if (!userId) return;
    const OFFLINE_KEY = OFFLINE_PROGRESS_KEY(userId);
    const QUEUE_KEY = SYNC_QUEUE_KEY(userId);
    const fieldMap: Record<string, string> = {
      vocab: 'vocabLearned',
      kanji: 'kanjiLearned',
      grammar: 'grammarLearned',
      exam: 'examsCompleted',
      roadmap: 'milestonesCompleted'
    };
    const targetField = fieldMap[type] || 'activitiesCompleted';

    const finalXp = typeof xpEarned === 'number' ? xpEarned : activePointsEarned * 2;
    const todayStr = getLocalDateString(new Date());
    const currentWeekKey = getCurrentIsoWeekKey(new Date());
    let currentStreak = 0;
    let nextWeeklyPoints = activePointsEarned;
    let nextWeeklyXp = finalXp;
    let nextStreakFreezes: number | undefined;
    const nowIso = new Date().toISOString();

    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);
      sessionStorage.removeItem(`kizuna_leaderboard_cache_weekly_${currentWeekKey}`);
      sessionStorage.removeItem(`kizuna_leaderboard_cache_all_time_${currentWeekKey}`);

      // 1. Cập nhật session user trong localStorage để thanh header nhảy điểm & streak ngay (kể cả khi Offline)
      const userRaw = localStorage.getItem('kizuna_user');
      if (userRaw) {
        const u = safeJsonParse<any>(userRaw, null);
        if (u && u.id === userId) {
          u.activePoints = (u.activePoints || 0) + activePointsEarned;
          u.totalXp = (u.totalXp || 0) + finalXp;
          if (u.weeklyPointsWeek === currentWeekKey) {
            u.weeklyActivePoints = (u.weeklyActivePoints || 0) + activePointsEarned;
          } else {
            u.weeklyPointsWeek = currentWeekKey;
            u.weeklyActivePoints = activePointsEarned;
          }
          if (u.weeklyXpWeek === currentWeekKey) {
            u.weeklyXp = (u.weeklyXp || 0) + finalXp;
          } else {
            u.weeklyXpWeek = currentWeekKey;
            u.weeklyXp = finalXp;
          }
          nextWeeklyPoints = u.weeklyActivePoints;
          nextWeeklyXp = u.weeklyXp;

          const streakEval = evaluateDailyStreak(
            u.currentStreak,
            u.lastActiveDate,
            new Date(),
            u.streakFreezes || 0
          );
          if (streakEval.streakUpdated) {
            u.currentStreak = streakEval.newStreak;
            u.lastActiveDate = streakEval.todayStr;
            if (streakEval.shieldUsed) {
              u.streakFreezes = streakEval.remainingFreezes ?? Math.max(0, (u.streakFreezes || 0) - 1);
              nextStreakFreezes = u.streakFreezes;
            }
            if (typeof window !== 'undefined' && (streakEval.isConsecutive || streakEval.newStreak === 1)) {
              window.dispatchEvent(new CustomEvent('kizuna_streak_increased', {
                detail: { newStreak: streakEval.newStreak, message: streakEval.message }
              }));
            }
          }
          currentStreak = u.currentStreak || 1;
          u.lastActiveDate = u.lastActiveDate || todayStr;
          u.lastStudiedAt = nowIso;
          localStorage.setItem('kizuna_user', JSON.stringify(u));
          syncUserToRegisteredCache(u);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kizuna_user_updated', { detail: { user: u, evaluation: streakEval } }));
          }
        }
      }

      // 2. Cập nhật tiến độ Offline trong localStorage
      if (amount > 0) {
        const prevRaw = localStorage.getItem(OFFLINE_KEY);
        const prev: Record<string, any> = safeJsonParse<Record<string, any>>(prevRaw, {
          userId,
          stageCompletionPercentage: 0,
          vocabLearned: 0,
          kanjiLearned: 0,
          grammarLearned: 0,
          examsCompleted: 0,
        });
        prev[targetField] = (Number(prev[targetField]) || 0) + amount;
        prev.lastStudiedAt = nowIso;
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(prev));
      }
    } catch {}

    const enqueueForLaterSync = () => {
      try {
        const rawQ = localStorage.getItem(QUEUE_KEY);
        const queue: OfflineSyncItem[] = safeJsonParse<OfflineSyncItem[]>(rawQ, []);
        queue.push({
          id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type,
          amount,
          activePointsEarned,
          xpEarned: finalXp,
          createdAt: nowIso
        });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      } catch {}
    };

    if (!db || isOfflineNow()) {
      enqueueForLaterSync();
      return;
    }

    try {
      const progressRef = doc(db, 'user_progress', userId);
      const progressPayload: Record<string, any> = {
        userId,
        lastStudiedAt: nowIso
      };
      if (amount > 0) {
        progressPayload[targetField] = increment(amount);
      }
      await withProgressTimeout(setDoc(progressRef, progressPayload, { merge: true }));

      const userRef = doc(db, 'users', userId);
      const updatePayload: any = {
        activePoints: increment(activePointsEarned),
        totalXp: increment(finalXp),
        weeklyActivePoints: nextWeeklyPoints,
        weeklyPointsWeek: currentWeekKey,
        weeklyXp: nextWeeklyXp,
        weeklyXpWeek: currentWeekKey,
        lastStudiedAt: nowIso,
        lastActiveDate: todayStr
      };
      if (typeof nextStreakFreezes === 'number') {
        updatePayload.streakFreezes = nextStreakFreezes;
      }
      if (currentStreak > 0) {
        updatePayload.currentStreak = currentStreak;
      }
      await withProgressTimeout(updateDoc(userRef, updatePayload).catch(async () => {
        await setDoc(userRef, updatePayload, { merge: true });
      }));

      if (currentStreak > 0) {
        updateDoc(doc(db, 'leaderboard', userId), {
          currentStreak,
          updatedAt: nowIso
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[Progress] Không thể đồng bộ ngay lên Firestore, đã xếp vào hàng đợi Offline:', e);
      enqueueForLaterSync();
    }
  },

  /**
   * Đồng bộ toàn bộ hàng đợi học tập Offline (hoạt động, lộ trình, đề thi, danh sách từ/kanji/ngữ pháp đã học, streak) lên Firestore khi có mạng lại
   */
  async syncOfflineQueue(userId: string): Promise<number> {
    if (!userId || !db || isOfflineNow()) return 0;
    let totalSynced = 0;

    // 1. Đồng bộ hàng đợi hoạt động (vocab, kanji, grammar, exam, roadmap + AP/XP + Streak)
    const QUEUE_KEY = SYNC_QUEUE_KEY(userId);
    const queue = safeJsonParse<OfflineSyncItem[]>(localStorage.getItem(QUEUE_KEY), []);
    if (queue.length > 0) {
      const totals: Record<string, number> = {
        vocab: 0,
        kanji: 0,
        grammar: 0,
        exam: 0,
        roadmap: 0,
        points: 0,
        xp: 0
      };
      for (const item of queue) {
        if (totals[item.type] !== undefined) totals[item.type] += item.amount || 0;
        totals.points += item.activePointsEarned || 0;
        totals.xp += typeof item.xpEarned === 'number' ? item.xpEarned : (item.activePointsEarned || 0) * 2;
      }

      try {
        const nowIso = new Date().toISOString();
        const progressRef = doc(db, 'user_progress', userId);
        const progressUpdate: Record<string, any> = {
          userId,
          lastStudiedAt: nowIso
        };
        if (totals.vocab > 0) progressUpdate.vocabLearned = increment(totals.vocab);
        if (totals.kanji > 0) progressUpdate.kanjiLearned = increment(totals.kanji);
        if (totals.grammar > 0) progressUpdate.grammarLearned = increment(totals.grammar);
        if (totals.exam > 0) progressUpdate.examsCompleted = increment(totals.exam);
        if (totals.roadmap > 0) progressUpdate.milestonesCompleted = increment(totals.roadmap);

        await withProgressTimeout(setDoc(progressRef, progressUpdate, { merge: true }));

        const userRef = doc(db, 'users', userId);
        const userPatch: Record<string, any> = {
          lastStudiedAt: nowIso
        };
        if (totals.points > 0) userPatch.activePoints = increment(totals.points);
        if (totals.xp > 0) userPatch.totalXp = increment(totals.xp);

        try {
          const u = safeJsonParse<any>(localStorage.getItem('kizuna_user'), null);
          if (u && u.id === userId) {
            if (typeof u.currentStreak === 'number' && u.currentStreak > 0) {
              userPatch.currentStreak = u.currentStreak;
            }
            if (u.lastActiveDate) userPatch.lastActiveDate = u.lastActiveDate;
            if (typeof u.streakFreezes === 'number') userPatch.streakFreezes = u.streakFreezes;
            if (u.weeklyPointsWeek) {
              userPatch.weeklyPointsWeek = u.weeklyPointsWeek;
              userPatch.weeklyActivePoints = u.weeklyActivePoints || 0;
            }
            if (u.weeklyXpWeek) {
              userPatch.weeklyXpWeek = u.weeklyXpWeek;
              userPatch.weeklyXp = u.weeklyXp || 0;
            }
          }
        } catch {}

        await withProgressTimeout(setDoc(userRef, userPatch, { merge: true }));

        if (typeof userPatch.currentStreak === 'number') {
          updateDoc(doc(db, 'leaderboard', userId), {
            currentStreak: userPatch.currentStreak,
            updatedAt: nowIso
          }).catch(() => {});
        }

        localStorage.removeItem(QUEUE_KEY);
        totalSynced += queue.length;
      } catch (e) {
        console.warn('[Progress] Đồng bộ hàng đợi hoạt động Offline thất bại, sẽ thử lại sau:', e);
      }
    }

    // 2. Đồng bộ tiến trình Lộ trình (completedQuests, readingCompleted, completedMilestones) nếu có sửa đổi khi offline
    if (localStorage.getItem(ROADMAP_DIRTY_KEY(userId))) {
      try {
        const localRoadmap = safeJsonParse<UserRoadmapProgress | null>(
          localStorage.getItem(ROADMAP_OFFLINE_KEY(userId)),
          null
        );
        if (localRoadmap) {
          let merged = localRoadmap;
          try {
            const snap = await withProgressTimeout(getDoc(doc(db, 'user_progress', userId)), 3000);
            if (snap.exists()) {
              const d = snap.data();
              const remote: UserRoadmapProgress = {
                userId,
                completedMilestones: Array.isArray(d?.completedMilestones) ? d.completedMilestones : [],
                completedQuests: (typeof d?.completedQuests === 'object' && d?.completedQuests !== null) ? d.completedQuests : {},
                readingCompleted: Array.isArray(d?.readingCompleted) ? d.readingCompleted : [],
              };
              const mergedCompleted = Array.from(new Set([...(remote.completedMilestones || []), ...(localRoadmap.completedMilestones || [])]));
              const mergedReading = Array.from(new Set([...(remote.readingCompleted || []), ...(localRoadmap.readingCompleted || [])]));
              const mergedQuests: Record<string, number[]> = { ...(remote.completedQuests || {}) };
              for (const [mId, list] of Object.entries(localRoadmap.completedQuests || {})) {
                const combined = Array.from(new Set([...(mergedQuests[mId] || []), ...(Array.isArray(list) ? list : [])])).sort((a, b) => a - b);
                mergedQuests[mId] = combined;
                if ([1, 2, 3, 4].every(idx => combined.includes(idx)) && !mergedCompleted.includes(mId)) {
                  mergedCompleted.push(mId);
                }
              }
              merged = {
                ...localRoadmap,
                completedMilestones: mergedCompleted,
                completedQuests: mergedQuests,
                readingCompleted: mergedReading
              };
            }
          } catch {}

          await withProgressTimeout(setDoc(doc(db, 'user_progress', userId), {
            userId,
            completedQuests: merged.completedQuests,
            completedMilestones: merged.completedMilestones,
            readingCompleted: merged.readingCompleted,
            lastStudiedAt: merged.lastStudiedAt || new Date().toISOString()
          }, { merge: true }));

          localStorage.setItem(ROADMAP_OFFLINE_KEY(userId), JSON.stringify(merged));
          localStorage.removeItem(ROADMAP_DIRTY_KEY(userId));
          totalSynced += 1;
        }
      } catch (e) {
        console.warn('[Progress] Đồng bộ Roadmap Offline thất bại:', e);
      }
    }

    // 3. Đồng bộ các bài thi JLPT / Choukai làm khi offline
    const pendingExamIds = readStringArray(EXAM_QUEUE_KEY(userId));
    if (pendingExamIds.length > 0) {
      const allLocalExams = safeJsonParse<Record<string, UserExamResult>>(
        localStorage.getItem(`kizuna_exam_results_${userId}`),
        {}
      );
      const remainingExamIds: string[] = [];
      for (const examId of pendingExamIds) {
        const examRes = allLocalExams[examId];
        if (!examRes) continue;
        try {
          await withProgressTimeout(setDoc(doc(db, 'user_exam_results', `${userId}_${examId}`), examRes, { merge: true }));
          totalSynced += 1;
        } catch {
          remainingExamIds.push(examId);
        }
      }
      if (remainingExamIds.length === 0) {
        localStorage.removeItem(EXAM_QUEUE_KEY(userId));
      } else {
        writeStringArray(EXAM_QUEUE_KEY(userId), remainingExamIds);
      }
    }

    // 4. Đồng bộ các bản vá tiến độ trực tiếp (saveUserProgress)
    const dirtyPatchRaw = localStorage.getItem(PROGRESS_PATCH_DIRTY_KEY(userId));
    if (dirtyPatchRaw) {
      try {
        const patch = JSON.parse(dirtyPatchRaw);
        await withProgressTimeout(setDoc(doc(db, 'user_progress', userId), patch, { merge: true }));
        localStorage.removeItem(PROGRESS_PATCH_DIRTY_KEY(userId));
        totalSynced += 1;
      } catch {}
    }

    // 5. Đồng bộ mảng bài học / từ vựng / kanji / ngữ pháp đã thuộc
    if (localStorage.getItem(ARRAYS_DIRTY_KEY(userId))) {
      const ok = await this.syncLearnedArraysToFirestore(userId);
      if (ok) totalSynced += 1;
    }

    return totalSynced;
  },

  /**
   * Lấy tiến trình lộ trình chi tiết của người học từ Firestore collection 'user_progress'
   */
  async getUserRoadmapProgress(userId: string): Promise<UserRoadmapProgress> {
    const fallbackProgress: UserRoadmapProgress = {
      userId,
      completedMilestones: [],
      completedQuests: {},
      readingCompleted: [],
      currentStageId: 'stage_n5_1',
      currentMilestoneId: 'ms_minna_b01'
    };
    if (!userId) return fallbackProgress;

    const CACHE_KEY = `kizuna_roadmap_progress_${userId}`;
    const OFFLINE_KEY = ROADMAP_OFFLINE_KEY(userId);

    let localSaved: UserRoadmapProgress | null = null;
    try {
      const offlineRaw = localStorage.getItem(OFFLINE_KEY);
      localSaved = safeJsonParse<UserRoadmapProgress | null>(offlineRaw, null);
    } catch {}

    const mergeProgress = (a: UserRoadmapProgress, b: UserRoadmapProgress | null): UserRoadmapProgress => {
      if (!b) return a;
      const mergedCompleted = Array.from(new Set([...(a.completedMilestones || []), ...(b.completedMilestones || [])]));
      const mergedReading = Array.from(new Set([...(a.readingCompleted || []), ...(b.readingCompleted || [])]));
      const mergedQuests: Record<string, number[]> = { ...(a.completedQuests || {}) };
      for (const [mId, list] of Object.entries(b.completedQuests || {})) {
        const combined = Array.from(new Set([...(mergedQuests[mId] || []), ...(Array.isArray(list) ? list : [])])).sort((x, y) => x - y);
        mergedQuests[mId] = combined;
        if ([1, 2, 3, 4].every(idx => combined.includes(idx)) && !mergedCompleted.includes(mId)) {
          mergedCompleted.push(mId);
        }
      }
      return {
        ...a,
        completedMilestones: mergedCompleted,
        completedQuests: mergedQuests,
        readingCompleted: mergedReading
      };
    };

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = safeJsonParse<{ data: UserRoadmapProgress; exp: number } | null>(cached, null);
        if (parsed && Date.now() < parsed.exp) return mergeProgress(parsed.data, localSaved);
      }
    } catch {}

    if (!db || isOfflineNow()) {
      return localSaved ? mergeProgress(fallbackProgress, localSaved) : fallbackProgress;
    }

    try {
      const snap = await withProgressTimeout(getDoc(doc(db, 'user_progress', userId)), 3000);
      if (snap.exists()) {
        const d = snap.data();
        const remote: UserRoadmapProgress = {
          userId,
          completedMilestones: Array.isArray(d?.completedMilestones) ? d.completedMilestones : [],
          completedQuests: (typeof d?.completedQuests === 'object' && d?.completedQuests !== null) ? d.completedQuests : {},
          readingCompleted: Array.isArray(d?.readingCompleted) ? d.readingCompleted : [],
          currentStageId: d?.currentStageId || 'stage_n5_1',
          currentMilestoneId: d?.currentMilestoneId || 'ms_minna_b01',
          lastStudiedAt: d?.lastStudiedAt
        };
        const merged = mergeProgress(remote, localSaved);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: merged, exp: Date.now() + 5 * 60 * 1000 }));
          localStorage.setItem(OFFLINE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } catch (e) {
      console.warn('[Progress] Lỗi lấy roadmap progress từ Firestore:', e);
    }
    return localSaved ? mergeProgress(fallbackProgress, localSaved) : fallbackProgress;
  },

  /**
   * Lưu tiến độ hoàn thành một Quest trong Mốc lên Firestore (hỗ trợ Offline + xếp hàng đồng bộ)
   */
  async saveQuestProgress(
    userId: string,
    milestoneId: string,
    questStepIndex: number,
    xpReward = 30,
    activePointsReward = 15
  ): Promise<UserRoadmapProgress> {
    const current = await this.getUserRoadmapProgress(userId);
    const existingQuestsForMilestone = current.completedQuests[milestoneId] || [];
    const isNewCompletion = !existingQuestsForMilestone.includes(questStepIndex);

    const updatedQuestsForMilestone = isNewCompletion
      ? [...existingQuestsForMilestone, questStepIndex].sort((a, b) => a - b)
      : existingQuestsForMilestone;

    const updatedCompletedQuests = {
      ...current.completedQuests,
      [milestoneId]: updatedQuestsForMilestone
    };

    const hasFinishedAllQuests = [1, 2, 3, 4].every(idx => updatedQuestsForMilestone.includes(idx));
    const updatedCompletedMilestones = [...current.completedMilestones];
    if (hasFinishedAllQuests && !updatedCompletedMilestones.includes(milestoneId)) {
      updatedCompletedMilestones.push(milestoneId);
    }

    const updated: UserRoadmapProgress = {
      ...current,
      completedQuests: updatedCompletedQuests,
      completedMilestones: updatedCompletedMilestones,
      lastStudiedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(`kizuna_roadmap_progress_${userId}`, JSON.stringify({ data: updated, exp: Date.now() + 5 * 60 * 1000 }));
      localStorage.setItem(ROADMAP_OFFLINE_KEY(userId), JSON.stringify(updated));
    } catch {}

    if (isNewCompletion) {
      if (db && !isOfflineNow()) {
        try {
          const ref = doc(db, 'user_progress', userId);
          await withProgressTimeout(setDoc(ref, {
            userId,
            completedQuests: updatedCompletedQuests,
            completedMilestones: updatedCompletedMilestones,
            lastStudiedAt: updated.lastStudiedAt
          }, { merge: true }));
        } catch (e) {
          console.warn('[Progress] Lỗi cập nhật quest progress lên Firestore, xếp hàng chờ đồng bộ:', e);
          try { localStorage.setItem(ROADMAP_DIRTY_KEY(userId), '1'); } catch {}
        }
      } else {
        try { localStorage.setItem(ROADMAP_DIRTY_KEY(userId), '1'); } catch {}
      }

      // Chỉ cộng điểm & Streak khi progress thực sự thay đổi (hoàn thành quest mới)
      await this.recordActivity(userId, 'roadmap', 1, activePointsReward, xpReward);
    }

    return updated;
  },

  /**
   * Lưu tiến độ hoàn thành bài Đọc hiểu trong Mốc lên Firestore (hỗ trợ Offline + xếp hàng đồng bộ)
   */
  async saveReadingProgress(
    userId: string,
    milestoneId: string,
    xpReward = 25,
    activePointsReward = 15
  ): Promise<UserRoadmapProgress> {
    const current = await this.getUserRoadmapProgress(userId);
    const isNewCompletion = !current.readingCompleted.includes(milestoneId);

    const updatedReadingCompleted = isNewCompletion
      ? [...current.readingCompleted, milestoneId]
      : current.readingCompleted;

    const questsForMilestone = current.completedQuests[milestoneId] || [];
    const hasFinishedAllQuests = [1, 2, 3, 4].every(idx => questsForMilestone.includes(idx));

    const updatedCompletedMilestones = [...current.completedMilestones];
    if (hasFinishedAllQuests && !updatedCompletedMilestones.includes(milestoneId)) {
      updatedCompletedMilestones.push(milestoneId);
    }

    const updated: UserRoadmapProgress = {
      ...current,
      readingCompleted: updatedReadingCompleted,
      completedMilestones: updatedCompletedMilestones,
      lastStudiedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(`kizuna_roadmap_progress_${userId}`, JSON.stringify({ data: updated, exp: Date.now() + 5 * 60 * 1000 }));
      localStorage.setItem(ROADMAP_OFFLINE_KEY(userId), JSON.stringify(updated));
    } catch {}

    if (isNewCompletion) {
      if (db && !isOfflineNow()) {
        try {
          const ref = doc(db, 'user_progress', userId);
          await withProgressTimeout(setDoc(ref, {
            userId,
            readingCompleted: updatedReadingCompleted,
            completedMilestones: updatedCompletedMilestones,
            lastStudiedAt: updated.lastStudiedAt
          }, { merge: true }));
        } catch (e) {
          console.warn('[Progress] Lỗi cập nhật reading progress lên Firestore, xếp hàng chờ đồng bộ:', e);
          try { localStorage.setItem(ROADMAP_DIRTY_KEY(userId), '1'); } catch {}
        }
      } else {
        try { localStorage.setItem(ROADMAP_DIRTY_KEY(userId), '1'); } catch {}
      }

      await this.recordActivity(userId, 'roadmap', 1, activePointsReward, xpReward);
    }

    return updated;
  },

  /**
   * Lưu kết quả thi thử JLPT của người dùng (vào LocalStorage và Firestore / hàng đợi Offline)
   */
  async saveExamResult(result: UserExamResult): Promise<void> {
    if (!result.userId || !result.examId) return;

    // 1. Lưu local cache ngay lập tức
    const LOCAL_KEY = `kizuna_exam_results_${result.userId}`;
    try {
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      const existing: Record<string, UserExamResult> = safeJsonParse<Record<string, UserExamResult>>(existingRaw, {});
      existing[result.examId] = result;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
    } catch {}

    const enqueueExamSync = () => {
      const q = readStringArray(EXAM_QUEUE_KEY(result.userId));
      if (!q.includes(result.examId)) {
        writeStringArray(EXAM_QUEUE_KEY(result.userId), [...q, result.examId]);
      }
    };

    // 2. Lưu vào Firestore nếu đang online
    if (db && !isOfflineNow()) {
      try {
        const docRef = doc(db, 'user_exam_results', `${result.userId}_${result.examId}`);
        await withProgressTimeout(setDoc(docRef, result, { merge: true }));
      } catch (e) {
        console.warn('[Progress] Lỗi lưu kết quả thi lên Firestore, đã xếp hàng đồng bộ:', e);
        enqueueExamSync();
      }
    } else {
      enqueueExamSync();
    }

    // 3. Tự động tính điểm XP thưởng, điểm năng động & cộng Streak
    const pointsEarned = Math.max(10, result.score * 5);
    await this.recordActivity(result.userId, 'exam', 1, pointsEarned);
  },

  /**
   * Lấy toàn bộ kết quả thi của người dùng để hiển thị trên danh mục đề thi
   */
  async getUserExamResults(userId: string): Promise<Record<string, UserExamResult>> {
    if (!userId) return {};
    const LOCAL_KEY = `kizuna_exam_results_${userId}`;
    let cachedResults: Record<string, UserExamResult> = {};
    try {
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      cachedResults = safeJsonParse<Record<string, UserExamResult>>(existingRaw, {});
    } catch {}

    if (!db || isOfflineNow()) return cachedResults;

    try {
      const q = query(collection(db, 'user_exam_results'), where('userId', '==', userId));
      const snap = await withProgressTimeout(getDocs(q));
      if (!snap.empty) {
        const firestoreResults: Record<string, UserExamResult> = { ...cachedResults };
        snap.forEach(d => {
          const data = d.data() as UserExamResult;
          if (data.examId) {
            firestoreResults[data.examId] = data;
          }
        });
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(firestoreResults));
        } catch {}
        return firestoreResults;
      }
    } catch (e) {
      console.warn('[Progress] Lỗi tải kết quả thi từ Firestore:', e);
    }

    return cachedResults;
  },

  /**
   * Lưu tiến độ bài tập Từ vựng (Flip, Quiz, Typing):
   * - Ghi nhận các từ vựng mới đã thuộc (không đếm trùng ID đã thuộc trước đó)
   * - Đánh dấu hoàn thành Unit & Mode
   * - Nếu có bất kỳ thay đổi nào trong progress -> tự động cộng điểm & Streak trong ngày
   */
  async saveVocabExerciseProgress(
    userId: string,
    _bookId: string,
    unitId: string,
    totalUnitWords: number,
    masteredItemIds: string[],
    mode: 'flip' | 'quiz' | 'typing'
  ): Promise<boolean> {
    if (!userId || !unitId) return false;
    const prevLearnedIds = new Set(readStringArray(VOCAB_LEARNED_IDS_KEY(userId)));
    const newIds = masteredItemIds.filter(id => id && !prevLearnedIds.has(id));
    newIds.forEach(id => prevLearnedIds.add(id));

    const completedUnits = readStringArray(VOCAB_UNITS_KEY(userId));
    const isFullUnit = totalUnitWords > 0 && masteredItemIds.length >= totalUnitWords;
    const isNewUnit = isFullUnit && !completedUnits.includes(unitId);

    const completedModes = readStringArray(VOCAB_MODES_KEY(userId));
    const modeKey = `${unitId}:${mode}`;
    const isNewMode = isFullUnit && !completedModes.includes(modeKey);

    if (newIds.length === 0 && !isNewUnit && !isNewMode) {
      return false;
    }

    if (newIds.length > 0) writeStringArray(VOCAB_LEARNED_IDS_KEY(userId), Array.from(prevLearnedIds));
    if (isNewUnit) writeStringArray(VOCAB_UNITS_KEY(userId), [...completedUnits, unitId]);
    if (isNewMode) writeStringArray(VOCAB_MODES_KEY(userId), [...completedModes, modeKey]);

    await this.syncLearnedArraysToFirestore(userId);
    const pointsEarned = newIds.length > 0 ? Math.max(5, newIds.length * 2) : 10;
    await this.recordActivity(userId, 'vocab', newIds.length, pointsEarned, pointsEarned * 2);
    return true;
  },

  async saveVocabUnitProgress(userId: string, bookId: string, unitId: string, wordCount: number): Promise<void> {
    if (!userId || !unitId) return;
    const completedUnits = readStringArray(VOCAB_UNITS_KEY(userId));
    if (!completedUnits.includes(unitId)) {
      writeStringArray(VOCAB_UNITS_KEY(userId), [...completedUnits, unitId]);
      await this.syncLearnedArraysToFirestore(userId);
      await this.recordActivity(userId, 'vocab', wordCount, Math.max(10, wordCount * 2));
    }
    void bookId;
  },

  getCompletedVocabUnits(userId: string): string[] {
    if (!userId) return [];
    return readStringArray(VOCAB_UNITS_KEY(userId));
  },

  /**
   * Lưu tiến độ bài tập Ngữ pháp (Flip, Quiz)
   */
  async saveGrammarExerciseProgress(
    userId: string,
    unitId: string,
    totalUnitItems: number,
    masteredItemIds: string[],
    mode: 'flip' | 'quiz'
  ): Promise<boolean> {
    if (!userId || !unitId) return false;
    const prevLearnedIds = new Set(readStringArray(GRAMMAR_LEARNED_IDS_KEY(userId)));
    const newIds = masteredItemIds.filter(id => id && !prevLearnedIds.has(id));
    newIds.forEach(id => prevLearnedIds.add(id));

    const completedUnits = readStringArray(GRAMMAR_UNITS_KEY(userId));
    const isFullUnit = totalUnitItems > 0 && masteredItemIds.length >= totalUnitItems;
    const isNewUnit = isFullUnit && !completedUnits.includes(unitId);

    const completedModes = readStringArray(GRAMMAR_MODES_KEY(userId));
    const modeKey = `${unitId}:${mode}`;
    const isNewMode = isFullUnit && !completedModes.includes(modeKey);

    if (newIds.length === 0 && !isNewUnit && !isNewMode) {
      return false;
    }

    if (newIds.length > 0) writeStringArray(GRAMMAR_LEARNED_IDS_KEY(userId), Array.from(prevLearnedIds));
    if (isNewUnit) writeStringArray(GRAMMAR_UNITS_KEY(userId), [...completedUnits, unitId]);
    if (isNewMode) writeStringArray(GRAMMAR_MODES_KEY(userId), [...completedModes, modeKey]);

    await this.syncLearnedArraysToFirestore(userId);
    const pointsEarned = newIds.length > 0 ? Math.max(10, newIds.length * 4) : 15;
    await this.recordActivity(userId, 'grammar', newIds.length, pointsEarned, pointsEarned * 2);
    return true;
  },

  async saveGrammarUnitProgress(userId: string, unitId: string, itemCount: number): Promise<void> {
    if (!userId || !unitId) return;
    const completedUnits = readStringArray(GRAMMAR_UNITS_KEY(userId));
    if (!completedUnits.includes(unitId)) {
      writeStringArray(GRAMMAR_UNITS_KEY(userId), [...completedUnits, unitId]);
      await this.syncLearnedArraysToFirestore(userId);
      await this.recordActivity(userId, 'grammar', itemCount, Math.max(15, itemCount * 5));
    }
  },

  getCompletedGrammarUnits(userId: string): string[] {
    if (!userId) return [];
    return readStringArray(GRAMMAR_UNITS_KEY(userId));
  },

  /**
   * Lưu tiến độ bài tập Chữ Hán Kanji (Flip, Quiz)
   */
  async saveKanjiProgress(
    userId: string,
    masteredKanjiIds: string[],
    exerciseKey: string,
    isFullCompletion: boolean
  ): Promise<boolean> {
    if (!userId) return false;
    const prevLearnedIds = new Set(readStringArray(KANJI_LEARNED_IDS_KEY(userId)));
    const newIds = masteredKanjiIds.filter(id => id && !prevLearnedIds.has(id));
    newIds.forEach(id => prevLearnedIds.add(id));

    const completedExercises = readStringArray(KANJI_EXERCISES_KEY(userId));
    const isNewExercise = Boolean(exerciseKey && isFullCompletion && !completedExercises.includes(exerciseKey));

    if (newIds.length === 0 && !isNewExercise) {
      return false;
    }

    if (newIds.length > 0) writeStringArray(KANJI_LEARNED_IDS_KEY(userId), Array.from(prevLearnedIds));
    if (isNewExercise) writeStringArray(KANJI_EXERCISES_KEY(userId), [...completedExercises, exerciseKey]);

    await this.syncLearnedArraysToFirestore(userId);
    const pointsEarned = newIds.length > 0 ? Math.max(10, newIds.length * 3) : 15;
    await this.recordActivity(userId, 'kanji', newIds.length, pointsEarned, pointsEarned * 2);
    return true;
  },

  getLearnedKanjiIds(userId: string): string[] {
    if (!userId) return [];
    return readStringArray(KANJI_LEARNED_IDS_KEY(userId));
  }
};
