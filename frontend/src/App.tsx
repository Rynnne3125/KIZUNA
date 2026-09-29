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
import { AdminNavbar } from './admin/components/AdminNavbar';

export default function App() {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<UserNavTab>('home');

  useEffect(() => {
    if (!user) {
      const demoUser = authService.getCurrentUser();
      if (demoUser) {
        setUser(demoUser);
      }
    }
  }, []);

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

  // If user is in admin mode, completely override the layout
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

  // If user is in login mode, show the standalone Login Page (no navbar/footer)
  if (activeTab === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => handleTabChange('home')}
      />
    );
  }

  return (
    <div className="app-container">
      <UserNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
        onRoleToggle={handleRoleToggle}
      />

      <main className="main-content">
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

      <footer className="bg-white border-t p-6 text-center text-slate-500 text-sm mt-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-orange-600">KIZUNA</span>
            <span>- Nền tảng học tiếng Nhật</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-semibold">Spring Boot 3</span>
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-semibold">Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
