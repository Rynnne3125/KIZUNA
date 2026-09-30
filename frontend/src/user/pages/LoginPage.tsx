import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/admin/components/ui/card';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Button } from '@/admin/components/ui/button';
import { Shield, Mail, Lock, User, LogIn, UserPlus, Heart, Star } from 'lucide-react';

export interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  onCancel?: () => void;
}

// Particle system for the mascot
const MascotParticles = ({ isDay }: { isDay: boolean }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; scale: number; isHeart: boolean }[]>([]);

  useEffect(() => {
    // Generate particles continuously
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticle = {
          id: Date.now() + Math.random(),
          x: (Math.random() - 0.5) * 200, 
          y: (Math.random() - 0.5) * 50, 
          scale: 0.8 + Math.random() * 0.7, 
          isHeart: isDay
        };
        // Keep only the last 15 particles
        return [...prev.slice(-14), newParticle];
      });
    }, 400); // New particle every 400ms
    return () => clearInterval(interval);
  }, [isDay]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 0, y: 50, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0.8, 0], 
              x: p.x, 
              y: p.y - 250 - (Math.random() * 100), // float much higher
              scale: p.scale 
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 3.5, ease: "easeOut" }}
            className="absolute"
          >
            {p.isHeart ? (
              <Heart className="text-pink-400 fill-pink-400/60 w-8 h-8 drop-shadow-md" />
            ) : (
              <Star className="text-yellow-300 fill-yellow-300/60 w-8 h-8 drop-shadow-md" />
            )}
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
  
  // Day-Night Cycle state (toggles every 15 seconds)
  const [isDayTime, setIsDayTime] = useState(true);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  useEffect(() => {
    const cycle = setInterval(() => {
      setIsDayTime(prev => !prev);
    }, 15000);
    return () => clearInterval(cycle);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        onLoginSuccess({ id: 'usr_admin', username: 'admin', fullName: 'Kizuna Administrator', role: 'ROLE_ADMIN' });
      } else if (username === 'user' && password === 'user123') {
        onLoginSuccess({ id: 'usr_001', username: 'user', fullName: 'Học viên Test', role: 'ROLE_USER' });
      } else {
        setError('Tài khoản hoặc mật khẩu không chính xác.');
        setLoading(false);
      }
    }, 1500); 
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  // Generate fixed background particles for the left side
  const leftParticles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 5
  }));

  return (
    <div className="flex min-h-screen w-full font-sans overflow-hidden bg-[#fdfaf6]">
      
      {/* ======================= LEFT: FORM SECTION ======================= */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center items-center p-6 sm:p-12 z-10 bg-[#fdfaf6]">
        
        {/* Left Side Floating Particles */}
        {leftParticles.map(p => (
          <motion.div
            key={`left-p-${p.id}`}
            animate={{ 
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
            className="absolute rounded-full bg-orange-400/20 blur-[1px]"
            style={{ left: p.left, top: p.top, width: 8 + (p.id % 4), height: 8 + (p.id % 4) }}
          />
        ))}

        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors font-medium bg-white/50 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-200 z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Quay lại
          </button>
        )}

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-200/30 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500 mb-2">
              KIZUNA
            </h1>
            <p className="text-slate-500 font-medium">
              Đăng nhập để tiếp tục hành trình học tiếng Nhật của bạn.
            </p>
          </div>

          <Card className="border border-white/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl rounded-3xl overflow-hidden">
            <div className="flex bg-slate-50/50 border-b border-slate-100 p-2 gap-2">
              <button 
                onClick={() => { setIsLoginMode(true); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${isLoginMode ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Đăng nhập
              </button>
              <button 
                onClick={() => { setIsLoginMode(false); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isLoginMode ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Đăng ký
              </button>
            </div>

            {/* Sync form sizes by fixing min-height */}
            <CardContent className="p-6 sm:p-8 min-h-[420px] relative">
              <AnimatePresence mode="wait">
                {isLoginMode ? (
                  <motion.form 
                    key="login"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLogin} 
                    className="space-y-5 absolute inset-0 p-6 sm:p-8"
                  >
                    <div className="bg-orange-50/80 border border-orange-100 rounded-2xl p-4 mb-2">
                      <p className="text-xs text-orange-800/80 font-bold uppercase tracking-wider mb-3">Truy cập nhanh</p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" className="flex-1 bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl shadow-sm" onClick={() => handleQuickFill('admin', 'admin123')}>
                          <Shield className="w-3.5 h-3.5 mr-1.5"/> Admin
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="flex-1 bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-xl shadow-sm" onClick={() => handleQuickFill('user', 'user123')}>
                          <User className="w-3.5 h-3.5 mr-1.5"/> Học viên
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-sm font-medium text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
                        {error}
                      </motion.div>
                    )}

                    <div className="space-y-2 group">
                      <Label htmlFor="username" className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Tên đăng nhập</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                          id="username" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Nhập tài khoản..." 
                          className="pl-10 h-11 bg-white/50 border-slate-200 hover:border-orange-200 focus-visible:border-orange-500 focus-visible:ring-4 focus-visible:ring-orange-500/10 rounded-xl transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <Label htmlFor="password" className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Mật khẩu</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                          id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} required placeholder="••••••••" 
                          className="pl-10 h-11 bg-white/50 border-slate-200 hover:border-orange-200 focus-visible:border-orange-500 focus-visible:ring-4 focus-visible:ring-orange-500/10 rounded-xl transition-all" 
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <motion.button 
                        whileTap={{ scale: 0.97 }} type="submit" disabled={loading} layout
                        className="w-full relative h-12 flex items-center justify-center bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl shadow-lg shadow-orange-500/25 font-semibold text-[15px] overflow-hidden transition-colors"
                      >
                        <AnimatePresence mode="wait">
                          {loading ? (
                            <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2">
                              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Đang xử lý...</span>
                            </motion.div>
                          ) : (
                            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center">
                              <LogIn className="w-4 h-4 mr-2" /> Đăng nhập
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.form 
                    key="register"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={e => e.preventDefault()} 
                    className="space-y-4 absolute inset-0 p-6 sm:p-8 flex flex-col justify-center"
                  >
                    <div className="space-y-2 group">
                      <Label htmlFor="reg-name" className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Họ và tên</Label>
                      <Input id="reg-name" required placeholder="Nguyễn Văn A" className="h-11 bg-white/50 border-pink-200 focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/10 rounded-xl" />
                    </div>
                    
                    <div className="space-y-2 group">
                      <Label htmlFor="reg-email" className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-pink-500" />
                        <Input id="reg-email" type="email" required placeholder="name@example.com" className="pl-10 h-11 bg-white/50 border-pink-200 focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/10 rounded-xl" />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <Label htmlFor="reg-pass" className="text-slate-600 font-semibold text-xs uppercase tracking-wide">Mật khẩu</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-pink-500" />
                        <Input id="reg-pass" type="password" required placeholder="••••••••" onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} className="pl-10 h-11 bg-white/50 border-pink-200 focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/10 rounded-xl" />
                      </div>
                    </div>

                    <div className="pt-4">
                      <motion.button 
                        whileTap={{ scale: 0.97 }} type="button" 
                        className="w-full h-12 flex items-center justify-center bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-pink-500/25 font-semibold text-[15px]"
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Tạo tài khoản mới
                      </motion.button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ======================= RIGHT: MASCOT & BRANDING SECTION ======================= */}
      <motion.div 
        animate={{ 
          background: isDayTime 
            ? 'linear-gradient(135deg, #fdfbfb 0%, #faedde 50%, #f4e6d6 100%)' // Day: Pastel Cream
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)'  // Night: Deep purple/indigo
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center"
      >
        
        {/* Day-Night Cycle Rotating Circle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute w-[500px] h-[500px] rounded-full border-[2px] border-white/20 border-dashed opacity-50 z-0"
        >
          {/* Sun Element */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-300 rounded-full shadow-[0_0_50px_rgba(253,224,71,0.8)] flex items-center justify-center">
             <div className="w-12 h-12 bg-yellow-400 rounded-full"></div>
          </div>
          {/* Moon Element */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-16 bg-slate-200 rounded-full shadow-[0_0_50px_rgba(226,232,240,0.8)] flex items-center justify-center overflow-hidden">
             <div className="w-12 h-12 bg-white rounded-full relative">
               <div className="absolute top-1 right-2 w-8 h-8 bg-slate-200 rounded-full shadow-inner"></div>
             </div>
          </div>
        </motion.div>

        {/* Mascot Container */}
        <div className="relative z-10 flex flex-col items-center">
          
          <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="relative">
            
            {/* Particle Emitter */}
            <MascotParticles isDay={isDayTime} />

            {/* The interactive reaction container (Hide eyes) */}
            <motion.div
              animate={isPasswordFocused ? { 
                rotateY: 180, scale: 0.95, filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.4))'
              } : { 
                rotateY: 0, scale: 1, filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.2))'
              }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="w-96 h-96 relative flex items-center justify-center z-30"
            >
              <img src="https://i.ibb.co/VY2n4HCx/otter-sitting-on-orange-cushion-nobg-only-character.webp" alt="Kizuna Mascot" className="w-full h-full object-contain pointer-events-none" />
              
              <AnimatePresence>
                {isPasswordFocused && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, rotateY: 180 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 180 }}
                    exit={{ opacity: 0, scale: 0, rotateY: 180 }}
                    className="absolute -top-6 -right-10 bg-white text-orange-600 px-4 py-2 rounded-2xl rounded-bl-none font-bold text-sm shadow-xl"
                  >
                    Tớ không nhìn lén mật khẩu đâu nhé! 🫣
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Soft shadow under the mascot */}
            <motion.div 
              animate={{ scale: [1, 0.8, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-48 h-6 bg-black/30 rounded-[100%] mx-auto mt-8 blur-md"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-center mt-12 relative z-30">
            <h2 className={`text-3xl font-extrabold mb-3 tracking-tight transition-colors duration-1000 ${isDayTime ? 'text-orange-900' : 'text-white/90'}`}>
              Học tiếng Nhật không hề cô đơn
            </h2>
            <p className={`font-medium max-w-md mx-auto text-sm leading-relaxed transition-colors duration-1000 ${isDayTime ? 'text-orange-800/80' : 'text-white/80'}`}>
              Trải nghiệm môi trường giáo dục cá nhân hóa với sự đồng hành của AI Sensei và cộng đồng học viên sôi động.
            </p>
          </motion.div>
        </div>
      </motion.div>

    </div>
  );
};
