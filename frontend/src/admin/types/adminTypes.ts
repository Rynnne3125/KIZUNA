export type AdminRole = 'ROLE_ADMIN' | 'ROLE_USER';

export interface AdminUser {
  id: string;
  username?: string;
  fullName?: string;
  email?: string;
  role?: AdminRole;
  status?: 'ACTIVE' | 'BANNED' | string;
  enabled?: boolean;
  isDeleted?: boolean;
  level?: string;
  totalXp?: number;
  activePoints?: number;
  currentStreak?: number;
  longestStreak?: number;
  placementVerified?: boolean;
  placementScore?: number;
  placementDetails?: any;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface StudentDossierData {
  user: AdminUser;
  progress: {
    currentRegionId?: string;
    currentStageId?: string;
    currentStageTitle?: string;
    unlockedRegions?: string[];
    completedMilestones?: string[];
    lastStudiedAt?: string;
    lastPlacementAt?: string;
    [key: string]: any;
  } | null;
  srsItems: Array<{
    id: string;
    itemId?: string;
    itemType?: 'VOCABULARY' | 'KANJI' | 'GRAMMAR' | string;
    term?: string;
    reading?: string;
    meaning?: string;
    repetition?: number;
    intervalDays?: number;
    easeFactor?: number;
    nextReviewAt?: string;
    wrongCount?: number;
    [key: string]: any;
  }>;
}

export interface AiEvaluationAudit {
  id: string;
  userId?: string;
  username?: string;
  milestoneTitle?: string;
  questTitle?: string;
  userSubmission?: string;
  aiScore?: number;
  aiFeedback?: string;
  studentAppealReason?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  submittedAt?: string;
  [key: string]: any;
}

export interface Stage {
  id: string;
  title?: string;
  orderIndex?: number;
  order_index?: number;
  description?: string;
  themeColor?: string;
  jlptLevel?: string;
  colorGradient?: string[];
  [key: string]: any;
}

export interface Milestone {
  id: string;
  stageId?: string;
  stage_id?: string;
  title?: string;
  nejUnit?: string;
  orderIndex?: number;
  order_index?: number;
  communicationContext?: string;
  xpReward?: number;
  activePointsReward?: number;
  prerequisiteMilestoneId?: string | null;
  isActive?: boolean;
  active?: boolean;
  [key: string]: any;
}

export interface MilestoneQuest {
  id: string;
  milestoneId: string;
  stepIndex: number; // 1..4
  questType: 'FLASHCARD_SRS' | 'VOCAB_GATEKEEPER' | 'GRAMMAR_SCRAMBLE' | 'CLOZE_PRACTICE' | string;
  title: string;
  description?: string;
  xpReward?: number;
  activePointsReward?: number;
  [key: string]: any;
}

export interface MilestoneWhitelistData {
  milestoneId: string;
  vocabulary: VocabularyItem[];
  kanji: KanjiDictionary[];
  grammar: GrammarItem[];
}

export interface VocabularyItem {
  id: string;
  [key: string]: any;
}

export interface GrammarItem {
  id: string;
  [key: string]: any;
}

export interface KanjiDictionary {
  id: string;
  [key: string]: any;
}

export interface JlptExam {
  id: string;
  [key: string]: any;
}

export interface AdminSystemStats {
  totalLearners: number;
  totalAdmins: number;
  totalExamsAvailable: number;
  totalStages: number;
  totalMilestones: number;
  pendingAiAudits: number;
  serverStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
}

export interface MilestoneFunnelStep {
  milestoneId: string;
  milestoneTitle: string;
  stageId: string;
  stageTitle?: string;
  orderIndex: number;
  reachedCount: number;
  completedCount: number;
  retentionRate: number; // % so với mốc đầu tiên
  dropOffRate: number;   // % rơi rụng so với mốc liền trước
  isBottleneck: boolean;
}

export interface KillerKnowledgeItem {
  id: string;
  type: 'VOCABULARY' | 'KANJI';
  term: string;
  reading: string;
  meaning: string;
  level: string;
  milestoneId?: string;
  totalAttempts: number;
  wrongCount: number;
  errorRate: number; // % làm sai
  avgEaseFactor: number;
  affectedLearners: number;
  rawItem?: any;
}

export interface LearningAnalyticsData {
  totalLearnersAnalyzed: number;
  avgFunnelRetention: number;
  bottleneckMilestoneTitle: string;
  bottleneckDropOffRate: number;
  funnelSteps: MilestoneFunnelStep[];
  killerVocabulary: KillerKnowledgeItem[];
  killerKanji: KillerKnowledgeItem[];
}
