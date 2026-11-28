import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/admin/components/ui/card';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { 
  Mail, Lock, User, LogIn, UserPlus, Star, 
  CheckCircle2, ArrowRight, RefreshCw, KeyRound, Sparkles, AlertCircle, MailCheck,
  Eye, EyeOff, Check, Sun, Moon, WifiOff
} from 'lucide-react';
import { authService } from '../services/authService';
import { User as KizunaUser } from '../types/auth';
import { validateEmail, validatePassword } from '../utils/authValidation';
import { useTheme } from '../hooks/useTheme';

export interface LoginPageProps {
  onLoginSuccess: (user: KizunaUser) => void;
  onCancel?: () => void;
  isOffline?: boolean;
  onRecheckNetwork?: () => Promise<any>;
  isCheckingNetwork?: boolean;
}

// Particle emitter with soft matcha / golden particles
const MascotParticles = () => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; scale: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticle = {
          id: Date.now() + Math.random(),
          x: (Math.random() - 0.5) * 180,
          y: (Math.random() - 0.5) * 40,
          scale: 0.7 + Math.random() * 0.6,
        };
        return [...prev.slice(-12), newParticle];
      });
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 0, y: 30, scale: 0 }}
            animate={{ 
              opacity: [0, 0.9, 0.7, 0], 
              x: p.x, 
              y: p.y - 200 - (Math.random() * 80),
              scale: p.scale 
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 3.2, ease: "easeOut" }}
            className="absolute"
          >
            <Sparkles className="text-emerald-400 fill-emerald-300/40 w-6 h-6 drop-shadow-xs" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onCancel,
  isOffline,
  onRecheckNetwork,
  isCheckingNetwork
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states - Login (Đăng nhập chuẩn bằng EMAIL)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Register
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const regPasswordCheck = validatePassword(regPassword);
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Kiểm tra môi trường localhost để bật phím tắt bấm vào rái cá nhảy thẳng vào Admin
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );

  const handleOtterAdminQuickLogin = async () => {
    if (!isLocalhost || loading) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authService.login({
        email: 'admin@kizuna.com',
        password: 'admin123'
      });
      setSuccessMsg('Chế độ Localhost: Đang chuyển thẳng vào trang Quản trị (Admin)...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 250);
    } catch {
      const devAdmin: KizunaUser = {
        id: 'usr_admin_local',
        username: 'admin',
        fullName: 'Localhost Admin',
        email: 'admin@kizuna.com',
        role: 'ROLE_ADMIN',
        activePoints: 9999,
        totalXp: 15000,
        currentStreak: 14,
        level: 'N1',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
      };
      authService.setSession(`token_admin_local_${Date.now()}`, devAdmin);
      onLoginSuccess(devAdmin);
    }
  };

  // Countdown timer for OTP resend (60s)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Kiểm tra nếu người dùng vừa quay về từ màn hình xác thực Google Redirect (Web Mobile)
  useEffect(() => {
    let isMounted = true;
    authService.checkRedirectResult().then(user => {
      if (isMounted && user) {
        const isAdmin = user.role === 'ROLE_ADMIN';
        setSuccessMsg(isAdmin 
          ? 'Đăng nhập Google thành công! Đang chuyển đến trang quản trị...'
          : 'Đăng nhập Google thành công! Đang chuyển đến trang chủ...'
        );
        setTimeout(() => {
          onLoginSuccess(user);
        }, 500);
      }
    }).catch(err => {
      if (isMounted) {
        console.warn('[LoginPage] checkRedirectResult error:', err);
      }
    });
    return () => { isMounted = false; };
  }, [onLoginSuccess]);

  // Handle Login with Email
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Vui lòng nhập đầy đủ địa chỉ Email và Mật khẩu.');
      return;
    }

    const emailCheck = validateEmail(loginEmail);
    if (!emailCheck.isValid) {
      setError(emailCheck.error || 'Địa chỉ email không đúng định dạng.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.login({ 
        email: loginEmail.trim().toLowerCase(), 
        password: loginPassword.trim() 
      });
      const isAdmin = res.user.role === 'ROLE_ADMIN';
      setSuccessMsg(isAdmin 
        ? 'Đăng nhập thành công! Đang chuyển đến trang quản trị...'
        : 'Đăng nhập thành công! Đang chuyển đến trang chủ...'
      );
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Email hoặc mật khẩu không chính xác.');
      setLoading(false);
    }
  };

  // Handle Google Sign-in with Firebase Authentication
  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await authService.loginWithGoogle();
      const isAdmin = res.user.role === 'ROLE_ADMIN';
      setSuccessMsg(isAdmin 
        ? 'Đăng nhập Google thành công! Đang chuyển đến trang quản trị...'
        : 'Đăng nhập Google thành công! Đang chuyển đến trang chủ...'
      );
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập bằng tài khoản Google thất bại.');
      setLoading(false);
    }
  };

  // Step 1: Request OTP email for Registration
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Vui lòng điền đầy đủ tất cả thông tin đăng ký.');
      return;
    }

    const emailCheck = validateEmail(regEmail);
    if (!emailCheck.isValid) {
      setError(emailCheck.error || 'Định dạng email không hợp lệ. Vui lòng nhập đúng email (ví dụ: name@gmail.com).');
      return;
    }

    const pwdCheck = validatePassword(regPassword);
    if (!pwdCheck.isValid) {
      setError(pwdCheck.error || 'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%...).');
      return;
    }


    setLoading(true);

    try {
      await authService.sendRegistrationOtp(regEmail, regFullName);
      setRegStep('OTP');
      setResendCooldown(60);
      setSuccessMsg(null);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi mã xác thực. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP email
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await authService.sendRegistrationOtp(regEmail, regFullName);
      setResendCooldown(60);
      setSuccessMsg('Hãy kiểm tra hòm thư email của bạn.');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi lại mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Check OTP from user input and create account in Firestore
  const handleVerifyOtpAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã xác thực từ email.');
      return;
    }

    // Kiểm tra tính hợp lệ của mã OTP
    const verifyRes = authService.verifyOtp(regEmail, cleanOtp);
    if (!verifyRes.valid) {
      setError(verifyRes.error || 'Mã OTP không chính xác hoặc đã hết hạn.');
      return;
    }

    const emailCheck = validateEmail(regEmail);
    if (!emailCheck.isValid) {
      setError(emailCheck.error || 'Địa chỉ email không hợp lệ.');
      return;
    }

    const pwdCheck = validatePassword(regPassword);
    if (!pwdCheck.isValid) {
      setError(pwdCheck.error || 'Mật khẩu chưa đủ điều kiện bảo mật.');
      return;
    }

    setLoading(true);

    try {
      // Đăng ký và lưu Firestore collection 'users'
      const res = await authService.register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: 'ROLE_USER'
      });

      setSuccessMsg('Xác thực mã OTP thành công! Tài khoản của bạn đã được kích hoạt.');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo tài khoản. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen w-full font-sans overflow-x-hidden ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f7f9f6] kanji-paper-bg text-slate-800'}`}>
      
      {/* ======================= LEFT: FORM SECTION ======================= */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 z-10">
        
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="absolute top-6 left-6 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors font-medium bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-xs border border-emerald-100 dark:border-slate-700 z-20 text-xs sm:text-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Quay lại
          </button>
        )}

        {/* Nút chuyển đổi Dark Mode / Light Mode */}
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-emerald-100 dark:border-slate-700 shadow-xs z-20 cursor-pointer transition-colors"
          title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md relative z-10 my-auto"
        >
          {/* Logo & Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center gap-2.5 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-md shadow-emerald-600/20">
                絆
              </div>
              <h1 className="text-3xl font-extrabold text-emerald-950 dark:text-white tracking-tight">
                KIZUNA
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Nền tảng học tiếng Nhật thông minh & Rèn luyện phản xạ chuẩn bản xứ
            </p>
          </div>

          {/* Thông báo mất kết nối Internet (không chặn đăng nhập Offline bằng tài khoản đã lưu) */}
          {isOffline && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Mất kết nối Internet — Bạn vẫn có thể đăng nhập bằng tài khoản đã lưu trên thiết bị để học ngoại tuyến.</span>
              </div>
              {onRecheckNetwork && (
                <button
                  type="button"
                  onClick={() => void onRecheckNetwork()}
                  disabled={isCheckingNetwork}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {isCheckingNetwork ? '...' : 'Thử lại'}
                </button>
              )}
            </div>
          )}

          {/* Form Card */}
          <Card className="border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-emerald-950/5 dark:shadow-none rounded-3xl overflow-hidden transition-colors">
            {/* Toggle Tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-800/80 border-b border-emerald-50 dark:border-slate-800 p-1.5 gap-1.5">
              <button 
                type="button"
                onClick={() => { 
                  setIsLoginMode(true); 
                  setError(null); 
                  setSuccessMsg(null); 
                  setRegStep('FORM');
                  setShowLoginPassword(false);
                  setShowRegPassword(false);
                }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  isLoginMode 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Đăng nhập
              </button>
              <button 
                type="button"
                onClick={() => { 
                  setIsLoginMode(false); 
                  setError(null); 
                  setSuccessMsg(null); 
                  setShowLoginPassword(false);
                  setShowRegPassword(false);
                }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  !isLoginMode 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>

            <CardContent className="p-6 sm:p-8 min-h-[380px] relative flex flex-col justify-center">
              
              {/* Error Message Alert */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mb-4 text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Success Message Alert */}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mb-4 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {isLoginMode ? (
                  /* ================= 1. ĐĂNG NHẬP CHUẨN BẰNG EMAIL ================= */
                  <motion.form 
                    key="login"
                    initial={{ opacity: 0, x: -12 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLogin} 
                    autoComplete="off"
                    className="space-y-4"
                  >
                    {/* Fake hidden inputs to intercept Chrome auto-populating saved passwords from other localhost sites */}
                    <input type="text" name="chrome_anti_autofill_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                    <input type="password" name="chrome_anti_autofill_pwd" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

                    <div className="space-y-1.5 group">
                      <Label htmlFor="login-email" className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">
                        Địa chỉ Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                        <Input 
                          id="login-email" 
                          type="email"
                          name="login_email"
                          autoComplete="username"
                          value={loginEmail} 
                          onChange={e => setLoginEmail(e.target.value)} 
                          required 
                          placeholder="name@example.com" 
                          className="pl-10 h-11 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-emerald-300 dark:hover:border-emerald-600 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 group">
                      <Label htmlFor="login-password" className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">
                        Mật khẩu
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                        <Input 
                          id="login-password" 
                          type={showLoginPassword ? 'text' : 'password'} 
                          name="login_password"
                          autoComplete="current-password"
                          value={loginPassword} 
                          onChange={e => setLoginPassword(e.target.value)} 
                          onFocus={() => setIsPasswordFocused(true)} 
                          onBlur={() => setIsPasswordFocused(false)} 
                          required 
                          placeholder="••••••••" 
                          className="pl-10 pr-11 h-11 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-emerald-300 dark:hover:border-emerald-600 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl transition-all" 
                        />
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setShowLoginPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none transition-colors cursor-pointer p-1 rounded-lg"
                          title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          tabIndex={-1}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-11 sm:h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white rounded-xl shadow-md shadow-emerald-600/25 font-bold text-sm sm:text-[15px] transition-all cursor-pointer"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="animate-spin h-4 w-4" />
                            <span>Đang xác thực...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <LogIn className="w-4 h-4 mr-2" /> Đăng nhập KIZUNA ➔
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Phân cách hoặc tiếp tục với Google */}
                    <div className="relative my-3 flex items-center justify-center">
                      <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                      <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                        Hoặc tiếp tục với
                      </span>
                      <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-11 sm:h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600 disabled:opacity-60 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs text-sm sm:text-[15px] transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Đăng nhập bằng Google</span>
                    </button>
                  </motion.form>
                ) : regStep === 'FORM' ? (
                  /* ================= 2. ĐĂNG KÝ BƯỚC 1: NHẬP EMAIL & THÔNG TIN ================= */
                  <motion.form 
                    key="register-form"
                    initial={{ opacity: 0, x: 12 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleRequestOtp} 
                    autoComplete="off"
                    className="space-y-3.5"
                  >
                    {/* Fake hidden inputs to intercept Chrome auto-populating saved passwords */}
                    <input type="text" name="chrome_anti_autofill_reg_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                    <input type="password" name="chrome_anti_autofill_reg_pwd" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

                    <div className="space-y-1 group">
                      <Label htmlFor="reg-fullname" className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">
                        Họ và tên
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400" />
                        <Input 
                          id="reg-fullname" 
                          type="text"
                          name="reg_fullname"
                          autoComplete="name"
                          value={regFullName}
                          onChange={e => setRegFullName(e.target.value)}
                          required 
                          placeholder="Ví dụ: Nguyễn Văn A" 
                          className="pl-10 h-10 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-emerald-300 dark:hover:border-emerald-600 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1 group">
                      <Label htmlFor="reg-email" className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">
                        Email nhận mã OTP xác thực
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600" />
                        <Input 
                          id="reg-email" 
                          type="email" 
                          name="reg_email"
                          autoComplete="email"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          required 
                          placeholder="tenban@gmail.com" 
                          className="pl-10 h-10 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-emerald-300 dark:hover:border-emerald-600 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Chỉ gửi mã OTP khi email đúng định dạng (có @, tên miền hợp lệ như @gmail.com).</p>
                    </div>

                    <div className="space-y-1 group">
                      <Label htmlFor="reg-pass" className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">
                        Mật khẩu
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400" />
                        <Input 
                          id="reg-pass" 
                          type={showRegPassword ? 'text' : 'password'} 
                          name="reg_password"
                          autoComplete="new-password"
                          value={regPassword} 
                          onChange={e => setRegPassword(e.target.value)} 
                          onFocus={() => setIsPasswordFocused(true)} 
                          onBlur={() => setIsPasswordFocused(false)} 
                          required 
                          placeholder="Tối thiểu 8 ký tự (Hoa, thường, số, ký tự đặc biệt)" 
                          className="pl-10 pr-11 h-10 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-emerald-300 dark:hover:border-emerald-600 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                        />
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setShowRegPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none transition-colors cursor-pointer p-1 rounded-lg"
                          title={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          tabIndex={-1}
                        >
                          {showRegPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Checklist điều kiện mật khẩu khi đăng ký */}
                      <div className="pt-1.5 space-y-1 bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span>Yêu cầu mật khẩu:</span>
                          {regPassword.length > 0 && (
                            <span className={regPasswordCheck.isValid ? "text-emerald-600 font-bold flex items-center gap-1" : "text-amber-600 font-medium"}>
                              {regPasswordCheck.isValid ? "✓ Đã đạt tiêu chuẩn" : "Chưa đủ điều kiện"}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                          <div className={`flex items-center gap-1.5 ${regPasswordCheck.criteria.minLength ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {regPasswordCheck.criteria.minLength ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1 shrink-0" />}
                            <span>Tối thiểu 8 ký tự</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${regPasswordCheck.criteria.hasUpper ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {regPasswordCheck.criteria.hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1 shrink-0" />}
                            <span>Chữ in hoa (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${regPasswordCheck.criteria.hasLower ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {regPasswordCheck.criteria.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1 shrink-0" />}
                            <span>Chữ thường (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${regPasswordCheck.criteria.hasNumber ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {regPasswordCheck.criteria.hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1 shrink-0" />}
                            <span>Chữ số (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 col-span-2 ${regPasswordCheck.criteria.hasSpecial ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {regPasswordCheck.criteria.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ml-1 mr-1 shrink-0" />}
                            <span>Ký tự đặc biệt (!@#$%^&*...)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-11 sm:h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white rounded-xl shadow-md shadow-emerald-600/25 font-bold text-sm sm:text-[15px] transition-all cursor-pointer"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="animate-spin h-4 w-4" />
                            <span>Đang gửi mã OTP đến email...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span>Gửi mã OTP xác thực email</span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Phân cách hoặc tiếp tục với Google */}
                    <div className="relative my-3 flex items-center justify-center">
                      <div className="border-t border-slate-200 w-full" />
                      <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                        Hoặc tiếp tục với
                      </span>
                      <div className="border-t border-slate-200 w-full" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-11 sm:h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs text-sm sm:text-[15px] transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Đăng ký nhanh bằng Google</span>
                    </button>
                  </motion.form>
                ) : (
                  /* ================= 3. ĐĂNG KÝ BƯỚC 2: CHECK MÃ OTP THẬT TỪ HỘP THƯ ================= */
                  <motion.form 
                    key="register-otp"
                    initial={{ opacity: 0, scale: 0.97 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleVerifyOtpAndCreate} 
                    className="space-y-4"
                  >
                    {/* Thông báo kiểm tra email đơn giản */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-900 dark:text-emerald-300 font-semibold text-sm">
                        <MailCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Hãy kiểm tra hòm thư email của bạn</span>
                      </div>
                    </div>

                    {/* 6-Digit OTP Code Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-input" className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wide">
                        Nhập mã OTP xác thực (6 chữ số)
                      </Label>
                      <Input 
                        id="otp-input" 
                        type="text" 
                        name="kizuna_otp_code"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={6} 
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required 
                        autoFocus
                        placeholder="••••••" 
                        className="text-center font-mono text-2xl tracking-[0.4em] font-extrabold h-12 bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-600 text-slate-900 dark:text-white focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/15 rounded-xl"
                      />
                    </div>

                    {/* Submit Button: Verify & Create in Firestore */}
                    <button 
                      type="submit" 
                      disabled={loading || otpCode.length !== 6}
                      className="w-full h-11 sm:h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl shadow-md shadow-emerald-600/25 font-bold text-sm sm:text-[15px] transition-all cursor-pointer"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="animate-spin h-4 w-4" />
                          <span>Đang kích hoạt tài khoản...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Xác thực & Hoàn tất tạo tài khoản
                        </div>
                      )}
                    </button>

                    {/* Resend & Back controls */}
                    <div className="flex items-center justify-between text-xs pt-1 text-slate-500 dark:text-slate-400">
                      <button 
                        type="button" 
                        onClick={() => { setRegStep('FORM'); setError(null); }}
                        className="text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 underline font-medium cursor-pointer"
                      >
                        ← Thay đổi địa chỉ email
                      </button>
                      <button 
                        type="button" 
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || loading}
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold disabled:text-slate-400 dark:disabled:text-slate-600 cursor-pointer"
                      >
                        {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã OTP'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ======================= RIGHT: MASCOT & JAPANESE ZEN THEME ======================= */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-emerald-900/90 via-teal-950 to-slate-950 p-12">
        
        {/* Subtle Kanji Grid Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:24px_24px]"></div>

        {/* Ambient Halo Glow */}
        <div className="absolute w-[450px] h-[450px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center max-w-lg text-center">
          
          <motion.div 
            animate={{ y: [0, -12, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
            className="relative mb-6"
          >
            {/* Particle Emitter */}
            <MascotParticles />

            {/* Mascot reaction */}
            <motion.div
              onClick={handleOtterAdminQuickLogin}
              title={isLocalhost ? '🛠️ [Localhost] Bấm vào Rái cá để nhảy thẳng vào trang Admin' : undefined}
              animate={isPasswordFocused ? { 
                rotateY: 180, scale: 0.95, filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.3))'
              } : { 
                rotateY: 0, scale: 1, filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.15))'
              }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              style={{ transformStyle: 'preserve-3d' }}
              className={`w-72 h-72 sm:w-80 sm:h-80 relative flex items-center justify-center z-30 ${isLocalhost ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}`}
            >
              <img 
                src="https://i.ibb.co/VY2n4HCx/otter-sitting-on-orange-cushion-nobg-only-character.webp" 
                alt="Kizuna Mascot" 
                className="w-full h-full object-contain select-none" 
              />
              
              <AnimatePresence>
                {isPasswordFocused && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, rotateY: 180 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 180 }}
                    exit={{ opacity: 0, scale: 0, rotateY: 180 }}
                    className="absolute -top-4 -right-6 bg-white text-emerald-900 px-4 py-2 rounded-2xl rounded-bl-none font-bold text-xs shadow-xl border border-emerald-100"
                  >
                    Tớ không nhìn lén mật khẩu đâu nhé! 🫣
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Soft shadow under mascot */}
            <motion.div 
              animate={{ scale: [1, 0.85, 1], opacity: [0.35, 0.2, 0.35] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
              className="w-44 h-5 bg-black/40 rounded-[100%] mx-auto mt-4 blur-md"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-white"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Học tiếng Nhật không hề cô đơn</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 tracking-tight text-emerald-50">
              Cùng KIZUNA Chinh Phục JLPT
            </h2>
            <p className="font-normal text-emerald-100/80 text-sm leading-relaxed max-w-sm mx-auto">
              Lộ trình bài bản chuẩn NEJ & Mimi Oboeru, đồng hành cùng AI Sensei và hệ thống lưu trữ tiến độ thông minh.
            </p>
          </motion.div>

        </div>
      </div>

    </div>
  );
};
