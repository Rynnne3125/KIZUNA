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
  Timer
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { authService } from '../services/authService';
import { progressService, UserExamResult } from '../services/progressService';
import { Exam } from '../types/kizuna';

// Thời lượng thi chuẩn chính thức theo quy định JLPT (tính bằng phút)
const JLPT_STANDARD_DURATIONS: Record<string, number> = {
  N5: 105, // Nhập môn: Kiến thức + Ngữ pháp/Đọc hiểu + Nghe
  N4: 125, // Sơ cấp
  N3: 140, // Trung cấp
  N2: 155, // Trung thượng cấp
  N1: 170  // Thượng cấp
};

const LEVEL_FILTERS = [
  { id: 'ALL', label: 'Tất cả cấp độ', kanji: '全' },
  { id: 'N5', label: 'N5 Nhập môn (105p)', kanji: '入門' },
  { id: 'N4', label: 'N4 Sơ cấp (125p)', kanji: '初級' },
  { id: 'N3', label: 'N3 Trung cấp (140p)', kanji: '中級' },
  { id: 'N2', label: 'N2 Trung thượng (155p)', kanji: '中上' },
  { id: 'N1', label: 'N1 Thượng cấp (170p)', kanji: '上級' },
];

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
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lưu lịch sử làm bài thi của người dùng từ Firestore / LocalStorage
  const [examResults, setExamResults] = useState<Record<string, UserExamResult>>({});

  // Chế độ phòng thi (Exam Room)
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreDetail | null>(null);
  const [loadingExamDetail, setLoadingExamDetail] = useState(false);
  
  // Modals xác nhận nộp bài & thoát phòng thi (thay thế window.confirm / alert)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState<string | null>(null);
  
  // Đồng hồ đếm ngược thời gian thực theo chuẩn kỳ thi JLPT
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Nạp danh mục đề thi
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const list = await kizunaService.getExamCatalog(levelFilter);
        setExams(list);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [levelFilter]);

  // Nạp lịch sử tiến trình thi của người dùng
  useEffect(() => {
    if (currentUser?.id) {
      progressService.getUserExamResults(currentUser.id).then(results => {
        setExamResults(results);
      });
    }
  }, [currentUser?.id]);

  // Bộ đếm ngược thời gian thi thực chiến (tự động nộp bài khi hết giờ)
  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Hết giờ thi: Tự động nộp bài
            handleAutoSubmitOnTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTimerRunning, secondsRemaining, isSubmitted]);

  // Format thời gian hiển thị (MM:SS hoặc HH:MM:SS)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format thời lượng hoàn thành thân thiện (VD: 45 phút 20 giây)
  const formatDurationSpent = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h} giờ ${m} phút ${s} giây`;
    }
    if (m > 0) {
      return `${m} phút ${s} giây`;
    }
    return `${s} giây`;
  };

  // Lọc đề thi theo tìm kiếm từ khoá
  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return exams;
    const q = searchQuery.toLowerCase().trim();
    return exams.filter(ex => 
      ex.label.toLowerCase().includes(q) ||
      ex.level.toLowerCase().includes(q) ||
      (ex.year && ex.year.toString().includes(q))
    );
  }, [exams, searchQuery]);

  // Bắt đầu làm bài thi
  const handleStartExam = async (examId: string) => {
    setLoadingExamDetail(true);
    try {
      const fullExam = await kizunaService.getExamById(examId);
      if (fullExam) {
        setActiveExam(fullExam);
        setUserAnswers({});
        setIsSubmitted(false);
        setScoreResult(null);

        // Áp dụng giới hạn thời gian chuẩn JLPT cho từng bậc N
        const standardDurationMin = JLPT_STANDARD_DURATIONS[fullExam.level?.toUpperCase()] || 120;
        const examDurationMin = (fullExam.durationMinutes && fullExam.durationMinutes > 0)
          ? fullExam.durationMinutes
          : standardDurationMin;

        const totalSecs = examDurationMin * 60;
        setSecondsRemaining(totalSecs);
        setTotalDurationSeconds(totalSecs);
        setIsTimerRunning(true);

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setLoadErrorMsg('Không thể tải chi tiết đề thi. Vui lòng kiểm tra lại kết nối và thử lại!');
      }
    } catch {
      setLoadErrorMsg('Đã có lỗi xảy ra khi nạp chi tiết đề thi. Vui lòng thử lại!');
    } finally {
      setLoadingExamDetail(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  // Tự động nộp bài khi hết giờ
  const handleAutoSubmitOnTimeUp = () => {
    executeSubmission(true);
  };

  // Học viên chủ động bấm nộp bài -> Mở modal xác nhận thay vì window.confirm
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
      for (const q of qs.questions) {
        if (!userAnswers[q.id]) {
          count++;
        }
      }
    }
    return count;
  };

  // Xử lý logic tính điểm, lưu tiến trình và cập nhật Firestore/LocalStorage
  const executeSubmission = async (isTimeExpired: boolean) => {
    if (!activeExam || !activeExam.questionSets) return;
    setIsTimerRunning(false);

    let total = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    for (const qs of activeExam.questionSets) {
      for (const q of qs.questions) {
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
    const isPassed = percentage >= 50; // Chuẩn đậu cơ bản JLPT

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

    // Lưu tiến trình bài thi vào Firestore và LocalStorage
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

  // Làm lại đề thi hiện tại
  const handleResetExam = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    if (activeExam) {
      const standardDurationMin = JLPT_STANDARD_DURATIONS[activeExam.level?.toUpperCase()] || 120;
      const examDurationMin = (activeExam.durationMinutes && activeExam.durationMinutes > 0)
        ? activeExam.durationMinutes
        : standardDurationMin;
      const totalSecs = examDurationMin * 60;
      setSecondsRemaining(totalSecs);
      setTotalDurationSeconds(totalSecs);
      setIsTimerRunning(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Thoát khỏi phòng thi -> Mở modal xác nhận thay vì window.confirm
  const handleExitExam = () => {
    if (!isSubmitted && Object.keys(userAnswers).length > 0) {
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
  // GIAO DIỆN PHÒNG THI THỰC CHIẾN (EXAM ROOM)
  // =========================================================================
  if (activeExam) {
    const answeredCount = Object.keys(userAnswers).length;
    let totalQuestionsCount = 0;
    if (activeExam.questionSets) {
      for (const qs of activeExam.questionSets) {
        totalQuestionsCount += qs.questions.length;
      }
    }
    if (totalQuestionsCount === 0) {
      totalQuestionsCount = activeExam.actualQuestionCount || activeExam.totalQuestions || 1;
    }
    const progressPercent = Math.min(100, Math.round((answeredCount / totalQuestionsCount) * 100));

    return (
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
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
        <div style={{
          position: 'sticky',
          top: 60,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          zIndex: 90,
          padding: '14px 20px',
          borderRadius: 12,
          boxShadow: '0 4px 14px rgba(44, 30, 20, 0.05)',
          border: '1px solid #ebe7df',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  background: '#fdf2f0',
                  color: '#c53d32',
                  border: '1px solid #f3d5d2',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 900
                }}>
                  {activeExam.level}
                </span>
                <h2 style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#1c2536',
                  margin: 0,
                  fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                }}>
                  {activeExam.label}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#78716c', marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Timer size={13} color={secondsRemaining < 300 && !isSubmitted ? '#ef4444' : '#78716c'} />
                  Thời gian: <strong style={{ color: secondsRemaining < 300 && !isSubmitted ? '#ef4444' : '#1c2536' }}>{formatTime(secondsRemaining)}</strong>
                </span>
                <span>•</span>
                <span>
                  Tiến độ: <strong style={{ color: '#c53d32' }}>{answeredCount}</strong> / {totalQuestionsCount} câu ({progressPercent}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {!isSubmitted ? (
                <button
                  onClick={handleSubmitExam}
                  style={{
                    padding: '8px 18px',
                    background: '#c53d32',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(197, 61, 50, 0.25)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#9c2a2a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#c53d32'}
                >
                  <CheckCircle2 size={15} /> Nộp bài chấm điểm
                </button>
              ) : (
                <button
                  onClick={handleResetExam}
                  style={{
                    padding: '8px 16px',
                    background: '#1c2536',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#c53d32'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1c2536'}
                >
                  <RotateCcw size={15} /> Làm lại bài thi
                </button>
              )}
              <button
                onClick={handleExitExam}
                style={{
                  padding: '8px 14px',
                  background: '#faf8f5',
                  color: '#57534e',
                  border: '1px solid #d6d3d1',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#ebe7df'}
                onMouseLeave={e => e.currentTarget.style.background = '#faf8f5'}
              >
                <ChevronLeft size={15} /> Thoát
              </button>
            </div>
          </div>

          {/* Thanh tiến trình hoàn thành */}
          <div style={{
            width: '100%',
            height: 4,
            background: '#f5f5f4',
            borderRadius: 2,
            overflow: 'hidden',
            marginTop: 10
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: isSubmitted ? '#16a34a' : '#c53d32',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* 2. BẢNG TỔNG KẾT KẾT QUẢ THI CHI TIẾT KHI NỘP BÀI */}
        {isSubmitted && scoreResult && (
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
            border: '1.5px solid #e7dfd5',
            borderLeft: '4px solid #c53d32',
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(44, 30, 20, 0.04)'
          }}>
            {/* Thông báo tự động thu bài nếu hết giờ */}
            {scoreResult.isTimeUp && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 700,
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={16} color="#ef4444" />
                <span>Hết thời gian thi chính thức theo chuẩn JLPT! Hệ thống đã tự động thu bài và chấm điểm của bạn.</span>
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {/* Đánh giá cấp độ năng lực */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 12,
                background: scoreResult.percentage >= 80
                  ? '#fefce8'
                  : scoreResult.percentage >= 50
                    ? '#f0fdf4'
                    : '#fef2f2',
                color: scoreResult.percentage >= 80
                  ? '#a16207'
                  : scoreResult.percentage >= 50
                    ? '#15803d'
                    : '#b91c1c',
                border: scoreResult.percentage >= 80
                  ? '1px solid #fef08a'
                  : scoreResult.percentage >= 50
                    ? '1px solid #bbf7d0'
                    : '1px solid #fecaca'
              }}>
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

              {/* Điểm số to rõ ràng */}
              <div style={{ fontSize: 36, fontWeight: 900, color: '#1c2536', marginBottom: 4 }}>
                {scoreResult.correct} <span style={{ fontSize: 22, color: '#78716c' }}>/ {scoreResult.total} câu đúng</span>
                <span style={{ fontSize: 24, color: '#c53d32', marginLeft: 10 }}>
                  ({scoreResult.percentage}%)
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#57534e' }}>
                Tiến trình đã được tự động lưu vào hồ sơ học tập KIZUNA của bạn
              </div>
            </div>

            {/* Lưới 4 chỉ số thực chiến: Thời gian, Tiến độ, Số câu đúng, Số câu sai */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              borderTop: '1px solid #ebe7df',
              paddingTop: 16
            }}>
              <div style={{ background: '#ffffff', border: '1px solid #ebe7df', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} color="#78716c" /> THỜI GIAN LÀM BÀI
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1c2536', marginTop: 4 }}>
                  {formatDurationSpent(scoreResult.timeSpentSeconds)}
                </div>
                <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 2 }}>
                  Quy định: {Math.round(totalDurationSeconds / 60)} phút
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #ebe7df', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={13} color="#78716c" /> TIẾN ĐỘ TRẢ LỜI
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1c2536', marginTop: 4 }}>
                  {scoreResult.total - scoreResult.unanswered} / {scoreResult.total} câu
                </div>
                <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 2 }}>
                  Hoàn thành {Math.round(((scoreResult.total - scoreResult.unanswered) / (scoreResult.total || 1)) * 100)}% đề thi
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={13} color="#15803d" /> SỐ CÂU ĐÚNG
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                  {scoreResult.correct} câu
                </div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                  Đạt {scoreResult.percentage}% điểm
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={13} color="#b91c1c" /> CÂU SAI & BỎ QUA
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#b91c1c', marginTop: 4 }}>
                  {scoreResult.wrong + scoreResult.unanswered} câu
                </div>
                <div style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>
                  {scoreResult.wrong} câu sai · {scoreResult.unanswered} chưa chọn
                </div>
              </div>
            </div>

            {/* Thông báo hướng dẫn xem lại */}
            <div style={{
              marginTop: 18,
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 12,
              color: '#475569',
              textAlign: 'center'
            }}>
              Toàn bộ câu hỏi bên dưới đã được tự động hiển thị chi tiết: câu sai hiển thị đối chiếu đáp án đúng, câu đúng hiển thị giải thích đầy đủ.
            </div>
          </div>
        )}

        {/* 3. AUDIO PLAYER CHO PHẦN CHOUKAI (NẾU ĐỀ CÓ FILE NGHE) */}
        {activeExam.audioUrl && (
          <div style={{
            padding: '16px 20px',
            marginBottom: 24,
            background: '#faf8f5',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            borderLeft: '4px solid #0d9488'
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f766e',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Headphones size={16} color="#0d9488" />
              <span>File Nghe Audio Chính Thức (JLPT Official Choukai Audio):</span>
            </div>
            <audio src={activeExam.audioUrl} controls style={{ width: '100%', outline: 'none' }} />
          </div>
        )}

        {/* 4. TOÀN BỘ CÁC PHẦN THI (MONDAI QUESTION SETS) VÀ CÂU HỎI */}
        {activeExam.questionSets && activeExam.questionSets.map((qs, setIdx) => {
          const isListeningPart = qs.part === 2;

          return (
            <div
              key={qs.id || setIdx}
              style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #ebe7df',
                padding: '24px',
                marginBottom: 24,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              {/* Tiêu đề Mondai */}
              <div style={{
                background: '#faf8f5',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                color: '#1c2536',
                marginBottom: 16,
                borderLeft: isListeningPart ? '4px solid #0d9488' : '4px solid #c53d32',
                border: '1px solid #ebe7df',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: isListeningPart ? '#0d9488' : '#c53d32',
                  background: isListeningPart ? '#f0fdfa' : '#fdf2f0',
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  {isListeningPart ? 'CHOUKAI' : 'BUNPOU / DOKKAI'}
                </span>
                <span>
                  Phần {qs.part === 1 ? 'Kiến Thức Ngôn Ngữ & Đọc Hiểu' : 'Nghe Hiểu (Choukai)'}: {qs.title}
                </span>
              </div>

              {/* Đoạn văn đọc hiểu nếu có */}
              {qs.content && (
                <div
                  style={{
                    background: '#fdfbf7',
                    border: '1px solid #e7dfd5',
                    borderRadius: 8,
                    padding: '16px 20px',
                    marginBottom: 20,
                    fontSize: 14,
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    color: '#334155',
                    fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                  }}
                  dangerouslySetInnerHTML={{ __html: qs.content }}
                />
              )}

              {/* Danh sách câu hỏi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {qs.questions.map((q, qIdx) => {
                  const userChoice = userAnswers[q.id];
                  const hasAnswered = !!userChoice;
                  const isCorrect = isSubmitted && userChoice === q.correctAnswer;
                  const isWrong = isSubmitted && hasAnswered && userChoice !== q.correctAnswer;
                  const isUnanswered = isSubmitted && !hasAnswered;

                  // Thiết lập khung viền: ĐỎ cho câu sai hoặc câu chưa làm, XANH LÁ cho câu đúng
                  let cardBg = '#ffffff';
                  let cardBorder = '1px solid #ebe7df';
                  let cardBorderLeft = '1px solid #ebe7df';
                  let cardShadow = '0 1px 3px rgba(0,0,0,0.02)';

                  if (isSubmitted) {
                    if (isCorrect) {
                      cardBg = '#fbfdfb';
                      cardBorder = '1.5px solid #86efac';
                      cardBorderLeft = '5px solid #16a34a';
                      cardShadow = '0 3px 10px rgba(22, 163, 74, 0.06)';
                    } else {
                      // isWrong hoặc isUnanswered: Khung đỏ nổi bật rõ ràng theo yêu cầu
                      cardBg = '#fffafa';
                      cardBorder = '1.5px solid #fca5a5';
                      cardBorderLeft = '5px solid #dc2626';
                      cardShadow = '0 3px 10px rgba(220, 38, 38, 0.06)';
                    }
                  }

                  return (
                    <div
                      key={q.id || qIdx}
                      style={{
                        background: cardBg,
                        border: cardBorder,
                        borderLeft: cardBorderLeft,
                        borderRadius: 12,
                        padding: '20px 22px',
                        boxShadow: cardShadow,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Tiêu đề câu hỏi kèm huy hiệu trạng thái đúng/sai sau khi nộp */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#1c2536',
                          lineHeight: 1.6,
                          fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                          flex: 1
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSubmitted
                              ? (isCorrect ? '#dcfce7' : '#fee2e2')
                              : '#fdf2f0',
                            color: isSubmitted
                              ? (isCorrect ? '#15803d' : '#b91c1c')
                              : '#c53d32',
                            border: isSubmitted
                              ? (isCorrect ? '1px solid #86efac' : '1px solid #fca5a5')
                              : '1px solid #f3d5d2',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 900,
                            marginRight: 8
                          }}>
                            Câu {q.index || (qIdx + 1)}
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: q.question }} />
                        </div>

                        {/* Huy hiệu đánh giá đúng/sai sau khi nộp bài */}
                        {isSubmitted && (
                          <div style={{ flexShrink: 0 }}>
                            {isCorrect && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800
                              }}>
                                <Check size={13} strokeWidth={3} /> ĐÚNG
                              </span>
                            )}
                            {isWrong && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800
                              }}>
                                <X size={13} strokeWidth={3} /> CÂU SAI
                              </span>
                            )}
                            {isUnanswered && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800
                              }}>
                                <AlertCircle size={13} /> CHƯA LÀM
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Các phương án lựa chọn (1, 2, 3, 4) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 10
                      }}>
                        {q.options.map(opt => {
                          const isChosen = userChoice === opt.id;
                          const isOfficialCorrect = isSubmitted && q.correctAnswer === opt.id;

                          let optBg = '#ffffff';
                          let optBorder = '1.5px solid #e2e8f0';
                          let optColor = '#1c2536';
                          let badgeBg = '#f1f5f9';
                          let badgeColor = '#475569';

                          if (isSubmitted) {
                            if (isOfficialCorrect) {
                              optBg = '#f0fdf4';
                              optBorder = '1.5px solid #16a34a';
                              optColor = '#15803d';
                              badgeBg = '#16a34a';
                              badgeColor = '#ffffff';
                            } else if (isChosen && !isOfficialCorrect) {
                              optBg = '#fef2f2';
                              optBorder = '2px solid #dc2626';
                              optColor = '#991b1b';
                              badgeBg = '#dc2626';
                              badgeColor = '#ffffff';
                            } else {
                              optBg = '#ffffff';
                              optBorder = '1px solid #e2e8f0';
                              optColor = '#94a3b8';
                              badgeBg = '#f8fafc';
                              badgeColor = '#94a3b8';
                            }
                          } else if (isChosen) {
                            optBg = '#fdf2f0';
                            optBorder = '1.5px solid #c53d32';
                            optColor = '#c53d32';
                            badgeBg = '#c53d32';
                            badgeColor = '#ffffff';
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt.id)}
                              style={{
                                background: optBg,
                                border: optBorder,
                                color: optColor,
                                padding: '11px 14px',
                                borderRadius: 8,
                                textAlign: 'left',
                                fontSize: 14,
                                fontWeight: isChosen || isOfficialCorrect ? 700 : 500,
                                cursor: isSubmitted ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                transition: 'all 0.15s ease',
                                boxShadow: isChosen && !isSubmitted ? '0 1px 4px rgba(197, 61, 50, 0.15)' : 'none'
                              }}
                              onMouseEnter={e => {
                                if (!isSubmitted && !isChosen) {
                                  e.currentTarget.style.borderColor = '#c53d32';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isSubmitted && !isChosen) {
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              <span style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: badgeBg,
                                color: badgeColor,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                {opt.id}
                              </span>

                              <span style={{ flex: 1, fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                {opt.value}
                              </span>

                              {isSubmitted && isOfficialCorrect && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  border: '1px solid #86efac',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  flexShrink: 0
                                }}>
                                  <Check size={12} strokeWidth={3} />
                                  <span>Đáp án đúng</span>
                                </span>
                              )}

                              {isSubmitted && isChosen && !isOfficialCorrect && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: '#b91c1c',
                                  background: '#fee2e2',
                                  border: '1px solid #fca5a5',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  flexShrink: 0
                                }}>
                                  <X size={12} strokeWidth={3} />
                                  <span>Bạn đã chọn</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* BẢNG ĐỐI CHIẾU KẾT QUẢ & LỜI GIẢI CHI TIẾT (HIỂN THỊ TỰ ĐỘNG SAU KHI NỘP) */}
                      {isSubmitted && (
                        <div style={{
                          marginTop: 4,
                          background: isCorrect ? '#f0fdf4' : '#fef2f2',
                          border: isCorrect ? '1px solid #bbf7d0' : '1px solid #fecaca',
                          borderLeft: isCorrect ? '4px solid #16a34a' : '4px solid #dc2626',
                          borderRadius: 8,
                          padding: '14px 16px',
                          fontSize: 13,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}>
                          {/* 1. Dòng đối chiếu bạn đã chọn vs đáp án đúng */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                            fontSize: 13,
                            fontWeight: 800
                          }}>
                            {isCorrect && (
                              <div style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={16} color="#16a34a" />
                                <span>Chính xác! Bạn đã chọn đúng phương án ({q.correctAnswer})</span>
                              </div>
                            )}

                            {isWrong && (
                              <div style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <X size={16} color="#dc2626" strokeWidth={3} />
                                <span>
                                  Bạn đã chọn sai: <strong style={{ textDecoration: 'line-through' }}>Phương án ({userChoice})</strong> — Đáp án chính xác là:{' '}
                                  <strong style={{ color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, border: '1px solid #86efac' }}>
                                    Phương án ({q.correctAnswer})
                                  </strong>
                                </span>
                              </div>
                            )}

                            {isUnanswered && (
                              <div style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <AlertCircle size={16} color="#dc2626" />
                                <span>
                                  Bạn chưa chọn đáp án cho câu này — Đáp án chính xác là:{' '}
                                  <strong style={{ color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, border: '1px solid #86efac' }}>
                                    Phương án ({q.correctAnswer})
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2. Lời giải thích chi tiết */}
                          {q.explanation ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              color: '#334155',
                              lineHeight: 1.6,
                              background: '#ffffff',
                              border: isCorrect ? '1px solid #dcfce7' : '1px solid #fee2e2',
                              borderRadius: 6,
                              padding: '10px 12px'
                            }}>
                              <Lightbulb size={15} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: '#92400e', marginRight: 4 }}>Giải thích chi tiết:</strong>
                                <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            </div>
                          ) : null}

                          {/* 3. Kịch bản Choukai / Dịch nghĩa đoạn văn */}
                          {q.script ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              color: '#475569',
                              lineHeight: 1.6,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: '10px 12px'
                            }}>
                              <BookOpen size={15} color="#475569" style={{ marginTop: 2, flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: '#1c2536', marginRight: 4 }}>Dịch nghĩa & Kịch bản:</strong>
                                <span dangerouslySetInnerHTML={{ __html: q.script }} />
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
        {/* 5. THANH ĐIỀU HƯỚNG / NỘP BÀI CUỐI TRANG */}
        {!isSubmitted ? (
          <div style={{
            marginTop: 20,
            padding: '20px 24px',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1c2536' }}>
                Đã hoàn thành các câu hỏi của đề thi?
              </div>
              <div style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>
                Đã trả lời: <strong style={{ color: '#c53d32' }}>{answeredCount}</strong> / {totalQuestionsCount} câu ({progressPercent}%)
                {countUnansweredQuestions() > 0 && (
                  <span style={{ color: '#dc2626', marginLeft: 8, fontWeight: 700 }}>
                    (Còn {countUnansweredQuestions()} câu chưa làm)
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitExam}
              style={{
                padding: '12px 26px',
                background: '#c53d32',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(197, 61, 50, 0.25)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#9c2a2a'}
              onMouseLeave={e => e.currentTarget.style.background = '#c53d32'}
            >
              <CheckCircle2 size={18} /> Nộp bài chấm điểm
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: 20,
            padding: '20px 24px',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1c2536' }}>
                Bạn đã xem lại xong kết quả bài thi!
              </div>
              <div style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>
                Đạt <strong style={{ color: scoreResult?.isPassed ? '#15803d' : '#b91c1c' }}>{scoreResult?.correct} / {scoreResult?.total}</strong> câu đúng ({scoreResult?.percentage}%)
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResetExam}
                style={{
                  padding: '10px 18px',
                  background: '#1c2536',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RotateCcw size={15} /> Làm lại đề này
              </button>
              <button
                type="button"
                onClick={handleExitExam}
                style={{
                  padding: '10px 18px',
                  background: '#faf8f5',
                  color: '#57534e',
                  border: '1px solid #d6d3d1',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <ChevronLeft size={15} /> Trở về danh mục
              </button>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN NỘP BÀI (THAY THẾ WINDOW.CONFIRM / LOCALHOST SAYS) */}
        {showSubmitModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
              border: '1px solid #ebe7df',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              animation: 'kizunaModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Icon & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: countUnansweredQuestions() > 0 ? '#fef2f2' : '#f0fdf4',
                  border: countUnansweredQuestions() > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {countUnansweredQuestions() > 0 ? (
                    <AlertCircle size={26} color="#dc2626" />
                  ) : (
                    <FileCheck size={26} color="#16a34a" />
                  )}
                </div>
                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#1c2536',
                    margin: 0,
                    fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                  }}>
                    Xác nhận nộp bài thi
                  </h3>
                  <div style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
                    {activeExam.label} ({activeExam.level})
                  </div>
                </div>
              </div>

              {/* Bảng tóm tắt tiến độ */}
              <div style={{
                background: '#faf8f5',
                border: '1px solid #ebe7df',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>TIẾN ĐỘ TRẢ LỜI</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', marginTop: 2 }}>
                    {answeredCount} <span style={{ fontSize: 12, color: '#78716c' }}>/ {totalQuestionsCount} câu</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>THỜI GIAN CÒN LẠI</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: secondsRemaining < 300 ? '#dc2626' : '#1c2536', marginTop: 2 }}>
                    {formatTime(secondsRemaining)}
                  </div>
                </div>
              </div>

              {/* Cảnh báo nếu còn câu chưa làm */}
              {countUnansweredQuestions() > 0 ? (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#991b1b',
                  lineHeight: 1.5,
                  display: 'flex',
                  gap: 10
                }}>
                  <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    Bạn còn <strong style={{ color: '#dc2626' }}>{countUnansweredQuestions()} câu hỏi chưa trả lời</strong>!
                    Các câu chưa hoàn thành sẽ được tính là 0 điểm. Bạn có chắc chắn muốn nộp bài chấm điểm ngay không?
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#15803d',
                  lineHeight: 1.5,
                  display: 'flex',
                  gap: 10
                }}>
                  <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    Bạn đã hoàn thành đủ <strong>{totalQuestionsCount}</strong> câu hỏi. Hãy xác nhận để hệ thống chấm điểm và lưu tiến trình!
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleCancelSubmit}
                  style={{
                    padding: '10px 18px',
                    background: '#ffffff',
                    color: '#57534e',
                    border: '1px solid #d6d3d1',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f4'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  Kiểm tra lại bài
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  style={{
                    padding: '10px 22px',
                    background: '#c53d32',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(197, 61, 50, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#9c2a2a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#c53d32'}
                >
                  <CheckCircle2 size={16} /> Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN RỜI PHÒNG THI (THAY THẾ WINDOW.CONFIRM / LOCALHOST SAYS) */}
        {showExitModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 440,
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
              border: '1px solid #ebe7df',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              animation: 'kizunaModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertCircle size={26} color="#d97706" />
                </div>
                <div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#1c2536',
                    margin: 0,
                    fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                  }}>
                    Rời khỏi phòng thi?
                  </h3>
                  <div style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
                    Bài làm hiện tại chưa được nộp
                  </div>
                </div>
              </div>

              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 13,
                color: '#92400e',
                lineHeight: 1.5
              }}>
                Bạn đã trả lời được <strong>{answeredCount}</strong> câu hỏi. Nếu rời phòng thi bây giờ, kết quả của lần thi này sẽ không được tính và lưu vào hệ thống.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#ffffff',
                    color: '#57534e',
                    border: '1px solid #d6d3d1',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Ở lại làm tiếp
                </button>

                <button
                  type="button"
                  onClick={performExit}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
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
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
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

      {/* 1. HERO BANNER CHUẨN PHONG CÁCH NHẬT BẢN */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
        border: '1px solid #e7dfd5',
        borderLeft: '4px solid #c53d32',
        borderRadius: 14,
        padding: '24px 28px',
        marginBottom: 20,
        boxShadow: '0 4px 16px -2px rgba(44, 30, 20, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            background: '#fdf2f0',
            color: '#c53d32',
            border: '1px solid #f3d5d2',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '1px',
            fontFamily: 'serif'
          }}>
            演習 · 模擬試験
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#78716c' }}>
            NGÂN HÀNG ĐỀ THI JLPT CHUẨN HOÁ
          </span>
        </div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#1c2536',
          margin: '0 0 8px 0',
          fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
        }}>
          Luyện Thi Thực Chiến & Chấm Điểm Chi Tiết
        </h1>

        <p style={{ color: '#57534e', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px 0', maxWidth: 760 }}>
          Hệ thống 85 bộ đề thi chính thức N5 → N1 qua các năm (2011 → 2024), tích hợp audio Choukai bản quyền, tự động tính giờ thi theo đúng kỳ thi JLPT thật và lưu tiến trình học tập cá nhân.
        </p>

        {/* Thống kê tính năng nổi bật */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            border: '1px solid #e7dfd5',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#1c2536'
          }}>
            <Target size={14} color="#c53d32" />
            <span>85 bộ đề chuẩn hóa N5 - N1</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            border: '1px solid #e7dfd5',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#1c2536'
          }}>
            <Clock size={14} color="#0d9488" />
            <span>Giới hạn thời gian chuẩn JLPT</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            border: '1px solid #e7dfd5',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#1c2536'
          }}>
            <FileCheck size={14} color="#2563eb" />
            <span>Tự động chấm & lưu tiến trình</span>
          </div>
        </div>
      </div>

      {/* 2. THANH LỌC BẬC JLPT (N5 - N1) */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 20
      }}>
        {LEVEL_FILTERS.map(lvl => {
          const isSelected = levelFilter === lvl.id;
          return (
            <button
              key={lvl.id}
              onClick={() => setLevelFilter(lvl.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: isSelected ? '#c53d32' : '#ffffff',
                color: isSelected ? '#ffffff' : '#57534e',
                border: isSelected ? '1px solid #c53d32' : '1px solid #e7dfd5',
                boxShadow: isSelected ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                opacity: isSelected ? 0.9 : 0.7,
                fontFamily: 'serif'
              }}>
                {lvl.kanji}
              </span>
              <span>{lvl.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. THANH TÌM KIẾM & BÁO CÁO SỐ LƯỢNG */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#57534e' }}>
          Tìm thấy <span style={{ color: '#c53d32', fontWeight: 900 }}>{filteredExams.length}</span> bộ đề thi:
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={15} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Tìm theo năm, tên đề (vd: 2024, 07)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 32px',
              borderRadius: 8,
              border: '1px solid #d6d3d1',
              fontSize: 13,
              outline: 'none',
              background: '#ffffff'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                color: '#78716c'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. LƯỚI DANH SÁCH BỘ ĐỀ THI */}
      {loading || loadingExamDetail ? (
        <div style={{
          padding: 60,
          textAlign: 'center',
          color: '#78716c',
          fontSize: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 28,
            height: 28,
            border: '3px solid #e7e5e4',
            borderTop: '3px solid #c53d32',
            borderRadius: '50%',
            animation: 'kanjiSpin 0.8s linear infinite'
          }} />
          <span>{loadingExamDetail ? 'Đang mở phòng thi và thiết lập đề...' : 'Đang nạp danh mục đề thi...'}</span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18
        }}>
          {filteredExams.map(exam => {
            const pastResult = examResults[exam.id];
            const standardDuration = JLPT_STANDARD_DURATIONS[exam.level?.toUpperCase()] || 120;
            const durationMin = (exam.durationMinutes && exam.durationMinutes > 0)
              ? exam.durationMinutes
              : standardDuration;

            return (
              <div
                key={exam.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: pastResult ? '1px solid #c6e2ce' : '1px solid #ebe7df',
                  borderLeft: pastResult ? (pastResult.isPassed ? '4px solid #16a34a' : '4px solid #c53d32') : '1px solid #ebe7df',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#c53d32';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(197, 61, 50, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = pastResult ? '#c6e2ce' : '#ebe7df';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                }}
              >
                {/* Header card: Level & Thời lượng chuẩn */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{
                    background: '#fdf2f0',
                    color: '#c53d32',
                    border: '1px solid #f3d5d2',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 900
                  }}>
                    {exam.level}
                  </span>

                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: '#78716c',
                    fontWeight: 600
                  }}>
                    <Clock size={13} color="#78716c" /> {durationMin} phút
                  </span>
                </div>

                {/* Tên đề thi */}
                <h3 style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#1c2536',
                  margin: '0 0 8px 0',
                  fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                }}>
                  {exam.label}
                </h3>

                {/* Huy hiệu tiến trình nếu người dùng đã từng thi đề này */}
                {pastResult && (
                  <div style={{
                    background: pastResult.isPassed ? '#f0fdf4' : '#fef2f2',
                    border: pastResult.isPassed ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    borderRadius: 6,
                    padding: '6px 10px',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11
                  }}>
                    <span style={{
                      fontWeight: 800,
                      color: pastResult.isPassed ? '#15803d' : '#b91c1c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {pastResult.isPassed ? <Check size={13} strokeWidth={3} /> : <AlertCircle size={13} />}
                      {pastResult.score}/{pastResult.total} câu ({pastResult.percentage}%) · {pastResult.isPassed ? 'Đạt' : 'Chưa đạt'}
                    </span>
                    <span style={{ color: '#78716c', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={10} />
                      {new Date(pastResult.completedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}

                {/* Thông tin câu hỏi, audio, giải thích */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    <FileText size={12} color="#475569" /> {exam.actualQuestionCount || exam.totalQuestions} câu hỏi
                  </span>

                  {exam.audioUrl && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#f0fdfa',
                      color: '#0d9488',
                      border: '1px solid #ccfbf1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      <Headphones size={12} color="#0d9488" /> Choukai
                    </span>
                  )}

                  {exam.explanationCount && exam.explanationCount > 0 ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#fffbeb',
                      color: '#d97706',
                      border: '1px solid #fef3c7',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      <Lightbulb size={12} color="#d97706" /> {exam.explanationCount} giải thích
                    </span>
                  ) : null}
                </div>

                {/* Nút vào thi hoặc thi lại */}
                <button
                  onClick={() => handleStartExam(exam.id)}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '10px 0',
                    background: pastResult ? '#c53d32' : '#1c2536',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = pastResult ? '#9c2a2a' : '#c53d32';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = pastResult ? '#c53d32' : '#1c2536';
                  }}
                >
                  <span>{pastResult ? 'Thi lại đề thi này' : 'Vào làm bài thi thử'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THÔNG BÁO LỖI NẠP ĐỀ (THAY THẾ WINDOW.ALERT / LOCALHOST SAYS) */}
      {loadErrorMsg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            maxWidth: 420,
            width: '100%',
            padding: '26px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
            border: '1px solid #ebe7df',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            animation: 'kizunaModalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertCircle size={24} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1c2536', margin: 0 }}>
                Thông báo
              </h3>
            </div>
            <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.5, margin: 0 }}>
              {loadErrorMsg}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setLoadErrorMsg(null)}
                style={{
                  padding: '9px 20px',
                  background: '#1c2536',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
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
