import React, { useState, useEffect } from 'react';
import { Milestone, Stage } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  Trophy, 
  Zap, 
  CheckCircle2, 
  Lock, 
  Play, 
  MessageSquare, 
  HelpCircle,
  Volume2,
  FileText,
  PenTool,
  Award
} from 'lucide-react';

interface RoadmapMilestoneDetailProps {
  milestone: Milestone;
  stage: Stage | null;
  level: string;
  onBack: () => void;
  onStartQuest?: (milestone: Milestone, questIndex: number) => void;
}

export const RoadmapMilestoneDetail: React.FC<RoadmapMilestoneDetailProps> = ({
  milestone,
  stage,
  level,
  onBack,
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

  // Speech helper
  const speakJapanese = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  const isCompleted = milestone.status === 'COMPLETED';
  const isBoss = milestone.milestone_type === 'BOSS_CHALLENGE' || milestone.milestone_type === 'CHECKPOINT';

  const defaultQuests = [
    {
      stepIndex: 1,
      title: 'Bài 1: Thẻ học Ghi nhớ Cốt lõi (SRS Flashcards)',
      questType: 'SRS_FLASHCARD',
      description: 'Học và ghi nhớ 26 từ vựng & chữ Hán trọng tâm trong bài theo phương pháp lặp lại ngắt quãng SM-2.',
      xpReward: 30,
      activePointsReward: 15
    },
    {
      stepIndex: 2,
      title: 'Bài 2: Cổng Từ Vựng Phản Xạ (Vocab Gatekeeper 100%)',
      questType: 'VOCAB_GATEKEEPER',
      description: 'Vượt qua bài trắc nghiệm phản xạ 4 phương án đảo ngẫu nhiên, yêu cầu đạt 100% độ chính xác để qua cổng.',
      xpReward: 35,
      activePointsReward: 20
    },
    {
      stepIndex: 3,
      title: 'Bài 3: Ngữ Pháp Ghép Câu & Bẫy Trợ Từ',
      questType: 'GRAMMAR_DRILL',
      description: 'Thực hành ghép các thẻ từ xáo trộn thành câu tiếng Nhật hoàn chỉnh, nhận diện các cạm bẫy trợ từ người Việt hay mắc phải.',
      xpReward: 40,
      activePointsReward: 25
    },
    {
      stepIndex: 4,
      title: 'Bài 4: Bài Tập Thực Chiến & Gặp Gỡ AI Sensei',
      questType: 'PRACTICE_FINAL',
      description: 'Đọc hiểu tình huống thực tế, tự viết câu trả lời và nhận đánh giá, sửa lỗi ngữ pháp tức thời từ AI Sensei.',
      xpReward: 50,
      activePointsReward: 30
    }
  ];

  const displayQuests = quests.length > 0 ? quests : defaultQuests;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* 1. Header Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#334155',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách Mốc</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: isBoss ? '#fef3c7' : '#ecfdf5',
              color: isBoss ? '#d97706' : '#15803d',
              border: isBoss ? '1px solid #fde68a' : '1px solid #bbf7d0'
            }}
          >
            {isBoss ? '👑 Thử Thách Trùm (Checkpoint)' : `${level} • Chặng ${stage?.orderIndex || 1}`}
          </span>
          {milestone.kanjiMark && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 800,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0'
              }}
            >
              Mốc ký hiệu: 【{milestone.kanjiMark}】
            </span>
          )}
        </div>
      </div>

      {/* 2. Milestone Overview Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1.5px solid #e2e8f0',
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: 'var(--shadow-sm)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              {milestone.nejUnit || `Bài học mốc ${milestone.orderIndex}`}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.35 }}>
              {milestone.title}
            </h1>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>🎯 Can-do:</span>
              <span>{milestone.canDoGoal || milestone.communicationContext || 'Hoàn thành các bài tập để củng cố kỹ năng hội thoại.'}</span>
            </div>
          </div>

          {/* Gamification Reward Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 180
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Phần thưởng hoàn tất mốc
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: '#d97706' }}>
              <Trophy size={16} />
              <span>+{milestone.xpReward || 100} XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: '#0284c7' }}>
              <Zap size={16} />
              <span>+{milestone.activePointsReward || 80} Điểm Năng Động</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation (Quests / Reading / Nikki) */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 20,
          gap: 4
        }}
      >
        <button
          onClick={() => setActiveTab('quests')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'quests' ? '3px solid #16a34a' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'quests' ? '#16a34a' : '#64748b',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <Sparkles size={16} />
          <span>4 Bài Học & Nhiệm Vụ (Quests)</span>
        </button>

        {milestone.readingPassage && (
          <button
            onClick={() => setActiveTab('reading')}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeTab === 'reading' ? '3px solid #16a34a' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'reading' ? '#16a34a' : '#64748b',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2
            }}
          >
            <BookOpen size={16} />
            <span>Bài Đọc Hiểu Thực Tế</span>
          </button>
        )}

        {milestone.nikkiDiary && (
          <button
            onClick={() => setActiveTab('nikki')}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeTab === 'nikki' ? '3px solid #16a34a' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'nikki' ? '#16a34a' : '#64748b',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2
            }}
          >
            <PenTool size={16} />
            <span>Nhật Ký Hội Thoại AI Sensei</span>
          </button>
        )}
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'quests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13.5, color: '#475569', marginBottom: 4 }}>
            Mỗi mốc học tập bao gồm chuỗi 4 bài luyện tập khép kín theo đúng tài liệu đặc tả KIZUNA:
          </div>

          {displayQuests.map((q, idx) => {
            const questDone = isCompleted;
            return (
              <div
                key={q.id || idx}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '18px 22px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: '1 1 450px' }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: questDone ? '#dcfce7' : '#f1f5f9',
                      color: questDone ? '#16a34a' : '#0f172a',
                      fontWeight: 900,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {questDone ? '✓' : idx + 1}
                  </span>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {q.title || `Bài học ${idx + 1}`}
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 8px',
                          borderRadius: 4,
                          backgroundColor: '#ecfdf5',
                          color: '#15803d'
                        }}
                      >
                        +{q.xpReward || 30} XP
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 8px',
                          borderRadius: 4,
                          backgroundColor: '#f0f9ff',
                          color: '#0369a1'
                        }}
                      >
                        +{q.activePointsReward || 15} pts
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      {q.description}
                    </div>

                    {q.patterns && q.patterns.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {q.patterns.map((p: any, pIdx: number) => (
                          <span
                            key={pIdx}
                            style={{
                              fontSize: 11.5,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#334155'
                            }}
                          >
                            Mẫu: <b>{p.structure || p.title}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onStartQuest?.(milestone, idx + 1)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
                >
                  <Play size={14} />
                  <span>{questDone ? 'Ôn tập lại' : 'Vào học ngay'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'reading' && milestone.readingPassage && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                HỘI THOẠI ĐỌC HIỂU GIAO TIẾP
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                {milestone.readingPassage.title} · {milestone.readingPassage.titleVi}
              </h2>
            </div>

            <button
              onClick={() => speakJapanese(milestone.readingPassage.japanese)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Volume2 size={16} style={{ color: '#16a34a' }} />
              <span>Nghe đoạn văn</span>
            </button>
          </div>

          {/* Japanese text */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 20,
              fontSize: 16,
              lineHeight: 1.9,
              color: '#0f172a',
              marginBottom: 16,
              fontFamily: '"Noto Sans JP", sans-serif'
            }}
          >
            {milestone.readingPassage.japanese}
          </div>

          {/* Vietnamese translation */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.7,
              color: '#166534',
              marginBottom: 24
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4, color: '#15803d' }}>
              DỊCH NGHĨA TIẾNG VIỆT:
            </div>
            {milestone.readingPassage.vietnamese}
          </div>

          {/* Highlights */}
          {milestone.readingPassage.highlights && milestone.readingPassage.highlights.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                Điểm ngữ pháp xuất hiện trong bài đọc:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {milestone.readingPassage.highlights.map((h: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      fontSize: 12.5,
                      color: '#334155'
                    }}
                  >
                    <b style={{ color: '#0f172a' }}>{h.excerpt}</b> ➔ <span style={{ color: '#16a34a', fontWeight: 700 }}>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          {milestone.readingPassage.questions && milestone.readingPassage.questions.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Câu hỏi trắc nghiệm kiểm tra độ hiểu:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {milestone.readingPassage.questions.map((q: any, i: number) => (
                  <div key={i} style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 10, color: '#0f172a' }}>
                      {i + 1}. {q.q}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                      {q.options?.map((opt: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            fontSize: 13,
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
        <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
              CHỦ ĐỀ VIẾT NHẬT KÝ & ĐỐI THOẠI AI SENSEI
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
              {milestone.nikkiDiary.title} · {milestone.nikkiDiary.vi}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {milestone.nikkiDiary.prompts?.map((p: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: 18,
                  backgroundColor: '#f8fafc',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
                  Tình huống {idx + 1}: {p.q}
                </div>
                {p.hint && (
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
                    💡 <b>Mẫu gợi ý:</b> <code style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: 6, color: '#0f172a' }}>{p.hint}</code>
                  </div>
                )}
                {p.ex && (
                  <div style={{ fontSize: 13, color: '#15803d' }}>
                    ✍️ <b>Câu ví dụ chuẩn:</b> {p.ex}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
