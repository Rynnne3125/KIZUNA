import React, { useState } from 'react';
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
  // Bắt đầu từ tài khoản trong session. Nếu chưa đăng nhập, bắt buộc vào LoginPage trước!
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<UserNavTab>('home');

  const handleTabChange = (tab: UserNavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveTab('home');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setActiveTab('home');
  };

  const handleRoleToggle = () => {
    const updated = authService.toggleRoleForTest();
    if (updated) {
      setUser({ ...updated });
    } else {
      authService.login({ username: 'admin' }).then(res => {
        setUser(res.user);
      });
    }
  };

  // 1. YÊU CẦU QUAN TRỌNG: Nếu chưa đăng nhập, bắt buộc hiển thị LoginPage trước!
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
        onSwitchToAdmin={handleRoleToggle}
        onLoginDifferent={() => handleTabChange('login')}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Nếu người dùng chọn tab 'login' khi đã có tài khoản (chuyển tài khoản khác)
  if (activeTab === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => handleTabChange('home')}
      />
    );
  }

  // 4. GIAO DIỆN CHÍNH: Left Sidebar Menu + Nền khung giấy viết Kanji + Thẻ nội dung màu trắng
  return (
    <div className="min-h-screen flex flex-col lg:flex-row kanji-paper-bg text-slate-800">
      
      {/* MENUBAR BÊN TRÁI (Desktop) + Header & Drawer & Bottom Navigation (Mobile App) */}
      <UserNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
        onRoleToggle={handleRoleToggle}
      />

      {/* KHU VỰC NỘI DUNG CHÍNH (Responsive cho Web & App, có đệm đáy cho Bottom Nav trên mobile) */}
      <div className="flex-1 flex flex-col min-w-0 pb-18 lg:pb-0">
        
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'home' && (
            <HomePage
              user={user}
              onNavigate={handleTabChange}
              onOpenAuth={() => handleTabChange('login')}
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
              onRoleToggle={handleRoleToggle}
              onOpenAuth={() => handleTabChange('login')}
            />
          )}
        </main>

        {/* FOOTER: TONE TRẮNG & XANH LÁ NHẸ */}
        <footer className="bg-white/80 backdrop-blur-xs border-t border-emerald-100 p-4 sm:p-5 text-center text-slate-500 text-xs mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-700 tracking-tight">KIZUNA 絆</span>
              <span className="text-slate-400">•</span>
              <span>Nền tảng học tiếng Nhật thông minh</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                Spring Boot 3
              </span>
              <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold">
                Firestore
              </span>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
