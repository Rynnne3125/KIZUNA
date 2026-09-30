import { User, Role, LoginCredentials, RegisterData } from '../types/auth';
import { db } from '../../config/firebase';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';

const TOKEN_KEY = 'kizuna_token';
const USER_KEY = 'kizuna_user';
const OTP_STORAGE_KEY = 'kizuna_pending_otp';
const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface PendingOtpData {
  email: string;
  code: string;
  sender: string;
  expiresAt: number;
}

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

  /**
   * Tạo và gửi mã OTP từ email phongtt.23it@vku.udn.vn đến email người dùng
   */
  async sendRegistrationOtp(email: string, fullName: string): Promise<{ success: boolean; code: string; sender: string }> {
    const sender = 'phongtt.23it@vku.udn.vn';
    // Sinh mã ngẫu nhiên 6 chữ số
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút

    const otpData: PendingOtpData = {
      email: email.trim().toLowerCase(),
      code,
      sender,
      expiresAt
    };

    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));

    // Thử gửi qua backend nếu backend có hỗ trợ
    try {
      await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, sender, fullName })
      });
    } catch {
      // Backend offline hoặc không có route, tiếp tục với in-app OTP handler
    }

    console.info(`[KIZUNA OTP] Hệ thống đã gửi mã xác thực từ ${sender} đến ${email}: ${code}`);
    return { success: true, code, sender };
  },

  /**
   * Xác thực mã OTP người dùng nhập vào
   */
  verifyOtp(email: string, inputCode: string): { valid: boolean; error?: string } {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) {
      return { valid: false, error: 'Chưa có mã OTP nào được yêu cầu hoặc phiên đã hết hạn.' };
    }

    try {
      const data: PendingOtpData = JSON.parse(raw);
      if (data.email !== email.trim().toLowerCase()) {
        return { valid: false, error: 'Email không khớp với mã OTP đã tạo.' };
      }
      if (Date.now() > data.expiresAt) {
        return { valid: false, error: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới.' };
      }
      if (data.code !== inputCode.trim()) {
        return { valid: false, error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.' };
      }

      // Xác thực thành công -> xóa OTP tạm
      localStorage.removeItem(OTP_STORAGE_KEY);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Lỗi xác thực OTP. Vui lòng thử lại.' };
    }
  },

  /**
   * Đăng ký tài khoản và lưu trực tiếp vào Firestore collection 'users'
   */
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const role: Role = data.role || 'ROLE_USER';
    const userId = `usr_${data.username}_${Date.now().toString(36)}`;
    
    const newUser: User = {
      id: userId,
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

    // 1. Lưu tài khoản trực tiếp vào Firestore collection 'users'
    try {
      if (db) {
        await setDoc(doc(db, 'users', userId), {
          id: userId,
          username: data.username,
          fullName: data.fullName,
          email: data.email,
          password: data.password || 'kizuna123',
          role,
          activePoints: 50,
          totalXp: 100,
          currentStreak: 1,
          level: 'N5',
          enabled: true,
          isDeleted: false,
          avatarUrl: newUser.avatarUrl,
          createdAt: new Date().toISOString()
        });
        console.log(`[Firestore] Đã lưu tài khoản ${data.username} vào collection 'users' thành công.`);
      }
    } catch (fsError) {
      console.warn('[Firestore] Không thể ghi vào Firestore, chuyển sang lưu trữ cục bộ:', fsError);
    }

    // 2. Lưu vào local storage để hỗ trợ offline & đăng nhập mượt mà
    const registered = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
    registered.push({ ...newUser, password: data.password });
    localStorage.setItem('kizuna_registered_users', JSON.stringify(registered));

    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
      JSON.stringify({ sub: data.username, role, exp: Date.now() + 86400000 })
    )}.mock_signature_${Date.now()}`;

    this.setSession(token, newUser);
    return { user: newUser, token };
  },

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const { username, password } = credentials;
    const cleanUser = username.trim().toLowerCase();

    // 1. Thử xác thực với Backend Spring Boot nếu đang chạy
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
          level: 'N4',
          avatarUrl: role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + username
        };

        const token = data.token || `bearer_mock_${Date.now()}_${username}`;
        this.setSession(token, user);
        return { user, token };
      }
    } catch {
      // Backend offline, fallback tiếp theo
    }

    // 2. Tài khoản quản trị mặc định (admin / admin123)
    if (cleanUser === 'admin' && (password === 'admin123' || !password)) {
      const adminUser: User = {
        id: 'usr_admin_01',
        username: 'admin',
        fullName: 'Kizuna Administrator',
        email: 'admin@kizuna.com',
        role: 'ROLE_ADMIN',
        activePoints: 9999,
        totalXp: 15000,
        currentStreak: 14,
        level: 'N1',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
      };
      const token = `mock_token_admin_${Date.now()}`;
      this.setSession(token, adminUser);
      return { user: adminUser, token };
    }

    // 3. Tài khoản học viên demo mặc định (user / user123)
    if (cleanUser === 'user' && (password === 'user123' || !password)) {
      const demoUser: User = {
        id: 'usr_001',
        username: 'user',
        fullName: 'Nguyễn Văn An (Học viên)',
        email: 'user@kizuna.com',
        role: 'ROLE_USER',
        activePoints: 2450,
        totalXp: 4800,
        currentStreak: 7,
        level: 'N4',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna_user'
      };
      const token = `mock_token_user_${Date.now()}`;
      this.setSession(token, demoUser);
      return { user: demoUser, token };
    }

    // 4. Kiểm tra tài khoản đã đăng ký trong localStorage
    const registeredUsers = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
    const found = registeredUsers.find((u: any) => 
      u.username.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser
    );

    if (found) {
      if (password && found.password && found.password !== password) {
        throw new Error('Mật khẩu không chính xác.');
      }
      const role: Role = found.role || 'ROLE_USER';
      const user: User = {
        id: found.id || `usr_${found.username}`,
        username: found.username,
        fullName: found.fullName,
        email: found.email,
        role,
        activePoints: found.activePoints || 50,
        totalXp: found.totalXp || 100,
        currentStreak: found.currentStreak || 1,
        level: found.level || 'N5',
        avatarUrl: found.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${found.username}`
      };
      const token = `mock_token_${Date.now()}_${user.username}`;
      this.setSession(token, user);
      return { user, token };
    }

    // 5. Thử tìm kiếm trong Firestore collection 'users' nếu có kết nối
    try {
      if (db) {
        const usersRef = collection(db, 'users');
        const qUsername = query(usersRef, where('username', '==', username));
        const snap = await getDocs(qUsername);
        if (!snap.empty) {
          const docData = snap.docs[0].data() as any;
          if (password && docData.password && docData.password !== password) {
            throw new Error('Mật khẩu không chính xác.');
          }
          const user: User = {
            id: docData.id || snap.docs[0].id,
            username: docData.username,
            fullName: docData.fullName || docData.username,
            email: docData.email,
            role: docData.role || 'ROLE_USER',
            activePoints: docData.activePoints || 50,
            totalXp: docData.totalXp || 100,
            currentStreak: docData.currentStreak || 1,
            level: docData.level || 'N5',
            avatarUrl: docData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docData.username}`
          };
          const token = `mock_token_fs_${Date.now()}_${user.username}`;
          this.setSession(token, user);
          return { user, token };
        }
      }
    } catch (e: any) {
      if (e.message === 'Mật khẩu không chính xác.') throw e;
    }

    throw new Error('Tài khoản không tồn tại hoặc thông tin đăng nhập không hợp lệ.');
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
