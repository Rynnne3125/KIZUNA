import React, { useState } from 'react';
import { User } from '../types/auth';
import { 
  Home, BookOpen, FileText, Languages, Map, Film, 
  Target, UserCheck, Shield, LogOut, Menu, X, Flame, Star, Sparkles, RefreshCw
} from 'lucide-react';

export type UserNavTab = 'home' | 'login' | 'vocab' | 'grammar' | 'kanji' | 'roadmap' | 'library' | 'exam' | 'profile' | 'admin';

interface UserNavbarProps {
  activeTab: UserNavTab;
  onTabChange: (tab: UserNavTab) => void;
  user: User | null;
  onLogout: () => void;
  onRoleToggle: () => void;
}

export const UserNavbar: React.FC<UserNavbarProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
  onRoleToggle
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const navItems: Array<{ id: UserNavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'home', label: 'Trang chủ', icon: <Home className="w-5 h-5" /> },
    { id: 'vocab', label: 'Từ vựng', icon: <BookOpen className="w-5 h-5" />, badge: '13k+' },
    { id: 'grammar', label: 'Ngữ pháp', icon: <FileText className="w-5 h-5" /> },
    { id: 'kanji', label: 'Kanji', icon: <Languages className="w-5 h-5" />, badge: '2k+' },
    { id: 'roadmap', label: 'Lộ trình', icon: <Map className="w-5 h-5" /> },
    { id: 'library', label: 'Thư viện', icon: <Film className="w-5 h-5" /> },
    { id: 'exam', label: 'Ôn thi JLPT', icon: <Target className="w-5 h-5" />, badge: '85 Đề' },
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
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
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
              <span className="font-extrabold text-emerald-950 text-base tracking-tight">KIZUNA</span>
              <span className="text-emerald-600 text-xs font-bold ml-1">絆</span>
            </div>
          </div>
        </div>

        {/* Mobile User Quick Info */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{user.currentStreak || 1}d</span>
              </div>
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'}
                alt={user.fullName || user.username}
                onClick={() => handleNavClick('profile')}
                className="w-8 h-8 rounded-full border border-emerald-200 cursor-pointer object-cover bg-emerald-50"
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
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-emerald-100">
            {/* Drawer Header */}
            <div className="p-4 border-b border-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                  絆
                </div>
                <div>
                  <div className="font-extrabold text-emerald-950 text-base tracking-tight">KIZUNA</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Học Tiếng Nhật Thông Minh</div>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer User Snapshot */}
            {user && (
              <div className="p-3 bg-emerald-50/60 border-b border-emerald-100/60">
                <div className="flex items-center gap-2.5 mb-2">
                  <img
                    src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'}
                    alt={user.fullName || user.username}
                    className="w-10 h-10 rounded-full border border-emerald-300 bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm truncate">{user.fullName || user.username}</div>
                    <div className="text-xs text-emerald-700 font-medium">Cấp độ: {user.level || 'N5'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 justify-between text-xs">
                  <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                    <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                    <span>{user.currentStreak || 1} ngày</span>
                  </span>
                  <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
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
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-emerald-600'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Admin Portal Tab */}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'admin' 
                      ? 'bg-emerald-800 text-white shadow-xs' 
                      : 'text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span>Trang Quản Trị</span>
                  </div>
                  {user?.role === 'ROLE_ADMIN' ? (
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">Admin</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Khóa</span>
                  )}
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            {user && (
              <div className="p-3 border-t border-emerald-50 space-y-2 bg-slate-50/50">
                <button
                  onClick={onRoleToggle}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Role: {user.role === 'ROLE_ADMIN' ? '👑 Admin' : '🎒 Học viên'} (Đổi role)</span>
                </button>
                <button
                  onClick={() => { setIsMobileDrawerOpen(false); onLogout(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
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
      <aside className="hidden lg:flex w-64 flex-col sticky top-0 h-screen bg-white border-r border-emerald-100/90 shadow-xs z-30 shrink-0">
        
        {/* Brand Logo & Tagline */}
        <div className="p-5 border-b border-emerald-50">
          <div 
            onClick={() => onTabChange('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
              絆
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-emerald-950 text-xl tracking-tight">KIZUNA</span>
                <span className="text-emerald-600 font-bold text-sm">絆</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium -mt-0.5">
                Học Tiếng Nhật Thông Minh
              </div>
            </div>
          </div>
        </div>

        {/* User Mini Profile Card */}
        {user && (
          <div className="p-4 mx-3 my-3 bg-gradient-to-b from-emerald-50/70 to-emerald-50/20 border border-emerald-100 rounded-2xl">
            <div className="flex items-center gap-3 mb-2.5">
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=kizuna'}
                alt={user.fullName || user.username}
                onClick={() => onTabChange('profile')}
                className="w-10 h-10 rounded-full border-2 border-white shadow-xs cursor-pointer object-cover bg-white"
              />
              <div className="min-w-0 flex-1">
                <div 
                  onClick={() => onTabChange('profile')}
                  className="font-bold text-slate-900 text-sm truncate hover:text-emerald-700 cursor-pointer"
                >
                  {user.fullName || user.username}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-semibold">{user.level || 'N5'}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-700 font-semibold">Online</span>
                </div>
              </div>
            </div>

            {/* Streak & Active Points stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 border border-emerald-100/60 rounded-xl p-1.5 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] text-slate-500 leading-none">Streak</div>
                  <div className="font-bold text-amber-900 leading-tight">{user.currentStreak || 1} ngày</div>
                </div>
              </div>
              <div className="bg-white/80 border border-emerald-100/60 rounded-xl p-1.5 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] text-slate-500 leading-none">Điểm</div>
                  <div className="font-bold text-emerald-900 leading-tight">{user.activePoints || 0} pts</div>
                </div>
              </div>
            </div>

            {/* Quick Role Switcher for Test */}
            <button
              onClick={onRoleToggle}
              title="Chuyển nhanh quyền Admin / Học viên để kiểm thử phân quyền"
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-emerald-200/80 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-2xs cursor-pointer"
            >
              <span>{user.role === 'ROLE_ADMIN' ? '👑 Admin (Quản trị)' : '🎒 Học viên'}</span>
              <span className="text-emerald-600 opacity-80">(Đổi)</span>
            </button>
          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Học tập & Rèn luyện
          </div>

          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-800 font-bold border-l-4 border-emerald-600 shadow-2xs' 
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Admin Management Section */}
          <div className="pt-3 mt-3 border-t border-emerald-50">
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Hệ thống
            </div>
            <button
              onClick={() => onTabChange('admin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'admin' 
                  ? 'bg-emerald-50 text-emerald-900 font-bold border-l-4 border-emerald-700 shadow-2xs' 
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${activeTab === 'admin' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>Trang Quản Trị</span>
              </div>
              {user?.role === 'ROLE_ADMIN' ? (
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">Admin</span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">🔒 Khóa</span>
              )}
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-emerald-50 bg-slate-50/40">
          {user ? (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          ) : (
            <button
              onClick={() => onTabChange('login')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <span>Đăng nhập ngay</span>
            </button>
          )}
          <div className="text-[10px] text-center text-slate-400 mt-1">
            KIZUNA • Spring Boot & Firestore
          </div>
        </div>
      </aside>

      {/* =========================================================================
          4. MOBILE APP BOTTOM NAVIGATION BAR (< 1024px)
          Fixed floating bar for native mobile app feel
          ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100/90 shadow-lg px-2 py-1.5 flex justify-around items-center">
        {[
          { id: 'home' as UserNavTab, label: 'Trang chủ', icon: <Home className="w-5 h-5" /> },
          { id: 'vocab' as UserNavTab, label: 'Từ vựng', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'kanji' as UserNavTab, label: 'Kanji', icon: <Languages className="w-5 h-5" /> },
          { id: 'exam' as UserNavTab, label: 'Ôn thi', icon: <Target className="w-5 h-5" /> },
          { id: 'profile' as UserNavTab, label: 'Cá nhân', icon: <UserCheck className="w-5 h-5" /> },
        ].map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <span className={`p-1 rounded-xl transition-all ${isActive ? 'bg-emerald-100 text-emerald-800' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
