import React, { useState, useEffect } from 'react';
import { Milestone } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { soundService } from '../../services/soundService';
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
    return () => {
      soundService.stop();
    };
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
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        style={{
          width: '100%',
          maxWidth: '580px',
          height: '100%',
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
          className={isBoss ? 'bg-indigo-950 dark:bg-indigo-950 text-white' : 'bg-slate-900 dark:bg-slate-950 text-white border-b dark:border-slate-800'}
          style={{
            padding: '24px',
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
          className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800"
          style={{
            display: 'flex',
            padding: '4px 16px 0'
          }}
        >
          <button
            onClick={() => setActiveTab('quests')}
            className={`px-4 py-3 border-b-2 font-bold text-[13px] cursor-pointer flex items-center gap-1.5 bg-transparent transition-colors ${
              activeTab === 'quests'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>⚡ 4 Bài Học (Quests)</span>
          </button>

          {milestone.readingPassage && (
            <button
              onClick={() => setActiveTab('reading')}
              className={`px-4 py-3 border-b-2 font-bold text-[13px] cursor-pointer flex items-center gap-1.5 bg-transparent transition-colors ${
                activeTab === 'reading'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>📖 Bài Đọc Hiểu</span>
            </button>
          )}

          {milestone.nikkiDiary && (
            <button
              onClick={() => setActiveTab('nikki')}
              className={`px-4 py-3 border-b-2 font-bold text-[13px] cursor-pointer flex items-center gap-1.5 bg-transparent transition-colors ${
                activeTab === 'nikki'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>✍️ Nhật Ký Hội Thoại</span>
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '24px', flex: 1 }}>
          {activeTab === 'quests' && (
            <div>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">
                Hoàn thành tuần tự 4 bài học dưới đây để đạt 100% tỉ lệ thông thạo và mở khóa mốc tiếp theo trên bản đồ:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {displayQuests.map((q, idx) => {
                  const questDone = isCompleted;
                  return (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm flex flex-col gap-2.5 transition-colors"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className={`w-6.5 h-6.5 rounded-full font-extrabold text-xs flex items-center justify-center ${
                              questDone
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {questDone ? '✓' : idx + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {q.title || `Bài ${idx + 1}`}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +{q.xpReward || 30} XP
                        </span>
                      </div>

                      <div className="text-[12.5px] text-slate-500 dark:text-slate-400">
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
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  ĐOẠN VĂN HỘI THOẠI MẪU
                </span>
                <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white mt-1 mb-0.5">
                  {milestone.readingPassage.title} ({milestone.readingPassage.titleVi})
                </h3>
              </div>

              {/* Japanese dialogue text */}
              <div
                className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 mb-4"
              >
                {milestone.readingPassage.japanese}
              </div>

              {/* Vietnamese translation */}
              <div
                className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 text-[13.5px] leading-relaxed text-emerald-800 dark:text-emerald-200 mb-5"
              >
                <div className="font-bold text-xs mb-1 text-emerald-700 dark:text-emerald-400">
                  BẢN DỊCH TIẾNG VIỆT:
                </div>
                {milestone.readingPassage.vietnamese}
              </div>

              {/* Comprehension Questions */}
              {milestone.readingPassage.questions && milestone.readingPassage.questions.length > 0 && (
                <div>
                  <h4 className="text-sm font-extrabold mb-2.5 text-slate-900 dark:text-white">
                    Câu hỏi trắc nghiệm kiểm tra độ hiểu:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {milestone.readingPassage.questions.map((q: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="font-bold text-[13px] mb-2 text-slate-800 dark:text-slate-200">
                          {i + 1}. {q.q}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {q.options?.map((opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className="px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
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
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase">
                  CHỦ ĐỀ LUYỆN VIẾT & HỘI THOẠI AI SENSEI
                </span>
                <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white mt-1 mb-0.5">
                  {milestone.nikkiDiary.title} ({milestone.nikkiDiary.vi})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {milestone.nikkiDiary.prompts?.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="font-bold text-[13px] text-slate-900 dark:text-slate-100 mb-1.5">
                      Tình huống {idx + 1}: {p.q}
                    </div>
                    {p.hint && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        💡 <b>Mẫu gợi ý:</b> <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200">{p.hint}</code>
                      </div>
                    )}
                    {p.ex && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
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
          className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 flex items-center justify-between gap-3"
        >
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Trạng thái:</div>
            <div className={`text-[13px] font-extrabold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
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
