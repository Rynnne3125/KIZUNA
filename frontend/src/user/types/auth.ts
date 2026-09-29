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
  level?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface RegisterData {
  username: string;
  password?: string;
  fullName: string;
  email: string;
  role?: Role;
}
