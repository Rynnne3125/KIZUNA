export type Role = 'ROLE_ADMIN' | 'ROLE_USER';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  activePoints?: number;
  totalXp?: number;
  currentStreak?: number;
  streakFreezes?: number;
  weeklyActivePoints?: number;
  weeklyPointsWeek?: string;
  weeklyXp?: number;
  weeklyXpWeek?: string;
  level?: string;
  placementVerified?: boolean;
  placementScore?: number;
  lastActiveDate?: string;
  lastStudiedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  username?: string;
  password?: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password?: string;
  username?: string;
  role?: Role;
}
