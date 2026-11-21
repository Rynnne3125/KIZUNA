import React, { useState, useEffect } from 'react';
import { Milestone, Stage } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { soundService } from '../../services/soundService';
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
  RotateCcw,
  Crown,
  Target,
  Lightbulb,
  FileText,
  Lock
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

const cleanStageTitle = (title?: string) => {
  if (!title) return '';
  return title
    .replace(/^\[N\d\]\s*/i, '')
    .replace(/^Chặng\s*\d+\s*[—–-]\s*/i, '')
    .trim();
};

export const RoadmapMilestoneDetail: React.FC<RoadmapMilestoneDetailProps> = ({
  milestone,
  stage,
  level,
  userId,
  userProgress,
  onBack,
  onProgressUpdate
}) => {
  // 2 Tabs: Quests & Đọc hiểu
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

  // Speech helper (Hỗ trợ cả Web & Android APK)
  const speakJapanese = (text: string) => {
    soundService.speakJapanese(text);
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
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách Mốc</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 border ${
              isBoss 
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
            }`}
          >
            {isBoss ? (
              <>
                <Crown size={12} />
                <span>Thử Thách Trùm (Checkpoint)</span>
              </>
            ) : (
              `${level} • Chặng ${stage?.orderIndex || 1}`
            )}
          </span>
          {milestone.kanjiMark && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Hán tự: {milestone.kanjiMark}
            </span>
          )}
        </div>
      </div>

      {/* 2. Milestone Overview Banner */}
      <div className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border shadow-md transition-colors ${
        isBoss 
          ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20' 
          : 'border-emerald-100 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start flex-wrap gap-5">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {milestone.nejUnit || `Bài ${milestone.orderIndex || 1}`}
              </span>
              {isMilestoneCompleted ? (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                  <Check size={12} strokeWidth={3} />
                  <span>Đã hoàn thành</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-900">
                  Đang học ({completedQuestIndices.length}/4 nhiệm vụ)
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
              {milestone.title}
            </h1>

            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2 mb-3">
              <Target size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span><b>Mục tiêu:</b> {milestone.canDoGoal || milestone.communicationContext || 'Thực hành giao tiếp tiếng Nhật cốt lõi'}</span>
            </div>

            {milestone.grammarSummary && (
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span><b>Trọng tâm:</b> {milestone.grammarSummary}</span>
              </div>
            )}
          </div>

          {/* Stats Box */}
          <div className="flex flex-col gap-2 min-w-[170px] bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-emerald-700 dark:text-emerald-400">
              <Zap size={15} />
              <span>+{milestone.xpReward || 60} XP</span>
            </div>
            <div className="flex items-center gap-2 font-extrabold text-amber-700 dark:text-amber-400">
              <Trophy size={15} />
              <span>+{milestone.activePointsReward || 40} Năng động</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 pt-2 border-t border-slate-200 dark:border-slate-700">
              Từ vựng: {milestone.vocabIds?.length || 26} · Ngữ pháp: {milestone.grammarIds?.length || 4}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Streamlined Tabs: [Nhiệm vụ] & [Đọc hiểu] */}
      <div className="flex gap-2 border-b-2 border-slate-200 dark:border-slate-800 pb-0.5">
        <button
          onClick={() => setActiveTab('quests')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold border-b-2 -mb-1 transition-all cursor-pointer ${
            activeTab === 'quests'
              ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen size={16} />
          <span>Nhiệm vụ ({completedQuestIndices.length}/4)</span>
        </button>

        <button
          onClick={() => setActiveTab('reading')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold border-b-2 -mb-1 transition-all cursor-pointer ${
            activeTab === 'reading'
              ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles size={16} />
          <span className="flex items-center gap-1.5">
            Đọc hiểu {isReadingDone && <Check size={13} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />}
          </span>
        </button>
      </div>

      {/* 4. TAB 1: 4 QUESTS LIST (Sequential Unlocking 1 -> 2 -> 3 -> 4) */}
      {activeTab === 'quests' && (
        <div className="space-y-3.5">
          {displayQuests.map((q, idx) => {
            const questDone = completedQuestIndices.includes(idx + 1);
            // Quy tắc mở khóa tuần tự:
            // Nhiệm vụ 1 luôn mở. Nhiệm vụ 2 mở khi xong nhiệm vụ 1. Nhiệm vụ 3 mở khi xong nhiệm vụ 2, v.v.
            const isUnlocked = idx === 0 || completedQuestIndices.includes(idx);

            return (
              <div
                key={idx}
                className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap border transition-all ${
                  !isUnlocked
                    ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    : questDone
                    ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-emerald-500/50 dark:border-emerald-600/50 shadow-sm ring-1 ring-emerald-500/20'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                  {/* Step indicator */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${
                    !isUnlocked
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                      : questDone
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  }`}>
                    {!isUnlocked ? <Lock size={15} /> : questDone ? <Check size={16} strokeWidth={3} /> : idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {q.title}
                      </h3>
                      {questDone ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check size={11} strokeWidth={3} /> Đã hoàn thành
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          Sẵn sàng
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <Lock size={10} /> Đang khóa (cần qua Bài {idx})
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {q.description}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">+{q.xpReward || 30} XP</span>
                      <span className="text-amber-600 dark:text-amber-400">+{q.activePointsReward || 15} AP</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {isUnlocked ? (
                  <button
                    onClick={() => setRunningQuestIndex(idx + 1)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 ${
                      questDone
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {questDone ? <RotateCcw size={14} /> : <Play size={14} />}
                    <span>{questDone ? 'Ôn tập lại' : 'Vào học ngay'}</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed"
                  >
                    <Lock size={14} />
                    <span>Đang khóa</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. TAB 2: ĐỌC HIỂU */}
      {activeTab === 'reading' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          {milestone.readingPassage ? (
            <div>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <div>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    HỘI THOẠI ĐỌC HIỂU GIAO TIẾP
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {milestone.readingPassage.title} · {milestone.readingPassage.titleVi}
                  </h2>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => speakJapanese(milestone.readingPassage.japanese)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Volume2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Nghe bài đọc</span>
                  </button>

                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      showTranslation
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}
                  </button>
                </div>
              </div>

              {/* Japanese reading passage */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-base sm:text-lg leading-loose text-slate-900 dark:text-slate-100 mb-4 font-['Noto_Sans_JP',sans-serif]">
                {milestone.readingPassage.japanese}
              </div>

              {/* Vietnamese translation toggle */}
              {showTranslation && (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed text-emerald-900 dark:text-emerald-200 mb-5">
                  <div className="font-extrabold text-xs mb-1.5 text-emerald-800 dark:text-emerald-300">
                    DỊCH NGHĨA TIẾNG VIỆT:
                  </div>
                  {milestone.readingPassage.vietnamese}
                </div>
              )}

              {/* Highlights */}
              {milestone.readingPassage.highlights && milestone.readingPassage.highlights.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mb-2.5">
                    Trọng tâm ngữ pháp trong bài đọc:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {milestone.readingPassage.highlights.map((h: any, i: number) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <b className="text-slate-900 dark:text-white">{h.excerpt}</b> ➔ <span className="text-emerald-600 dark:text-emerald-400 font-bold">{h.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Reading Comprehension Quiz */}
              {milestone.readingPassage.questions && milestone.readingPassage.questions.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText size={16} className="text-slate-500" />
                      <span>Câu hỏi trắc nghiệm kiểm tra độ hiểu:</span>
                    </div>
                    {isReadingDone && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check size={12} strokeWidth={3} />
                        <span>Đã hoàn thành Đọc hiểu</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 mb-5">
                    {milestone.readingPassage.questions.map((q: any, i: number) => {
                      const selectedOpt = userReadingAnswers[i];

                      return (
                        <div key={i} className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                          <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mb-3">
                            Câu {i + 1}: {q.q}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isChosen = selectedOpt === optIdx;
                              let btnClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';

                              if (readingQuizChecked) {
                                if (optIdx === q.answer) {
                                  btnClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-extrabold';
                                } else if (isChosen && optIdx !== q.answer) {
                                  btnClass = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 font-extrabold';
                                }
                              } else if (isChosen) {
                                btnClass = 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-800 dark:text-sky-300 font-extrabold ring-1 ring-sky-500';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => {
                                    if (!readingQuizChecked) {
                                      setUserReadingAnswers(prev => ({ ...prev, [i]: optIdx }));
                                    }
                                  }}
                                  className={`p-3 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${btnClass}`}
                                >
                                  <span className="mr-2 font-bold opacity-60">{String.fromCharCode(65 + optIdx)}.</span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {readingQuizChecked && q.explanation && (
                            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                              <Lightbulb size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span><b>Giải thích:</b> {q.explanation}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reading Quiz action buttons */}
                  <div className="flex justify-end gap-3">
                    {!readingQuizChecked ? (
                      <button
                        onClick={handleCheckReadingQuiz}
                        disabled={Object.keys(userReadingAnswers).length < milestone.readingPassage.questions.length}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all cursor-pointer ${
                          Object.keys(userReadingAnswers).length >= milestone.readingPassage.questions.length
                            ? 'bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 shadow-sm'
                            : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                        }`}
                      >
                        Kiểm tra kết quả trắc nghiệm
                      </button>
                    ) : (
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => {
                            setReadingQuizChecked(false);
                            setUserReadingAnswers({});
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} />
                          <span>Làm lại</span>
                        </button>

                        <button
                          onClick={handleSaveReadingPassage}
                          disabled={savingReading}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                        >
                          {savingReading ? (
                            'Đang lưu...'
                          ) : (
                            <>
                              <Check size={15} strokeWidth={3} />
                              <span>Hoàn thành Đọc hiểu (+25 XP, +15 AP)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              Đang đồng bộ đoạn hội thoại đọc hiểu của mốc từ Firestore...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
