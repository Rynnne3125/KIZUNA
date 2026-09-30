import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/admin/components/ui/card';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Button } from '@/admin/components/ui/button';
import { 
  Shield, Mail, Lock, User, LogIn, UserPlus, Star, 
  CheckCircle2, ArrowRight, RefreshCw, KeyRound, Sparkles, AlertCircle, Copy
} from 'lucide-react';
import { authService } from '../services/authService';
import { User as KizunaUser } from '../types/auth';

export interface LoginPageProps {
  onLoginSuccess: (user: KizunaUser) => void;
  onCancel?: () => void;
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
            <Sparkles className="text-emerald-400 fill-emerald-300/40 w-6 h-6 drop-shadow-sm" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states - Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Form states - Register
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStep, setRegStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ tài khoản và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.login({ username: username.trim(), password: password.trim() });
      setSuccessMsg('Đăng nhập thành công! Đang chuyển đến trang chủ...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      setLoading(false);
    }
  };

  // Quick fill demo credentials
  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  // Step 1: Request OTP for Registration
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Vui lòng điền đầy đủ tất cả thông tin đăng ký.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setError('Định dạng email không hợp lệ. Vui lòng nhập đúng email.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const otpRes = await authService.sendRegistrationOtp(regEmail, regFullName);
      setGeneratedOtp(otpRes.code);
      setRegStep('OTP');
      setResendCooldown(60);
      setSuccessMsg(`Mã OTP đã được gửi từ phongtt.23it@vku.udn.vn đến ${regEmail}!`);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const otpRes = await authService.sendRegistrationOtp(regEmail, regFullName);
      setGeneratedOtp(otpRes.code);
      setResendCooldown(60);
      setSuccessMsg(`Đã gửi lại mã OTP mới từ phongtt.23it@vku.udn.vn đến ${regEmail}!`);
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi lại mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Save to Firestore
  const handleVerifyOtpAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }

    // Xác thực OTP
    const verifyRes = authService.verifyOtp(regEmail, otpCode.trim());
    if (!verifyRes.valid) {
      setError(verifyRes.error || 'Mã OTP không đúng hoặc đã hết hạn.');
      return;
    }

    setLoading(true);

    try {
      // Đăng ký và lưu Firestore collection 'users'
      const res = await authService.register({
        username: regUsername.trim(),
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: 'ROLE_USER'
      });

      setSuccessMsg('Xác thực OTP thành công! Đã tạo tài khoản và lưu vào Firestore.');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu tài khoản vào cơ sở dữ liệu.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans overflow-x-hidden kanji-paper-bg">
      
      {/* ======================= LEFT: FORM SECTION ======================= */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 z-10">
        
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-6 left-6 flex items-center gap-2 text-slate-600 hover:text-emerald-700 transition-colors font-medium bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-xs border border-emerald-100 z-20 text-xs sm:text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Quay lại
          </button>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md relative z-10 my-auto"
        >
          {/* Logo & Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-600/20">
                絆
              </div>
              <h1 className="text-3xl font-extrabold text-emerald-950 tracking-tight">
                KIZUNA
              </h1>
            </div>
            <p className="text-slate-600 text-sm font-medium">
              Nền tảng học tiếng Nhật thông minh chuẩn JLPT & Hội thoại tự nhiên
            </p>
          </div>

          {/* Form Card (Crisp White contrasting with Kanji Paper Background) */}
          <Card className="border border-emerald-100 bg-white shadow-lg shadow-emerald-950/5 rounded-3xl overflow-hidden">
            {/* Toggle Tabs */}
            <div className="flex bg-slate-50 border-b border-emerald-50 p-1.5 gap-1.5">
              <button 
                type="button"
                onClick={() => { 
                  setIsLoginMode(true); 
                  setError(null); 
                  setSuccessMsg(null); 
                  setRegStep('FORM');
                }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isLoginMode 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
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
                }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  !isLoginMode 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>

            <CardContent className="p-6 sm:p-8 min-h-[440px] relative flex flex-col justify-center">
              
              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mb-4 text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Success Message */}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mb-4 text-xs sm:text-sm font-medium text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {isLoginMode ? (
                  /* ================= LOGIN FORM ================= */
                  <motion.form 
                    key="login"
                    initial={{ opacity: 0, x: -15 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLogin} 
                    className="space-y-4"
                  >
                    {/* Quick Access Helper */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 sm:p-3.5 mb-2">
                      <p className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Truy cập nhanh (Test Accounts)</span>
                        <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-full font-semibold">1-Click</span>
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200 rounded-xl text-xs font-semibold shadow-xs" 
                          onClick={() => handleQuickFill('admin', 'admin123')}
                        >
                          <Shield className="w-3.5 h-3.5 mr-1 text-emerald-600"/> Admin
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200 rounded-xl text-xs font-semibold shadow-xs" 
                          onClick={() => handleQuickFill('user', 'user123')}
                        >
                          <User className="w-3.5 h-3.5 mr-1 text-emerald-600"/> Học viên
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 group">
                      <Label htmlFor="login-username" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Tài khoản hoặc Email
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                        <Input 
                          id="login-username" 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          required 
                          placeholder="Nhập username hoặc email..." 
                          className="pl-10 h-11 bg-white border-slate-200 hover:border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 group">
                      <Label htmlFor="login-password" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Mật khẩu
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                        <Input 
                          id="login-password" 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          onFocus={() => setIsPasswordFocused(true)} 
                          onBlur={() => setIsPasswordFocused(false)} 
                          required 
                          placeholder="••••••••" 
                          className="pl-10 h-11 bg-white border-slate-200 hover:border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl transition-all" 
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-11 sm:h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md shadow-emerald-600/25 font-bold text-sm sm:text-[15px] transition-all cursor-pointer"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="animate-spin h-4 w-4" />
                            <span>Đang kiểm tra tài khoản...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <LogIn className="w-4 h-4 mr-2" /> Đăng nhập KIZUNA ➔
                          </div>
                        )}
                      </button>
                    </div>
                  </motion.form>
                ) : regStep === 'FORM' ? (
                  /* ================= REGISTRATION STEP 1: INFO FORM ================= */
                  <motion.form 
                    key="register-form"
                    initial={{ opacity: 0, x: 15 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleRequestOtp} 
                    className="space-y-3.5"
                  >
                    <div className="space-y-1 group">
                      <Label htmlFor="reg-fullname" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Họ và tên
                      </Label>
                      <Input 
                        id="reg-fullname" 
                        value={regFullName}
                        onChange={e => setRegFullName(e.target.value)}
                        required 
                        placeholder="Ví dụ: Trần Tuấn Phong" 
                        className="h-10 bg-white border-slate-200 hover:border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                      />
                    </div>

                    <div className="space-y-1 group">
                      <Label htmlFor="reg-username" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Tên đăng nhập
                      </Label>
                      <Input 
                        id="reg-username" 
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        required 
                        placeholder="tuanphong23" 
                        className="h-10 bg-white border-slate-200 hover:border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                      />
                    </div>
                    
                    <div className="space-y-1 group">
                      <Label htmlFor="reg-email" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Email nhận mã OTP
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600" />
                        <Input 
                          id="reg-email" 
                          type="email" 
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          required 
                          placeholder="user@example.com" 
                          className="pl-10 h-10 bg-white border-slate-200 hover:border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1 group">
                      <Label htmlFor="reg-pass" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Mật khẩu
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600" />
                        <Input 
                          id="reg-pass" 
                          type="password" 
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          onFocus={() => setIsPasswordFocused(true)} 
                          onBlur={() => setIsPasswordFocused(false)} 
                          required 
                          placeholder="Tối thiểu 6 ký tự" 
                          className="pl-10 h-10 bg-white border-slate-200 hover:border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/10 rounded-xl" 
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-11 sm:h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md shadow-emerald-600/25 font-bold text-sm sm:text-[15px] transition-all cursor-pointer"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="animate-spin h-4 w-4" />
                            <span>Đang gửi mã OTP...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span>Gửi mã OTP xác thực email</span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </div>
                        )}
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  /* ================= REGISTRATION STEP 2: OTP VERIFICATION ================= */
                  <motion.form 
                    key="register-otp"
                    initial={{ opacity: 0, scale: 0.96 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleVerifyOtpAndCreate} 
                    className="space-y-4"
                  >
                    {/* OTP Sender & Target Info Box */}
                    <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <KeyRound className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-900 uppercase">
                          Xác thực Email OTP
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed mb-2">
                        Mã xác thực 6 chữ số đã được gửi từ địa chỉ email chính thức:
                      </p>
                      <div className="bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-mono font-bold text-emerald-800 mb-1 flex items-center justify-between">
                        <span>phongtt.23it@vku.udn.vn</span>
                        <span className="text-[10px] text-emerald-600 font-sans font-semibold">Gửi đến: {regEmail}</span>
                      </div>
                    </div>

                    {/* Interactive Live Email Notification Card (For testing & convenience) */}
                    {generatedOtp && (
                      <div className="bg-white border-2 border-emerald-300 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Hộp thư đến (phongtt.23it@vku.udn.vn):
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Mã OTP: <span className="font-mono font-extrabold text-emerald-700 text-sm tracking-wider">{generatedOtp}</span>
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setOtpCode(generatedOtp)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 rounded-xl text-xs font-bold shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Tự điền mã
                        </Button>
                      </div>
                    )}

                    {/* 6-Digit OTP Code Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="otp-input" className="text-slate-700 font-bold text-xs uppercase tracking-wide">
                        Nhập mã xác thực (6 chữ số)
                      </Label>
                      <Input 
                        id="otp-input" 
                        type="text" 
                        maxLength={6} 
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required 
                        placeholder="123456" 
                        className="text-center font-mono text-2xl tracking-[0.5em] font-bold h-12 bg-white border-emerald-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/15 rounded-xl"
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
                          <span>Đang lưu vào Firestore...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Xác thực & Tạo tài khoản Firestore
                        </div>
                      )}
                    </button>

                    {/* Resend & Back controls */}
                    <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                      <button 
                        type="button" 
                        onClick={() => { setRegStep('FORM'); setError(null); }}
                        className="text-slate-600 hover:text-emerald-700 underline font-medium cursor-pointer"
                      >
                        ← Sửa lại email
                      </button>
                      <button 
                        type="button" 
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || loading}
                        className="text-emerald-700 hover:text-emerald-800 font-bold disabled:text-slate-400 cursor-pointer"
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
        
        {/* Subtle Kanji Grid Overlay in Right Panel */}
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
              animate={isPasswordFocused ? { 
                rotateY: 180, scale: 0.95, filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.3))'
              } : { 
                rotateY: 0, scale: 1, filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.15))'
              }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="w-72 h-72 sm:w-80 sm:h-80 relative flex items-center justify-center z-30"
            >
              <img 
                src="https://i.ibb.co/VY2n4HCx/otter-sitting-on-orange-cushion-nobg-only-character.webp" 
                alt="Kizuna Mascot" 
                className="w-full h-full object-contain pointer-events-none" 
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
              Lộ trình bài bản chuẩn NEJ & Mimi Oboeru, đồng hành cùng AI Sensei và hệ thống lưu tiến độ tức thì trên Firestore.
            </p>
          </motion.div>

        </div>
      </div>

    </div>
  );
};
