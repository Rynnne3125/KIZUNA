import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { User } from './user/types/auth';
import { authService } from './user/services/authService';
import { UserNavbar, UserNavTab } from './user/components/UserNavbar';
import { LoginPage } from './user/pages/LoginPage';
import { HomePage } from './user/pages/HomePage';
import { VocabPage } from './user/pages/VocabPage';
import { GrammarPage } from './user/pages/GrammarPage';
import { KanjiPage } from './user/pages/KanjiPage';
import { RoadmapPage } from './user/pages/RoadmapPage';
import { LibraryPage } from './user/pages/LibraryPage';
import { ExamPage } from './user/pages/ExamPage';
import { ProfilePage } from './user/pages/ProfilePage';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { Smartphone, Download, CheckCircle2, Moon, Sun, Flame, X, Wrench, LogOut, RefreshCw, WifiOff } from 'lucide-react';
import { db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ApkDownloadModal } from './user/components/ApkDownloadModal';
import { isNativeApp } from './user/utils/platform';
import { useNetworkStatus } from './user/hooks/useNetworkStatus';
import { useTheme } from './user/hooks/useTheme';

import { AiPlacementModal } from './user/components/placement/AiPlacementModal';
import { progressService } from './user/services/progressService';
import { placementService } from './user/services/placementService';
import { dailyQuestService } from './user/services/dailyQuestService';
import { soundService } from './user/services/soundService';

const getTabFromPath = (): UserNavTab => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
  const tabMap: Record<string, UserNavTab> = {
    '': 'home',
    'home': 'home',
    'vocab': 'vocab',
    'grammar': 'grammar',
    'kanji': 'kanji',
    'roadmap': 'roadmap',
    'library': 'library',
    'exam': 'exam',
    'profile': 'profile',
    'admin': 'admin'
  };
  return tabMap[path] || 'home';
};

export default function App() {
  const isApp = isNativeApp();
  const network = useNetworkStatus();
  const { theme, isDark, toggleTheme } = useTheme();
  // Lấy người dùng từ session được lưu trong localStorage (tối đa 24h)
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  
  // Tự động điều hướng đến 'admin' nếu là ROLE_ADMIN, ngược lại vào tab theo URL hoặc 'home'
  const [activeTab, setActiveTab] = useState<UserNavTab>(() => {
    const current = authService.getCurrentUser();
    return current?.role === 'ROLE_ADMIN' ? 'admin' : getTabFromPath();
  });

  // Trạng thái mở modal tải APK
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // Trạng thái mở modal làm bài test thẩm định trình độ thích ứng
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);

  // Trạng thái kết nối mạng (Online / Weak / Offline) và hàng đợi đồng bộ Firestore
  const isOffline = network.status.isOffline;
  const isOnline = !isOffline;
  const prevOfflineRef = useRef<boolean>(isOffline);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    user?.id ? progressService.getPendingSyncCount(user.id) : 0
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [streakNotice, setStreakNotice] = useState<string | null>(null);
  const [maintenanceState, setMaintenanceState] = useState<{ active: boolean; message: string }>({
    active: false,
    message: 'Hệ thống KIZUNA đang được bảo trì và cập nhật nội dung giáo trình. Vui lòng quay lại sau ít phút.'
  });

  const syncAllOfflineData = useCallback(async (userId: string): Promise<number> => {
    if (!userId) return 0;
    const [progressCount, dailyCount, placementSynced] = await Promise.all([
      progressService.syncOfflineQueue(userId),
      dailyQuestService.syncOfflineDailyQuests(userId),
      placementService.syncPendingPlacement(userId).catch(() => null)
    ]);
    const total = progressCount + dailyCount + (placementSynced ? 1 : 0);
    setPendingSyncCount(progressService.getPendingSyncCount(userId));
    return total;
  }, []);

  const checkMaintenanceStatus = async () => {
    if (isOffline) return;
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/system/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data && typeof data.maintenanceMode === 'boolean') {
          setMaintenanceState({
            active: data.maintenanceMode,
            message: data.maintenanceMessage || maintenanceState.message
          });
          return;
        }
      }
    } catch {}

    try {
      if (db) {
        const snap = await getDoc(doc(db, 'system_config', 'settings'));
        if (snap.exists()) {
          const data = snap.data();
          setMaintenanceState({
            active: Boolean(data?.maintenanceMode),
            message: data?.maintenanceMessage || maintenanceState.message
          });
          return;
        }
      }
    } catch {}
  };

  useEffect(() => {
    void checkMaintenanceStatus();
  }, [user?.id, activeTab, isOffline]);

  useEffect(() => {
    const wasOffline = prevOfflineRef.current;
    prevOfflineRef.current = isOffline;

    if (isOffline) {
      setOfflineBannerDismissed(false);
      setSyncNotice(null);
      if (user?.id) {
        setPendingSyncCount(progressService.getPendingSyncCount(user.id));
      }
      return;
    }

    const current = authService.getCurrentUser();
    if (current?.id) {
      void syncAllOfflineData(current.id).then(syncedCount => {
        if (syncedCount > 0) {
          setSyncNotice(`Đã kết nối Internet và đồng bộ ${syncedCount} thay đổi học tập thành công!`);
          setTimeout(() => setSyncNotice(null), 5000);
        } else if (wasOffline) {
          setSyncNotice('Đã kết nối lại Internet — Dữ liệu trực tuyến đã sẵn sàng.');
          setTimeout(() => setSyncNotice(null), 4000);
        }
      });
    } else if (wasOffline) {
      setSyncNotice('Đã kết nối lại Internet.');
      setTimeout(() => setSyncNotice(null), 3500);
    }
  }, [isOffline, user?.id, syncAllOfflineData]);

  // Đồng bộ quyền mới nhất từ Firestore khi mở ứng dụng (đẩy dữ liệu offline lên trước rồi mới đọc về)
  useEffect(() => {
    authService.initGoogleAuthNative();
    authService.checkRedirectResult().then(redirected => {
      if (redirected) {
        setUser(redirected);
        if (redirected.role === 'ROLE_ADMIN') {
          setActiveTab('admin');
        }
      }
    });

    const bootstrapSession = async () => {
      const current = authService.getCurrentUser();
      if (!current?.id) return;

      if (!isOffline) {
        const syncedCount = await syncAllOfflineData(current.id);
        if (syncedCount > 0) {
          setSyncNotice(`Đã đồng bộ ${syncedCount} thay đổi ngoại tuyến thành công!`);
          setTimeout(() => setSyncNotice(null), 5000);
        }
      }

      const expiryRes = await authService.checkAndUpdateDailyStreak(current);
      if (expiryRes?.evaluation.streakUpdated) {
        setUser({ ...expiryRes.user });
      }

      if (current.email && !isOffline) {
        const synced = await authService.syncUserFromFirestore(current.email);
        if (synced) {
          setUser({ ...synced });
          if (synced.role === 'ROLE_ADMIN') {
            setActiveTab('admin');
          }
        }
      }
    };

    void bootstrapSession();
  }, []);

  // Lắng nghe sự kiện kizuna_user_updated & kizuna_streak_increased để đồng bộ tức thời Navbar, Profile & Banner
  useEffect(() => {
    const handleUserUpdate = () => {
      const fresh = authService.getCurrentUser();
      if (fresh) {
        setUser({ ...fresh });
        setPendingSyncCount(progressService.getPendingSyncCount(fresh.id));
      }
    };

    const handleStreakIncreased = (e: any) => {
      const msg = e?.detail?.message;
      if (msg) {
        setStreakNotice(msg);
        setTimeout(() => setStreakNotice(null), 6000);
      }
    };

    window.addEventListener('kizuna_user_updated', handleUserUpdate);
    window.addEventListener('kizuna_streak_increased', handleStreakIncreased);
    return () => {
      window.removeEventListener('kizuna_user_updated', handleUserUpdate);
      window.removeEventListener('kizuna_streak_increased', handleStreakIncreased);
    };
  }, []);

  // Tự động kiểm tra thời hạn phiên đăng nhập (tối đa 24h) và cập nhật streak theo ngày thực (Real-day Streak)
  useEffect(() => {
    const checkSessionAndDailyStreak = () => {
      const current = authService.getCurrentUser();
      if (!current && user) {
        console.info('[KIZUNA] Phiên đăng nhập đã hết hạn 24 giờ.');
        setUser(null);
        setActiveTab('home');
        return;
      }

      if (current?.id) {
        authService.checkAndUpdateDailyStreak(current).then(res => {
          if (res?.evaluation.streakUpdated) {
            setUser({ ...res.user });
            if (res.evaluation.message && res.evaluation.isConsecutive) {
              setStreakNotice(res.evaluation.message);
              setTimeout(() => setStreakNotice(null), 6000);
            }
          }
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionAndDailyStreak();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Kiểm tra định kỳ mỗi 60 giây (đảm bảo nếu người dùng mở app qua đêm thì đúng 00:00 ngày mới sẽ nhận diện streak)
    const timer = setInterval(checkSessionAndDailyStreak, 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(timer);
    };
  }, [user]);

  const handleTabChange = (tab: UserNavTab, replace = false) => {
    soundService.stop();
    setActiveTab(tab);
    const targetPath = tab === 'home' ? '/' : `/${tab}`;
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ tab }, '', targetPath);
      } else {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Đồng bộ lịch sử ban đầu với URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialTab = getTabFromPath();
      const targetPath = initialTab === 'home' ? '/' : `/${initialTab}`;
      window.history.replaceState({ tab: initialTab }, '', targetPath);
    }
  }, []);

  // Lắng nghe phím Back / Forward của trình duyệt web
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      soundService.stop();
      const tabFromState = (e.state && e.state.tab) ? e.state.tab : getTabFromPath();
      setActiveTab(tabFromState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Hỗ trợ nút Back vật lý / cử chỉ vuốt Back trên điện thoại Android (Capacitor)
  useEffect(() => {
    let backListener: any = null;
    if (isNativeApp()) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        CapApp.addListener('backButton', () => {
          // 1. Đóng modal nếu đang mở
          if (isApkModalOpen) {
            setIsApkModalOpen(false);
            return;
          }
          if (isPlacementModalOpen) {
            setIsPlacementModalOpen(false);
            return;
          }
          // 2. Nếu đang ở trang con khác trang chủ và có lịch sử -> quay về trang trước
          if (window.history.length > 1 && window.location.pathname !== '/' && window.location.pathname !== '/home') {
            window.history.back();
            return;
          }
          // 3. Nếu đang ở tab khác 'home' -> điều hướng về 'home'
          if (activeTab !== 'home') {
            handleTabChange('home');
            return;
          }
          // 4. Nếu đang ở 'home' -> thoát app
          CapApp.exitApp();
        }).then(h => {
          backListener = h;
        });
      }).catch(err => {
        console.warn('Capacitor App listener error:', err);
      });
    }

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [activeTab, isApkModalOpen, isPlacementModalOpen]);

  // Khi đăng nhập thành công: Nếu là Admin chuyển ngay đến Admin Dashboard, ngược lại vào Trang Chủ
  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === 'ROLE_ADMIN') {
      handleTabChange('admin', true);
    } else {
      handleTabChange(getTabFromPath(), true);
    }
  };

  // Đăng xuất: Xóa toàn bộ session lưu trữ và quay về trang đăng nhập
  const handleLogout = () => {
    soundService.stop();
    authService.logout();
    setUser(null);
    handleTabChange('home', true);
  };

  // 1. Nếu chưa đăng nhập hoặc phiên đã hết hạn, hiển thị LoginPage (vẫn giữ thông báo mất mạng nếu đang offline)
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        isOffline={isOffline}
        onRecheckNetwork={network.recheck}
        isCheckingNetwork={network.isChecking}
      />
    );
  }

  // 2. Chế độ Quản trị viên (Admin Dashboard - luôn truy cập được kể cả khi đang bật bảo trì)
  if (activeTab === 'admin') {
    return (
      <AdminDashboardPage
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // 2.5. Chế độ Bảo trì Hệ thống (Maintenance Mode áp dụng cho học viên ROLE_USER)
  if (maintenanceState.active && user.role !== 'ROLE_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900/60 p-8 text-center shadow-xl space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              KIZUNA • Đang Bảo Trì Hệ Thống
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-3">
              Hệ thống đang được nâng cấp
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {maintenanceState.message}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => void checkMaintenanceStatus()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Kiểm tra lại
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. GIAO DIỆN CHÍNH HỌC VIÊN: Left Sidebar Menu + Nền giấy Kanji + Thẻ nội dung
  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-300 font-sans ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f7f9f6] kanji-paper-bg text-slate-800'}`}>
      
      {/* MENUBAR BÊN TRÁI (Desktop) + Header & Drawer & Bottom Navigation (Mobile App) */}
      <UserNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 pb-18 lg:pb-0">
        
        {/* TOPBAR TRÊN MÁY TÍNH (DESKTOP TOPBAR) */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-emerald-100/70 dark:border-slate-800 sticky top-0 z-20 shadow-2xs transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>KIZUNA 絆 — Học tiếng Nhật thông minh chuẩn bản xứ</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
              Bậc: {user.level || 'Tân binh'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút bật/tắt Giao diện Sáng/Tối ở Topbar Desktop */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 shadow-xs transition-colors cursor-pointer"
              title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>

            {/* Nút tải App đa nền tảng ở Topbar Desktop (chỉ hiển thị trên Website) */}
            {!isApp && (
              <button
                onClick={() => setIsApkModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                title="Cài đặt ứng dụng KIZUNA cho Android, iOS và Máy tính (PC)"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Cài Đặt Ứng Dụng</span>
                <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-md font-extrabold">Android • iOS • PC</span>
              </button>
            )}
          </div>
        </header>

        {streakNotice && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-md transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse" />
              </div>
              <span>{streakNotice}</span>
            </div>
            <button
              onClick={() => setStreakNotice(null)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng thông báo chuỗi học tập"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isOffline && !offlineBannerDismissed && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs font-semibold">
            <div className="flex items-center gap-2.5 min-w-0">
              <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="leading-snug">
                Mất kết nối Internet — Đang dùng chế độ Ngoại tuyến.
                {pendingSyncCount > 0
                  ? ` Có ${pendingSyncCount} thay đổi đang chờ tự động đồng bộ khi có mạng lại.`
                  : ' Bạn vẫn có thể học tập bình thường, tiến độ sẽ tự động đồng bộ khi có mạng lại.'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => void network.recheck()}
                disabled={network.isChecking}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${network.isChecking ? 'animate-spin' : ''}`} />
                <span>Kiểm tra</span>
              </button>
              <button
                type="button"
                onClick={() => setOfflineBannerDismissed(true)}
                className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                aria-label="Đóng thông báo mất mạng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isOnline && syncNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900 px-4 py-2 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          </div>
        )}

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'home' && (
            <HomePage
              user={user}
              onNavigate={handleTabChange}
              onOpenPlacement={() => setIsPlacementModalOpen(true)}
            />
          )}
          {activeTab === 'vocab' && <VocabPage />}
          {activeTab === 'grammar' && <GrammarPage />}
          {activeTab === 'kanji' && <KanjiPage />}
          {activeTab === 'roadmap' && <RoadmapPage />}
          {activeTab === 'library' && <LibraryPage />}
          {activeTab === 'exam' && <ExamPage />}
          {activeTab === 'profile' && (
            <ProfilePage
              user={user}
              onLogout={handleLogout}
              isDark={isDark}
              onToggleTheme={toggleTheme}
            />
          )}
        </main>

        {/* FOOTER: GIAO DIỆN CHUẨN SẠCH KHÔNG CHỨA GHI CHÚ DEV */}
        <footer className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-t border-emerald-100 dark:border-slate-800 p-4 sm:p-5 text-center text-slate-500 dark:text-slate-400 text-xs mt-auto transition-colors">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">KIZUNA 絆</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span>Nền tảng học tiếng Nhật thông minh</span>
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-xs">
              © 2026 KIZUNA. All rights reserved.
            </div>
          </div>
        </footer>

      </div>

      {/* MODAL TẢI BẢN APP APK CHO ĐIỆN THOẠI (chỉ hiển thị trên Website) */}
      {!isApp && (
        <ApkDownloadModal
          isOpen={isApkModalOpen}
          onClose={() => setIsApkModalOpen(false)}
        />
      )}

      {/* MODAL THẨM ĐỊNH TRÌNH ĐỘ ĐẦU VÀO CÙNG AI SENSEI */}
      <AiPlacementModal
        isOpen={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        user={user}
        onAssessmentComplete={(result) => {
          if (user) {
            setUser({
              ...user,
              level: result.assignedLevel,
              placementVerified: result.answeredCount > 0,
              placementScore: result.percentage
            });
          }
        }}
        onNavigateToRoadmap={() => handleTabChange('roadmap')}
      />

    </div>
  );
}
