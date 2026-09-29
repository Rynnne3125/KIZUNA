import React from 'react';

export interface AdminNavbarProps {
  user: { fullName?: string; username?: string; role?: string } | null;
  onGoHome: () => void;
  onLogout: () => void;
  onRoleToggle: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  user,
  onGoHome,
  onLogout,
  onRoleToggle
}) => {
  return (
    <div style={{
      background: '#1e1b4b',
      color: '#ffffff',
      padding: '12px 20px',
      marginBottom: 24,
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: '#dc2626',
          color: '#fff',
          fontWeight: 900,
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 14
        }}>
          ADMIN
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Hệ Thống Quản Trị Trung Tâm KIZUNA</div>
          <div style={{ fontSize: 12, color: '#a5b4fc' }}>Phân hệ dành riêng cho ban điều hành & giáo viên</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onRoleToggle}
          title="Chuyển đổi quyền nhanh để test màn hình 403"
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: 'none' }}
        >
          🔄 Đổi sang ROLE_USER
        </button>
        <button
          onClick={onGoHome}
          className="btn btn-sm"
          style={{ background: '#3b82f6', color: '#ffffff', border: 'none' }}
        >
          🎒 Về giao diện Học viên
        </button>
        {user && (
          <button
            onClick={onLogout}
            className="btn btn-sm btn-secondary"
            style={{ color: '#ef4444', borderColor: '#f87171' }}
          >
            Đăng xuất
          </button>
        )}
      </div>
    </div>
  );
};
