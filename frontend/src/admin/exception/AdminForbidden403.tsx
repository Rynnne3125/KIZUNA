import React from 'react';

export interface AdminForbidden403Props {
  userRole?: string;
  userName?: string;
  onGoHome: () => void;
  onSwitchToAdmin: () => void;
  onLoginDifferent: () => void;
}

export const AdminForbidden403: React.FC<AdminForbidden403Props> = ({
  userRole = 'ROLE_USER',
  userName = 'Học Viên',
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
        HTTP 403 FORBIDDEN - ADMIN ONLY
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
        Quyền Truy Cập Bị Từ Chối!
      </h2>

      <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
        Phân hệ này dành riêng cho quản trị viên <strong>ROLE_ADMIN</strong>. Học viên thông thường không được phép can thiệp vào cơ sở dữ liệu và cấu hình hệ thống.
      </p>

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
          <span style={{ color: '#64748b' }}>Tài khoản đang đăng nhập:</span>{' '}
          <strong style={{ color: '#0f172a' }}>{userName}</strong>
        </div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: '#64748b' }}>Vai trò hiện có:</span>{' '}
          <span className="badge badge-warning" style={{ fontSize: 12 }}>{userRole}</span>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Yêu cầu:</span>{' '}
          <span className="badge badge-primary" style={{ fontSize: 12 }}>ROLE_ADMIN</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onGoHome} className="btn btn-secondary">
          🏠 Quay về Trang Học Viên
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
