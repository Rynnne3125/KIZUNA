import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { Stage, Milestone } from '../types/kizuna';

export const RoadmapPage: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, m] = await Promise.all([
          kizunaService.getStages(),
          kizunaService.getMilestones()
        ]);
        setStages(s);
        setMilestones(m);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-primary" style={{ marginBottom: 6 }}>
          🗺️ BẢN ĐỒ LỘ TRÌNH KIZUNA (ROADMAP)
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
          Lộ Trình Học Chuẩn Giáo Trình NEJ (N5 ➔ N4)
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Mỗi mốc học tập bao gồm 4 bài học (Quest): Học từ vựng, Vượt cổng Gatekeeper, Ghép câu Scramble và Bài tập tổng hợp với AI Sensei.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang nạp lộ trình...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {stages.map(stage => {
            const stageMilestones = milestones.filter(m => m.stageId === stage.id || !m.stageId);
            return (
              <div key={stage.id} className="kizuna-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <span className="badge badge-secondary" style={{ marginBottom: 4 }}>
                      Chặng {stage.orderIndex}
                    </span>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      {stage.title}
                    </h2>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{stage.description}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {stageMilestones.slice(0, 4).map((ms, idx) => {
                    const status = ms.status || (idx === 0 ? 'COMPLETED' : idx === 1 ? 'UNLOCKED' : 'LOCKED');
                    const isCompleted = status === 'COMPLETED';
                    const isUnlocked = status === 'UNLOCKED';

                    return (
                      <div
                        key={ms.id}
                        style={{
                          background: isCompleted ? '#f0fdf4' : isUnlocked ? '#ffffff' : '#f8fafc',
                          border: isCompleted ? '1.5px solid #86efac' : isUnlocked ? '2px solid #dc2626' : '1px solid #e2e8f0',
                          borderRadius: 'var(--radius-md)',
                          padding: 16,
                          position: 'relative',
                          opacity: status === 'LOCKED' ? 0.7 : 1
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                            Mốc {ms.orderIndex || (idx + 1)} • {ms.nejUnit}
                          </span>
                          {isCompleted && <span className="badge badge-success">✓ Đã xong</span>}
                          {isUnlocked && <span className="badge badge-primary">⚡ Đang mở</span>}
                          {status === 'LOCKED' && <span style={{ fontSize: 14 }}>🔒 Khóa</span>}
                        </div>

                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                          {ms.title}
                        </h3>

                        <div style={{ fontSize: 12, color: '#475569', marginBottom: 12, minHeight: 32 }}>
                          {ms.communicationContext || 'Thực hành giao tiếp tiếng Nhật'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10, fontSize: 11 }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>+{ms.xpReward || 50} XP</span>
                          <span style={{ color: '#4f46e5', fontWeight: 700 }}>+{ms.activePointsReward || 20} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
