import React, { useState } from 'react';
import { firebaseConfig } from './config/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'admin' | 'user'>('overview');
  const [loginRole, setLoginRole] = useState<'admin' | 'user'>('admin');
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async () => {
    setLoading(true);
    setTokenResult(null);
    try {
      const credentials = loginRole === 'admin'
        ? { username: 'admin', password: 'admin123' }
        : { username: 'user', password: 'user123' };

      const response = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();
      setTokenResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTokenResult(`Lỗi kết nối Backend (Port 3000): ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 900, margin: '40px auto', padding: 24, color: '#1f2937' }}>
      <header style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, color: '#dc2626' }}>
          ⛩️ KIZUNA (絆) - Cross-Platform Japanese Learning
        </h1>
        <p style={{ margin: 0, color: '#4b5563' }}>
          Ứng dụng học tiếng Nhật đa nền tảng kết hợp Spring Boot 3.4 (Port 3000) và Firebase Firestore (Project: {firebaseConfig.projectId})
        </p>
      </header>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          ● Backend: Port 3000 (Bearer Token Auth)
        </span>
        <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          🔥 Firebase: {firebaseConfig.projectId}
        </span>
        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          🚀 Hosting Target: kizuna-6756a
        </span>
        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
          📱 Android Package: com.kizuna
        </span>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {(['overview', 'admin', 'user'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              borderBottom: activeTab === tab ? '3px solid #dc2626' : '3px solid transparent',
              color: activeTab === tab ? '#dc2626' : '#6b7280'
            }}
          >
            {tab === 'overview' && 'Tổng Quan & Test Auth'}
            {tab === 'admin' && 'Phân Hệ Admin'}
            {tab === 'user' && 'Phân Hệ User (Học Viên)'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px 0' }}>🧪 Thử Nghiệm API Đăng Nhập & Lấy Bearer Token</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#4b5563' }}>
              Kiểm tra trực tiếp xác thực với Spring Boot Backend chạy tại <code>http://localhost:3000</code>.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 500 }}>Chọn quyền test:</label>
              <select
                value={loginRole}
                onChange={e => setLoginRole(e.target.value as any)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="admin">Admin (ROLE_ADMIN - admin / admin123)</option>
                <option value="user">User (ROLE_USER - user / user123)</option>
              </select>
              <button
                onClick={handleTestLogin}
                disabled={loading}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Đang gọi API...' : 'Đăng nhập lấy Token'}
              </button>
            </div>

            {tokenResult && (
              <pre style={{ background: '#1e293b', color: '#f8fafc', padding: 16, borderRadius: 8, overflowX: 'auto', fontSize: 13 }}>
                {tokenResult}
              </pre>
            )}
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#991b1b' }}>🛡️ Admin Portal (Web Desktop)</h3>
          <p style={{ margin: '0 0 8px 0', fontSize: 14 }}>Dành cho giáo viên và biên tập viên nội dung học:</p>
          <ul style={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
            <li>Quản lý Bản đồ Hành trình, Chặng & Mốc học tiếng Nhật (Kanji, Từ vựng, Ngữ pháp).</li>
            <li>Thiết lập danh sách Whitelist tri thức cho từng mốc.</li>
            <li>Sandbox kiểm tra Prompt cho AI Sensei & Kiểm duyệt câu hỏi ôn tập.</li>
            <li>Theo dõi số liệu người học và tiến độ toàn hệ thống.</li>
          </ul>
        </div>
      )}

      {activeTab === 'user' && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#15803d' }}>🎒 User Learning Client (Đa Nền Tảng: Web & APK)</h3>
          <p style={{ margin: '0 0 8px 0', fontSize: 14 }}>Dành cho người học tiếng Nhật:</p>
          <ul style={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
            <li>Trải nghiệm bản đồ hành trình tương tác 1 chạm trực quan.</li>
            <li>Thực hành làm bài tập biến thể sinh bởi AI Sensei.</li>
            <li>Thuật toán Spaced Repetition (SRS SM-2) gợi ý ôn tập thông minh hàng ngày.</li>
            <li>Tích lũy kinh nghiệm (XP), duy trì chuỗi học liên tục (Daily Streak).</li>
          </ul>
        </div>
      )}
    </div>
  );
}
