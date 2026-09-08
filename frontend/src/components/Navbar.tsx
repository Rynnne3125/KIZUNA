import React from 'react';
import { Sparkles, Flame, Trophy, LogIn, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenAiSensei: () => void;
  streak?: number;
  xp?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  onOpenAiSensei,
  streak = 1,
  xp = 120,
}) => {
  return (
    <header style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #e11d48, #be123c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.4rem' }} className="kanji-font">
            絆
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              KIZUNA <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>日本語</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI-Native Japanese Learning</p>
          </div>
        </div>

        {/* Right Nav Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* AI Sensei Button */}
          <button onClick={onOpenAiSensei} className="btn" style={{ background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8' }}>
            <Sparkles size={18} />
            <span>AI Sensei</span>
          </button>

          {/* Gamification Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '6px 14px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ea580c', fontWeight: 700, fontSize: '0.85rem' }}>
              <Flame size={18} fill="#ea580c" />
              <span>{streak} ngày</span>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'var(--border)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#eab308', fontWeight: 700, fontSize: '0.85rem' }}>
              <Trophy size={18} />
              <span>{xp} XP</span>
            </div>
          </div>

          {/* Auth Button */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <button onClick={onLogout} className="btn btn-outline" style={{ padding: '8px 12px' }} title="Đăng xuất">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={onLogin} className="btn btn-primary">
              <LogIn size={18} />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
