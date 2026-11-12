import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProgressData } from '../types/progress';

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
  type: 'vocab' | 'kanji' | 'grammar' | 'exam';
  amount: number;
  activePointsEarned: number;
  createdAt: string;
}

function withProgressTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Progress Firestore timeout')), ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

export const progressService = {
  /**
   * Lấy tiến trình học tập chuẩn thực tế của user từ Firestore (có lưu dự phòng Offline vào localStorage)
   * TỐI ƯU HÓA: Dùng cache sessionStorage (TTL 10 phút) + localStorage Offline fallback
   */
  async getUserProgress(userId: string): Promise<UserProgressData | null> {
    if (!userId) return null;
    const CACHE_KEY = `kizuna_user_progress_${userId}`;
    const OFFLINE_KEY = `kizuna_offline_progress_${userId}`;

    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, exp } = JSON.parse(raw);
        if (Date.now() < exp) return data;
      }
    } catch {}

    // Nếu đang mất mạng (Offline), trả về ngay từ localStorage không chờ mạng
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const offlineRaw = localStorage.getItem(OFFLINE_KEY);
        if (offlineRaw) return JSON.parse(offlineRaw);
      } catch {}
      return {
        userId,
        stageCompletionPercentage: 0,
        vocabLearned: 0,
        kanjiLearned: 0,
        grammarLearned: 0,
        examsCompleted: 0,
      };
    }

    if (!db) return null;
    try {
      const snap = await withProgressTimeout(getDoc(doc(db, 'user_progress', userId)));
      if (snap.exists()) {
        const data = snap.data() as UserProgressData;
        const result: UserProgressData = {
          userId,
          currentStageId: data.currentStageId,
          currentStageTitle: data.currentStageTitle,
          currentMilestoneId: data.currentMilestoneId,
          currentMilestoneTitle: data.currentMilestoneTitle,
          currentMilestoneContext: data.currentMilestoneContext,
          stageCompletionPercentage: typeof data.stageCompletionPercentage === 'number' ? data.stageCompletionPercentage : 0,
          vocabLearned: typeof data.vocabLearned === 'number' ? data.vocabLearned : 0,
          kanjiLearned: typeof data.kanjiLearned === 'number' ? data.kanjiLearned : 0,
          grammarLearned: typeof data.grammarLearned === 'number' ? data.grammarLearned : 0,
          examsCompleted: typeof data.examsCompleted === 'number' ? data.examsCompleted : 0,
          lastStudiedAt: data.lastStudiedAt
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

    try {
      const offlineRaw = localStorage.getItem(OFFLINE_KEY);
      if (offlineRaw) return JSON.parse(offlineRaw);
    } catch {}
    return null;
  },

  /**
   * Lưu hoặc cập nhật tiến trình học tập của user lên LocalStorage và Firestore
   */
  async saveUserProgress(userId: string, data: Partial<UserProgressData>): Promise<void> {
    if (!userId) return;
    const OFFLINE_KEY = `kizuna_offline_progress_${userId}`;
    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);
      const prevRaw = localStorage.getItem(OFFLINE_KEY);
      const prev: Partial<UserProgressData> = prevRaw ? JSON.parse(prevRaw) : { userId };
      const merged = {
        ...prev,
        ...data,
        userId,
        lastStudiedAt: new Date().toISOString()
      };
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(merged));
    } catch {}

    if (!db || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    try {
      const ref = doc(db, 'user_progress', userId);
      await withProgressTimeout(setDoc(ref, {
        ...data,
        userId,
        lastStudiedAt: new Date().toISOString()
      }, { merge: true }));
    } catch (e) {
      console.warn('[Progress] Lỗi cập nhật tiến trình lên Firestore:', e);
    }
  },

  /**
   * Ghi nhận khi học xong từ vựng, chữ hán, ngữ pháp hoặc thi thử
   * Tự động cộng điểm năng động (activePoints) và XP vào localStorage (hỗ trợ Offline) và Firestore
   */
  async recordActivity(
    userId: string,
    type: 'vocab' | 'kanji' | 'grammar' | 'exam',
    amount = 1,
    activePointsEarned = 10
  ): Promise<void> {
    if (!userId) return;
    const OFFLINE_KEY = `kizuna_offline_progress_${userId}`;
    const QUEUE_KEY = `kizuna_offline_sync_queue_${userId}`;
    const fieldMap = {
      vocab: 'vocabLearned',
      kanji: 'kanjiLearned',
      grammar: 'grammarLearned',
      exam: 'examsCompleted'
    } as const;
    const targetField = fieldMap[type];

    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);

      // 1. Cập nhật session user trong localStorage để thanh header nhảy điểm ngay (kể cả khi Offline)
      const userRaw = localStorage.getItem('kizuna_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        u.activePoints = (u.activePoints || 0) + activePointsEarned;
        u.totalXp = (u.totalXp || 0) + (activePointsEarned * 2);
        localStorage.setItem('kizuna_user', JSON.stringify(u));
      }

      // 2. Cập nhật tiến độ Offline trong localStorage
      const prevRaw = localStorage.getItem(OFFLINE_KEY);
      const prev: Record<string, any> = prevRaw ? JSON.parse(prevRaw) : {
        userId,
        stageCompletionPercentage: 0,
        vocabLearned: 0,
        kanjiLearned: 0,
        grammarLearned: 0,
        examsCompleted: 0,
      };
      prev[targetField] = (Number(prev[targetField]) || 0) + amount;
      prev.lastStudiedAt = new Date().toISOString();
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(prev));
    } catch {}

    const enqueueForLaterSync = () => {
      try {
        const rawQ = localStorage.getItem(QUEUE_KEY);
        const queue: OfflineSyncItem[] = rawQ ? JSON.parse(rawQ) : [];
        queue.push({
          id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type,
          amount,
          activePointsEarned,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      } catch {}
    };

    if (!db || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      enqueueForLaterSync();
      return;
    }

    try {
      const progressRef = doc(db, 'user_progress', userId);
      await withProgressTimeout(setDoc(progressRef, {
        userId,
        [targetField]: increment(amount),
        lastStudiedAt: new Date().toISOString()
      }, { merge: true }));

      const userRef = doc(db, 'users', userId);
      await withProgressTimeout(updateDoc(userRef, {
        activePoints: increment(activePointsEarned),
        totalXp: increment(activePointsEarned * 2)
      }).catch(async () => {
        await setDoc(userRef, {
          activePoints: increment(activePointsEarned),
          totalXp: increment(activePointsEarned * 2)
        }, { merge: true });
      }));
    } catch (e) {
      console.warn('[Progress] Không thể đồng bộ ngay lên Firestore, đã xếp vào hàng đợi Offline:', e);
      enqueueForLaterSync();
    }
  },

  /**
   * Đồng bộ hàng đợi học tập Offline lên Firestore khi có kết nối Wi-Fi trở lại
   */
  async syncOfflineQueue(userId: string): Promise<number> {
    if (!userId || !db || (typeof navigator !== 'undefined' && !navigator.onLine)) return 0;
    const QUEUE_KEY = `kizuna_offline_sync_queue_${userId}`;
    let queue: OfflineSyncItem[] = [];
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) queue = JSON.parse(raw);
    } catch {}

    if (queue.length === 0) return 0;

    const totals = { vocab: 0, kanji: 0, grammar: 0, exam: 0, points: 0 };
    for (const item of queue) {
      totals[item.type] += item.amount;
      totals.points += item.activePointsEarned;
    }

    try {
      const progressRef = doc(db, 'user_progress', userId);
      const progressUpdate: Record<string, any> = {
        userId,
        lastStudiedAt: new Date().toISOString()
      };
      if (totals.vocab > 0) progressUpdate.vocabLearned = increment(totals.vocab);
      if (totals.kanji > 0) progressUpdate.kanjiLearned = increment(totals.kanji);
      if (totals.grammar > 0) progressUpdate.grammarLearned = increment(totals.grammar);
      if (totals.exam > 0) progressUpdate.examsCompleted = increment(totals.exam);

      await withProgressTimeout(setDoc(progressRef, progressUpdate, { merge: true }));

      if (totals.points > 0) {
        const userRef = doc(db, 'users', userId);
        await withProgressTimeout(setDoc(userRef, {
          activePoints: increment(totals.points),
          totalXp: increment(totals.points * 2)
        }, { merge: true }));
      }

      localStorage.removeItem(QUEUE_KEY);
      return queue.length;
    } catch (e) {
      console.warn('[Progress] Đồng bộ hàng đợi Offline thất bại, sẽ thử lại sau:', e);
      return 0;
    }
  },

  /**
   * Lưu kết quả thi thử JLPT của người dùng (vào LocalStorage và Firestore)
   */
  async saveExamResult(result: UserExamResult): Promise<void> {
    if (!result.userId || !result.examId) return;

    // 1. Lưu local cache ngay lập tức
    const LOCAL_KEY = `kizuna_exam_results_${result.userId}`;
    try {
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      const existing: Record<string, UserExamResult> = existingRaw ? JSON.parse(existingRaw) : {};
      existing[result.examId] = result;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
    } catch {}

    // 2. Lưu vào Firestore
    if (db) {
      try {
        const docRef = doc(db, 'user_exam_results', `${result.userId}_${result.examId}`);
        await setDoc(docRef, result, { merge: true });
      } catch (e) {
        console.warn('[Progress] Lỗi lưu kết quả thi lên Firestore:', e);
      }
    }

    // 3. Tự động tính điểm XP thưởng & điểm năng động theo số câu đúng
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
      if (existingRaw) {
        cachedResults = JSON.parse(existingRaw);
      }
    } catch {}

    if (!db) return cachedResults;

    try {
      const q = query(collection(db, 'user_exam_results'), where('userId', '==', userId));
      const snap = await getDocs(q);
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
   * Đánh dấu và lưu hoàn thành bài học từ vựng (khi đạt 100% ôn tập hoặc 100% luyện gõ/dịch)
   */
  async saveVocabUnitProgress(userId: string, bookId: string, unitId: string, wordCount: number): Promise<void> {
    if (!userId || !unitId) return;
    const LOCAL_KEY = `kizuna_vocab_completed_units_${userId}`;
    try {
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      const completedUnits: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      if (!completedUnits.includes(unitId)) {
        completedUnits.push(unitId);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(completedUnits));
        await this.recordActivity(userId, 'vocab', wordCount, Math.max(10, wordCount * 2));
      }
    } catch (e) {
      console.warn('[Progress] Lỗi lưu hoàn thành từ vựng:', e);
    }
  },

  getCompletedVocabUnits(userId: string): string[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`kizuna_vocab_completed_units_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Đánh dấu và lưu hoàn thành bài học ngữ pháp (khi đạt 100% thẻ lật hoặc 100% bài luyện ghi nhớ)
   */
  async saveGrammarUnitProgress(userId: string, unitId: string, itemCount: number): Promise<void> {
    if (!userId || !unitId) return;
    const LOCAL_KEY = `kizuna_grammar_completed_units_${userId}`;
    try {
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      const completedUnits: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      if (!completedUnits.includes(unitId)) {
        completedUnits.push(unitId);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(completedUnits));
        await this.recordActivity(userId, 'grammar', itemCount, Math.max(15, itemCount * 5));
      }
    } catch (e) {
      console.warn('[Progress] Lỗi lưu hoàn thành ngữ pháp:', e);
    }
  },

  getCompletedGrammarUnits(userId: string): string[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`kizuna_grammar_completed_units_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
};
