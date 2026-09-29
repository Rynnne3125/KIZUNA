import React, { useState } from 'react';
import { User } from '../types/auth';
import { authService } from '../services/authService';

interface ProfilePageProps {
  user: User | null;
  onLogout: () => void;
  onRoleToggle: () => void;
  onOpenAuth: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onLogout,
  onRoleToggle,
  onOpenAuth
}) => {
  const [copied, setCopied] = useState(false);
  const token = authService.getToken();

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }} className="kizuna-card">
        <div style={{ padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Bạn chưa đăng nhập</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
            Vui lòng đăng nhập để xem thông tin hồ sơ và lưu tiến trình học tập của bạn.
          </p>
          <button onClick={onOpenAuth} className="btn btn-primary">
            Đăng nhập / Đăng ký ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-primary" style={{ marginBottom: 6 }}>
          👤 HỒ SƠ NGƯỜI DÙNG KIZUNA
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
          Quản Lý Tài Khoản & Quyền Truy Cập
        </h1>
      </div>

      <div className="kizuna-card" style={{ padding: 28, marginBottom: 24 }}>
        {/* User Info Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt="Avatar"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '3px solid #e2e8f0'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {user.fullName || user.username}
              </h2>
              <span className={`badge ${user.role === 'ROLE_ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>
                {user.role}
              </span>
            </div>
            <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              @{user.username} • {user.email}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>🔥 {user.currentStreak || 1}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Ngày Streak</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4338ca' }}>⭐ {user.activePoints || 0}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Điểm Năng Động</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>🏆 {user.totalXp || 0}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Kinh Nghiệm (XP)</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{user.level || 'N5'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Cấp độ JLPT</div>
          </div>
        </div>

        {/* Role Toggle for Testing Permissions & 403 */}
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          padding: 16,
          borderRadius: 'var(--radius-md)',
          marginBottom: 24
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
            ⚡ Kiểm thử phân quyền RBAC & Màn hình 403 Forbidden:
          </div>
          <p style={{ fontSize: 13, color: '#78350f', marginBottom: 12 }}>
            Bấm nút dưới đây để hoán đổi nhanh giữa vai trò <strong>ROLE_USER</strong> và <strong>ROLE_ADMIN</strong>. Khi là ROLE_USER, bạn sẽ bị chặn 403 khi vào Trang Quản Trị.
          </p>
          <button
            onClick={onRoleToggle}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#d97706', color: '#92400e', background: '#fff', fontWeight: 700 }}
          >
            Chuyển sang vai trò {user.role === 'ROLE_ADMIN' ? 'ROLE_USER (Học viên)' : 'ROLE_ADMIN (Quản trị viên)'}
          </button>
        </div>

        {/* Bearer Token Preview */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
              🔑 Mã Xác Thực (JWT Bearer Token):
            </span>
            <button
              onClick={handleCopyToken}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              {copied ? '✓ Đã sao chép' : 'Sao chép token'}
            </button>
          </div>
          <div style={{
            background: '#1e293b',
            color: '#38bdf8',
            fontFamily: 'monospace',
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            wordBreak: 'break-all',
            maxHeight: 100,
            overflowY: 'auto'
          }}>
            Bearer {token || 'Chưa có token'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Token này được tự động gửi trong header <code>Authorization: Bearer &lt;token&gt;</code> cho mọi request API.
          </div>
        </div>

        {/* Logout Button */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
          >
            🚪 Đăng xuất khỏi hệ thống
          </button>
        </div>
      </div>
    </div>
  );
};
