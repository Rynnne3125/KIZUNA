import React from 'react';
import { User } from '../types/auth';

export interface Forbidden403Props {
  user: User | null;
  onGoHome: () => void;
  onSwitchToAdmin: () => void;
  onLoginDifferent: () => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  user,
  onGoHome,
  onSwitchToAdmin,
  onLoginDifferent
}) => {
  return (
    <div style={{
      maxWidth: 640,
      margin: '60px auto',
      padding: '40px 24px',
      textAlign: 'center',
      background: '#ffffff',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid #fecaca',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{
        width: 80,
        height: 80,
        margin: '0 auto 24px auto',
        background: '#fee2e2',
        color: '#dc2626',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 38,
        border: '4px solid #fca5a5'
      }}>
        ⛔
      </div>

      <div style={{
        display: 'inline-block',
        background: '#fee2e2',
        color: '#991b1b',
        fontSize: 13,
        fontWeight: 800,
        padding: '4px 12px',
        borderRadius: 999,
        marginBottom: 12,
        letterSpacing: '1px'
      }}>
        HTTP 403 FORBIDDEN
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
        Quyền Truy Cập Bị Từ Chối!
      </h2>

      <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
        Khu vực này yêu cầu đặc quyền <strong>ROLE_ADMIN</strong> để quản lý hệ thống và biên tập nội dung.
      </p>

      {user ? (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: 28,
          textAlign: 'left',
          fontSize: 14
        }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#64748b' }}>Tài khoản hiện tại:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{user.fullName || user.username}</strong>
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#64748b' }}>Vai trò hiện có:</span>{' '}
            <span className="badge badge-warning" style={{ fontSize: 12 }}>{user.role}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Yêu cầu:</span>{' '}
            <span className="badge badge-primary" style={{ fontSize: 12 }}>ROLE_ADMIN</span>
          </div>
        </div>
      ) : (
        <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 24 }}>
          Bạn chưa đăng nhập vào hệ thống KIZUNA. Vui lòng đăng nhập với tài khoản Admin.
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onGoHome} className="btn btn-secondary">
          🏠 Quay về Trang Chủ
        </button>

        <button onClick={onSwitchToAdmin} className="btn btn-primary">
          ⚡ Chuyển sang ROLE_ADMIN để thử nghiệm
        </button>

        <button onClick={onLoginDifferent} className="btn btn-secondary" style={{ color: '#4f46e5' }}>
          🔑 Đăng nhập tài khoản khác
        </button>
      </div>
    </div>
  );
};
