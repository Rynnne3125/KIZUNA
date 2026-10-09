export interface UserProgressData {
  userId: string;
  currentStageId?: string;
  currentStageTitle?: string;
  currentMilestoneId?: string;
  currentMilestoneTitle?: string;
  currentMilestoneContext?: string;
  stageCompletionPercentage: number;
  vocabLearned: number;
  kanjiLearned: number;
  grammarLearned: number;
  examsCompleted: number;
  lastStudiedAt?: string;
}
