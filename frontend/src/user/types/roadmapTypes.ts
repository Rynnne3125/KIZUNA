export type RoadmapGoalType = 'it_career' | 'study_abroad' | 'pass_jlpt' | 'hobby';

export type TaskType = 'VOCAB' | 'KANJI' | 'GRAMMAR' | 'SCENARIO' | 'SRS_REVIEW' | 'EXAM_CHECKPOINT';

export interface RoadmapTask {
  id: string;
  title: string;
  type: TaskType;
  description: string;
  targetCount: number;
  targetUnit: string; // 'từ' | 'chữ' | 'mẫu câu' | 'bài hội thoại' | 'phút ôn tập'
  recommendedMinutes: number;
  isCompleted: boolean;
  milestoneId?: string;
}

export interface WeeklyPlan {
  weekNumber: number;
  title: string;
  themeVi: string;
  stageId: string;
  stageTitle: string;
  regionId: string;
  regionName: string;
  estimatedHours: number;
  focusArea: string;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  tasks: RoadmapTask[];
}

export interface PersonalizedRoadmap {
  roadmapId: string;
  userId: string;
  currentLevel: 'N5' | 'N4' | 'N3' | 'Tân binh';
  targetLevel: 'N5' | 'N4' | 'N3' | 'N2';
  targetLevelTitle: string;
  goalType: RoadmapGoalType;
  goalTitle: string;
  weeklyPaceHours: number;
  estimatedTotalWeeks: number;
  aiSenseiSummary: string;
  strategicAdvice: string[];
  startingRegionId: string;
  startingRegionName: string;
  completionRate: number; // 0..100
  totalTasksCount: number;
  completedTasksCount: number;
  weeklyPlans: WeeklyPlan[];
  createdAt: string;
  updatedAt: string;
}

