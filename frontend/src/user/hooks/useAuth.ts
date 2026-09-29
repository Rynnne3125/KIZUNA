import { useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterData } from '../types/auth';
import { authService } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      const current = authService.getCurrentUser();
      if (current) setUser(current);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(credentials);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.register(data);
      setUser(res.user);
      return res.user;
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const toggleRole = useCallback(() => {
    const updated = authService.toggleRoleForTest();
    if (updated) {
      setUser({ ...updated });
    }
    return updated;
  }, []);

  return {
    user,
    setUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ROLE_ADMIN',
    loading,
    error,
    login,
    register,
    logout,
    toggleRole
  };
}
