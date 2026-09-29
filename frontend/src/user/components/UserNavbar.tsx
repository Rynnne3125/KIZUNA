import React from 'react';
import { User } from '../types/auth';

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
  const navItems: Array<{ id: UserNavTab; label: string; icon: string }> = [
    { id: 'home', label: 'Trang chủ', icon: '🏠' },
    { id: 'vocab', label: 'Từ vựng', icon: '📖' },
    { id: 'grammar', label: 'Ngữ pháp', icon: '📝' },
    { id: 'kanji', label: 'Kanji', icon: '🈸' },
    { id: 'roadmap', label: 'Lộ trình', icon: '🗺️' },
    { id: 'library', label: 'Thư viện', icon: '🎬' },
    { id: 'exam', label: 'Ôn thi', icon: '🎯' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Banner Bar */}
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => onTabChange('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 20,
            boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)'
          }}>
            絆
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', letterSpacing: '0.5px' }}>
              KIZUNA <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>絆</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: -2 }}>
              Học Tiếng Nhật Thông Minh & AI
            </div>
          </div>
        </div>

        {/* User Badges & Auth Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              {/* Streak */}
              <div
                title="Chuỗi ngày học liên tục"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                <span>🔥</span>
                <span>{user.currentStreak || 1} ngày</span>
              </div>

              {/* Active Points */}
              <div
                title="Điểm Năng Động KIZUNA"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#e0e7ff',
                  color: '#4338ca',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                <span>⭐</span>
                <span>{user.activePoints || 0} pts</span>
              </div>

              {/* Role Badge (Quick Toggle for test) */}
              <button
                onClick={onRoleToggle}
                title="Bấm vào đây để chuyển đổi nhanh quyền Admin / User để kiểm thử phân quyền & 403"
                style={{
                  background: user.role === 'ROLE_ADMIN' ? '#fee2e2' : '#f1f5f9',
                  color: user.role === 'ROLE_ADMIN' ? '#991b1b' : '#334155',
                  border: user.role === 'ROLE_ADMIN' ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>{user.role === 'ROLE_ADMIN' ? '👑 ADMIN' : '🎒 HỌC VIÊN'}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>(Đổi role)</span>
              </button>

              {/* User Avatar & Logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  onClick={() => onTabChange('profile')}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  {user.fullName || user.username}
                </span>
                <button
                  onClick={onLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => onTabChange('login')}
              className="btn btn-primary btn-sm"
              style={{ padding: '6px 16px', borderRadius: 999 }}
            >
              Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Menu Bar */}
      <div style={{
        background: '#ffffff',
        borderTop: '1px solid #f1f5f9',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          gap: 4
        }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 14px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#dc2626' : '#475569',
                  borderBottom: isActive ? '3px solid #dc2626' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Management Menu Item (Always present, but requires ROLE_ADMIN) */}
          <button
            onClick={() => onTabChange('admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === 'admin' ? 700 : 600,
              color: activeTab === 'admin' ? '#b91c1c' : '#b45309',
              borderBottom: activeTab === 'admin' ? '3px solid #b91c1c' : '3px solid transparent',
              transition: 'all 0.15s ease',
              marginLeft: 'auto',
              flexShrink: 0
            }}
          >
            <span>🛡️</span>
            <span>Trang Quản Trị</span>
            {user?.role === 'ROLE_ADMIN' ? (
              <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>
                Admin
              </span>
            ) : (
              <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>
                🔒 Khóa
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
