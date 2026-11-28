import React, { useEffect, useState, useMemo } from 'react';
import {
  Target,
  Clock,
  FileText,
  Headphones,
  Lightbulb,
  CheckCircle2,
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  RotateCcw,
  Search,
  Award,
  BookOpen,
  AlertCircle,
  Sparkles,
  FileCheck,
  Calendar,
  Timer,
  Eye,
  EyeOff
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { authService } from '../services/authService';
import { progressService, UserExamResult } from '../services/progressService';
import { Exam } from '../types/kizuna';

// Thời lượng thi chuẩn chính thức theo quy định JLPT (tính bằng phút)
const JLPT_STANDARD_DURATIONS: Record<string, number> = {
  N5: 105,
  N4: 125,
  N3: 140,
  N2: 155,
  N1: 170
};

const LEVEL_FILTERS = [
  { id: 'ALL', label: 'Tất cả cấp độ', kanji: '全' },
  { id: 'N5', label: 'N5 Nhập môn (105p)', kanji: '入門' },
  { id: 'N4', label: 'N4 Sơ cấp (125p)', kanji: '初級' },
  { id: 'N3', label: 'N3 Trung cấp (140p)', kanji: '中級' },
  { id: 'N2', label: 'N2 Trung thượng (155p)', kanji: '中上' },
  { id: 'N1', label: 'N1 Thượng cấp (170p)', kanji: '上級' },
];

type ExamMode = 'exam' | 'practice';

interface ScoreDetail {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percentage: number;
  isPassed: boolean;
  timeSpentSeconds: number;
  isTimeUp: boolean;
}

export const ExamPage: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const [exams, setExams] = useState<Exam[]>([]);
  const [catalogTotalExams, setCatalogTotalExams] = useState<number>(105);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Lịch sử làm bài của học viên
  const [examResults, setExamResults] = useState<Record<string, UserExamResult>>({});

  // Phòng thi (Exam Room): 'exam' (Thi thật - ẩn furigana) hoặc 'practice' (Luyện tập - hiện đáp án & furigana)
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>('exam');
  const [showPracticeFurigana, setShowPracticeFurigana] = useState<boolean>(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreDetail | null>(null);
  const [loadingExamDetail, setLoadingExamDetail] = useState(false);

  // Modals xác nhận
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState<string | null>(null);

  // Đồng hồ đếm ngược thời gian thực theo chuẩn JLPT
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    kizunaService.getAppCatalogStats().then((stats) => {
      if (stats?.examsCount && stats.examsCount > 0) {
        setCatalogTotalExams(stats.examsCount);
      }
    }).catch(() => {});
  }, []);

  // Nạp danh mục đề thi
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const list = await kizunaService.getExamCatalog(levelFilter);
        setExams(list);
        if (levelFilter === 'ALL' && list.length > 0) {
          setCatalogTotalExams(list.length);
        }
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [levelFilter]);

  // Nạp lịch sử tiến trình thi
  useEffect(() => {
    if (currentUser?.id) {
      progressService.getUserExamResults(currentUser.id).then(results => {
        setExamResults(results);
      });
    }
  }, [currentUser?.id]);

  // Bộ đếm ngược thời gian (chỉ chạy ở chế độ Thi thật)
  useEffect(() => {
    if (examMode === 'exam' && isTimerRunning && secondsRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmitOnTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examMode, isTimerRunning, secondsRemaining, isSubmitted]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDurationSpent = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    if (m > 0) return `${m} phút ${s} giây`;
    return `${s} giây`;
  };

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return exams;
    const q = searchQuery.toLowerCase().trim();
    return exams.filter(ex =>
      ex.label.toLowerCase().includes(q) ||
      ex.level.toLowerCase().includes(q) ||
      (ex.year && ex.year.toString().includes(q))
    );
  }, [exams, searchQuery]);

  const handleStartExam = async (examId: string, mode: ExamMode = 'exam') => {
    setLoadingExamDetail(true);
    setLoadErrorMsg(null);
    try {
      const fullExam = await kizunaService.getExamById(examId);
      const hasQuestions = Boolean(
        fullExam &&
        Array.isArray(fullExam.questionSets) &&
        fullExam.questionSets.some(qs => Array.isArray(qs.questions) && qs.questions.length > 0)
      );
      if (fullExam && hasQuestions) {
        setActiveExam(fullExam);
        setExamMode(mode);
        setShowPracticeFurigana(true);
        setUserAnswers({});
        setIsSubmitted(false);
        setScoreResult(null);

        const standardDurationMin = JLPT_STANDARD_DURATIONS[fullExam.level?.toUpperCase()] || 120;
        const examDurationMin = (fullExam.durationMinutes && fullExam.durationMinutes > 0)
          ? fullExam.durationMinutes
          : standardDurationMin;

        const totalSecs = examDurationMin * 60;
        setSecondsRemaining(totalSecs);
        setTotalDurationSeconds(totalSecs);
        setIsTimerRunning(mode === 'exam');

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setLoadErrorMsg('Đề thi này hiện chưa có dữ liệu câu hỏi hoặc không thể tải chi tiết. Vui lòng chọn đề thi khác!');
      }
    } catch {
      setLoadErrorMsg('Đã có lỗi xảy ra khi nạp chi tiết đề thi. Vui lòng thử lại!');
    } finally {
      setLoadingExamDetail(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    if (examMode === 'practice' && userAnswers[questionId]) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleRetryQuestion = (questionId: string) => {
    if (isSubmitted || examMode !== 'practice') return;
    setUserAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleSwitchExamMode = (nextMode: ExamMode) => {
    if (nextMode === examMode) return;
    if (isSubmitted) {
      handleResetExam(nextMode);
      return;
    }
    if (nextMode === 'practice') {
      setExamMode('practice');
      setShowPracticeFurigana(true);
      setIsTimerRunning(false);
    } else {
      setUserAnswers({});
      setExamMode('exam');
      setSecondsRemaining(totalDurationSeconds);
      setIsTimerRunning(true);
    }
  };

  const handleAutoSubmitOnTimeUp = () => {
    executeSubmission(true);
  };

  const handleSubmitExam = () => {
    if (!activeExam || !activeExam.questionSets) return;
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    executeSubmission(false);
  };

  const handleCancelSubmit = () => {
    setShowSubmitModal(false);
  };

  const countUnansweredQuestions = () => {
    if (!activeExam || !activeExam.questionSets) return 0;
    let count = 0;
    for (const qs of activeExam.questionSets) {
      for (const q of (qs.questions || [])) {
        if (!userAnswers[q.id]) count++;
      }
    }
    return count;
  };

  const executeSubmission = async (isTimeExpired: boolean) => {
    if (!activeExam || !activeExam.questionSets) return;
    setIsTimerRunning(false);

    let total = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    for (const qs of activeExam.questionSets) {
      for (const q of (qs.questions || [])) {
        total++;
        const chosen = userAnswers[q.id];
        if (!chosen) {
          unanswered++;
        } else if (chosen === q.correctAnswer) {
          correct++;
        } else {
          wrong++;
        }
      }
    }

    const timeSpent = Math.max(1, totalDurationSeconds - secondsRemaining);
    const percentage = Math.round((correct / (total || 1)) * 100);
    const isPassed = percentage >= 50;

    const scoreData: ScoreDetail = {
      total,
      correct,
      wrong,
      unanswered,
      percentage,
      isPassed,
      timeSpentSeconds: timeSpent,
      isTimeUp: isTimeExpired
    };

    setScoreResult(scoreData);
    setIsSubmitted(true);

    if (currentUser?.id) {
      const resultPayload: UserExamResult = {
        userId: currentUser.id,
        examId: activeExam.id,
        examLabel: activeExam.label,
        level: activeExam.level,
        score: correct,
        total,
        percentage,
        isPassed,
        timeSpentSeconds: timeSpent,
        answeredCount: Object.keys(userAnswers).length,
        totalQuestions: total,
        completedAt: new Date().toISOString(),
        userAnswers
      };

      await progressService.saveExamResult(resultPayload);
      setExamResults(prev => ({ ...prev, [activeExam.id]: resultPayload }));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetExam = (targetMode: ExamMode = examMode) => {
    setUserAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    setExamMode(targetMode);
    if (targetMode === 'practice') {
      setShowPracticeFurigana(true);
    }
    if (activeExam) {
      const standardDurationMin = JLPT_STANDARD_DURATIONS[activeExam.level?.toUpperCase()] || 120;
      const examDurationMin = (activeExam.durationMinutes && activeExam.durationMinutes > 0)
        ? activeExam.durationMinutes
        : standardDurationMin;
      const totalSecs = examDurationMin * 60;
      setSecondsRemaining(totalSecs);
      setTotalDurationSeconds(totalSecs);
      setIsTimerRunning(targetMode === 'exam');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitExam = () => {
    if (examMode === 'exam' && !isSubmitted && Object.keys(userAnswers).length > 0) {
      setShowExitModal(true);
      return;
    }
    performExit();
  };

  const performExit = () => {
    setShowExitModal(false);
    setActiveExam(null);
    setUserAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    setIsTimerRunning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // =========================================================================
  // GIAO DIỆN PHÒNG THI & LUYỆN TẬP (EXAM ROOM)
  // =========================================================================
  if (activeExam) {
    const answeredCount = Object.keys(userAnswers).length;
    let totalQuestionsCount = 0;
    let liveCorrectCount = 0;
    let liveWrongCount = 0;
    if (activeExam.questionSets) {
      for (const qs of activeExam.questionSets) {
        const qsList = qs.questions || [];
        totalQuestionsCount += qsList.length;
        for (const q of qsList) {
          const chosen = userAnswers[q.id];
          if (chosen) {
            if (chosen === q.correctAnswer) liveCorrectCount++;
            else liveWrongCount++;
          }
        }
      }
    }
    if (totalQuestionsCount === 0) {
      totalQuestionsCount = activeExam.actualQuestionCount || activeExam.totalQuestions || 1;
    }
    const progressPercent = Math.min(100, Math.round((answeredCount / totalQuestionsCount) * 100));

    // Quy tắc Furigana:
    // - Trong chế độ Thi thật (khi chưa nộp bài): LUÔN ẨN Furigana để mô phỏng đúng đề thi JLPT thực tế
    // - Trong chế độ Luyện tập hoặc sau khi nộp bài: HIỂN THỊ Furigana (kèm nút bật/tắt nhanh nếu muốn)
    const shouldHideFurigana = (examMode === 'exam' && !isSubmitted) || !showPracticeFurigana;

    return (
      <div className="max-w-4xl mx-auto pb-16 space-y-5">
        <style>{`
          @keyframes kanjiSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes kizunaModalIn {
            from { opacity: 0; transform: scale(0.96) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* 1. THANH ĐIỀU HƯỚNG GHIM PHÒNG THI (STICKY HEADER) */}
        <div className="sticky top-14 lg:top-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3.5 sm:px-5 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md px-2 py-0.5 text-xs font-black">
                  {activeExam.level}
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0 font-jp-serif truncate">
                  {activeExam.label}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                {examMode === 'exam' ? (
                  <span className="inline-flex items-center gap-1">
                    <Timer size={13} className={secondsRemaining < 300 && !isSubmitted ? 'text-rose-500' : 'text-slate-400'} />
                    Thời gian:{' '}
                    <strong className={secondsRemaining < 300 && !isSubmitted ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}>
                      {formatTime(secondsRemaining)}
                    </strong>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-bold">
                    <Lightbulb size={13} />
                    <span>Chế độ Luyện tập · Xem đáp án ngay</span>
                  </span>
                )}
                <span>•</span>
                <span>
                  Tiến độ: <strong className="text-rose-600 dark:text-rose-400">{answeredCount}</strong> / {totalQuestionsCount} câu ({progressPercent}%)
                </span>
                {examMode === 'practice' && answeredCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Đúng: {liveCorrectCount}</span>
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">Sai: {liveWrongCount}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bộ chuyển đổi 2 chế độ: Thi thật / Luyện tập */}
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitchExamMode('exam')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    examMode === 'exam'
                      ? 'bg-slate-900 dark:bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Thi thật
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchExamMode('practice')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    examMode === 'practice'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Luyện tập
                </button>
              </div>

              {/* Nút Bật/Tắt Furigana (chỉ hiện trong Luyện tập hoặc khi xem lại sau nộp bài; Thi thật ẩn bắt buộc) */}
              {(examMode === 'practice' || isSubmitted) ? (
                <button
                  type="button"
                  onClick={() => setShowPracticeFurigana(prev => !prev)}
                  title={showPracticeFurigana ? 'Ẩn phiên âm Furigana' : 'Hiện phiên âm Furigana'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    showPracticeFurigana
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {showPracticeFurigana ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>Furigana: {showPracticeFurigana ? 'Bật' : 'Tắt'}</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                  <EyeOff size={12} /> Ẩn Furigana
                </span>
              )}

              {!isSubmitted ? (
                examMode === 'exam' ? (
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={15} /> Nộp bài chấm điểm
                  </button>
                ) : (
                  <>
                    {answeredCount > 0 && (
                      <button
                        type="button"
                        onClick={() => executeSubmission(false)}
                        className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={15} /> Tổng kết & Lưu
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleResetExam('practice')}
                      className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} /> Làm lại
                    </button>
                  </>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleResetExam()}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-rose-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={15} /> Làm lại bài thi
                </button>
              )}

              <button
                type="button"
                onClick={handleExitExam}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} /> Thoát
              </button>
            </div>
          </div>

          {/* Thanh tiến trình */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full transition-all duration-300 ${
                isSubmitted ? 'bg-emerald-600' : examMode === 'practice' ? 'bg-teal-600' : 'bg-rose-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 2. BẢNG TỔNG KẾT KẾT QUẢ THI KHI NỘP BÀI */}
        {isSubmitted && scoreResult && (
          <div className="bg-gradient-to-br from-white to-stone-50 dark:from-slate-900 dark:to-slate-900/95 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 rounded-2xl p-5 sm:p-7 shadow-sm">
            {scoreResult.isTimeUp && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 mb-4 text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500 shrink-0" />
                <span>Hết thời gian thi chính thức theo chuẩn JLPT! Hệ thống đã tự động thu bài và chấm điểm của bạn.</span>
              </div>
            )}

            <div className="text-center mb-5">
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold mb-3 border ${
                scoreResult.percentage >= 80
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : scoreResult.percentage >= 50
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}>
                {scoreResult.percentage >= 80 ? (
                  <>
                    <Sparkles size={15} />
                    <span>合格見込み · XUẤT SẮC - ĐẠT CHUẨN ĐỖ CAO</span>
                  </>
                ) : scoreResult.percentage >= 50 ? (
                  <>
                    <Award size={15} />
                    <span>合格圏内 · ĐẠT CHUẨN ĐỖ CƠ BẢN</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={15} />
                    <span>要復習 · CẦN CỐ GẮNG ÔN TẬP THÊM</span>
                  </>
                )}
              </div>

              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
                {scoreResult.correct}{' '}
                <span className="text-xl text-slate-500 dark:text-slate-400">/ {scoreResult.total} câu đúng</span>
                <span className="text-2xl text-rose-600 dark:text-rose-400 ml-2.5">({scoreResult.percentage}%)</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Tiến trình đã được tự động lưu vào hồ sơ học tập KIZUNA của bạn
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} /> THỜI GIAN LÀM BÀI
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {formatDurationSpent(scoreResult.timeSpentSeconds)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Quy định: {Math.round(totalDurationSeconds / 60)} phút
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText size={13} /> TIẾN ĐỘ TRẢ LỜI
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {scoreResult.total - scoreResult.unanswered} / {scoreResult.total} câu
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Hoàn thành {Math.round(((scoreResult.total - scoreResult.unanswered) / (scoreResult.total || 1)) * 100)}% đề thi
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 rounded-xl p-3">
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> SỐ CÂU ĐÚNG
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {scoreResult.correct} câu
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Đạt {scoreResult.percentage}% điểm
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 rounded-xl p-3">
                <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle size={13} /> CÂU SAI & BỎ QUA
                </div>
                <div className="text-lg font-black text-rose-700 dark:text-rose-300 mt-1">
                  {scoreResult.wrong + scoreResult.unanswered} câu
                </div>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                  {scoreResult.wrong} câu sai · {scoreResult.unanswered} chưa chọn
                </div>
              </div>
            </div>

            <div className="mt-4 p-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 text-center">
              Toàn bộ câu hỏi bên dưới đã mở khóa đầy đủ Furigana, giải thích từ vựng/ngữ pháp và kịch bản dịch nghĩa để bạn ôn tập.
            </div>
          </div>
        )}

        {/* 3. AUDIO PLAYER CHUNG CHO CHOUKAI */}
        {activeExam.audioUrl && !(activeExam.questionSets || []).some(qs => Boolean(qs.audioUrl)) && (
          <div className="p-4 sm:p-5 bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-800/70 border-l-4 border-l-teal-600 dark:border-l-teal-500">
            <div className="text-xs sm:text-sm font-extrabold text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
              <Headphones size={16} />
              <span>File Nghe Audio Chính Thức (JLPT Official Choukai Audio):</span>
            </div>
            <audio src={activeExam.audioUrl} controls className="w-full h-10 outline-none" />
          </div>
        )}

        {/* 4. TOÀN BỘ CÁC PHẦN THI (MONDAI QUESTION SETS) */}
        <div className={shouldHideFurigana ? 'kizuna-hide-furigana space-y-6' : 'space-y-6'}>
          {activeExam.questionSets && activeExam.questionSets.map((qs, setIdx) => {
            const isListeningPart = qs.part === 2;
            const anyQuestionAnsweredInSet = qs.questions.some(q => Boolean(userAnswers[q.id]));
            const showSetScript = Boolean(qs.script) && (isSubmitted || (examMode === 'practice' && anyQuestionAnsweredInSet));

            return (
              <div
                key={qs.id || setIdx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs transition-colors"
              >
                {/* Tiêu đề Mondai */}
                <div className={`bg-slate-50 dark:bg-slate-800/80 p-3 px-4 rounded-xl text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-4 border border-slate-200 dark:border-slate-700 border-l-4 flex items-center gap-2.5 flex-wrap ${
                  isListeningPart ? 'border-l-teal-600 dark:border-l-teal-500' : 'border-l-rose-600 dark:border-l-rose-500'
                }`}>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                    isListeningPart
                      ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800'
                      : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {isListeningPart ? 'CHOUKAI' : 'BUNPOU / DOKKAI'}
                  </span>
                  <span>
                    Phần {qs.part === 1 ? 'Kiến Thức Ngôn Ngữ & Đọc Hiểu' : 'Nghe Hiểu (Choukai)'}:{' '}
                    <span className="kizuna-passage-html" dangerouslySetInnerHTML={{ __html: qs.title }} />
                  </span>
                </div>

                {/* Audio player riêng cho Mondai */}
                {qs.audioUrl && (
                  <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70 rounded-xl p-3 mb-4">
                    <div className="text-xs font-bold text-teal-800 dark:text-teal-300 mb-1.5 flex items-center gap-1.5">
                      <Headphones size={14} />
                      <span>File nghe Mondai này:</span>
                    </div>
                    <audio src={qs.audioUrl} controls preload="none" className="w-full h-9 outline-none" />
                  </div>
                )}

                {/* Ảnh minh họa Mondai */}
                {qs.imageUrl && (
                  <div className="mb-4 text-center">
                    <img
                      src={qs.imageUrl}
                      alt={qs.title || 'Mondai illustration'}
                      className="max-w-full max-h-[420px] mx-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                    />
                  </div>
                )}

                {/* Đoạn văn đọc hiểu (Dokkai) */}
                {qs.content && (
                  <div
                    className="kizuna-passage-html bg-stone-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 mb-5 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-100 font-jp-serif"
                    dangerouslySetInnerHTML={{ __html: qs.content }}
                  />
                )}

                {/* Kịch bản nghe tổng thể Mondai */}
                {showSetScript && qs.script && (
                  <details className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 text-xs">
                    <summary className="font-bold text-teal-700 dark:text-teal-400 cursor-pointer">
                      Xem kịch bản & dịch nghĩa Mondai
                    </summary>
                    <div
                      className="kizuna-passage-html mt-2 text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: qs.script }}
                    />
                  </details>
                )}

                {/* Danh sách câu hỏi */}
                <div className="flex flex-col gap-5">
                  {(qs.questions || []).map((q, qIdx) => {
                    const userChoice = userAnswers[q.id];
                    const hasAnswered = !!userChoice;
                    const isGraded = isSubmitted || (examMode === 'practice' && hasAnswered);
                    const isCorrect = isGraded && userChoice === q.correctAnswer;
                    const isWrong = isGraded && hasAnswered && userChoice !== q.correctAnswer;
                    const isUnanswered = isSubmitted && !hasAnswered;

                    let cardCls =
                      'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all';
                    if (isGraded) {
                      if (isCorrect) {
                        cardCls =
                          'bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800/80 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all';
                      } else {
                        cardCls =
                          'bg-rose-50/40 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-800/80 border-l-4 border-l-rose-600 dark:border-l-rose-500 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all';
                      }
                    }

                    return (
                      <div key={q.id || qIdx} className={cardCls}>
                        {/* Đoạn văn riêng của câu hỏi */}
                        {q.content && (
                          <div
                            className="kizuna-passage-html bg-stone-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 sm:p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-100 font-jp-serif"
                            dangerouslySetInnerHTML={{ __html: q.content }}
                          />
                        )}

                        {q.imageUrl && (
                          <div className="text-center">
                            <img
                              src={q.imageUrl}
                              alt={`Câu ${q.index || qIdx + 1}`}
                              className="max-w-full max-h-96 mx-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                            />
                          </div>
                        )}
                        {q.audioUrl && (
                          <audio src={q.audioUrl} controls preload="none" className="w-full h-9 outline-none" />
                        )}

                        {/* Tiêu đề câu hỏi kèm huy hiệu đúng/sai */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-relaxed font-jp-serif flex-1 min-w-0">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-black mr-2 border ${
                                isGraded
                                  ? isCorrect
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              Câu {q.index || qIdx + 1}
                            </span>
                            <span className="kizuna-passage-html" dangerouslySetInnerHTML={{ __html: q.question }} />
                          </div>

                          {isGraded && (
                            <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
                              {isCorrect && (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-md text-[11px] font-extrabold">
                                  <Check size={13} strokeWidth={3} /> ĐÚNG
                                </span>
                              )}
                              {isWrong && (
                                <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-2.5 py-1 rounded-md text-[11px] font-extrabold">
                                  <X size={13} strokeWidth={3} /> CÂU SAI
                                </span>
                              )}
                              {isUnanswered && (
                                <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-2.5 py-1 rounded-md text-[11px] font-extrabold">
                                  <AlertCircle size={13} /> CHƯA LÀM
                                </span>
                              )}
                              {examMode === 'practice' && hasAnswered && !isSubmitted && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryQuestion(q.id)}
                                  title="Xóa chọn câu này để làm lại"
                                  className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  <RotateCcw size={11} /> Làm lại
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Các phương án lựa chọn (1, 2, 3, 4) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(q.options || []).map(opt => {
                            const isChosen = userChoice === opt.id;
                            const isOfficialCorrect = isGraded && q.correctAnswer === opt.id;
                            const isOptionLocked = isGraded;

                            let optCls =
                              'text-left p-3 px-3.5 rounded-xl border text-sm flex items-center gap-2.5 transition-all ';
                            let badgeCls =
                              'w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-extrabold shrink-0 ';

                            if (isGraded) {
                              if (isOfficialCorrect) {
                                optCls +=
                                  'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 font-bold';
                                badgeCls += 'bg-emerald-600 text-white';
                              } else if (isChosen && !isOfficialCorrect) {
                                optCls +=
                                  'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 dark:border-rose-600 text-rose-800 dark:text-rose-200 font-bold';
                                badgeCls += 'bg-rose-600 text-white';
                              } else {
                                optCls +=
                                  'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-70';
                                badgeCls += 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
                              }
                            } else if (isChosen) {
                              optCls +=
                                'bg-rose-50 dark:bg-rose-950/50 border-rose-500 dark:border-rose-500 text-rose-700 dark:text-rose-200 font-bold shadow-xs cursor-pointer';
                              badgeCls += 'bg-rose-600 text-white';
                            } else {
                              optCls +=
                                'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-rose-400 dark:hover:border-rose-500 hover:-translate-y-0.5 font-medium cursor-pointer';
                              badgeCls += 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200';
                            }

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={isOptionLocked}
                                onClick={() => handleSelectOption(q.id, opt.id)}
                                className={optCls}
                              >
                                <span className={badgeCls}>{opt.id}</span>

                                <span className="flex-1 font-jp-serif leading-relaxed">
                                  {opt.value ? (
                                    <span className="kizuna-passage-html" dangerouslySetInnerHTML={{ __html: opt.value }} />
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">
                                      Phương án ({opt.id})
                                    </span>
                                  )}
                                </span>

                                {isGraded && isOfficialCorrect && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded shrink-0">
                                    <Check size={12} strokeWidth={3} />
                                    <span>Đáp án đúng</span>
                                  </span>
                                )}

                                {isGraded && isChosen && !isOfficialCorrect && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 px-2 py-0.5 rounded shrink-0">
                                    <X size={12} strokeWidth={3} />
                                    <span>Bạn chọn</span>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Bảng đối chiếu đáp án & giải thích chi tiết / dịch nghĩa */}
                        {isGraded && (
                          <div className={`mt-1 rounded-xl p-3.5 sm:p-4 text-xs sm:text-[13px] flex flex-col gap-2.5 border border-l-4 ${
                            isCorrect
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 border-l-emerald-600'
                              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 border-l-rose-600'
                          }`}>
                            <div className="flex items-center flex-wrap gap-2 font-extrabold">
                              {isCorrect && (
                                <div className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                  <CheckCircle2 size={16} />
                                  <span>Chính xác! Bạn đã chọn đúng phương án ({q.correctAnswer})</span>
                                </div>
                              )}
                              {isWrong && (
                                <div className="text-rose-700 dark:text-rose-300 flex items-center gap-1.5 flex-wrap">
                                  <X size={16} strokeWidth={3} />
                                  <span>
                                    Bạn đã chọn sai: <strong className="line-through">Phương án ({userChoice})</strong> — Đáp án đúng:{' '}
                                    <strong className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                                      Phương án ({q.correctAnswer})
                                    </strong>
                                  </span>
                                </div>
                              )}
                              {isUnanswered && (
                                <div className="text-rose-700 dark:text-rose-300 flex items-center gap-1.5 flex-wrap">
                                  <AlertCircle size={16} />
                                  <span>
                                    Chưa chọn đáp án — Đáp án đúng:{' '}
                                    <strong className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                                      Phương án ({q.correctAnswer})
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>

                            {q.explanation ? (
                              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3">
                                <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-amber-800 dark:text-amber-400 text-xs mb-1">
                                    Giải thích & Từ vựng / Ngữ pháp:
                                  </div>
                                  <div className="kizuna-passage-html" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                </div>
                              </div>
                            ) : null}

                            {q.script ? (
                              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3">
                                <BookOpen size={16} className="text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-teal-800 dark:text-teal-400 text-xs mb-1">
                                    Dịch nghĩa câu & Kịch bản hội thoại:
                                  </div>
                                  <div className="kizuna-passage-html whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: q.script }} />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. THANH ĐIỀU HƯỚNG / NỘP BÀI CUỐI TRANG */}
        {!isSubmitted ? (
          examMode === 'exam' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex justify-between items-center flex-wrap gap-4 shadow-xs">
              <div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  Đã hoàn thành các câu hỏi của đề thi?
                </div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Đã trả lời: <strong className="text-rose-600 dark:text-rose-400">{answeredCount}</strong> / {totalQuestionsCount} câu ({progressPercent}%)
                  {countUnansweredQuestions() > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 ml-2 font-bold">
                      (Còn {countUnansweredQuestions()} câu chưa làm)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle2 size={18} /> Nộp bài chấm điểm
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-800/70 border-l-4 border-l-teal-600 p-5 flex justify-between items-center flex-wrap gap-4 shadow-xs">
              <div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  Chế độ Luyện tập · Đáp án hiển thị ngay sau khi chọn
                </div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Đã làm: <strong className="text-teal-700 dark:text-teal-400">{answeredCount}</strong> / {totalQuestionsCount} câu ·{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">Đúng {liveCorrectCount}</strong> ·{' '}
                  <strong className="text-rose-600 dark:text-rose-400">Sai {liveWrongCount}</strong>
                </div>
              </div>

              <div className="flex gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleResetExam('practice')}
                  className="px-4 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw size={15} /> Làm lại từ đầu
                </button>
                {answeredCount > 0 && (
                  <button
                    type="button"
                    onClick={() => executeSubmission(false)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 size={16} /> Tổng kết & Lưu kết quả
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex justify-between items-center flex-wrap gap-4 shadow-xs">
            <div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                Bạn đã xem lại xong kết quả bài thi!
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Đạt{' '}
                <strong className={scoreResult?.isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {scoreResult?.correct} / {scoreResult?.total}
                </strong>{' '}
                câu đúng ({scoreResult?.percentage}%)
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleResetExam()}
                className="px-4 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-rose-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw size={15} /> Làm lại đề này
              </button>
              <button
                type="button"
                onClick={handleExitExam}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft size={15} /> Trở về danh mục
              </button>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN NỘP BÀI */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 animate-[kizunaModalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                  countUnansweredQuestions() > 0
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {countUnansweredQuestions() > 0 ? <AlertCircle size={25} /> : <FileCheck size={25} />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0 font-jp-serif">
                    Xác nhận nộp bài thi
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeExam.label} ({activeExam.level})
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">TIẾN ĐỘ TRẢ LỜI</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {answeredCount} <span className="text-xs text-slate-500 dark:text-slate-400">/ {totalQuestionsCount} câu</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">THỜI GIAN CÒN LẠI</div>
                  <div className={`text-lg font-black mt-0.5 ${
                    secondsRemaining < 300 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}>
                    {formatTime(secondsRemaining)}
                  </div>
                </div>
              </div>

              {countUnansweredQuestions() > 0 ? (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs sm:text-sm text-rose-800 dark:text-rose-200 leading-relaxed flex gap-2.5">
                  <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    Bạn còn <strong className="text-rose-700 dark:text-rose-300">{countUnansweredQuestions()} câu hỏi chưa trả lời</strong>!
                    Các câu chưa làm sẽ được tính là 0 điểm. Bạn có chắc chắn muốn nộp bài ngay không?
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed flex gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    Bạn đã hoàn thành đủ <strong>{totalQuestionsCount}</strong> câu hỏi. Hãy xác nhận để chấm điểm và lưu tiến trình!
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={handleCancelSubmit}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Kiểm tra lại bài
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <CheckCircle2 size={16} /> Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN RỜI PHÒNG THI */}
        {showExitModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-[kizunaModalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle size={25} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0 font-jp-serif">
                    Rời khỏi phòng thi?
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Bài làm hiện tại chưa được nộp
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                Bạn đã trả lời được <strong>{answeredCount}</strong> câu hỏi. Nếu rời phòng thi bây giờ, kết quả lần thi này sẽ không được lưu vào hệ thống.
              </div>

              <div className="flex justify-end gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Ở lại làm tiếp
                </button>
                <button
                  type="button"
                  onClick={performExit}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Xác nhận rời đi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN DANH MỤC ĐỀ THI JLPT (CATALOG VIEW)
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-5">
      <style>{`
        @keyframes kanjiSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes kizunaModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-br from-white to-stone-50 dark:from-slate-900 dark:to-slate-900/95 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 rounded-2xl p-5 sm:p-7 shadow-xs transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white m-0 font-jp-serif">
            Kho Đề Thi JLPT (N5 – N1)
          </h1>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {catalogTotalExams} bộ đề chính thức
          </span>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Target size={14} className="text-rose-600 dark:text-rose-400" />
            <span>{catalogTotalExams} bộ đề JLPT chuẩn hóa N5 – N1</span>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Clock size={14} className="text-teal-600 dark:text-teal-400" />
            <span>Thi thật (ẩn Furigana, tính giờ) & Luyện tập (xem đáp án, từ vựng & giải thích ngay)</span>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <FileCheck size={14} className="text-blue-600 dark:text-blue-400" />
            <span>Tự động chấm & lưu tiến trình</span>
          </div>
        </div>
      </div>

      {/* 2. THANH LỌC BẬC JLPT (N5 - N1) */}
      <div className="flex gap-2 flex-wrap">
        {LEVEL_FILTERS.map(lvl => {
          const isSelected = levelFilter === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setLevelFilter(lvl.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600'
              }`}
            >
              <span className={`text-[11px] font-black font-jp-serif ${isSelected ? 'opacity-95' : 'opacity-70'}`}>
                {lvl.kanji}
              </span>
              <span>{lvl.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. THANH TÌM KIẾM & BÁO CÁO SỐ LƯỢNG */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
          Tìm thấy <span className="text-rose-600 dark:text-rose-400 font-black">{filteredExams.length}</span> bộ đề thi:
        </div>

        <div className="relative min-w-[260px] w-full sm:w-72">
          <Search size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo năm, tên đề (vd: 2024, 07)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-9 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm outline-none focus:border-rose-500 dark:focus:border-rose-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. LƯỚI DANH SÁCH BỘ ĐỀ THI */}
      {loading || loadingExamDetail ? (
        <div className="p-14 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-[3px] border-slate-200 dark:border-slate-700 border-t-rose-600 rounded-full animate-[kanjiSpin_0.8s_linear_infinite]" />
          <span>{loadingExamDetail ? 'Đang mở phòng thi và thiết lập đề...' : 'Đang nạp danh mục đề thi...'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map(exam => {
            const pastResult = examResults[exam.id];
            const standardDuration = JLPT_STANDARD_DURATIONS[exam.level?.toUpperCase()] || 120;
            const durationMin = (exam.durationMinutes && exam.durationMinutes > 0)
              ? exam.durationMinutes
              : standardDuration;

            return (
              <div
                key={exam.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col transition-all duration-150 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-rose-400 dark:hover:border-rose-500 ${
                  pastResult
                    ? pastResult.isPassed
                      ? 'border-emerald-200 dark:border-emerald-800/80 border-l-4 border-l-emerald-600'
                      : 'border-rose-200 dark:border-rose-800/80 border-l-4 border-l-rose-600'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header card */}
                <div className="flex justify-between items-center mb-2.5">
                  <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md px-2 py-0.5 text-[11px] font-black">
                    {exam.level}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <Clock size={13} /> {durationMin} phút
                  </span>
                </div>

                {/* Tên đề thi */}
                <h3 className="text-base sm:text-[17px] font-extrabold text-slate-900 dark:text-white m-0 mb-2 font-jp-serif">
                  {exam.label}
                </h3>

                {/* Huy hiệu tiến trình */}
                {pastResult && (
                  <div className={`rounded-lg px-2.5 py-1.5 mb-3 flex items-center justify-between text-[11px] border ${
                    pastResult.isPassed
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  }`}>
                    <span className="font-extrabold flex items-center gap-1">
                      {pastResult.isPassed ? <Check size={13} strokeWidth={3} /> : <AlertCircle size={13} />}
                      {pastResult.score}/{pastResult.total} câu ({pastResult.percentage}%) · {pastResult.isPassed ? 'Đạt' : 'Chưa đạt'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(pastResult.completedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}

                {/* Meta tags */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-[11px] font-semibold">
                    <FileText size={12} /> {exam.actualQuestionCount || exam.totalQuestions} câu hỏi
                  </span>

                  {exam.audioUrl && (
                    <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-md px-2 py-0.5 text-[11px] font-semibold">
                      <Headphones size={12} /> Choukai
                    </span>
                  )}

                  {exam.explanationCount && exam.explanationCount > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-0.5 text-[11px] font-semibold">
                      <Lightbulb size={12} /> {exam.explanationCount} giải thích
                    </span>
                  ) : null}
                </div>

                {/* 2 chế độ: Thi thật & Luyện tập */}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartExam(exam.id, 'exam')}
                    className={`w-full py-2.5 px-2 rounded-xl font-bold text-xs sm:text-[13px] text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                      pastResult
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-slate-800 dark:bg-slate-700 hover:bg-rose-600 dark:hover:bg-rose-600'
                    }`}
                  >
                    <span>{pastResult ? 'Thi lại' : 'Thi thật'}</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartExam(exam.id, 'practice')}
                    className="w-full py-2.5 px-2 rounded-xl font-bold text-xs sm:text-[13px] bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-600 hover:text-white hover:border-teal-600 dark:hover:bg-teal-600 dark:hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Lightbulb size={13} />
                    <span>Luyện tập</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THÔNG BÁO LỖI NẠP ĐỀ */}
      {loadErrorMsg && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-[kizunaModalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0">
                Thông báo
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              {loadErrorMsg}
            </p>
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => setLoadErrorMsg(null)}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
