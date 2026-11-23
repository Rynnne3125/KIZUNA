import { User, Role, LoginCredentials, RegisterData } from '../types/auth';
import { db, auth } from '../../config/firebase';
import { doc, setDoc, updateDoc, collection, getDocs, getDoc, query, where, limit } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signInWithCredential, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { emailService, OFFICIAL_SENDER_EMAIL } from './emailService';
import { validateEmail, validatePassword } from '../utils/authValidation';

export const ADMIN_EMAILS = [
  'banhbeothuy10@gmail.com',
  'phongtt.23it@vku.udn.vn',
  'admin@kizuna.com'
];

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean) || clean === 'admin';
}

const TOKEN_KEY = 'kizuna_token';
const BACKEND_JWT_KEY = 'kizuna_backend_jwt';
const USER_KEY = 'kizuna_user';
const SESSION_EXPIRES_KEY = 'kizuna_session_expires_at';
const OTP_STORAGE_KEY = 'kizuna_pending_otp';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function requestBackendJwtLogin(usernameOrEmail: string, password: string): Promise<string | null> {
  if (!usernameOrEmail || !password) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameOrEmail, password }),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const jwt = payload?.data?.token;
    if (typeof jwt === 'string' && jwt.includes('.')) {
      localStorage.setItem(BACKEND_JWT_KEY, jwt);
      return jwt;
    }
  } catch {
    // Backend may be offline in static/offline environments; Firestore session still works.
  }
  return null;
}

async function requestBackendJwtFromFirebase(fbUser: any): Promise<string | null> {
  try {
    if (!fbUser || typeof fbUser.getIdToken !== 'function') return null;
    const idToken = await fbUser.getIdToken();
    if (!idToken) return null;
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/firebase-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const jwt = payload?.data?.token;
    if (typeof jwt === 'string' && jwt.includes('.')) {
      localStorage.setItem(BACKEND_JWT_KEY, jwt);
      return jwt;
    }
  } catch {
    // Non-fatal fallback
  }
  return null;
}
// Chuẩn hóa role linh hoạt (hỗ trợ admin, ADMIN, ROLE_ADMIN,...)
export function normalizeRole(rawRole: any): Role {
  if (!rawRole) return 'ROLE_USER';
  const str = String(rawRole).trim().toLowerCase();
  return (str.includes('admin') || str === 'role_admin') ? 'ROLE_ADMIN' : 'ROLE_USER';
}

// Thời gian duy trì phiên đăng nhập tối đa: 24 giờ
export const SESSION_MAX_DURATION = 24 * 60 * 60 * 1000;

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const PASSWORD_SALT = 'kizuna_salt_sec_2026';

/**
 * Mã hóa mật khẩu bảo mật bằng SHA-256 kèm Salt
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(plainText + PASSWORD_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    hash = (hash << 5) - hash + plainText.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}_${PASSWORD_SALT}`;
}

export interface PendingOtpData {
  email: string;
  code: string;
  sender: string;
  expiresAt: number;
}

/**
 * Lấy chuỗi ngày lịch địa phương theo định dạng YYYY-MM-DD (dựa trên múi giờ thực tế của thiết bị)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateToLocalString(dateOrIso?: string | null): string | null {
  if (!dateOrIso) return null;
  const trimmed = dateOrIso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return getLocalDateString(d);
    }
  } catch {
    // fallback
  }
  return trimmed.slice(0, 10);
}

export function calculateCalendarDaysDiff(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const fromMidnight = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
  const toMidnight = new Date(ty, tm - 1, td, 0, 0, 0, 0);
  const diffMs = toMidnight.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface StreakEvaluationResult {
  newStreak: number;
  streakUpdated: boolean;
  daysDifference: number;
  isConsecutive: boolean;
  isBroken: boolean;
  todayStr: string;
  message?: string;
}

export function evaluateDailyStreak(
  currentStreak: number = 0,
  lastActiveDateRaw?: string | null,
  now: Date = new Date()
): StreakEvaluationResult {
  const todayStr = getLocalDateString(now);
  const lastActiveStr = normalizeDateToLocalString(lastActiveDateRaw);

  if (!lastActiveStr) {
    const initialStreak = Math.max(1, currentStreak || 1);
    return {
      newStreak: initialStreak,
      streakUpdated: true,
      daysDifference: 0,
      isConsecutive: false,
      isBroken: false,
      todayStr,
      message: 'Chào mừng bạn! Chuỗi học tập KIZUNA bắt đầu từ hôm nay.'
    };
  }

  if (lastActiveStr === todayStr) {
    return {
      newStreak: Math.max(1, currentStreak || 1),
      streakUpdated: false,
      daysDifference: 0,
      isConsecutive: false,
      isBroken: false,
      todayStr
    };
  }

  const diffDays = calculateCalendarDaysDiff(lastActiveStr, todayStr);

  if (diffDays === 1) {
    const newStreak = (currentStreak || 0) + 1;
    return {
      newStreak,
      streakUpdated: true,
      daysDifference: 1,
      isConsecutive: true,
      isBroken: false,
      todayStr,
      message: `🔥 Tuyệt vời! Bạn đã duy trì chuỗi học tập ${newStreak} ngày liên tiếp!`
    };
  }

  if (diffDays > 1) {
    return {
      newStreak: 1,
      streakUpdated: true,
      daysDifference: diffDays,
      isConsecutive: false,
      isBroken: true,
      todayStr,
      message: 'Chuỗi học tập mới đã bắt đầu hôm nay. Hãy duy trì đều đặn mỗi ngày nhé!'
    };
  }

  return {
    newStreak: Math.max(1, currentStreak || 1),
    streakUpdated: false,
    daysDifference: diffDays,
    isConsecutive: false,
    isBroken: false,
    todayStr
  };
}

export const authService = {
  /**
   * Tự động kiểm tra và cập nhật chuỗi Streak theo ngày thực tế (Real-day Streak)
   * Khi qua ngày mới mà người dùng vào app:
   * - Nếu là ngày liên tiếp (diffDays === 1): Tăng streak thêm 1 (+1 day streak)
   * - Nếu bị lỡ >= 1 ngày (diffDays > 1): Khởi tạo lại chuỗi streak = 1
   * - Nếu đã vào app hôm nay (diffDays === 0): Giữ nguyên streak
   */
  async checkAndUpdateDailyStreak(targetUser?: User | null): Promise<{ user: User; evaluation: StreakEvaluationResult } | null> {
    const user = targetUser || this.getCurrentUser();
    if (!user || !user.id) return null;

    const evaluation = evaluateDailyStreak(user.currentStreak, user.lastActiveDate);
    if (!evaluation.streakUpdated) {
      return { user, evaluation };
    }

    const updatedUser: User = {
      ...user,
      currentStreak: evaluation.newStreak,
      lastActiveDate: evaluation.todayStr,
      lastStudiedAt: new Date().toISOString()
    };

    // 1. Cập nhật localStorage phiên đăng nhập
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

    // 2. Cập nhật cache kizuna_registered_users
    try {
      const regRaw = localStorage.getItem('kizuna_registered_users');
      if (regRaw) {
        const regUsers = safeJsonParse<any[]>(regRaw, []);
        const idx = regUsers.findIndex((u: any) => u.id === user.id || (u.email && u.email.toLowerCase() === user.email?.toLowerCase()));
        if (idx >= 0) {
          regUsers[idx].currentStreak = evaluation.newStreak;
          regUsers[idx].lastActiveDate = evaluation.todayStr;
          regUsers[idx].lastStudiedAt = updatedUser.lastStudiedAt;
          localStorage.setItem('kizuna_registered_users', JSON.stringify(regUsers));
        }
      }
    } catch {
      // ignore
    }

    // 3. Đồng bộ lên Firestore (nếu có mạng)
    if (db && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          currentStreak: evaluation.newStreak,
          lastActiveDate: evaluation.todayStr,
          lastStudiedAt: updatedUser.lastStudiedAt
        });
      } catch (err) {
        console.warn('[Streak] Lỗi cập nhật Firestore users:', err);
      }

      try {
        const lbRef = doc(db, 'leaderboard', user.id);
        await updateDoc(lbRef, {
          currentStreak: evaluation.newStreak,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // bỏ qua nếu doc leaderboard chưa tồn tại
      }
    }

    // 4. Phát sự kiện để Header, Navbar, Profile cập nhật tức thì
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kizuna_user_updated', { detail: { user: updatedUser, evaluation } }));
      if (evaluation.isConsecutive) {
        window.dispatchEvent(new CustomEvent('kizuna_streak_increased', { detail: { newStreak: evaluation.newStreak, message: evaluation.message } }));
      }
    }

    return { user: updatedUser, evaluation };
  },

  getToken(): string | null {
    return localStorage.getItem(BACKEND_JWT_KEY) || localStorage.getItem(TOKEN_KEY);
  },

  getBackendJwt(): string | null {
    const jwt = localStorage.getItem(BACKEND_JWT_KEY);
    if (jwt && jwt.split('.').length === 3) return jwt;
    const tok = localStorage.getItem(TOKEN_KEY);
    if (tok && tok.split('.').length === 3 && !tok.includes('mock_signature')) return tok;
    return null;
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

  updateCurrentUser(updatedUser: Partial<User>) {
    const current = this.getCurrentUser();
    if (!current) return;
    const merged = { ...current, ...updatedUser };
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
    const expiresAt = Date.now() + SESSION_MAX_DURATION;
    localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt.toString());
    window.dispatchEvent(new Event('kizuna_user_updated'));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(BACKEND_JWT_KEY);
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
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      throw new Error(emailCheck.error || 'Địa chỉ email không hợp lệ.');
    }
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
    const emailCheck = validateEmail(data.email);
    if (!emailCheck.isValid) {
      throw new Error(emailCheck.error || 'Địa chỉ email không hợp lệ.');
    }
    const pwdCheck = validatePassword(data.password || '');
    if (!pwdCheck.isValid) {
      throw new Error(pwdCheck.error || 'Mật khẩu chưa đáp ứng tiêu chuẩn bảo mật.');
    }
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

    // 1. Mã hóa mật khẩu bảo mật trước khi lưu
    const hashedPassword = await hashPassword(data.password || 'kizuna123');

    // 2. Lưu tài khoản trực tiếp vào Firestore collection 'users'
    try {
      if (db) {
        await setDoc(doc(db, 'users', userId), {
          id: userId,
          username,
          fullName: data.fullName.trim(),
          email: emailClean,
          password: hashedPassword, // ĐÃ ĐƯỢC MÃ HÓA BẢO MẬT
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
        console.log(`[Firestore] Đã lưu tài khoản ${emailClean} (mật khẩu đã mã hóa) vào collection 'users' thành công.`);
      }
    } catch (fsError) {
      console.warn('[Firestore] Không thể ghi vào Firestore, lưu trữ cục bộ:', fsError);
    }

    // 3. Lưu vào local storage để hỗ trợ đăng nhập ngoại tuyến mượt mà
    const registered = safeJsonParse<any[]>(localStorage.getItem('kizuna_registered_users'), []);
    registered.push({ ...newUser, password: hashedPassword });
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
          const hashedInput = await hashPassword(password);
          if (password && matchedDoc.password) {
            const isMatch = (matchedDoc.password === hashedInput) || (matchedDoc.password === password);
            if (!isMatch) {
              throw new Error('Mật khẩu không chính xác.');
            }
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
            avatarUrl: matchedDoc.avatarUrl || (role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailInput}`),
            lastActiveDate: matchedDoc.lastActiveDate,
            lastStudiedAt: matchedDoc.lastStudiedAt
          };

          // Tự động kiểm tra và cập nhật streak theo ngày thực tế ngay khi đăng nhập
          const streakRes = await this.checkAndUpdateDailyStreak(user);
          const finalUser = streakRes?.user || user;

          // Đồng bộ và cập nhật lại cache cục bộ kizuna_registered_users để không bao giờ bị lệch dữ liệu cũ
          try {
            const registeredUsers = safeJsonParse<any[]>(localStorage.getItem('kizuna_registered_users'), []);
            const idx = registeredUsers.findIndex((u: any) => 
              u.email?.toLowerCase() === emailInput || u.id === finalUser.id
            );
            if (idx >= 0) {
              registeredUsers[idx] = { ...registeredUsers[idx], ...finalUser, role, password: matchedDoc.password || hashedInput };
            } else {
              registeredUsers.push({ ...finalUser, role, password: matchedDoc.password || hashedInput });
            }
            localStorage.setItem('kizuna_registered_users', JSON.stringify(registeredUsers));
          } catch {
            // bỏ qua lỗi storage
          }

          const backendJwt = await requestBackendJwtLogin(emailInput, password);
          const token = backendJwt || `token_fs_${Date.now()}_${finalUser.id}`;
          this.setSession(token, finalUser);
          return { user: finalUser, token };
        }
      }
    } catch (e: any) {
      if (e.message === 'Mật khẩu không chính xác.') throw e;
      console.warn('[Firestore Auth] Lỗi tìm kiếm Firestore:', e);
    }

    // 2. Tài khoản quản trị viên hệ thống mặc định (Fallback)
    if (
      (emailInput === 'banhbeothuy10@gmail.com' || emailInput === 'admin@kizuna.com' || emailInput === 'phongtt.23it@vku.udn.vn' || emailInput === 'admin') &&
      password === 'admin123'
    ) {
      const adminUser: User = {
        id: 'usr_admin_banhbeothuy10',
        username: 'banhbeothuy10',
        fullName: 'Thúy Trần (Admin)',
        email: 'banhbeothuy10@gmail.com',
        role: 'ROLE_ADMIN',
        activePoints: 9999,
        totalXp: 15000,
        currentStreak: 14,
        level: 'N1',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
      };
      const backendJwt = await requestBackendJwtLogin(emailInput, password);
      const token = backendJwt || `token_admin_${Date.now()}`;
      this.setSession(token, adminUser);
      return { user: adminUser, token };
    }

    // 3. Fallback bộ nhớ ngoại tuyến (Local Storage) khi không kết nối được Firestore
    const registeredUsers = safeJsonParse<any[]>(localStorage.getItem('kizuna_registered_users'), []);
    const found = registeredUsers.find((u: any) => 
      u.email?.toLowerCase() === emailInput || u.username?.toLowerCase() === emailInput
    );

    if (found) {
      const hashedInput = await hashPassword(password);
      if (password && found.password) {
        const isMatch = (found.password === hashedInput) || (found.password === password);
        if (!isMatch) {
          throw new Error('Mật khẩu không chính xác.');
        }
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
        avatarUrl: found.avatarUrl || (role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailInput}`),
        lastActiveDate: found.lastActiveDate,
        lastStudiedAt: found.lastStudiedAt
      };
      const streakRes = await this.checkAndUpdateDailyStreak(user);
      const finalUser = streakRes?.user || user;
      const token = `token_offline_${Date.now()}_${finalUser.id}`;
      this.setSession(token, finalUser);
      return { user: finalUser, token };
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
          avatarUrl: matchedDoc.avatarUrl || (currentUser?.avatarUrl ?? (role === 'ROLE_ADMIN' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=admin' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${clean}`)),
          lastActiveDate: matchedDoc.lastActiveDate || currentUser?.lastActiveDate,
          lastStudiedAt: matchedDoc.lastStudiedAt || currentUser?.lastStudiedAt
        };
        const streakRes = await this.checkAndUpdateDailyStreak(updatedUser);
        const finalUser = streakRes?.user || updatedUser;
        const token = this.getToken() || `token_${Date.now()}`;
        this.setSession(token, finalUser);
        return finalUser;
      }
    } catch (e) {
      console.warn('[Firestore Sync] Lỗi đồng bộ user từ Firestore:', e);
    }
    return null;
  },

  /**
   * Khởi tạo GoogleAuth native nếu đang chạy trong môi trường Capacitor Native (Android / iOS)
   */
  initGoogleAuthNative() {
    if (typeof window === 'undefined') return;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GoogleAuth')) {
      try {
        GoogleAuth.initialize({
          clientId: '657175691442-eeqc6uhf4a8hl4m27oat1pmghk99df0b.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: false
        });
      } catch (err) {
        console.warn('[GoogleAuth Native] Init warning:', err);
      }
    }
  },

  /**
   * Đồng bộ và quản lý phiên làm việc người dùng Firebase với Firestore
   */
  async handleFirebaseUser(fbUser: any): Promise<{ user: User; token: string }> {
    if (!fbUser || !fbUser.email) {
      throw new Error('Không thể lấy thông tin email từ tài khoản Google của bạn.');
    }

    const emailClean = fbUser.email.trim().toLowerCase();
    const displayName = fbUser.displayName?.trim() || emailClean.split('@')[0];
    const photoURL = fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailClean}`;
    const isAdmin = isAdminEmail(emailClean);

    let matchedDoc: any = null;
    let matchedDocId: string = '';

    // 1. Kiểm tra tài khoản trong Firestore 'users'
    if (db) {
      try {
        const usersRef = collection(db, 'users');
        const qEmail = query(usersRef, where('email', '==', emailClean), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          matchedDoc = snapEmail.docs[0].data();
          matchedDocId = snapEmail.docs[0].id;
        } else {
          try {
            const directDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (directDoc.exists()) {
              matchedDoc = directDoc.data();
              matchedDocId = directDoc.id;
            }
          } catch {
            // bỏ qua lỗi đọc id trực tiếp
          }
        }
      } catch (dbErr) {
        console.warn('[Firestore Google Auth] Lỗi tra cứu tài khoản trong Firestore:', dbErr);
      }
    }

    let appUser: User;

    if (matchedDoc) {
      // Đã có tài khoản: Giữ nguyên toàn bộ tiến độ học tập (XP, Điểm, Streak, Cấp độ)
      const role: Role = isAdmin ? 'ROLE_ADMIN' : normalizeRole(matchedDoc.role);
      appUser = {
        id: matchedDoc.id || matchedDocId || fbUser.uid,
        username: matchedDoc.username || emailClean.split('@')[0],
        fullName: matchedDoc.fullName || displayName,
        email: matchedDoc.email || emailClean,
        role,
        activePoints: typeof matchedDoc.activePoints === 'number' ? matchedDoc.activePoints : 0,
        totalXp: typeof matchedDoc.totalXp === 'number' ? matchedDoc.totalXp : 0,
        currentStreak: typeof matchedDoc.currentStreak === 'number' ? matchedDoc.currentStreak : 1,
        level: matchedDoc.level || 'Tân binh',
        avatarUrl: matchedDoc.avatarUrl || photoURL,
        lastActiveDate: matchedDoc.lastActiveDate,
        lastStudiedAt: matchedDoc.lastStudiedAt
      };

      const streakRes = await this.checkAndUpdateDailyStreak(appUser);
      if (streakRes?.user) {
        appUser = streakRes.user;
      }

      // Cập nhật lastActiveDate, avatarUrl nếu có thay đổi
      if (db && matchedDocId) {
        try {
          await updateDoc(doc(db, 'users', matchedDocId), {
            lastActiveDate: appUser.lastActiveDate || getLocalDateString(),
            lastStudiedAt: appUser.lastStudiedAt || new Date().toISOString(),
            currentStreak: appUser.currentStreak || 1,
            authProvider: 'google',
            ...(matchedDoc.avatarUrl ? {} : { avatarUrl: photoURL })
          });
        } catch (uErr) {
          console.warn('[Firestore] Lỗi cập nhật lastActiveDate cho Google user:', uErr);
        }
      }
    } else {
      // Người dùng mới: Khởi tạo tài khoản
      const role: Role = isAdmin ? 'ROLE_ADMIN' : 'ROLE_USER';
      const userId = fbUser.uid || `usr_g_${Date.now().toString(36)}`;
      const username = emailClean.split('@')[0];

      appUser = {
        id: userId,
        username,
        fullName: displayName,
        email: emailClean,
        role,
        activePoints: 0,
        totalXp: 0,
        currentStreak: 1,
        level: 'Tân binh',
        avatarUrl: photoURL
      };

      if (db) {
        try {
          await setDoc(doc(db, 'users', userId), {
            id: userId,
            username,
            fullName: displayName,
            email: emailClean,
            role,
            activePoints: 0,
            totalXp: 0,
            currentStreak: 1,
            level: 'Tân binh',
            enabled: true,
            isDeleted: false,
            avatarUrl: photoURL,
            authProvider: 'google',
            createdAt: new Date().toISOString(),
            lastActiveDate: new Date().toISOString(),
            lastStudiedAt: new Date().toISOString()
          });
          console.log(`[Firestore] Đã tạo tài khoản Google mới (${emailClean}) thành công.`);
        } catch (setErr) {
          console.warn('[Firestore] Lỗi tạo tài khoản Google mới trong Firestore:', setErr);
        }
      }
    }

    // Đồng bộ vào Local Storage kizuna_registered_users
    try {
      const registeredUsers = safeJsonParse<any[]>(localStorage.getItem('kizuna_registered_users'), []);
      const idx = registeredUsers.findIndex((u: any) =>
        u.email?.toLowerCase() === emailClean || u.id === appUser.id
      );
      if (idx >= 0) {
        registeredUsers[idx] = { ...registeredUsers[idx], ...appUser, authProvider: 'google' };
      } else {
        registeredUsers.push({ ...appUser, authProvider: 'google' });
      }
      localStorage.setItem('kizuna_registered_users', JSON.stringify(registeredUsers));
    } catch {
      // bỏ qua lỗi storage
    }

    const backendJwt = await requestBackendJwtFromFirebase(fbUser);
    const token = backendJwt || `token_google_${Date.now()}_${appUser.id}`;
    this.setSession(token, appUser);
    window.dispatchEvent(new Event('kizuna_user_updated'));
    return { user: appUser, token };
  },

  /**
   * Đăng nhập hoặc đăng ký nhanh bằng tài khoản Google
   * - Trên ứng dụng di động (Android APK / Capacitor): Sử dụng native Google Play Services dialog trực tiếp trong app
   * - Trên trình duyệt Web máy tính / điện thoại: Sử dụng Firebase Popup / Redirect
   */
  async loginWithGoogle(): Promise<{ user: User; token: string }> {
    if (!auth) {
      throw new Error('Hệ thống Firebase Authentication chưa được khởi tạo. Vui lòng kiểm tra lại cấu hình.');
    }

    // 1. Nếu đang chạy trong Native App (Capacitor Android / iOS)
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.isPluginAvailable('GoogleAuth')) {
        try {
          this.initGoogleAuthNative();
          const googleUser = await GoogleAuth.signIn();
          const idToken = googleUser.authentication?.idToken || (googleUser as any).idToken;
          if (!idToken) {
            throw new Error('Không thể nhận diện mã xác thực Google từ ứng dụng.');
          }
          const credential = GoogleAuthProvider.credential(idToken);
          const result = await signInWithCredential(auth, credential);
          return await this.handleFirebaseUser(result.user);
        } catch (nativeErr: any) {
          console.warn('[GoogleAuth Native] Error:', nativeErr);
          const msg = nativeErr?.message || '';
          const code = (nativeErr?.code ?? '').toString();
          if (msg.includes('12501') || msg.includes('cancelled') || code === '12501') {
            throw new Error('Bạn đã hủy thao tác đăng nhập Google.');
          }
          if (code === '10' || msg.includes('10') || msg.includes('DEVELOPER_ERROR') || msg.toLowerCase().includes('something went wrong')) {
            throw new Error('Lỗi xác thực Google (DEVELOPER_ERROR). Vui lòng: 1) Đợi 5-10 phút để Google cập nhật mã SHA-1 vừa thêm; 2) Đảm bảo Firebase Console đã chọn "Email hỗ trợ dự án" (Support email).');
          }
          if (code === '12500' || msg.includes('12500')) {
            throw new Error('Lỗi xác thực Google (Code 12500). Vui lòng thử lại sau vài phút hoặc kiểm tra tài khoản Google trên thiết bị.');
          }
          throw new Error(msg || 'Đăng nhập Google trên ứng dụng di động thất bại. Vui lòng thử lại.');
        }
      } else {
        throw new Error('Phiên bản APK trên máy bạn chưa hỗ trợ Google Sign-In trực tiếp. Vui lòng cập nhật bản APK mới nhất hoặc đăng nhập bằng Email / Mật khẩu.');
      }
    }

    // 2. Chạy trên trình duyệt Web (Desktop / Mobile Web)
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    let fbUser: any = null;
    try {
      const result = await signInWithPopup(auth, provider);
      fbUser = result.user;
    } catch (authErr: any) {
      console.warn('[Firebase Auth Google] Error:', authErr);
      const code = authErr?.code || '';
      if (code === 'auth/configuration-not-found') {
        throw new Error('Dịch vụ Authentication hoặc phương thức Google chưa được bật trên Firebase Console (Lỗi: auth/configuration-not-found). Vui lòng vào Firebase Console > Authentication > Sign-in method và bật Google.');
      }
      if (code === 'auth/popup-closed-by-user') {
        throw new Error('Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.');
      }
      if (code === 'auth/popup-blocked') {
        // Nếu trình duyệt di động chặn popup, thử dùng signInWithRedirect
        try {
          await signInWithRedirect(auth, provider);
          return new Promise(() => {}); // Chờ điều hướng
        } catch (redirErr: any) {
          throw new Error('Trình duyệt đã chặn cửa sổ Popup. Vui lòng cho phép popup để đăng nhập bằng Google.');
        }
      }
      if (code === 'auth/cancelled-popup-request') {
        throw new Error('Yêu cầu đăng nhập đã bị hủy.');
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('Tên miền hiện tại chưa được cấp quyền trên Firebase Auth console (Authorized Domains). Vui lòng thêm tên miền vào Firebase Console > Authentication > Settings.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Phương thức đăng nhập Google chưa được kích hoạt trên Firebase.');
      }
      throw new Error(authErr?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    }

    return await this.handleFirebaseUser(fbUser);
  },

  /**
   * Kiểm tra kết quả redirect đăng nhập Google (dành cho Web Mobile nếu dùng signInWithRedirect)
   */
  async checkRedirectResult(): Promise<User | null> {
    if (!auth || Capacitor.isNativePlatform()) return null;
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        const { user } = await this.handleFirebaseUser(result.user);
        return user;
      }
    } catch (err) {
      console.warn('[Firebase Auth Redirect] Error checking redirect result:', err);
    }
    return null;
  },

  logout() {
    this.clearSession();
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GoogleAuth')) {
      try {
        GoogleAuth.signOut().catch(() => {});
      } catch {}
    }
    if (auth) {
      signOut(auth).catch(() => {});
    }
  }
};
