import React, { useState } from 'react';
import { User } from '../types/auth';
import { 
  Home, BookOpen, FileText, Languages, Map, Film, 
  Target, UserCheck, Shield, LogOut, Menu, X, Flame, Star, Sparkles,
  Smartphone, Download, Moon, Sun
} from 'lucide-react';
import { ApkDownloadModal } from './ApkDownloadModal';
import { isNativeApp } from '../utils/platform';

export type UserNavTab = 'home' | 'vocab' | 'grammar' | 'kanji' | 'roadmap' | 'library' | 'exam' | 'profile' | 'admin' | 'login';

interface UserNavbarProps {
  activeTab: UserNavTab;
  onTabChange: (tab: UserNavTab) => void;
  user: User | null;
  onLogout: () => void;
  onOpenApkModal?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const UserNavbar: React.FC<UserNavbarProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
  onOpenApkModal,
  isDark,
  onToggleTheme
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [internalApkModalOpen, setInternalApkModalOpen] = useState(false);
  const isApp = isNativeApp();

  const handleOpenApk = () => {
    if (onOpenApkModal) {
      onOpenApkModal();
    } else {
      setInternalApkModalOpen(true);
    }
  };

  const navItems: Array<{ id: UserNavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'home', label: 'Trang chủ', icon: <Home className="w-5 h-5" /> },
    { id: 'vocab', label: 'Từ vựng', icon: <BookOpen className="w-5 h-5" />, badge: '13k+' },
    { id: 'grammar', label: 'Ngữ pháp', icon: <FileText className="w-5 h-5" /> },
    { id: 'kanji', label: 'Kanji', icon: <Languages className="w-5 h-5" />, badge: '2k+' },
    { id: 'roadmap', label: 'Lộ trình', icon: <Map className="w-5 h-5" /> },
    { id: 'library', label: 'Thư viện', icon: <Film className="w-5 h-5" /> },
    { id: 'exam', label: 'Ôn thi JLPT', icon: <Target className="w-5 h-5" />, badge: '95 Đề' },
    { id: 'profile', label: 'Cá nhân', icon: <UserCheck className="w-5 h-5" /> },
  ];

  const handleNavClick = (tab: UserNavTab) => {
    onTabChange(tab);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* =========================================================================
          1. MOBILE TOP APP BAR (< 1024px)
          ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-emerald-100/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs transition-colors">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-1 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Mobile Brand */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-base shadow-sm shadow-emerald-600/30">
              絆
            </div>
            <div>
              <span className="font-extrabold text-emerald-950 dark:text-white text-base tracking-tight">KIZUNA</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold ml-1">絆</span>
            </div>
          </div>
        </div>

        {/* Mobile User Quick Info & APK Download & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nút bật/tắt Giao diện Sáng/Tối trên Mobile */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>
          )}

          {/* Nút tải APK ở Topbar Mobile (chỉ hiển thị trên Website) */}
          {!isApp && (
            <button
              type="button"
              onClick={handleOpenApk}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold shadow-xs shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              title="Tải app APK cho điện thoại Android"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
              <span>Tải APK</span>
            </button>
          )}

          {user ? (
            <>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50 px-2 py-0.5 rounded-full text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{user.currentStreak || 0}d</span>
              </div>
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'}
                alt={user.fullName || user.username}
                onClick={() => handleNavClick('profile')}
                className="w-8 h-8 rounded-full border border-emerald-200 dark:border-slate-700 cursor-pointer object-cover bg-emerald-50 dark:bg-slate-800"
              />
            </>
          ) : (
            <button
              onClick={() => handleNavClick('login')}
              className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-xs cursor-pointer"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          2. MOBILE DRAWER SIDEBAR (Slide-over with Backdrop)
          ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-emerald-100 dark:border-slate-800 transition-colors">
            {/* Drawer Header */}
            <div className="p-4 border-b border-emerald-50 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                  絆
                </div>
                <div>
                  <div className="font-extrabold text-emerald-950 dark:text-white text-base tracking-tight">KIZUNA</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Học Tiếng Nhật Thông Minh</div>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer User Snapshot */}
            {user && (
              <div className="p-3 bg-emerald-50/60 dark:bg-slate-800/80 border-b border-emerald-100/60 dark:border-slate-700">
                <div className="flex items-center gap-2.5 mb-2">
                  <img
                    src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'}
                    alt={user.fullName || user.username}
                    className="w-10 h-10 rounded-full border border-emerald-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{user.fullName || user.username}</div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Bậc: {user.level || 'Tân binh'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 justify-between text-xs">
                  <span className="bg-amber-100/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                    <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                    <span>{user.currentStreak || 0} ngày</span>
                  </span>
                  <span className="bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                    <Star className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                    <span>{user.activePoints || 0} pts</span>
                  </span>
                </div>
              </div>
            )}

            {/* Drawer Nav Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                const path = item.id === 'home' ? '/' : `/${item.id}`;
                return (
                  <a
                    key={item.id}
                    href={path}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-800 dark:hover:text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}

              {/* Chuyển đổi giao diện Sáng / Tối trong Drawer */}
              {onToggleTheme && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button
                    onClick={onToggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                      </span>
                      <span>{isDark ? 'Giao diện Tối' : 'Giao diện Sáng'}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {isDark ? '🌙 Đang bật' : '☀️ Đang bật'}
                    </span>
                  </button>
                </div>
              )}

              {/* Admin Portal Tab - Chỉ hiển thị cho tài khoản có quyền Quản trị viên */}
              {user?.role === 'ROLE_ADMIN' && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button
                    onClick={() => handleNavClick('admin')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'admin' 
                        ? 'bg-emerald-800 text-white shadow-xs' 
                        : 'text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Trang Quản Trị</span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">Admin</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Multiplatform Download Banner (chỉ hiển thị trên Website) */}
            {!isApp && (
              <div className="p-3 mx-3 my-2 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl text-white shadow-md shadow-emerald-700/20">
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span className="font-extrabold text-xs">Cài Đặt KIZUNA App</span>
                  <span className="ml-auto bg-white/20 text-[10px] px-1.5 py-0.2 rounded font-bold">Android • iOS • PC</span>
                </div>
                <p className="text-[11px] text-emerald-100/90 leading-tight mb-2">
                  Học tiếng Nhật mọi lúc trên Android, iPhone & Máy tính.
                </p>
                <button
                  type="button"
                  onClick={() => { setIsMobileDrawerOpen(false); handleOpenApk(); }}
                  className="w-full py-1.5 px-3 bg-white text-emerald-800 text-xs font-extrabold rounded-xl shadow-xs hover:bg-emerald-50 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Cài Đặt Ứng Dụng</span>
                </button>
              </div>
            )}

            {/* Drawer Footer */}
            {user && (
              <div className="p-3 border-t border-emerald-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  onClick={() => { setIsMobileDrawerOpen(false); onLogout(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          3. DESKTOP LEFT SIDEBAR (>= 1024px)
          Fixed/Sticky on Left Side - Pure White contrasting with Kanji Paper
          ========================================================================= */}
      <aside className="hidden lg:flex w-64 flex-col sticky top-0 h-screen bg-white dark:bg-slate-900 border-r border-emerald-100/90 dark:border-slate-800 shadow-xs z-30 shrink-0 transition-colors">
        
        {/* Brand Logo & Tagline */}
        <div className="p-5 border-b border-emerald-50 dark:border-slate-800">
          <div 
            onClick={() => onTabChange('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
              絆
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-emerald-950 dark:text-white text-xl tracking-tight">KIZUNA</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">絆</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                Học Tiếng Nhật Thông Minh
              </div>
            </div>
          </div>
        </div>

        {/* User Mini Profile Card */}
        {user && (
          <div className="p-4 mx-3 my-3 bg-gradient-to-b from-emerald-50/70 to-emerald-50/20 dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-100 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-3 mb-2.5">
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'}
                alt={user.fullName || user.username}
                onClick={() => onTabChange('profile')}
                className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-600 shadow-xs cursor-pointer object-cover bg-white dark:bg-slate-800"
              />
              <div className="min-w-0 flex-1">
                <div 
                  onClick={() => onTabChange('profile')}
                  className="font-bold text-slate-900 dark:text-white text-sm truncate hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                >
                  {user.fullName || user.username}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">{user.level || 'N5'}</span>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Online</span>
                </div>
              </div>
            </div>

            {/* Streak & Active Points stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 dark:bg-slate-900/80 border border-emerald-100/60 dark:border-slate-700 rounded-xl p-1.5 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Streak</div>
                  <div className="font-bold text-amber-900 dark:text-amber-300 leading-tight">{user.currentStreak || 0} ngày</div>
                </div>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 border border-emerald-100/60 dark:border-slate-700 rounded-xl p-1.5 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Điểm</div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-300 leading-tight">{user.activePoints || 0} pts</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Học tập & Rèn luyện
          </div>

          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const path = item.id === 'home' ? '/' : `/${item.id}`;
            return (
              <a
                key={item.id}
                href={path}
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border-l-4 border-emerald-600 dark:border-emerald-500 shadow-2xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}

          {/* Admin Management Section - Chỉ hiển thị cho Quản trị viên */}
          {user?.role === 'ROLE_ADMIN' && (
            <div className="pt-3 mt-3 border-t border-emerald-50 dark:border-slate-800">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Hệ thống
              </div>
              <button
                onClick={() => onTabChange('admin')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold border-l-4 border-emerald-700 dark:border-emerald-500 shadow-2xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className={`w-5 h-5 ${activeTab === 'admin' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>Trang Quản Trị</span>
                </div>
                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">Admin</span>
              </button>
            </div>
          )}
        </nav>

        {/* Desktop Sidebar App Download Card (chỉ hiển thị trên Website) */}
        {!isApp && (
          <div className="p-3 mx-3 mb-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 border border-emerald-200/80 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-800 dark:text-white text-xs leading-none truncate">Cài Đặt App KIZUNA</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">Android • iOS • PC</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenApk}
              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải & Cài Đặt App</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-emerald-50 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />}
              <span className="truncate">{isDark ? 'Sáng' : 'Tối'}</span>
            </button>
          )}

          {user && (
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ml-auto"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          4. MOBILE APP BOTTOM NAVIGATION BAR (< 1024px)
          Fixed floating bar for native mobile app feel
          ========================================================================= */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-emerald-100/90 dark:border-slate-800 shadow-lg px-2 pt-1.5 flex justify-around items-center transition-colors"
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))' }}
      >
        {[
          { id: 'home' as UserNavTab, label: 'Trang chủ', icon: <Home className="w-5 h-5" /> },
          { id: 'vocab' as UserNavTab, label: 'Từ vựng', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'kanji' as UserNavTab, label: 'Kanji', icon: <Languages className="w-5 h-5" /> },
          { id: 'exam' as UserNavTab, label: 'Ôn thi', icon: <Target className="w-5 h-5" /> },
          { id: 'profile' as UserNavTab, label: 'Cá nhân', icon: <UserCheck className="w-5 h-5" /> },
        ].map(item => {
          const isActive = activeTab === item.id;
          const path = item.id === 'home' ? '/' : `/${item.id}`;
          return (
            <a
              key={item.id}
              href={path}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.id);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                isActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <span className={`p-1 rounded-xl transition-all ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* APK DOWNLOAD MODAL (chỉ hiển thị trên Website) */}
      {!isApp && (
        <ApkDownloadModal 
          isOpen={internalApkModalOpen} 
          onClose={() => setInternalApkModalOpen(false)} 
        />
      )}
    </>
  );
};
