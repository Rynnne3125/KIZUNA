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

export const progressService = {
  /**
   * Lấy tiến trình học tập chuẩn thực tế của user từ Firestore
   * TỐI ƯU HÓA: Dùng cache sessionStorage (TTL 10 phút) để tránh đọc Firestore mỗi lần chuyển tab
   */
  async getUserProgress(userId: string): Promise<UserProgressData | null> {
    if (!userId) return null;
    const CACHE_KEY = `kizuna_user_progress_${userId}`;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, exp } = JSON.parse(raw);
        if (Date.now() < exp) return data;
      }
    } catch {}

    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'user_progress', userId));
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
        } catch {}
        return result;
      }
      return null;
    } catch (e) {
      console.warn('[Progress] Lỗi lấy tiến độ từ Firestore:', e);
      return null;
    }
  },

  /**
   * Lưu hoặc cập nhật tiến trình học tập của user lên Firestore
   */
  async saveUserProgress(userId: string, data: Partial<UserProgressData>): Promise<void> {
    if (!userId) return;
    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);
    } catch {}

    if (!db) return;
    try {
      const ref = doc(db, 'user_progress', userId);
      await setDoc(ref, {
        ...data,
        userId,
        lastStudiedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('[Progress] Lỗi cập nhật tiến trình lên Firestore:', e);
    }
  },

  /**
   * Ghi nhận khi học xong từ vựng, chữ hán, ngữ pháp hoặc thi thử
   * Tự động cộng điểm năng động (activePoints) và XP vào Firestore và localStorage
   */
  async recordActivity(
    userId: string,
    type: 'vocab' | 'kanji' | 'grammar' | 'exam',
    amount = 1,
    activePointsEarned = 10
  ): Promise<void> {
    if (!userId) return;
    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);

      // Cập nhật session user trong localStorage để thanh header nhảy điểm ngay
      const userRaw = localStorage.getItem('kizuna_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        u.activePoints = (u.activePoints || 0) + activePointsEarned;
        u.totalXp = (u.totalXp || 0) + (activePointsEarned * 2);
        localStorage.setItem('kizuna_user', JSON.stringify(u));
      }

      if (!db) return;

      // 1. Cập nhật tiến độ trong collection 'user_progress'
      const progressRef = doc(db, 'user_progress', userId);
      const fieldMap = {
        vocab: 'vocabLearned',
        kanji: 'kanjiLearned',
        grammar: 'grammarLearned',
        exam: 'examsCompleted'
      };
      const targetField = fieldMap[type];

      await setDoc(progressRef, {
        userId,
        [targetField]: increment(amount),
        lastStudiedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Cập nhật điểm năng động và XP vào collection 'users'
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        activePoints: increment(activePointsEarned),
        totalXp: increment(activePointsEarned * 2)
      }).catch(async () => {
        await setDoc(userRef, {
          activePoints: increment(activePointsEarned),
          totalXp: increment(activePointsEarned * 2)
        }, { merge: true });
      });
    } catch (e) {
      console.warn('[Progress] Lỗi ghi nhận hoạt động học tập:', e);
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
