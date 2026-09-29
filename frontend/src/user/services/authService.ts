import { User, Role, LoginCredentials, RegisterData } from '../types/auth';

const TOKEN_KEY = 'kizuna_token';
const USER_KEY = 'kizuna_user';
const API_BASE_URL = 'http://localhost:3000/api/v1';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  },

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const { username, password } = credentials;

    // 1. Try Spring Boot Backend if available
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const body = await res.json();
        const data = body.data || body;
        const role: Role = data.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER';
        const user: User = {
          id: data.id || (role === 'ROLE_ADMIN' ? 'usr_admin_01' : 'usr_user_01'),
          username: data.username || username,
          fullName: data.fullName || (role === 'ROLE_ADMIN' ? 'Kizuna Administrator' : 'Học Viên Kizuna'),
          email: data.email || `${username}@kizuna.com`,
          role,
          activePoints: 2450,
          totalXp: 4800,
          currentStreak: 7,
          level: 'N4'
        };

        const token = data.token || `bearer_mock_${Date.now()}_${username}`;
        this.setSession(token, user);
        return { user, token };
      }
    } catch {
      console.warn('Backend at localhost:3000 unavailable. Falling back to local auth.');
    }

    // 2. Fallback Mock Authentication (Seamless offline & demo support)
    let role: Role = 'ROLE_USER';
    let fullName = 'Học Viên Kizuna';
    let email = `${username}@kizuna.com`;

    if (username.toLowerCase() === 'admin') {
      role = 'ROLE_ADMIN';
      fullName = 'Kizuna Administrator (Admin)';
      email = 'admin@kizuna.com';
    } else {
      const registeredUsers = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
      const found = registeredUsers.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      if (found) {
        role = found.role || 'ROLE_USER';
        fullName = found.fullName;
        email = found.email;
      }
    }

    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
      JSON.stringify({ sub: username, role, exp: Date.now() + 86400000 })
    )}.mock_signature_${Date.now()}`;

    const user: User = {
      id: `usr_${username}_${Date.now().toString(36)}`,
      username,
      fullName,
      email,
      role,
      activePoints: role === 'ROLE_ADMIN' ? 9999 : 2450,
      totalXp: role === 'ROLE_ADMIN' ? 15000 : 4800,
      currentStreak: 7,
      level: 'N4',
      avatarUrl: role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'
    };

    this.setSession(mockToken, user);
    return { user, token: mockToken };
  },

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const role: Role = data.role || 'ROLE_USER';
    const newUser: User = {
      id: `usr_${data.username}_${Date.now().toString(36)}`,
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      role,
      activePoints: 50,
      totalXp: 100,
      currentStreak: 1,
      level: 'N5',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`
    };

    const registered = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
    registered.push({ ...newUser, password: data.password });
    localStorage.setItem('kizuna_registered_users', JSON.stringify(registered));

    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
      JSON.stringify({ sub: data.username, role, exp: Date.now() + 86400000 })
    )}.mock_signature_${Date.now()}`;

    this.setSession(token, newUser);
    return { user: newUser, token };
  },

  logout() {
    this.clearSession();
  },

  toggleRoleForTest(): User | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const newRole: Role = current.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
    const updated = {
      ...current,
      role: newRole,
      fullName: newRole === 'ROLE_ADMIN' ? 'Kizuna Administrator (Test)' : 'Học Viên Kizuna (Test)'
    };
    this.setSession(this.getToken() || 'mock_token', updated);
    return updated;
  }
};
