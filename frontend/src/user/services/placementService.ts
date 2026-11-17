import { db } from '../../config/firebase';
import { collection, doc, getDoc, getDocFromServer, getDocsFromServer, runTransaction } from 'firebase/firestore';
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
import { assessPlacement, type PlacementAiAssessment, type PlacementCandidate } from './placementAssessmentApi';
import { comparePlacementVersions, placementStorage } from './placementStorage';

export interface PlacementAssessmentResult {
  userId: string;
  questionSetId?: number;
  screening: ScreeningAnswer;
  assignedLevel: PlacementLevel | 'Tân binh';
  passedLevels?: PlacementLevel[];
  levelTitle: string;
  recommendedRegionId: string;
  recommendedRegionName: string;
  recommendedLearningLevel?: PlacementLevel;
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
  attemptId?: string;
  aiAssessment?: PlacementAiAssessment;
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
  const recommended = result.recommendedLearningLevel;
  if (!recommended) return nextLearningLevel(getPassedPlacementLevels(result));
  const estimated = result.assignedLevel === 'Tân binh' ? 'N5' : result.assignedLevel;
  const index = JLPT_LEVELS.indexOf(recommended);
  return index >= 0 && index <= JLPT_LEVELS.indexOf(estimated) ? recommended : estimated;
}

export function formatPlacementStageTitle(level: PlacementLevel, title: string): string {
  const prefix = `[${level}]`;
  return title.startsWith(prefix) ? title : `${prefix} ${title}`;
}

export function getPlacementTarget(
  stages: Stage[],
  milestones: Milestone[],
  level: PlacementLevel,
  preferredStageId?: string,
  preferredMilestoneId?: string
) {
  const levelStages = stages.filter(stage => (stage.jlptLevel ?? 'N5') === level);
  const orderedStages = levelStages.sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));
  const playableStages = orderedStages.filter(stage => milestones.some(milestone => milestone.stageId === stage.id));
  const preferredMilestone = milestones.find(item => item.id === preferredMilestoneId);
  const stage = playableStages.find(item => item.id === preferredMilestone?.stageId)
    ?? playableStages.find(item => item.id === preferredStageId)
    ?? playableStages[0];
  if (!stage) return null;
  const milestone = milestones.filter(item => item.stageId === stage.id)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id))[0];
  return { stage, milestone: preferredMilestone?.stageId === stage.id ? preferredMilestone : milestone };
}

export function getRoadmapAccess(
  stages: Stage[],
  milestones: Milestone[],
  completedMilestoneIds: readonly string[],
  placement: PlacementAssessmentResult | null
) {
  const passedLevels = placement ? getPassedPlacementLevels(placement) : [];
  const placementTarget = placement
    ? getPlacementTarget(stages, milestones, getPlacementLearningLevel(placement),
        placement.recommendedStageId, placement.recommendedMilestoneId)
    : null;
  const completed = new Set(completedMilestoneIds);
  const unlockedMilestoneIds = new Set<string>();
  const orderedStages = [...stages].sort((left, right) =>
    JLPT_LEVELS.indexOf(left.jlptLevel ?? 'N5') - JLPT_LEVELS.indexOf(right.jlptLevel ?? 'N5') ||
    left.orderIndex - right.orderIndex || left.id.localeCompare(right.id));
  const milestonesByStage = new Map<string, Milestone[]>();
  for (const milestone of milestones) {
    const items = milestonesByStage.get(milestone.stageId);
    if (items) items.push(milestone);
    else milestonesByStage.set(milestone.stageId, [milestone]);
  }

  let lastAccessibleStage: Stage | null = null;
  let previousLevel: PlacementLevel | undefined;
  let previousStageCompleted = false;
  for (const stage of orderedStages) {
    const level = stage.jlptLevel ?? 'N5';
    const items = milestonesByStage.get(stage.id) ?? [];
    items.sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id));
    const stageEntryUnlocked = level === previousLevel ? previousStageCompleted : level === 'N5';
    for (const [index, item] of items.entries()) {
      if (completed.has(item.id) || passedLevels.includes(level) || item.id === placementTarget?.milestone.id ||
          (index === 0 ? stageEntryUnlocked : completed.has(items[index - 1].id))) {
        unlockedMilestoneIds.add(item.id);
        lastAccessibleStage = stage;
      }
    }
    previousLevel = level;
    previousStageCompleted = items.length > 0 && items.every(item => completed.has(item.id));
  }

  return { passedLevels, placementTarget, unlockedMilestoneIds, lastAccessibleStage };
}

function eligiblePlacementCandidates(stages: Stage[], milestones: Milestone[], maxLevel: PlacementLevel): PlacementCandidate[] {
  const highest = JLPT_LEVELS.indexOf(maxLevel);
  const stagesById = new Map(stages.map(stage => [stage.id, stage]));
  return milestones.flatMap(milestone => {
    const stage = stagesById.get(milestone.stageId);
    const level = stage?.jlptLevel ?? 'N5';
    const index = JLPT_LEVELS.indexOf(level);
    if (!stage || index < 0 || index > highest || milestone.id.length > 128 ||
        !stage.title.trim() || !milestone.title.trim()) return [];
    return [{
      id: milestone.id,
      level,
      stageTitle: stage.title.slice(0, 180),
      title: milestone.title.slice(0, 180),
      goal: (milestone.canDoGoal || milestone.communicationContext || '').slice(0, 200)
    }];
  }).sort((left, right) => JLPT_LEVELS.indexOf(right.level) - JLPT_LEVELS.indexOf(left.level)).slice(0, 200);
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
    if (db && navigator.onLine !== false) {
      try {
        const [stageSnapshot, milestoneSnapshot] = await Promise.all([
          getDocsFromServer(collection(db, 'stages')),
          getDocsFromServer(collection(db, 'milestones'))
        ]);
        const catalog = {
          stages: stageSnapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Stage),
          milestones: milestoneSnapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Milestone)
        };
        if (catalog.stages.length && catalog.milestones.length) {
          await placementStorage.writeCatalog(catalog).catch(() => undefined);
        }
        return catalog;
      } catch {
        // Use the most recent Firestore catalog saved on this device.
      }
    }
    const cached = await placementStorage.readCatalog().catch(() => undefined);
    if (!cached) throw new Error('Cần tải lộ trình khi có mạng trước khi làm bài xếp lớp offline.');
    return cached;
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
    const testedAt = new Date().toISOString();
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

    const levels = JLPT_LEVELS.flatMap(level => {
      const questions = testedQuestions.filter(question => question.level === level);
      const skills = new Map<DiagnosticQuestion['category'], { category: DiagnosticQuestion['category']; correct: number; total: number }>();
      let correct = 0;
      for (const question of questions) {
        const score = skills.get(question.category) ?? { category: question.category, correct: 0, total: 0 };
        score.total++;
        if (userAnswers[question.id] === question.correctAnswer) {
          score.correct++;
          correct++;
        }
        skills.set(question.category, score);
      }
      return questions.length ? [{ level, correct, total: questions.length, skills: [...skills.values()] }] : [];
    });
    const passedLevels: PlacementLevel[] = [];
    for (const { level, correct, total } of levels) {
      if (level !== JLPT_LEVELS[passedLevels.length] || correct / total < PLACEMENT_PASS_RATE) break;
      passedLevels.push(level);
    }

    const assignedLevel = passedLevels[passedLevels.length - 1] ?? 'Tân binh';
    const maxLevel = assignedLevel === 'Tân binh' ? 'N5' : assignedLevel;
    const { stages, milestones } = await this.getPlacementCatalog();
    const candidates = eligiblePlacementCandidates(stages, milestones, maxLevel);
    const aiAssessment = await assessPlacement(levels, candidates);
    const selected = candidates.find(candidate => candidate.id === aiAssessment?.milestoneId);
    const roadmapLevel = selected?.level ?? maxLevel;
    const target = getPlacementTarget(stages, milestones, roadmapLevel, undefined, selected?.id);
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
      recommendedLearningLevel: roadmapLevel,
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
      testedAt,
      attemptId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      ...(aiAssessment ? { aiAssessment } : {})
    };
  },

  async savePlacementResult(result: PlacementAssessmentResult): Promise<PlacementSaveOutcome> {
    if (!result.userId) throw new Error('Cần đăng nhập để lưu kết quả.');
    try {
      await placementStorage.queue(result);
    } catch {
      // An online user can still save if this browser denies IndexedDB access.
      const saved = await commitPlacement(result);
      publishPlacement(saved);
      return { result: saved, status: 'synced' };
    }

    const synced = await this.syncPendingPlacement(result.userId);
    if (synced) return synced;

    const pending = await placementStorage.readPending(result.userId);
    if (!pending) return { result: await this.checkUserPlacementStatus(result.userId) ?? result, status: 'synced' };
    publishPlacement(pending);
    return { result: pending, status: 'pending' };
  },

  async syncPendingPlacement(userId: string): Promise<PlacementSaveOutcome | null> {
    if (!db || !userId || navigator.onLine === false) return null;
    try {
      const pending = await placementStorage.readPending(userId);
      if (!pending) return null;
      const saved = await commitPlacement(pending);
      await placementStorage.removeSynced(saved);
      const remaining = await placementStorage.readPending(userId);
      const result = remaining ?? saved;
      publishPlacement(result);
      return { result, status: remaining ? 'pending' : 'synced' };
    } catch {
      // Keep the queued result for the next reconnect or app open.
      return null;
    }
  },

  async checkUserPlacementStatus(userId: string): Promise<PlacementAssessmentResult | null> {
    if (!userId) return null;

    const pending = await placementStorage.readPending(userId).catch(() => undefined);
    if (pending) return pending;

    if (db && navigator.onLine !== false) {
      try {
        const snap = await getDocFromServer(doc(db, 'users', userId));
        return (snap.data()?.placementDetails as PlacementAssessmentResult | undefined) ?? null;
      } catch {
        // Fall back to the latest result already available on this device.
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

interface PlacementSaveOutcome {
  result: PlacementAssessmentResult;
  status: 'synced' | 'pending';
}

async function commitPlacement(result: PlacementAssessmentResult): Promise<PlacementAssessmentResult> {
  if (!db || navigator.onLine === false) throw new Error('Thiết bị đang offline.');

  const userRef = doc(db, 'users', result.userId);
  const progressRef = doc(db, 'user_progress', result.userId);
  return runTransaction(db, async transaction => {
    const userSnapshot = await transaction.get(userRef);
    const existing = userSnapshot.data()?.placementDetails as PlacementAssessmentResult | undefined;
    if (existing && comparePlacementVersions(existing, result) >= 0) return existing;

    transaction.update(userRef, {
      level: result.assignedLevel,
      placementVerified: result.answeredCount > 0,
      placementMethod: result.answeredCount > 0 ? 'ADAPTIVE_TEST' : 'BEGINNER_START',
      placementScore: result.percentage,
      placementDetails: result,
      updatedAt: result.testedAt
    });
    transaction.set(progressRef, {
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
    return result;
  }, { maxAttempts: 3 });
}

function publishPlacement(result: PlacementAssessmentResult) {
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
  } catch (error) {
    console.warn('[PlacementService] Lỗi đồng bộ localStorage:', error);
  }
  window.dispatchEvent(new Event('kizuna_user_updated'));
}
