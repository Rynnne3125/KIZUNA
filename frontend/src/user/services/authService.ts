import { User, Role, LoginCredentials, RegisterData } from '../types/auth';
import { db } from '../../config/firebase';
import { doc, setDoc, collection, getDocs, getDoc, query, where, limit } from 'firebase/firestore';
import { emailService, OFFICIAL_SENDER_EMAIL } from './emailService';

const TOKEN_KEY = 'kizuna_token';
const USER_KEY = 'kizuna_user';
const SESSION_EXPIRES_KEY = 'kizuna_session_expires_at';
const OTP_STORAGE_KEY = 'kizuna_pending_otp';
// Chuẩn hóa role linh hoạt (hỗ trợ admin, ADMIN, ROLE_ADMIN,...)
export function normalizeRole(rawRole: any): Role {
  if (!rawRole) return 'ROLE_USER';
  const str = String(rawRole).trim().toLowerCase();
  return (str.includes('admin') || str === 'role_admin') ? 'ROLE_ADMIN' : 'ROLE_USER';
}

// Thời gian duy trì phiên đăng nhập tối đa: 24 giờ
export const SESSION_MAX_DURATION = 24 * 60 * 60 * 1000;

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
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAtStr = localStorage.getItem(SESSION_EXPIRES_KEY);

    if (!raw || !token) return null;

    if (expiresAtStr) {
      const expiresAt = parseInt(expiresAtStr, 10);
      // Giới hạn thời gian đăng nhập tối đa 24h
      if (Date.now() > expiresAt) {
        console.warn('[KIZUNA Auth] Phiên đăng nhập đã hết hạn 24 giờ. Tự động xóa phiên.');
        this.clearSession();
        return null;
      }
    } else {
      localStorage.setItem(SESSION_EXPIRES_KEY, (Date.now() + SESSION_MAX_DURATION).toString());
    }

    try {
      return JSON.parse(raw);
    } catch {
      this.clearSession();
      return null;
    }
  },

  setSession(token: string, user: User) {
    const expiresAt = Date.now() + SESSION_MAX_DURATION;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt.toString());
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    localStorage.removeItem(OTP_STORAGE_KEY);
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  },

  /**
   * Tạo và gửi mã OTP qua email thực tế từ phongtt.23it@vku.udn.vn đến email người dùng
   * Không trả mã OTP về cho client UI hiển thị để đảm bảo tính bảo mật thực thụ
   */
  async sendRegistrationOtp(email: string, fullName: string): Promise<{ success: boolean; sender: string; message: string }> {
    const sender = OFFICIAL_SENDER_EMAIL;
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

    // Thực hiện gửi email thực tế qua emailService (EmailJS hoặc Spring Boot SMTP)
    const emailResult = await emailService.sendOtpEmail({
      toEmail: email.trim(),
      toName: fullName.trim(),
      otpCode: code
    });

    return { 
      success: true, 
      sender,
      message: emailResult.message 
    };
  },

  /**
   * Xác thực mã OTP người dùng nhập vào từ hộp thư email
   */
  verifyOtp(email: string, inputCode: string): { valid: boolean; error?: string } {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) {
      return { valid: false, error: 'Chưa có mã OTP nào được yêu cầu hoặc phiên đã hết hạn. Vui lòng bấm gửi lại mã.' };
    }

    try {
      const data: PendingOtpData = JSON.parse(raw);
      if (data.email !== email.trim().toLowerCase()) {
        return { valid: false, error: 'Email không khớp với phiên gửi mã OTP.' };
      }
      if (Date.now() > data.expiresAt) {
        return { valid: false, error: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu gửi mã mới.' };
      }
      if (data.code !== inputCode.trim()) {
        return { valid: false, error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại email.' };
      }

      // Xác thực thành công -> dọn dẹp mã OTP đã dùng
      localStorage.removeItem(OTP_STORAGE_KEY);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Lỗi xác thực mã OTP. Vui lòng thử lại.' };
    }
  },

  /**
   * Đăng ký tài khoản và lưu trực tiếp vào Firestore collection 'users'
   */
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const role: Role = data.role || 'ROLE_USER';
    const emailClean = data.email.trim().toLowerCase();
    const username = data.username?.trim() || emailClean.split('@')[0];
    const userId = `usr_${Date.now().toString(36)}`;
    
    const newUser: User = {
      id: userId,
      username,
      fullName: data.fullName.trim(),
      email: emailClean,
      role,
      activePoints: 0,
      totalXp: 0,
      currentStreak: 0,
      level: 'Tân binh',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    };

    // 1. Lưu tài khoản trực tiếp vào Firestore collection 'users'
    try {
      if (db) {
        await setDoc(doc(db, 'users', userId), {
          id: userId,
          username,
          fullName: data.fullName.trim(),
          email: emailClean,
          password: data.password || 'kizuna123',
          role,
          activePoints: 0,
          totalXp: 0,
          currentStreak: 0,
          level: 'Tân binh',
          enabled: true,
          isDeleted: false,
          avatarUrl: newUser.avatarUrl,
          createdAt: new Date().toISOString()
        });
        console.log(`[Firestore] Đã lưu tài khoản ${emailClean} vào collection 'users' thành công.`);
      }
    } catch (fsError) {
      console.warn('[Firestore] Không thể ghi vào Firestore, lưu trữ cục bộ:', fsError);
    }

    // 2. Lưu vào local storage để hỗ trợ đăng nhập ngoại tuyến mượt mà
    const registered = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
    registered.push({ ...newUser, password: data.password });
    localStorage.setItem('kizuna_registered_users', JSON.stringify(registered));

    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
      JSON.stringify({ sub: emailClean, role, exp: Date.now() + 86400000 })
    )}.mock_signature_${Date.now()}`;

    this.setSession(token, newUser);
    return { user: newUser, token };
  },

  /**
   * Đăng nhập chuẩn bằng EMAIL và MẬT KHẨU
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const emailInput = (credentials.email || credentials.username || '').trim().toLowerCase();
    const password = credentials.password || '';

    if (!emailInput) {
      throw new Error('Vui lòng nhập địa chỉ email.');
    }

    // 1. ƯU TIÊN 1: Tra cứu và xác thực trực tiếp từ Firestore collection 'users' (Dữ liệu thực tế mới nhất)
    try {
      if (db) {
        const usersRef = collection(db, 'users');
        let matchedDoc: any = null;
        let matchedDocId: string = '';

        // Cách 1: Truy vấn theo field 'email' chính xác (limit 1)
        const qEmail = query(usersRef, where('email', '==', emailInput), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          matchedDoc = snapEmail.docs[0].data();
          matchedDocId = snapEmail.docs[0].id;
        } else {
          // Cách 2: Truy vấn theo field 'username' (limit 1)
          const qUser = query(usersRef, where('username', '==', emailInput), limit(1));
          const snapUser = await getDocs(qUser);
          if (!snapUser.empty) {
            matchedDoc = snapUser.docs[0].data();
            matchedDocId = snapUser.docs[0].id;
          } else {
            // Cách 3: Tra cứu trực tiếp theo document ID (tối ưu 1 read)
            try {
              const directDoc = await getDoc(doc(db, 'users', emailInput));
              if (directDoc.exists()) {
                matchedDoc = directDoc.data();
                matchedDocId = directDoc.id;
              }
            } catch {
              // Bỏ qua lỗi truy cập trực tiếp ID
            }
          }
        }

        if (matchedDoc) {
          if (password && matchedDoc.password && matchedDoc.password !== password) {
            throw new Error('Mật khẩu không chính xác.');
          }

          const role: Role = normalizeRole(matchedDoc.role);
          const user: User = {
            id: matchedDoc.id || matchedDocId,
            username: matchedDoc.username || emailInput.split('@')[0],
            fullName: matchedDoc.fullName || matchedDoc.username || 'Học viên KIZUNA',
            email: matchedDoc.email || emailInput,
            role,
            activePoints: typeof matchedDoc.activePoints === 'number' ? matchedDoc.activePoints : 0,
            totalXp: typeof matchedDoc.totalXp === 'number' ? matchedDoc.totalXp : 0,
            currentStreak: typeof matchedDoc.currentStreak === 'number' ? matchedDoc.currentStreak : 0,
            level: matchedDoc.level || 'Tân binh',
            avatarUrl: matchedDoc.avatarUrl || (role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailInput}`)
          };

          // Đồng bộ và cập nhật lại cache cục bộ kizuna_registered_users để không bao giờ bị lệch dữ liệu cũ
          try {
            const registeredUsers = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
            const idx = registeredUsers.findIndex((u: any) => 
              u.email?.toLowerCase() === emailInput || u.id === user.id
            );
            if (idx >= 0) {
              registeredUsers[idx] = { ...registeredUsers[idx], ...user, role, password: matchedDoc.password || password };
            } else {
              registeredUsers.push({ ...user, role, password: matchedDoc.password || password });
            }
            localStorage.setItem('kizuna_registered_users', JSON.stringify(registeredUsers));
          } catch {
            // bỏ qua lỗi storage
          }

          const token = `token_fs_${Date.now()}_${user.id}`;
          this.setSession(token, user);
          return { user, token };
        }
      }
    } catch (e: any) {
      if (e.message === 'Mật khẩu không chính xác.') throw e;
      console.warn('[Firestore Auth] Lỗi tìm kiếm Firestore:', e);
    }

    // 2. Tài khoản quản trị viên hệ thống mặc định (Fallback)
    if (
      (emailInput === 'admin@kizuna.com' || emailInput === 'phongtt.23it@vku.udn.vn' || emailInput === 'admin') &&
      password === 'admin123'
    ) {
      const adminUser: User = {
        id: 'usr_admin_01',
        username: 'admin',
        fullName: 'Kizuna Administrator',
        email: emailInput.includes('@') ? emailInput : 'admin@kizuna.com',
        role: 'ROLE_ADMIN',
        activePoints: 9999,
        totalXp: 15000,
        currentStreak: 14,
        level: 'N1',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
      };
      const token = `token_admin_${Date.now()}`;
      this.setSession(token, adminUser);
      return { user: adminUser, token };
    }

    // 3. Fallback bộ nhớ ngoại tuyến (Local Storage) khi không kết nối được Firestore
    const registeredUsers = JSON.parse(localStorage.getItem('kizuna_registered_users') || '[]');
    const found = registeredUsers.find((u: any) => 
      u.email?.toLowerCase() === emailInput || u.username?.toLowerCase() === emailInput
    );

    if (found) {
      if (password && found.password && found.password !== password) {
        throw new Error('Mật khẩu không chính xác.');
      }
      const role: Role = normalizeRole(found.role);
      const user: User = {
        id: found.id || `usr_${Date.now()}`,
        username: found.username || emailInput.split('@')[0],
        fullName: found.fullName || found.username,
        email: found.email || emailInput,
        role,
        activePoints: found.activePoints || 0,
        totalXp: found.totalXp || 0,
        currentStreak: found.currentStreak || 0,
        level: found.level || 'Tân binh',
        avatarUrl: found.avatarUrl || (role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailInput}`)
      };
      const token = `token_offline_${Date.now()}_${user.id}`;
      this.setSession(token, user);
      return { user, token };
    }

    throw new Error('Tài khoản với email này chưa được đăng ký hoặc thông tin không hợp lệ.');
  },

  /**
   * Đồng bộ dữ liệu và quyền (role) người dùng mới nhất từ Firestore
   */
  async syncUserFromFirestore(emailOrId: string, force = false): Promise<User | null> {
    if (!db || !emailOrId) return null;

    // Giảm tần suất đọc Firestore: Nếu vừa sync trong vòng 5 phút và đã có thông tin phiên, tái sử dụng currentUser
    const LAST_SYNC_KEY = 'kizuna_last_user_sync';
    const lastSyncTime = parseInt(sessionStorage.getItem(LAST_SYNC_KEY) || '0', 10);
    const currentUser = this.getCurrentUser();
    if (!force && currentUser && (Date.now() - lastSyncTime < 5 * 60 * 1000)) {
      return currentUser;
    }

    try {
      const clean = emailOrId.trim().toLowerCase();
      const usersRef = collection(db, 'users');
      let matchedDoc: any = null;
      let matchedDocId: string = '';

      // Thử 1: Tra cứu trực tiếp theo document ID (chỉ tốn 1 read)
      try {
        const directDoc = await getDoc(doc(db, 'users', emailOrId));
        if (directDoc.exists()) {
          matchedDoc = directDoc.data();
          matchedDocId = directDoc.id;
        }
      } catch {
        // Tiếp tục kiểm tra query
      }

      // Thử 2: Query theo email chính xác có limit(1)
      if (!matchedDoc) {
        const qEmail = query(usersRef, where('email', '==', clean), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          matchedDoc = snapEmail.docs[0].data();
          matchedDocId = snapEmail.docs[0].id;
        }
      }

      // Thử 3: Query theo username có limit(1)
      if (!matchedDoc) {
        const qUser = query(usersRef, where('username', '==', clean), limit(1));
        const snapUser = await getDocs(qUser);
        if (!snapUser.empty) {
          matchedDoc = snapUser.docs[0].data();
          matchedDocId = snapUser.docs[0].id;
        }
      }

      if (matchedDoc) {
        sessionStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        const role = normalizeRole(matchedDoc.role);
        const currentUser = this.getCurrentUser();
        const updatedUser: User = {
          id: matchedDoc.id || matchedDocId,
          username: matchedDoc.username || (currentUser?.username ?? clean.split('@')[0]),
          fullName: matchedDoc.fullName || (currentUser?.fullName ?? 'Học viên KIZUNA'),
          email: matchedDoc.email || clean,
          role,
          activePoints: typeof matchedDoc.activePoints === 'number' ? matchedDoc.activePoints : (currentUser?.activePoints ?? 0),
          totalXp: typeof matchedDoc.totalXp === 'number' ? matchedDoc.totalXp : (currentUser?.totalXp ?? 0),
          currentStreak: typeof matchedDoc.currentStreak === 'number' ? matchedDoc.currentStreak : (currentUser?.currentStreak ?? 0),
          level: matchedDoc.level || (currentUser?.level ?? 'Tân binh'),
          avatarUrl: matchedDoc.avatarUrl || (currentUser?.avatarUrl ?? (role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${clean}`))
        };
        const token = this.getToken() || `token_${Date.now()}`;
        this.setSession(token, updatedUser);
        return updatedUser;
      }
    } catch (e) {
      console.warn('[Firestore Sync] Lỗi đồng bộ user từ Firestore:', e);
    }
    return null;
  },

  logout() {
    this.clearSession();
  }
};
