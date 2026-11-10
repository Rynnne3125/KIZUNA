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

export interface UserRoadmapProgress {
  userId: string;
  completedMilestones: string[];
  completedQuests: Record<string, number[]>;
  readingCompleted: string[];
  currentStageId?: string;
  currentMilestoneId?: string;
  lastStudiedAt?: string;
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
   * Ghi nhận khi học xong từ vựng, chữ hán, ngữ pháp, đề thi hoặc lộ trình
   * Tự động cộng điểm năng động (activePoints), XP và tính chuỗi ngày học Streak vào Firestore và localStorage
   */
  async recordActivity(
    userId: string,
    type: 'vocab' | 'kanji' | 'grammar' | 'exam' | 'roadmap',
    amount = 1,
    activePointsEarned = 10,
    xpEarned?: number
  ): Promise<void> {
    if (!userId) return;
    try {
      sessionStorage.removeItem(`kizuna_user_progress_${userId}`);
      sessionStorage.removeItem(`kizuna_roadmap_progress_${userId}`);

      const finalXp = typeof xpEarned === 'number' ? xpEarned : activePointsEarned * 2;
      const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // Cập nhật session user trong localStorage để thanh header và profile nhảy điểm ngay
      const userRaw = localStorage.getItem('kizuna_user');
      let currentStreak = 0;
      if (userRaw) {
        const u = JSON.parse(userRaw);
        u.activePoints = (u.activePoints || 0) + activePointsEarned;
        u.totalXp = (u.totalXp || 0) + finalXp;

        const lastActive = u.lastActiveDate;
        let streak = typeof u.currentStreak === 'number' ? u.currentStreak : 0;
        if (lastActive !== todayStr) {
          if (lastActive) {
            const lastDate = new Date(lastActive);
            const curDate = new Date(todayStr);
            const diffDays = Math.round((curDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              streak += 1;
            } else {
              streak = 1;
            }
          } else {
            streak = 1;
          }
          u.currentStreak = streak;
          u.lastActiveDate = todayStr;
        }
        currentStreak = u.currentStreak || 1;
        u.lastStudiedAt = new Date().toISOString();
        localStorage.setItem('kizuna_user', JSON.stringify(u));

        // Phát sự kiện để App.tsx và UserNavbar cập nhật ngay lập tức
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('kizuna_user_updated'));
        }
      }

      if (!db) return;

      // 1. Cập nhật tiến độ trong collection 'user_progress'
      const progressRef = doc(db, 'user_progress', userId);
      const fieldMap: Record<string, string> = {
        vocab: 'vocabLearned',
        kanji: 'kanjiLearned',
        grammar: 'grammarLearned',
        exam: 'examsCompleted',
        roadmap: 'milestonesCompleted'
      };
      const targetField = fieldMap[type] || 'activitiesCompleted';

      await setDoc(progressRef, {
        userId,
        [targetField]: increment(amount),
        lastStudiedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Cập nhật điểm năng động, XP và Streak vào collection 'users'
      const userRef = doc(db, 'users', userId);
      const updatePayload: any = {
        activePoints: increment(activePointsEarned),
        totalXp: increment(finalXp),
        lastStudiedAt: new Date().toISOString(),
        lastActiveDate: todayStr
      };
      if (currentStreak > 0) {
        updatePayload.currentStreak = currentStreak;
      }

      await updateDoc(userRef, updatePayload).catch(async () => {
        await setDoc(userRef, updatePayload, { merge: true });
      });
    } catch (e) {
      console.warn('[Progress] Lỗi ghi nhận hoạt động học tập:', e);
    }
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
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, exp } = JSON.parse(cached);
        if (Date.now() < exp) return data;
      }
    } catch {}

    if (!db) return fallbackProgress;

    try {
      const snap = await getDoc(doc(db, 'user_progress', userId));
      if (snap.exists()) {
        const d = snap.data();
        const res: UserRoadmapProgress = {
          userId,
          completedMilestones: Array.isArray(d?.completedMilestones) ? d.completedMilestones : [],
          completedQuests: (typeof d?.completedQuests === 'object' && d?.completedQuests !== null) ? d.completedQuests : {},
          readingCompleted: Array.isArray(d?.readingCompleted) ? d.readingCompleted : [],
          currentStageId: d?.currentStageId || 'stage_n5_1',
          currentMilestoneId: d?.currentMilestoneId || 'ms_minna_b01',
          lastStudiedAt: d?.lastStudiedAt
        };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: res, exp: Date.now() + 5 * 60 * 1000 }));
        } catch {}
        return res;
      }
    } catch (e) {
      console.warn('[Progress] Lỗi lấy roadmap progress từ Firestore:', e);
    }
    return fallbackProgress;
  },

  /**
   * Lưu tiến độ hoàn thành một Quest trong Mốc lên Firestore
   * Tự động kiểm tra: nếu mốc đã xong đủ 4 Quests và Đọc hiểu thì đánh dấu hoàn thành Mốc!
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

    const updatedQuestsForMilestone = existingQuestsForMilestone.includes(questStepIndex)
      ? existingQuestsForMilestone
      : [...existingQuestsForMilestone, questStepIndex].sort((a, b) => a - b);

    const updatedCompletedQuests = {
      ...current.completedQuests,
      [milestoneId]: updatedQuestsForMilestone
    };

    // Kiểm tra xem đã hoàn thành cả 4 quests và bài đọc hiểu chưa
    const hasFinishedAllQuests = [1, 2, 3, 4].every(idx => updatedQuestsForMilestone.includes(idx));
    const hasFinishedReading = current.readingCompleted.includes(milestoneId);

    const updatedCompletedMilestones = [...current.completedMilestones];
    if (hasFinishedAllQuests && hasFinishedReading && !updatedCompletedMilestones.includes(milestoneId)) {
      updatedCompletedMilestones.push(milestoneId);
    }

    const updated: UserRoadmapProgress = {
      ...current,
      completedQuests: updatedCompletedQuests,
      completedMilestones: updatedCompletedMilestones,
      lastStudiedAt: new Date().toISOString()
    };

    if (db) {
      try {
        const ref = doc(db, 'user_progress', userId);
        await setDoc(ref, {
          userId,
          completedQuests: updatedCompletedQuests,
          completedMilestones: updatedCompletedMilestones,
          lastStudiedAt: updated.lastStudiedAt
        }, { merge: true });
      } catch (e) {
        console.warn('[Progress] Lỗi cập nhật quest progress lên Firestore:', e);
      }
    }

    try {
      sessionStorage.setItem(`kizuna_roadmap_progress_${userId}`, JSON.stringify({ data: updated, exp: Date.now() + 5 * 60 * 1000 }));
    } catch {}

    // Ghi nhận hoạt động, cộng điểm năng động, XP & Streak
    await this.recordActivity(userId, 'roadmap', 1, activePointsReward, xpReward);

    return updated;
  },

  /**
   * Lưu tiến độ hoàn thành bài Đọc hiểu trong Mốc lên Firestore
   */
  async saveReadingProgress(
    userId: string,
    milestoneId: string,
    xpReward = 25,
    activePointsReward = 15
  ): Promise<UserRoadmapProgress> {
    const current = await this.getUserRoadmapProgress(userId);
    const updatedReadingCompleted = current.readingCompleted.includes(milestoneId)
      ? current.readingCompleted
      : [...current.readingCompleted, milestoneId];

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

    if (db) {
      try {
        const ref = doc(db, 'user_progress', userId);
        await setDoc(ref, {
          userId,
          readingCompleted: updatedReadingCompleted,
          completedMilestones: updatedCompletedMilestones,
          lastStudiedAt: updated.lastStudiedAt
        }, { merge: true });
      } catch (e) {
        console.warn('[Progress] Lỗi cập nhật reading progress lên Firestore:', e);
      }
    }

    try {
      sessionStorage.setItem(`kizuna_roadmap_progress_${userId}`, JSON.stringify({ data: updated, exp: Date.now() + 5 * 60 * 1000 }));
    } catch {}

    await this.recordActivity(userId, 'roadmap', 1, activePointsReward, xpReward);

    return updated;
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
