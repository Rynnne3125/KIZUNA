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

  // Auto-initialize demo session if user not logged in
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
      // If guest, create admin demo
      authService.login({ username: 'admin' }).then(res => {
        setUser(res.user);
      });
    }
  };

  return (
    <div className="app-container">
      {/* Top Banner & Navigation Header */}
      <UserNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
        onRoleToggle={handleRoleToggle}
      />

      {/* Main Body Content */}
      <main className="main-content">
        {/* Dedicated Login / Register Page */}
        {activeTab === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => handleTabChange('home')}
          />
        )}

        {/* Dedicated Home Page (Centered on User Learning Progress) */}
        {activeTab === 'home' && (
          <HomePage
            user={user}
            onNavigate={handleTabChange}
            onOpenAuth={() => handleTabChange('login')}
          />
        )}

        {/* Learning Pages */}
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

        {/* Dedicated Admin Portal (Protected with RBAC & 403 Forbidden Screen) */}
        {activeTab === 'admin' && (
          <div>
            {user?.role === 'ROLE_ADMIN' && (
              <AdminNavbar
                user={user}
                onGoHome={() => handleTabChange('home')}
                onLogout={handleLogout}
                onRoleToggle={handleRoleToggle}
              />
            )}
            <AdminDashboardPage
              user={user}
              onGoHome={() => handleTabChange('home')}
              onSwitchToAdmin={handleRoleToggle}
              onLoginDifferent={() => handleTabChange('login')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid var(--border-color)',
        padding: '24px 16px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13,
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#dc2626' }}>⛩️ KIZUNA (絆)</span>
            <span>• Nền tảng học tiếng Nhật đa nền tảng hỗ trợ bởi AI</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span className="badge badge-success">Backend: Spring Boot 3.4 (JWT Bearer)</span>
            <span className="badge badge-secondary">Database: Google Cloud Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
