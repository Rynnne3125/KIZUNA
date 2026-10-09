export type AdminRole = 'ROLE_ADMIN' | 'ROLE_USER';

export interface AdminUser {
  id: string;
  username?: string;
  fullName?: string;
  email?: string;
  role?: AdminRole;
  status?: string;
  level?: string;
  totalXp?: number;
  activePoints?: number;
  createdAt?: string;
  [key: string]: any;
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
  [key: string]: any;
}

export interface Milestone {
  id: string;
  [key: string]: any;
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
