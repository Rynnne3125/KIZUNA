import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User, Role } from '../types/auth';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('user');
  const [password, setPassword] = useState('user123');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('ROLE_USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { user } = await authService.login({ username, password });
        onLoginSuccess(user);
      } else {
        if (!fullName.trim() || !email.trim()) {
          setError('Vui lòng nhập đầy đủ họ tên và email!');
          setLoading(false);
          return;
        }
        const { user } = await authService.register({
          username,
          password,
          fullName,
          email,
          role
        });
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi xác thực!');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{
      maxWidth: 480,
      margin: '40px auto',
      background: '#ffffff',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-color)',
      overflow: 'hidden'
    }}>
      {/* Brand Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        padding: '28px 24px',
        textAlign: 'center',
        color: '#ffffff'
      }}>
        <div style={{
          width: 52,
          height: 52,
          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          borderRadius: 14,
          margin: '0 auto 12px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
        }}>
          絆
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>
          KIZUNA JAPANESE LEARNING
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#c7d2fe' }}>
          Đăng nhập để lưu tiến độ học tập và rèn luyện thi JLPT
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: '#f8fafc'
      }}>
        <button
          type="button"
          onClick={() => { setMode('login'); setError(null); }}
          style={{
            flex: 1,
            padding: '14px 16px',
            border: 'none',
            background: mode === 'login' ? '#ffffff' : 'transparent',
            fontWeight: 700,
            fontSize: 15,
            color: mode === 'login' ? '#dc2626' : '#64748b',
            borderBottom: mode === 'login' ? '3px solid #dc2626' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); }}
          style={{
            flex: 1,
            padding: '14px 16px',
            border: 'none',
            background: mode === 'register' ? '#ffffff' : 'transparent',
            fontWeight: 700,
            fontSize: 15,
            color: mode === 'register' ? '#dc2626' : '#64748b',
            borderBottom: mode === 'register' ? '3px solid #dc2626' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          Đăng Ký Tài Khoản
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} style={{ padding: 28 }}>
        {/* Quick Fill Box for Testing */}
        <div style={{
          background: '#f1f5f9',
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 18,
          fontSize: 12
        }}>
          <div style={{ fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            ⚡ Điền nhanh tài khoản kiểm thử (1-Click Fill):
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                padding: '5px 10px',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👑 Admin (admin / admin123)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user', 'user123')}
              style={{
                background: '#e0e7ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
                padding: '5px 10px',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🎒 Học viên (user / user123)
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {/* Inputs */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Tên đăng nhập (Username):
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ví dụ: kizuna_user"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>

        {mode === 'register' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Họ và tên hiển thị:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="ví dụ: Nguyễn Văn A"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Địa chỉ Email:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Phân quyền tài khoản:
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: 14,
                  outline: 'none'
                }}
              >
                <option value="ROLE_USER">Học viên (ROLE_USER)</option>
                <option value="ROLE_ADMIN">Quản trị viên (ROLE_ADMIN)</option>
              </select>
            </div>
          </>
        )}

        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
            Mật khẩu:
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Về Trang Chủ
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ flex: 1 }}
          >
            {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng Nhập Ngay ➔' : 'Hoàn Tất Đăng Ký ➔')}
          </button>
        </div>
      </form>
    </div>
  );
};
