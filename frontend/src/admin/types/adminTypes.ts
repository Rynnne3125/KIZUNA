export type AdminRole = 'ROLE_ADMIN' | 'ROLE_USER';

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: AdminRole;
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  level: string;
  totalXp: number;
  activePoints: number;
  createdAt: string;
}

export interface AiEvaluationAudit {
  id: string;
  userId: string;
  username: string;
  milestoneTitle: string;
  questTitle: string;
  userSubmission: string;
  aiScore: number;
  aiFeedback: string;
  studentAppealReason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
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
