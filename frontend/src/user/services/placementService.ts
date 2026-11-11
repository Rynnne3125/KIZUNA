import { db } from '../../config/firebase';
import { collection, doc, getDoc, getDocsFromServer, writeBatch } from 'firebase/firestore';
import {
  ScreeningAnswer,
  DiagnosticQuestion,
  DIAGNOSTIC_QUESTION_SETS,
  ADVANCED_PLACEMENT_QUESTIONS,
  JLPT_LEVELS,
  PlacementLevel,
  PLACEMENT_PASS_RATE
} from '../data/placementQuestionBank';
import { User } from '../types/auth';
import { Milestone, Stage } from '../types/kizuna';

export interface PlacementAssessmentResult {
  userId: string;
  questionSetId?: number;
  screening: ScreeningAnswer;
  assignedLevel: PlacementLevel | 'Tân binh';
  passedLevels?: PlacementLevel[];
  levelTitle: string;
  recommendedRegionId: string;
  recommendedRegionName: string;
  recommendedStageId: string;
  recommendedStageTitle: string;
  recommendedMilestoneId: string;
  recommendedMilestoneTitle: string;
  recommendedMilestoneContext: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  unlockedRegionIds: string[];
  testedAt: string;
}

const OPTION_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

export function getPassedPlacementLevels(result: PlacementAssessmentResult): PlacementLevel[] {
  if (result.passedLevels) return result.passedLevels;
  if (result.assignedLevel === 'Tân binh') return [];

  // The previous tier-based test stored the last passed level and the starting milestone.
  // Older tests only reliably indicate that levels below the assigned one may be skipped.
  const assignedIndex = JLPT_LEVELS.indexOf(result.assignedLevel);
  return JLPT_LEVELS.slice(0, Math.max(0, assignedIndex + (result.recommendedMilestoneId ? 1 : 0)));
}

function nextLearningLevel(passedLevels: PlacementLevel[]): PlacementLevel {
  return JLPT_LEVELS.find(level => !passedLevels.includes(level)) ?? 'N1';
}

export function getPlacementLearningLevel(result: PlacementAssessmentResult): PlacementLevel {
  return nextLearningLevel(getPassedPlacementLevels(result));
}

export function formatPlacementStageTitle(level: PlacementLevel, title: string): string {
  const prefix = `[${level}]`;
  return title.startsWith(prefix) ? title : `${prefix} ${title}`;
}

export function getPlacementTarget(
  stages: Stage[],
  milestones: Milestone[],
  level: PlacementLevel,
  preferredStageId?: string
) {
  const levelStages = stages.filter(stage => (stage.jlptLevel ?? 'N5') === level);
  const orderedStages = levelStages.sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));
  const playableStages = orderedStages.filter(stage => milestones.some(milestone => milestone.stageId === stage.id));
  const stage = playableStages.find(item => item.id === preferredStageId) ?? playableStages[0];
  if (!stage) return null;
  const milestone = milestones.filter(item => item.stageId === stage.id)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id))[0];
  return { stage, milestone };
}

/**
 * Xáo trộn vị trí 4 đáp án A, B, C, D của một câu hỏi để tránh học vẹt vị trí
 */
function shuffleQuestionOptions(q: DiagnosticQuestion): DiagnosticQuestion {
  const shuffledOptions = [...q.options];
  for (let index = shuffledOptions.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledOptions[index], shuffledOptions[swapIndex]] = [shuffledOptions[swapIndex], shuffledOptions[index]];
  }

  let newCorrectKey: 'A' | 'B' | 'C' | 'D' = 'A';
  const newOptions = shuffledOptions.map((opt, idx) => {
    const key = OPTION_KEYS[idx] || 'A';
    if (opt.key === q.correctAnswer) {
      newCorrectKey = key;
    }
    return {
      key,
      text: opt.text,
      subtext: opt.subtext
    };
  });

  return {
    ...q,
    options: newOptions,
    correctAnswer: newCorrectKey
  };
}

export const placementService = {
  async getCompletedMilestones(userId: string): Promise<string[]> {
    if (!db || !userId) return [];
    try {
      const snapshot = await getDoc(doc(db, 'user_progress', userId));
      const completed = snapshot.data()?.completedMilestones;
      return Array.isArray(completed) ? completed : [];
    } catch {
      return [];
    }
  },

  async getPlacementCatalog(): Promise<{ stages: Stage[]; milestones: Milestone[] }> {
    const [stageSnapshot, milestoneSnapshot] = await Promise.all([
      getDocsFromServer(collection(db, 'stages')),
      getDocsFromServer(collection(db, 'milestones'))
    ]);
    return {
      stages: stageSnapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Stage),
      milestones: milestoneSnapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Milestone)
    };
  },

  /**
   * Chọn ngẫu nhiên 1 bộ đề trong 10 bộ đề (Không trùng với bộ đề vừa làm lần trước)
   */
  pickRandomSetId(): number {
    const lastSetRaw = localStorage.getItem('kizuna_last_placement_set_id');
    const lastSetId = lastSetRaw ? parseInt(lastSetRaw, 10) : -1;

    const allSetIds = DIAGNOSTIC_QUESTION_SETS.map(s => s.setId);
    const availableIds = allSetIds.filter(id => id !== lastSetId);
    const pool = availableIds.length > 0 ? availableIds : allSetIds;

    const chosenId = pool[Math.floor(Math.random() * pool.length)];
    try {
      localStorage.setItem('kizuna_last_placement_set_id', String(chosenId));
    } catch {}
    return chosenId;
  },

  /**
   * Lấy câu hỏi theo tầng độ khó từ Bộ đề được chọn (1 trong 10 bộ) + đảo vị trí đáp án
   */
  getQuestionsForLevel(level: PlacementLevel, setId?: number): DiagnosticQuestion[] {
    if (level === 'N2' || level === 'N1') {
      return ADVANCED_PLACEMENT_QUESTIONS.filter(q => q.level === level).map(shuffleQuestionOptions);
    }
    const targetSetId = setId || this.pickRandomSetId();
    const foundSet = DIAGNOSTIC_QUESTION_SETS.find(s => s.setId === targetSetId) || DIAGNOSTIC_QUESTION_SETS[0];
    const levelQuestions = foundSet.questions.filter(q => q.level === level);
    return levelQuestions.map(q => shuffleQuestionOptions(q));
  },

  /**
   * Chấm theo từng cấp và chọn chặng đầu tiên của cấp cần học tiếp.
   */
  async evaluatePlacement(
    userId: string,
    screening: ScreeningAnswer,
    userAnswers: Record<string, string>,
    testedQuestions: DiagnosticQuestion[],
    questionSetId?: number
  ): Promise<PlacementAssessmentResult> {
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;

    testedQuestions.forEach(q => {
      maxScore += q.points;
      if (userAnswers[q.id] === q.correctAnswer) {
        score += q.points;
        correctCount += 1;
      }
    });

    const percentage = testedQuestions.length ? Math.round((correctCount / testedQuestions.length) * 100) : 0;

    const passedLevels: PlacementLevel[] = [];
    for (const level of JLPT_LEVELS) {
      const questions = testedQuestions.filter(question => question.level === level);
      const correct = questions.filter(question => userAnswers[question.id] === question.correctAnswer).length;
      if (!questions.length || correct / questions.length < PLACEMENT_PASS_RATE) break;
      passedLevels.push(level);
    }

    const assignedLevel = passedLevels[passedLevels.length - 1] ?? 'Tân binh';
    const roadmapLevel = nextLearningLevel(passedLevels);
    const { stages, milestones } = await this.getPlacementCatalog();
    const target = getPlacementTarget(stages, milestones, roadmapLevel);
    if (!target) throw new Error(`Chưa có chặng và mốc học cho cấp ${roadmapLevel} trong dữ liệu lộ trình.`);

    const recommendedRegionId = `region_${roadmapLevel.toLowerCase()}`;
    const unlockedRegionIds = [...new Set([...passedLevels, roadmapLevel])]
      .map(level => `region_${level.toLowerCase()}`);
    const levelTitle = assignedLevel === 'Tân binh' ? 'Tân binh nhập môn' : `Trình độ ước tính ${assignedLevel}`;

    return {
      userId,
      ...(testedQuestions.length > 0 ? { questionSetId: questionSetId ?? 1 } : {}),
      screening,
      assignedLevel,
      passedLevels,
      levelTitle,
      recommendedRegionId,
      recommendedRegionName: roadmapLevel,
      recommendedStageId: target.stage.id,
      recommendedStageTitle: target.stage.title,
      recommendedMilestoneId: target.milestone.id,
      recommendedMilestoneTitle: target.milestone.title,
      recommendedMilestoneContext: target.milestone.communicationContext ?? '',
      score,
      maxScore,
      percentage,
      correctCount,
      wrongCount: testedQuestions.length - correctCount,
      answeredCount: testedQuestions.length,
      unlockedRegionIds,
      testedAt: new Date().toISOString()
    };
  },

  /**
   * Lưu kết quả thẩm định vào Firestore và đồng bộ LocalStorage
   */
  async savePlacementResult(result: PlacementAssessmentResult): Promise<void> {
    if (!db || !result.userId) throw new Error('Cần kết nối Firestore và đăng nhập để lưu kết quả.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', result.userId), {
      level: result.assignedLevel,
      placementVerified: result.answeredCount > 0,
      placementMethod: result.answeredCount > 0 ? 'ADAPTIVE_TEST' : 'BEGINNER_START',
      placementScore: result.percentage,
      placementDetails: result,
      updatedAt: result.testedAt
    });
    batch.set(doc(db, 'user_progress', result.userId), {
      userId: result.userId,
      currentRegionId: result.recommendedRegionId,
      currentStageId: result.recommendedStageId,
      currentStageTitle: result.recommendedStageTitle,
      currentMilestoneId: result.recommendedMilestoneId,
      currentMilestoneTitle: result.recommendedMilestoneTitle,
      currentMilestoneContext: result.recommendedMilestoneContext,
      stageCompletionPercentage: 0,
      unlockedRegions: result.unlockedRegionIds,
      lastPlacementAt: result.testedAt
    }, { merge: true });
    await batch.commit();

    try {
      sessionStorage.removeItem(`kizuna_user_progress_${result.userId}`);
      sessionStorage.removeItem(`kizuna_roadmap_progress_${result.userId}`);
    } catch {}

    try {
      localStorage.setItem(`kizuna_placement_${result.userId}`, JSON.stringify(result));
      const rawUser = localStorage.getItem('kizuna_user');
      const currentUser: User | null = rawUser ? JSON.parse(rawUser) : null;
      if (currentUser?.id === result.userId) {
        localStorage.setItem('kizuna_user', JSON.stringify({
          ...currentUser,
          level: result.assignedLevel,
          placementVerified: result.answeredCount > 0,
          placementScore: result.percentage
        }));
      }
    } catch (e) {
      console.warn('[PlacementService] Lỗi đồng bộ localStorage:', e);
    }
    window.dispatchEvent(new Event('kizuna_user_updated'));
  },

  /**
   * Kiểm tra xem user hiện tại đã làm bài test thẩm định chưa
   */
  async checkUserPlacementStatus(userId: string): Promise<PlacementAssessmentResult | null> {
    if (!userId) return null;

    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.placementDetails) {
            return data.placementDetails as PlacementAssessmentResult;
          }
        }
        return null;
      } catch (e) {
        console.warn('[PlacementService] Lỗi kiểm tra status từ Firestore:', e);
      }
    }

    try {
      const cached = localStorage.getItem(`kizuna_placement_${userId}`);
      return cached ? JSON.parse(cached) as PlacementAssessmentResult : null;
    } catch {
      return null;
    }
  }
};
