import React from 'react';
import { User } from '../types/auth';
import { UserNavTab } from '../components/UserNavbar';

interface HomePageProps {
  user: User | null;
  onNavigate: (tab: UserNavTab) => void;
  onOpenAuth: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigate, onOpenAuth }) => {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        color: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {user ? `Xin chào, ${user.fullName || user.username}!` : 'Chào mừng bạn đến với KIZUNA!'}
            </span>
            <span style={{ background: '#f59e0b', color: '#78350f', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
              Cấp độ: {user?.level || 'N5'}
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Hôm nay bạn muốn rèn luyện gì nào?
          </h1>
          <p style={{ margin: 0, color: '#c7d2fe', fontSize: 14 }}>
            Học tiếng Nhật chuẩn NEJ & Mimi Oboeru cùng AI Sensei và ngân hàng 85 đề thi JLPT thực chiến.
          </p>
        </div>

        {!user ? (
          <button
            onClick={onOpenAuth}
            className="btn btn-primary btn-lg"
            style={{ background: '#dc2626', borderColor: '#b91c1c' }}
          >
            Đăng nhập để lưu tiến độ 🚀
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>🔥 {user.currentStreak || 1}</div>
              <div style={{ fontSize: 11, color: '#e0e7ff' }}>Chuỗi ngày Streak</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#a7f3d0' }}>⭐ {user.activePoints || 0}</div>
              <div style={{ fontSize: 11, color: '#e0e7ff' }}>Điểm Năng Động</div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          TRỌNG TÂM CHÍNH GIỮA: KHU VỰC TIẾN ĐỘ CỦA USER
          ========================================================================= */}
      <div className="kizuna-card" style={{ padding: 28, marginBottom: 28, border: '2px solid #fecaca', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: 6 }}>
              🎯 TIẾN ĐỘ HỌC TẬP CỦA BẠN (CURRENT PROGRESS)
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              Bạn đang học: Mốc 3 - Giới thiệu bản thân & Nghề nghiệp
            </h2>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              Chặng 1: Bảng Chữ Cái & Phát Âm Cơ Bản (NEJ Bài 3) • Bối cảnh: Gặp gỡ đối tác lần đầu
            </div>
          </div>

          <button
            onClick={() => onNavigate('roadmap')}
            className="btn btn-primary btn-lg"
            style={{ boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)' }}
          >
            Tiếp tục bài học ngay ➔
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: '#0f172a' }}>Tiến độ Chặng 1 (Nhập Môn)</span>
            <span style={{ color: '#dc2626' }}>65% hoàn thành (Bài 2/4 Quest)</span>
          </div>
          <div className="progress-bar-bg" style={{ height: 12 }}>
            <div className="progress-bar-fill" style={{ width: '65%' }}></div>
          </div>
        </div>

        {/* Breakdown of What was learned (Học được bao nhiêu) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          {/* Vocab */}
          <div
            onClick={() => onNavigate('vocab')}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>📖</span>
              <span className="badge badge-success">Đạt 142 từ</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Từ vựng đã thuộc</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              142 <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>/ 13,096 từ</span>
            </div>
          </div>

          {/* Kanji */}
          <div
            onClick={() => onNavigate('kanji')}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🈸</span>
              <span className="badge badge-primary">Đạt 35 chữ</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Chữ Hán Kanji</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              35 <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>/ 2,216 chữ</span>
            </div>
          </div>

          {/* Grammar */}
          <div
            onClick={() => onNavigate('grammar')}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <span className="badge badge-secondary">Đạt 18 mẫu</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Ngữ pháp nắm vững</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              18 <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>/ 605 mẫu</span>
            </div>
          </div>

          {/* JLPT Exams */}
          <div
            onClick={() => onNavigate('exam')}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <span className="badge badge-warning">2 đề thi</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Bộ đề JLPT đã luyện</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
              2 <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>/ 85 bộ đề</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Daily SRS Review & Featured Mock Exam */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Daily SRS Review Queue */}
        <div className="kizuna-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🧠</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Hàng Đợi Ôn Tập Hôm Nay (SRS SM-2)</h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>Thuật toán Spaced Repetition ghi nhớ vĩnh viễn</div>
              </div>
            </div>
            <span className="badge badge-warning">12 thẻ đến hạn</span>
          </div>

          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
            Bộ nhớ của bạn cần củng cố 12 từ vựng và chữ Hán đã học từ 3 ngày trước để không bị rơi vào đường cong quên lãng (Forgetting Curve).
          </p>

          <button
            onClick={() => onNavigate('vocab')}
            className="btn btn-secondary"
            style={{ width: '100%', borderColor: '#f59e0b', color: '#b45309', fontWeight: 700 }}
          >
            Bắt đầu phiên ôn tập 12 thẻ (5 phút) ➔
          </button>
        </div>

        {/* Featured JLPT Exam */}
        <div className="kizuna-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Đề Thi Thử Đề Xuất (Corodomo Bank)</h3>
                <div style={{ fontSize: 12, color: '#64748b' }}>JLPT N5 Ôn tập 11 • Chấm điểm tự động</div>
              </div>
            </div>
            <span className="badge badge-primary">Cực hot</span>
          </div>

          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
            Đề thi đầy đủ 43 câu hỏi chữ Hán, ngữ pháp, đọc hiểu kèm đáp án chi tiết tiếng Việt và thang điểm chuẩn JLPT.
          </p>

          <button
            onClick={() => onNavigate('exam')}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Vào phòng thi thử ngay ➔
          </button>
        </div>
      </div>
    </div>
  );
};
