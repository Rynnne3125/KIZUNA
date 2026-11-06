import React, { useState, useEffect } from 'react';
import { Milestone } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { X, BookOpen, Sparkles, Trophy, Zap, CheckCircle2, Lock, ArrowRight, Play, MessageSquare, HelpCircle } from 'lucide-react';

interface MilestoneDrawerProps {
  milestone: Milestone | null;
  isOpen: boolean;
  onClose: () => void;
  onStartQuest?: (milestone: Milestone, questIndex: number) => void;
}

export const MilestoneDrawer: React.FC<MilestoneDrawerProps> = ({
  milestone,
  isOpen,
  onClose,
  onStartQuest
}) => {
  const [activeTab, setActiveTab] = useState<'quests' | 'reading' | 'nikki'>('quests');
  const [quests, setQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);

  useEffect(() => {
    if (milestone?.id) {
      setLoadingQuests(true);
      kizunaService.getMilestoneQuests(milestone.id)
        .then(res => setQuests(res))
        .finally(() => setLoadingQuests(false));
    }
  }, [milestone?.id]);

  if (!isOpen || !milestone) return null;

  const isCompleted = milestone.status === 'COMPLETED';
  const isUnlocked = milestone.status === 'UNLOCKED' || milestone.status === 'IN_PROGRESS';
  const isBoss = milestone.milestone_type === 'BOSS_CHALLENGE' || milestone.milestone_type === 'CHECKPOINT';

  // Default 4 quests if not yet returned by backend
  const displayQuests = quests.length > 0 ? quests : [
    {
      stepIndex: 1,
      title: 'Bài 1: Thẻ học Ghi nhớ Cốt lõi (SRS Flashcards)',
      questType: 'SRS_FLASHCARD',
      description: 'Học và phản xạ 26 từ vựng & chữ Hán trọng tâm của bài.',
      xpReward: 30,
      activePointsReward: 15
    },
    {
      stepIndex: 2,
      title: 'Bài 2: Cổng Từ Vựng Phản Xạ (Vocab Gatekeeper 100%)',
      questType: 'VOCAB_GATEKEEPER',
      description: 'Vượt rào trắc nghiệm đảo phương án, đạt 100% để qua cổng.',
      xpReward: 35,
      activePointsReward: 20
    },
    {
      stepIndex: 3,
      title: 'Bài 3: Ngữ Pháp Ghép Câu & Bẫy Trợ Từ',
      questType: 'GRAMMAR_DRILL',
      description: 'Luyện cấu trúc câu ngữ pháp và nhận diện lỗi sai người Việt hay gặp.',
      xpReward: 40,
      activePointsReward: 25
    },
    {
      stepIndex: 4,
      title: 'Bài 4: Bài Tập Thực Chiến & Gặp Gỡ AI Sensei',
      questType: 'PRACTICE_FINAL',
      description: 'Tự viết câu hội thoại thực tế, nhận góp ý tức thời từ AI Sensei.',
      xpReward: 50,
      activePointsReward: 30
    }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          height: '100%',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header of Drawer */}
        <div
          style={{
            padding: '24px',
            backgroundColor: isBoss ? '#1e1b4b' : '#0f172a',
            color: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 800,
                  backgroundColor: isBoss ? '#f59e0b' : isCompleted ? '#10b981' : '#3b82f6',
                  color: '#ffffff'
                }}
              >
                {isBoss ? '👑 CHECKPOINT BOSS' : `MỐC ${milestone.orderIndex} • ${milestone.nejUnit || 'Bài học'}`}
              </span>

              {isCompleted ? (
                <span style={{ fontSize: 12, color: '#86efac', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} /> Đã hoàn thành
                </span>
              ) : isUnlocked ? (
                <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={14} /> Đang mở khóa
                </span>
              ) : (
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={14} /> Chưa mở khóa
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px 0', lineHeight: 1.4 }}>
            {milestone.title}
          </h2>

          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
            🎯 <b>Mục tiêu Can-do:</b> {milestone.canDoGoal || milestone.communicationContext || 'Làm chủ mẫu câu và từ vựng trong bài.'}
          </div>

          {/* Reward Chips */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#facc15' }}>
              <Trophy size={14} />
              <span>+{milestone.xpReward || 100} XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
              <Zap size={14} />
              <span>+{milestone.activePointsReward || 80} Điểm Năng Động</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '4px 16px 0'
          }}
        >
          <button
            onClick={() => setActiveTab('quests')}
            style={{
              padding: '12px 16px',
              border: 'none',
              borderBottom: activeTab === 'quests' ? '3px solid #16a34a' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'quests' ? '#16a34a' : '#64748b',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>⚡ 4 Bài Học (Quests)</span>
          </button>

          {milestone.readingPassage && (
            <button
              onClick={() => setActiveTab('reading')}
              style={{
                padding: '12px 16px',
                border: 'none',
                borderBottom: activeTab === 'reading' ? '3px solid #16a34a' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'reading' ? '#16a34a' : '#64748b',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📖 Bài Đọc Hiểu</span>
            </button>
          )}

          {milestone.nikkiDiary && (
            <button
              onClick={() => setActiveTab('nikki')}
              style={{
                padding: '12px 16px',
                border: 'none',
                borderBottom: activeTab === 'nikki' ? '3px solid #16a34a' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'nikki' ? '#16a34a' : '#64748b',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>✍️ Nhật Ký Hội Thoại</span>
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '24px', flex: 1 }}>
          {activeTab === 'quests' && (
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Hoàn thành tuần tự 4 bài học dưới đây để đạt 100% tỉ lệ thông thạo và mở khóa mốc tiếp theo trên bản đồ:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {displayQuests.map((q, idx) => {
                  const questDone = isCompleted;
                  return (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: '16px',
                        borderRadius: 14,
                        border: '1.5px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              backgroundColor: questDone ? '#dcfce7' : '#f1f5f9',
                              color: questDone ? '#16a34a' : '#475569',
                              fontWeight: 800,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {questDone ? '✓' : idx + 1}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                            {q.title || `Bài ${idx + 1}`}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                          +{q.xpReward || 30} XP
                        </span>
                      </div>

                      <div style={{ fontSize: 12.5, color: '#64748b' }}>
                        {q.description || 'Nhiệm vụ rèn luyện kỹ năng cốt lõi.'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
                        <button
                          onClick={() => onStartQuest?.(milestone, idx + 1)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Play size={12} />
                          <span>{questDone ? 'Ôn lại' : 'Làm bài'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'reading' && milestone.readingPassage && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  ĐOẠN VĂN HỘI THOẠI MẪU
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: '4px 0 2px' }}>
                  {milestone.readingPassage.title} ({milestone.readingPassage.titleVi})
                </h3>
              </div>

              {/* Japanese dialogue text */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: '#0f172a',
                  marginBottom: 16
                }}
              >
                {milestone.readingPassage.japanese}
              </div>

              {/* Vietnamese translation */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: '#166534',
                  marginBottom: 20
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: '#15803d' }}>
                  BẢN DỊCH TIẾNG VIỆT:
                </div>
                {milestone.readingPassage.vietnamese}
              </div>

              {/* Comprehension Questions */}
              {milestone.readingPassage.questions && milestone.readingPassage.questions.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: '#0f172a' }}>
                    Câu hỏi trắc nghiệm kiểm tra độ hiểu:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {milestone.readingPassage.questions.map((q: any, i: number) => (
                      <div key={i} style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                          {i + 1}. {q.q}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {q.options?.map((opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                fontSize: 12,
                                color: '#334155'
                              }}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'nikki' && milestone.nikkiDiary && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase' }}>
                  CHỦ ĐỀ LUYỆN VIẾT & HỘI THOẠI AI SENSEI
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: '4px 0 2px' }}>
                  {milestone.nikkiDiary.title} ({milestone.nikkiDiary.vi})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {milestone.nikkiDiary.prompts?.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: 14,
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 6 }}>
                      Tình huống {idx + 1}: {p.q}
                    </div>
                    {p.hint && (
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        💡 <b>Mẫu gợi ý:</b> <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{p.hint}</code>
                      </div>
                    )}
                    {p.ex && (
                      <div style={{ fontSize: 12, color: '#16a34a' }}>
                        ✍️ <b>Ví dụ:</b> {p.ex}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer CTA */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Trạng thái:</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: isCompleted ? '#16a34a' : '#0f172a' }}>
              {isCompleted ? 'Đã tốt nghiệp mốc' : 'Sẵn sàng học tập'}
            </div>
          </div>

          <button
            onClick={() => onStartQuest?.(milestone, 1)}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)'
            }}
          >
            <span>{isCompleted ? 'ÔN TẬP MỐC NÀY' : 'BẮT ĐẦU BÀI HỌC NGAY'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
