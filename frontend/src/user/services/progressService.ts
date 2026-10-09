import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { UserProgressData } from '../types/progress';

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
   * Tự động cộng điểm năng động (activePoints) và XP vào Firestore
   */
  async recordActivity(
    userId: string,
    type: 'vocab' | 'kanji' | 'grammar' | 'exam',
    amount = 1,
    activePointsEarned = 10
  ): Promise<void> {
    if (!db || !userId) return;
    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);
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
        // Trường hợp doc user chưa có field thì dùng setDoc merge
        await setDoc(userRef, {
          activePoints: increment(activePointsEarned),
          totalXp: increment(activePointsEarned * 2)
        }, { merge: true });
      });
    } catch (e) {
      console.warn('[Progress] Lỗi ghi nhận hoạt động học tập:', e);
    }
  }
};
