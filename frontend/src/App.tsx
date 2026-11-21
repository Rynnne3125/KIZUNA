import React, { useState, useEffect } from 'react';
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
import { Smartphone, Download, CheckCircle2, Moon, Sun } from 'lucide-react';
import { ApkDownloadModal } from './user/components/ApkDownloadModal';
import { isNativeApp } from './user/utils/platform';
import { useNetworkStatus } from './user/hooks/useNetworkStatus';
import { useTheme } from './user/hooks/useTheme';
import { NoInternet404Page } from './user/pages/NoInternet404Page';

import { AiPlacementModal } from './user/components/placement/AiPlacementModal';
import { progressService } from './user/services/progressService';
import { placementService } from './user/services/placementService';

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

  // Trạng thái kết nối mạng (Online / Offline) và thông báo đồng bộ
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const current = authService.getCurrentUser();
      if (current?.id) {
        const syncedCount = await progressService.syncOfflineQueue(current.id);
        if (syncedCount > 0) {
          setSyncNotice(`Đã kết nối lại Wi-Fi và đồng bộ ${syncedCount} hoạt động học tập ngoại tuyến!`);
        } else {
          setSyncNotice('Đã kết nối lại Wi-Fi — Chế độ Trực tuyến hoạt động bình thường.');
        }
        setTimeout(() => setSyncNotice(null), 4500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncNotice(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const sync = () => { void placementService.syncPendingPlacement(userId); };
    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [user?.id]);

  // Đồng bộ quyền mới nhất từ Firestore khi mở ứng dụng và khởi tạo Google Auth
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

    const current = authService.getCurrentUser();
    if (current?.email) {
      authService.syncUserFromFirestore(current.email).then(synced => {
        if (synced && synced.role !== current.role) {
          console.info(`[KIZUNA] Đồng bộ quyền từ Firestore: ${current.role} -> ${synced.role}`);
          setUser(synced);
          if (synced.role === 'ROLE_ADMIN') {
            setActiveTab('admin');
          }
        }
      });
    }
  }, []);

  // Lắng nghe sự kiện kizuna_user_updated để đồng bộ tức thời Navbar & Profile khi hoàn thành bài học
  useEffect(() => {
    const handleUserUpdate = () => {
      const fresh = authService.getCurrentUser();
      if (fresh) {
        setUser({ ...fresh });
      }
    };
    window.addEventListener('kizuna_user_updated', handleUserUpdate);
    return () => window.removeEventListener('kizuna_user_updated', handleUserUpdate);
  }, []);

  // Tự động kiểm tra thời hạn phiên đăng nhập (tối đa 24h) kể cả khi tab ở ẩn nền (background)
  useEffect(() => {
    const checkSessionExpiry = () => {
      const current = authService.getCurrentUser();
      if (!current && user) {
        console.info('[KIZUNA] Phiên đăng nhập đã hết hạn 24 giờ.');
        setUser(null);
        setActiveTab('home');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionExpiry();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Kiểm tra định kỳ mỗi 60 giây
    const timer = setInterval(checkSessionExpiry, 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(timer);
    };
  }, [user]);

  const handleTabChange = (tab: UserNavTab, replace = false) => {
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
    authService.logout();
    setUser(null);
    handleTabChange('home', true);
  };

  // 0. BẮT BUỘC: Nếu không có kết nối Internet (mất cả Wi-Fi lẫn 4G/5G)
  // Bất kể đã đăng nhập hay chưa (kể cả khi đã có phiên đăng nhập và vào HomePage),
  // lập tức hiển thị trang 404 Không có Internet.
  // Khi có Internet: Nếu có phiên đăng nhập -> vào HomePage; nếu chưa -> vào LoginPage.
  const isOffline = network.isBlockedByNoInternet || !isOnline;
  if (isOffline) {
    return (
      <NoInternet404Page
        status={network.status}
        isChecking={network.isChecking}
        onRecheck={async () => {
          const fresh = await network.recheck();
          setIsOnline(fresh.connected && !fresh.isOffline);
          return fresh;
        }}
      />
    );
  }

  // 1. Nếu chưa đăng nhập hoặc phiên đã hết hạn, hiển thị LoginPage (Yêu cầu có mạng Wi-Fi hoặc 4G/5G)
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // 2. Chế độ Quản trị viên (Admin Dashboard)
  if (activeTab === 'admin') {
    return (
      <AdminDashboardPage
        user={user}
        onLogout={handleLogout}
      />
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
