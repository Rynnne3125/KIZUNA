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

export default function App() {
  // Lấy người dùng từ session được lưu trong localStorage (tối đa 24h)
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  
  // Tự động điều hướng đến 'admin' nếu là ROLE_ADMIN, ngược lại vào 'home'
  const [activeTab, setActiveTab] = useState<UserNavTab>(() => {
    const current = authService.getCurrentUser();
    return current?.role === 'ROLE_ADMIN' ? 'admin' : 'home';
  });

  // Đồng bộ quyền mới nhất từ Firestore khi mở ứng dụng (đảm bảo quyền mới sửa trên console ăn ngay)
  useEffect(() => {
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

  const handleTabChange = (tab: UserNavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Khi đăng nhập thành công: Nếu là Admin chuyển ngay đến Admin Dashboard, ngược lại vào Trang Chủ
  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === 'ROLE_ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('home');
    }
  };

  // Đăng xuất: Xóa toàn bộ session lưu trữ và quay về trang đăng nhập
  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setActiveTab('home');
  };

  // 1. Nếu chưa đăng nhập hoặc phiên đã hết hạn, bắt buộc hiển thị LoginPage trước!
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
        onGoHome={() => handleTabChange('home')}
        onLogout={handleLogout}
      />
    );
  }

  // 3. GIAO DIỆN CHÍNH HỌC VIÊN: Left Sidebar Menu + Nền giấy Kanji + Thẻ nội dung
  return (
    <div className="min-h-screen flex flex-col lg:flex-row kanji-paper-bg text-slate-800">
      
      {/* MENUBAR BÊN TRÁI (Desktop) + Header & Drawer & Bottom Navigation (Mobile App) */}
      <UserNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
      />

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 pb-18 lg:pb-0">
        
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'home' && (
            <HomePage
              user={user}
              onNavigate={handleTabChange}
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
            />
          )}
        </main>

        {/* FOOTER: GIAO DIỆN CHUẨN SẠCH KHÔNG CHỨA GHI CHÚ DEV */}
        <footer className="bg-white/80 backdrop-blur-xs border-t border-emerald-100 p-4 sm:p-5 text-center text-slate-500 text-xs mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-700 tracking-tight">KIZUNA 絆</span>
              <span className="text-slate-400">•</span>
              <span>Nền tảng học tiếng Nhật thông minh</span>
            </div>
            <div className="text-slate-400 text-xs">
              © 2026 KIZUNA. All rights reserved.
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
