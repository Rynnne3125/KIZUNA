import React, { useState, useEffect } from 'react';
import { Milestone, Stage } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { progressService, UserRoadmapProgress } from '../../services/progressService';
import { RoadmapQuestRunner } from './RoadmapQuestRunner';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  Trophy, 
  Zap, 
  CheckCircle2, 
  Play, 
  Volume2, 
  Check, 
  AlertCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

interface RoadmapMilestoneDetailProps {
  milestone: Milestone;
  stage: Stage | null;
  level: string;
  userId?: string;
  userProgress: UserRoadmapProgress | null;
  onBack: () => void;
  onProgressUpdate?: (updated: UserRoadmapProgress) => void;
}

export const RoadmapMilestoneDetail: React.FC<RoadmapMilestoneDetailProps> = ({
  milestone,
  stage,
  level,
  userId,
  userProgress,
  onBack,
  onProgressUpdate
}) => {
  // 2 Tabs: Quests & Đọc hiểu (loại bỏ Nhật ký theo yêu cầu)
  const [activeTab, setActiveTab] = useState<'quests' | 'reading'>('quests');
  const [quests, setQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);

  // State for interactive Quest runner
  const [runningQuestIndex, setRunningQuestIndex] = useState<number | null>(null);

  // Reading quiz state
  const [userReadingAnswers, setUserReadingAnswers] = useState<Record<number, number>>({});
  const [readingQuizChecked, setReadingQuizChecked] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

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

  const isMilestoneCompleted = userProgress?.completedMilestones?.includes(milestone.id) || false;
  const isReadingDone = userProgress?.readingCompleted?.includes(milestone.id) || false;
  const completedQuestIndices = userProgress?.completedQuests?.[milestone.id] || [];
  const isBoss = milestone.milestone_type === 'BOSS_CHALLENGE' || milestone.milestone_type === 'CHECKPOINT';

  const defaultQuests = [
    {
      stepIndex: 1,
      title: 'Bài 1: Thẻ Ghi Nhớ Cốt Lõi (SRS Flashcards)',
      questType: 'SRS_FLASHCARD',
      description: 'Luyện tập và ghi nhớ từ vựng, chữ Hán trọng tâm theo chu trình lặp lại ngắt quãng SM-2.',
      xpReward: 30,
      activePointsReward: 15
    },
    {
      stepIndex: 2,
      title: 'Bài 2: Cổng Phản Xạ Từ Vựng (Gatekeeper 100%)',
      questType: 'VOCAB_GATEKEEPER',
      description: 'Vượt qua bài trắc nghiệm phản xạ nghĩa tiếng Việt, yêu cầu đạt 100% độ chính xác để qua cổng.',
      xpReward: 35,
      activePointsReward: 20
    },
    {
      stepIndex: 3,
      title: 'Bài 3: Ngữ Pháp Ghép Câu Kéo Thả (Drag & Drop)',
      questType: 'GRAMMAR_DRILL',
      description: 'Kéo thả các thẻ từ ghép thành câu tiếng Nhật hoàn chỉnh, nhận diện cạm bẫy trợ từ người Việt hay mắc.',
      xpReward: 40,
      activePointsReward: 25
    },
    {
      stepIndex: 4,
      title: 'Bài 4: Đối Thoại Tình Huống AI Sensei (2-Way Dialogue)',
      questType: 'PRACTICE_FINAL',
      description: 'Hội thoại 2 chiều thực chiến theo ngữ cảnh, tự xây dựng câu trả lời và nhận phản hồi trực tiếp từ Sensei.',
      xpReward: 50,
      activePointsReward: 30
    }
  ];

  // Merge Firestore quests while preserving standardized titles and types
  const displayQuests = defaultQuests.map((defQ, idx) => {
    const matched = quests.find(q => (idx === 2 && q.questType === 'GRAMMAR_DRILL') || (idx === 3 && q.questType === 'VOCAB_KANJI_MASTERY'));
    return {
      ...(matched || {}),
      stepIndex: idx + 1,
      title: defQ.title,
      questType: defQ.questType,
      description: defQ.description,
      xpReward: defQ.xpReward,
      activePointsReward: defQ.activePointsReward
    };
  });

  // Handle complete quest from Runner
  const handleCompleteQuest = async (qIndex: number, xp: number, ap: number) => {
    if (!userId) return;
    const updated = await progressService.saveQuestProgress(userId, milestone.id, qIndex, xp, ap);
    if (onProgressUpdate) {
      onProgressUpdate(updated);
    }
  };

  // Handle Reading Quiz check and complete
  const handleCheckReadingQuiz = () => {
    setReadingQuizChecked(true);
  };

  const handleSaveReadingPassage = async () => {
    if (!userId) return;
    setSavingReading(true);
    try {
      const updated = await progressService.saveReadingProgress(userId, milestone.id, 25, 15);
      if (onProgressUpdate) {
        onProgressUpdate(updated);
      }
    } finally {
      setSavingReading(false);
    }
  };

  // If user is currently running an interactive Quest
  if (runningQuestIndex !== null) {
    const activeQuest = displayQuests[runningQuestIndex - 1];
    return (
      <RoadmapQuestRunner
        milestone={milestone}
        questIndex={runningQuestIndex}
        questData={activeQuest}
        onBack={() => setRunningQuestIndex(null)}
        onCompleteQuest={handleCompleteQuest}
      />
    );
  }

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
              Hán tự: {milestone.kanjiMark}
            </span>
          )}
        </div>
      </div>

      {/* 2. Milestone Overview Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: isBoss ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                {milestone.nejUnit || `Bài ${milestone.orderIndex || 1}`}
              </span>
              {isMilestoneCompleted ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                  ✓ Đã hoàn thành mốc
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                  Đang học ({completedQuestIndices.length}/4 quests)
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0' }}>
              {milestone.title}
            </h1>

            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, marginBottom: 12 }}>
              🎯 <b>Mục tiêu giao tiếp:</b> {milestone.canDoGoal || milestone.communicationContext || 'Thực hành giao tiếp tiếng Nhật cốt lõi'}
            </div>

            {/* Grammar summary tags from Firestore */}
            {milestone.grammarSummary && (
              <div style={{ fontSize: 13, color: '#475569', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                💡 <b>Trọng tâm:</b> {milestone.grammarSummary}
              </div>
            )}
          </div>

          {/* Milestone Stats / Rewards */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 160,
              backgroundColor: '#f8fafc',
              padding: '14px 18px',
              borderRadius: 12,
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              <Zap size={16} style={{ color: '#10b981' }} />
              <span>+{milestone.xpReward || 60} Kinh nghiệm XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#b45309' }}>
              <Trophy size={16} style={{ color: '#f59e0b' }} />
              <span>+{milestone.activePointsReward || 40} Điểm năng động</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
              Từ vựng: {milestone.vocabIds?.length || 26} từ · Ngữ pháp: {milestone.grammarIds?.length || 4} mẫu
            </div>
          </div>
        </div>
      </div>

      {/* 3. Streamlined Tabs: [Nhiệm vụ] & [Đọc hiểu] (Loại bỏ Nhật ký theo yêu cầu) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab('quests')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'quests' ? '#16a34a' : '#64748b',
            borderBottom: activeTab === 'quests' ? '3px solid #16a34a' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s'
          }}
        >
          <BookOpen size={16} />
          <span>Nhiệm vụ ({completedQuestIndices.length}/4)</span>
        </button>

        <button
          onClick={() => setActiveTab('reading')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'reading' ? '#16a34a' : '#64748b',
            borderBottom: activeTab === 'reading' ? '3px solid #16a34a' : '3px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s'
          }}
        >
          <Sparkles size={16} />
          <span>Đọc hiểu {isReadingDone ? '✓' : ''}</span>
        </button>
      </div>

      {/* 4. TAB 1: 4 QUESTS LIST */}
      {activeTab === 'quests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayQuests.map((q, idx) => {
            const questDone = completedQuestIndices.includes(idx + 1);

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  border: questDone ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 450px' }}>
                  {/* Step order indicator */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: questDone ? '#dcfce7' : '#f1f5f9',
                      color: questDone ? '#16a34a' : '#475569',
                      fontSize: 14,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: questDone ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                      flexShrink: 0
                    }}
                  >
                    {questDone ? '✓' : idx + 1}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {q.title}
                      </h3>
                      {questDone ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 4, backgroundColor: '#dcfce7', color: '#15803d' }}>
                          Đã hoàn thành
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 4, backgroundColor: '#f1f5f9', color: '#64748b' }}>
                          Chưa học
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginTop: 4 }}>
                      {q.description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#16a34a' }}>
                        +{q.xpReward || 30} XP
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309' }}>
                        +{q.activePointsReward || 15} pts
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setRunningQuestIndex(idx + 1)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: questDone ? '#f8fafc' : '#16a34a',
                    color: questDone ? '#334155' : '#ffffff',
                    borderStyle: questDone ? 'solid' : 'none',
                    borderWidth: questDone ? 1 : 0,
                    borderColor: '#cbd5e1',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: questDone ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.3)',
                    transition: 'all 0.15s'
                  }}
                >
                  <Play size={14} />
                  <span>{questDone ? 'Ôn tập lại' : 'Vào học ngay'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. TAB 2: ĐỌC HIỂU (BÀI ĐỌC TIẾNG NHẬT + TRẮC NGHIỆM ĐỌC HIỂU TƯƠNG TÁC) */}
      {activeTab === 'reading' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          {milestone.readingPassage ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                    HỘI THOẠI ĐỌC HIỂU GIAO TIẾP
                  </span>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                    {milestone.readingPassage.title} · {milestone.readingPassage.titleVi}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
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
                    <span>Nghe bài đọc</span>
                  </button>

                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      backgroundColor: showTranslation ? '#dcfce7' : '#f8fafc',
                      border: showTranslation ? '1px solid #86efac' : '1px solid #cbd5e1',
                      color: showTranslation ? '#15803d' : '#334155',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}
                  </button>
                </div>
              </div>

              {/* Japanese reading passage */}
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

              {/* Vietnamese translation toggle */}
              {showTranslation && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: '#166534',
                    marginBottom: 20
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4, color: '#15803d' }}>
                    DỊCH NGHĨA TIẾNG VIỆT:
                  </div>
                  {milestone.readingPassage.vietnamese}
                </div>
              )}

              {/* Highlights */}
              {milestone.readingPassage.highlights && milestone.readingPassage.highlights.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                    Trọng tâm ngữ pháp trong bài đọc:
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

              {/* Interactive Reading Comprehension Quiz */}
              {milestone.readingPassage.questions && milestone.readingPassage.questions.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                      📝 Câu hỏi trắc nghiệm kiểm tra độ hiểu:
                    </div>
                    {isReadingDone && (
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', backgroundColor: '#dcfce7', padding: '3px 10px', borderRadius: 6 }}>
                        ✓ Đã hoàn thành Đọc hiểu
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                    {milestone.readingPassage.questions.map((q: any, i: number) => {
                      const selectedOpt = userReadingAnswers[i];
                      const isCorrect = selectedOpt === q.answer;

                      return (
                        <div key={i} style={{ padding: 18, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, color: '#0f172a' }}>
                            Câu {i + 1}: {q.q}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isChosen = selectedOpt === optIdx;
                              let bg = '#ffffff';
                              let border = '1px solid #cbd5e1';
                              let color = '#334155';

                              if (readingQuizChecked) {
                                if (optIdx === q.answer) {
                                  bg = '#ecfdf5';
                                  border = '2px solid #10b981';
                                  color = '#065f46';
                                } else if (isChosen && optIdx !== q.answer) {
                                  bg = '#fff1f2';
                                  border = '2px solid #f43f5e';
                                  color = '#9f1239';
                                }
                              } else if (isChosen) {
                                bg = '#eff6ff';
                                border = '2px solid #3b82f6';
                                color = '#1d4ed8';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  onClick={() => {
                                    if (!readingQuizChecked) {
                                      setUserReadingAnswers(prev => ({ ...prev, [i]: optIdx }));
                                    }
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    backgroundColor: bg,
                                    border,
                                    color,
                                    fontSize: 13.5,
                                    fontWeight: isChosen ? 800 : 600,
                                    cursor: readingQuizChecked ? 'default' : 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <span style={{ marginRight: 6, color: '#64748b' }}>{String.fromCharCode(65 + optIdx)}.</span>
                                  {opt}
                                </div>
                              );
                            })}
                          </div>

                          {readingQuizChecked && q.explanation && (
                            <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 8, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: 13, color: '#065f46' }}>
                              💡 <b>Giải thích chi tiết:</b> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reading Quiz action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    {!readingQuizChecked ? (
                      <button
                        onClick={handleCheckReadingQuiz}
                        disabled={Object.keys(userReadingAnswers).length < milestone.readingPassage.questions.length}
                        style={{
                          padding: '10px 24px',
                          backgroundColor: Object.keys(userReadingAnswers).length >= milestone.readingPassage.questions.length ? '#0f172a' : '#94a3b8',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 14,
                          border: 'none',
                          cursor: Object.keys(userReadingAnswers).length >= milestone.readingPassage.questions.length ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Kiểm tra kết quả trắc nghiệm
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => {
                            setReadingQuizChecked(false);
                            setUserReadingAnswers({});
                          }}
                          style={{
                            padding: '10px 18px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 13.5,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCcw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          Làm lại
                        </button>

                        <button
                          onClick={handleSaveReadingPassage}
                          disabled={savingReading}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 14,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          {savingReading ? 'Đang lưu...' : '✓ Hoàn thành Đọc hiểu (+25 XP, +15 AP)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
              Đang đồng bộ đoạn hội thoại đọc hiểu của mốc từ Firestore...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
