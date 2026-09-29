import React, { useState } from 'react';
import { AdminForbidden403 } from '../exception/AdminForbidden403';
import { useAdminData } from '../hooks/useAdminData';

export interface AdminDashboardPageProps {
  user: { fullName?: string; username?: string; role?: string } | null;
  onGoHome: () => void;
  onSwitchToAdmin: () => void;
  onLoginDifferent: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  onGoHome,
  onSwitchToAdmin,
  onLoginDifferent
}) => {
  const { stats, users, audits, loading } = useAdminData();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audits'>('overview');

  // Access Control: Must be ROLE_ADMIN
  if (!user || user.role !== 'ROLE_ADMIN') {
    return (
      <AdminForbidden403
        userRole={user?.role}
        userName={user?.fullName || user?.username}
        onGoHome={onGoHome}
        onSwitchToAdmin={onSwitchToAdmin}
        onLoginDifferent={onLoginDifferent}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-primary" style={{ marginBottom: 6 }}>
          🛡️ TRANG QUẢN TRỊ VIÊN (ADMIN PORTAL - ROLE_ADMIN ONLY)
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
          Trung Tâm Điều Hành & Quản Trị Hệ Thống KIZUNA
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Bạn đang đăng nhập với tư cách <strong>{user.fullName || user.username}</strong> ({user.role}).
        </p>
      </div>

      {/* Admin Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('overview')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'overview' ? '#1e1b4b' : '#f1f5f9',
            color: activeTab === 'overview' ? '#fff' : '#475569',
            fontWeight: 700
          }}
        >
          📊 Tổng quan hệ thống
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'users' ? '#1e1b4b' : '#f1f5f9',
            color: activeTab === 'users' ? '#fff' : '#475569',
            fontWeight: 700
          }}
        >
          👥 Quản lý người dùng ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'audits' ? '#1e1b4b' : '#f1f5f9',
            color: activeTab === 'audits' ? '#fff' : '#475569',
            fontWeight: 700
          }}
        >
          🤖 Kiểm duyệt AI Sensei ({audits.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang nạp dữ liệu quản trị...</div>
      ) : activeTab === 'overview' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Module 1: Quản lý người dùng */}
          <div className="kizuna-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Quản Lý Người Dùng & Phân Quyền
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Tra cứu danh sách học viên ({stats?.totalLearners || 1240} học viên), khóa/mở tài khoản, cấp quyền ROLE_ADMIN và điều chỉnh điểm.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-success">API: /api/v1/admin/users</span>
            </div>
          </div>

          {/* Module 2: Quản lý Bản đồ Hành trình */}
          <div className="kizuna-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗺️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Quản Lý Chặng & Mốc Học Tập
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Biên tập {stats?.totalStages || 34} chặng (Stages), {stats?.totalMilestones || 182} mốc học (Milestones) theo giáo trình NEJ.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-primary">Database: Firestore</span>
            </div>
          </div>

          {/* Module 3: Hàng đợi kiểm duyệt AI */}
          <div className="kizuna-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🤖</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Kiểm Duyệt Phán Quyết AI Sensei
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Xem xét khiếu nại của học viên khi AI chấm điểm bài viết tự do ({stats?.pendingAiAudits || 5} bài chờ duyệt).
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-warning">Collection: ai_evaluation_audits</span>
            </div>
          </div>

          {/* Module 4: Quản lý Ngân hàng Đề thi JLPT */}
          <div className="kizuna-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎯</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Quản Lý Đề Thi JLPT ({stats?.totalExamsAvailable || 85} Bộ Đề)
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Quản lý kho 85 bộ đề thi chính thức N5 - N1, kiểm tra audio URL, đáp án và lời giải thích chi tiết.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-secondary">Collection: jlpt_exams</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="kizuna-card" style={{ padding: 24, overflowX: 'auto' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Danh Sách Người Dùng Hệ Thống</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Họ tên / Username</th>
                <th style={{ padding: '10px 12px' }}>Email</th>
                <th style={{ padding: '10px 12px' }}>Vai trò</th>
                <th style={{ padding: '10px 12px' }}>Cấp độ</th>
                <th style={{ padding: '10px 12px' }}>Điểm / XP</th>
                <th style={{ padding: '10px 12px' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <strong>{u.fullName}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>@{u.username}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${u.role === 'ROLE_ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{u.level}</td>
                  <td style={{ padding: '10px 12px' }}>{u.activePoints} pts / {u.totalXp} XP</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {audits.map(audit => (
            <div key={audit.id} className="kizuna-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span className="badge badge-warning" style={{ marginRight: 8 }}>{audit.status}</span>
                  <strong>{audit.milestoneTitle}</strong> • {audit.questTitle}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Học viên: @{audit.username} ({audit.submittedAt})</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Bài nộp của học viên:</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{audit.userSubmission}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13 }}>
                  <span>Điểm AI: <strong style={{ color: '#059669' }}>{audit.aiScore}/100</strong>. </span>
                  <span style={{ color: '#475569' }}>Nhận xét: {audit.aiFeedback}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ background: '#059669', borderColor: '#047857' }}>
                    ✓ Duyệt đạt
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }}>
                    ✕ Yêu cầu viết lại
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
