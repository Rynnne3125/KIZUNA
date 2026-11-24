export type AdminRole = 'ROLE_ADMIN' | 'ROLE_USER';
export type BackendConnectionStatus = 'CONNECTED' | 'FALLBACK_FIRESTORE';

export interface PlacementSkillBreakdownItem {
  category: 'alphabet' | 'vocabulary' | 'grammar' | 'kanji' | 'reading' | string;
  correct: number;
  total: number;
}

export interface PlacementLevelBreakdown {
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | string;
  correct: number;
  total: number;
  skills: PlacementSkillBreakdownItem[];
}

export interface PlacementDetailsRecord {
  userId?: string;
  questionSetId?: number;
  screening?: {
    studyBackground?: string;
    certificate?: string;
    goal?: string;
    weeklyHours?: string;
  };
  assignedLevel?: string;
  passedLevels?: string[];
  levelTitle?: string;
  recommendedRegionId?: string;
  recommendedRegionName?: string;
  recommendedLearningLevel?: string;
  recommendedStageId?: string;
  recommendedStageTitle?: string;
  recommendedMilestoneId?: string;
  recommendedMilestoneTitle?: string;
  recommendedMilestoneContext?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  correctCount?: number;
  wrongCount?: number;
  answeredCount?: number;
  unlockedRegionIds?: string[];
  testedAt?: string;
  attemptId?: string;
  skillBreakdown?: PlacementLevelBreakdown[];
  aiAssessment?: {
    confidence: 'LOW' | 'MODERATE' | 'HIGH';
    milestoneId: string;
    model: string;
    latencyMs: number;
  };
  [key: string]: any;
}

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
  placementDetails?: PlacementDetailsRecord | null;
  lastAntiCheatNote?: string;
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
    currentMilestoneId?: string;
    currentMilestoneTitle?: string;
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
  milestoneId?: string;
  milestoneTitle?: string;
  questTitle?: string;
  promptText?: string;
  userSubmission?: string;
  studentInput?: string;
  aiScore?: number;
  aiFeedback?: string;
  aiResponse?: string;
  studentAppealReason?: string;
  studentReason?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  adminNote?: string;
  resolvedBy?: string;
  bonusPointsAwarded?: number;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt?: number;
  resolvedAt?: number;
  [key: string]: any;
}

export interface AiRuntimeConfig {
  model: string;
  dailyLimit: number;
  timeoutSeconds: number;
  maxConcurrency: number;
  senseiEnabled: boolean;
  senseiSystemPrompt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AiTelemetryEvent {
  id: string;
  type: 'PLACEMENT' | 'SENSEI' | string;
  model: string;
  confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'N/A' | string;
  milestoneId?: string | null;
  assignedLevel?: string | null;
  latencyMs: number;
  status: 'SUCCESS' | 'RATE_LIMITED' | 'FALLBACK' | 'ERROR' | string;
  httpStatus: number;
  timestamp: number;
}

export interface AiPlacementMonitorData {
  model: string;
  apiKeyConfigured: boolean;
  senseiEnabled: boolean;
  callsToday: number;
  dailyLimit: number;
  remainingToday: number;
  quotaUsagePercent: number;
  budgetDate: string;
  inFlightActive: number;
  inFlightMax: number;
  timeoutSeconds: number;
  rateLimitErrors429Count: number;
  totalRecordedCalls: number;
  totalPlacementCalls: number;
  totalPlacedUsers: number;
  aiAssistedPlacements: number;
  successCount: number;
  fallbackOrErrorCount: number;
  successRatePercent: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  pendingAuditsCount: number;
  confidenceDistribution: {
    HIGH: number;
    MODERATE: number;
    LOW: number;
  };
  levelDistribution: Record<string, number>;
  stageDistribution: Record<string, number>;
  recentEvents: AiTelemetryEvent[];
  config: AiRuntimeConfig;
}

export interface AntiCheatAnomaly {
  userId: string;
  username?: string;
  fullName?: string;
  email?: string;
  level?: string;
  activePoints: number;
  totalXp: number;
  currentStreak: number;
  enabled: boolean;
  riskScore: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  flags: string[];
  reasons: string[];
  detectedAt: string;
}

export interface AdminActivityLog {
  id: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewRegistrations: boolean;
  aiSenseiEnabled: boolean;
  updatedBy?: string;
  updatedAt?: string;
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
