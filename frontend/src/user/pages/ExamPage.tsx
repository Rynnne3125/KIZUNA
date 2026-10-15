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
  FileCheck
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { Exam } from '../types/kizuna';

const LEVEL_FILTERS = [
  { id: 'ALL', label: 'Tất cả cấp độ', kanji: '全' },
  { id: 'N5', label: 'N5 Nhập môn', kanji: '入門' },
  { id: 'N4', label: 'N4 Sơ cấp', kanji: '初級' },
  { id: 'N3', label: 'N3 Trung cấp', kanji: '中級' },
  { id: 'N2', label: 'N2 Trung thượng cấp', kanji: '中上' },
  { id: 'N1', label: 'N1 Thượng cấp', kanji: '上級' },
];

export const ExamPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Test-taking mode
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ total: number; correct: number } | null>(null);
  const [loadingExamDetail, setLoadingExamDetail] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  
  // Real-time countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

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

  // Countdown timer effect
  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTimerRunning, secondsRemaining, isSubmitted]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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

  const handleStartExam = async (examId: string) => {
    setLoadingExamDetail(true);
    try {
      const fullExam = await kizunaService.getExamById(examId);
      if (fullExam) {
        setActiveExam(fullExam);
        setUserAnswers({});
        setIsSubmitted(false);
        setScoreResult(null);
        setReviewFilter('all');
        const totalSecs = (fullExam.durationMinutes || 60) * 60;
        setSecondsRemaining(totalSecs);
        setIsTimerRunning(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Không thể tải chi tiết đề thi. Vui lòng thử lại!');
      }
    } finally {
      setLoadingExamDetail(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmitExam = () => {
    if (!activeExam || !activeExam.questionSets) return;
    let total = 0;
    let correct = 0;

    for (const qs of activeExam.questionSets) {
      for (const q of qs.questions) {
        total++;
        if (userAnswers[q.id] === q.correctAnswer) {
          correct++;
        }
      }
    }

    setScoreResult({ total, correct });
    setIsSubmitted(true);
    setIsTimerRunning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetExam = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    setReviewFilter('all');
    if (activeExam) {
      const totalSecs = (activeExam.durationMinutes || 60) * 60;
      setSecondsRemaining(totalSecs);
      setIsTimerRunning(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitExam = () => {
    if (!isSubmitted && Object.keys(userAnswers).length > 0) {
      const confirmExit = window.confirm('Bạn có chắc chắn muốn rời khỏi phòng thi? Bài thi hiện tại chưa được nộp.');
      if (!confirmExit) return;
    }
    setActiveExam(null);
    setUserAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    setReviewFilter('all');
    setIsTimerRunning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If in active exam mode, render the test-taking interface
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
        `}</style>

        {/* Sticky Exam Room Header */}
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
                  <Clock size={13} color="#78716c" />
                  Thời gian: <strong style={{ color: secondsRemaining < 300 && !isSubmitted ? '#ef4444' : '#1c2536' }}>{formatTime(secondsRemaining)}</strong>
                </span>
                <span>•</span>
                <span>
                  Đã làm: <strong style={{ color: '#c53d32' }}>{answeredCount}</strong> / {totalQuestionsCount} câu ({progressPercent}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {!isSubmitted ? (
                <button
                  onClick={handleSubmitExam}
                  style={{
                    padding: '8px 16px',
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

          {/* Thanh tiến trình làm bài trực quan */}
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

        {/* Bảng tổng kết kết quả chấm điểm (sau khi nộp bài) */}
        {isSubmitted && scoreResult && (
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
            border: '1.5px solid #e7dfd5',
            borderLeft: '4px solid #c53d32',
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(44, 30, 20, 0.04)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 10,
              background: scoreResult.correct / (scoreResult.total || 1) >= 0.8
                ? '#fefce8'
                : scoreResult.correct / (scoreResult.total || 1) >= 0.5
                  ? '#f0fdf4'
                  : '#fef2f2',
              color: scoreResult.correct / (scoreResult.total || 1) >= 0.8
                ? '#a16207'
                : scoreResult.correct / (scoreResult.total || 1) >= 0.5
                  ? '#15803d'
                  : '#b91c1c',
              border: scoreResult.correct / (scoreResult.total || 1) >= 0.8
                ? '1px solid #fef08a'
                : scoreResult.correct / (scoreResult.total || 1) >= 0.5
                  ? '1px solid #bbf7d0'
                  : '1px solid #fecaca'
            }}>
              {scoreResult.correct / (scoreResult.total || 1) >= 0.8 ? (
                <>
                  <Sparkles size={14} />
                  <span>合格見込み · XUẤT SẮC - ĐẠT CHUẨN ĐỖ CAO</span>
                </>
              ) : scoreResult.correct / (scoreResult.total || 1) >= 0.5 ? (
                <>
                  <Award size={14} />
                  <span>合格圏内 · ĐẠT MỨC ĐỖ CƠ BẢN</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span>要復習 · CẦN CỐ GẮNG ÔN TẬP THÊM</span>
                </>
              )}
            </div>

            <div style={{ fontSize: 34, fontWeight: 900, color: '#1c2536', marginBottom: 4 }}>
              {scoreResult.correct} <span style={{ fontSize: 20, color: '#78716c' }}>/ {scoreResult.total}</span>
              <span style={{ fontSize: 22, color: '#c53d32', marginLeft: 10 }}>
                ({Math.round(((scoreResult.correct || 0) / (scoreResult.total || 1)) * 100)}%)
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#57534e', marginBottom: 16 }}>
              Số câu trả lời chính xác trong tổng số câu hỏi bài thi
            </div>

            {/* Bộ lọc xem lại: Tất cả / Câu sai / Câu đúng */}
            <div style={{ display: 'inline-flex', gap: 6, background: '#f5f5f4', padding: 4, borderRadius: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setReviewFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: reviewFilter === 'all' ? '#ffffff' : 'transparent',
                  color: reviewFilter === 'all' ? '#1c2536' : '#78716c',
                  boxShadow: reviewFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Tất cả ({scoreResult.total})
              </button>
              <button
                onClick={() => setReviewFilter('wrong')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: reviewFilter === 'wrong' ? '#ffffff' : 'transparent',
                  color: reviewFilter === 'wrong' ? '#dc2626' : '#78716c',
                  boxShadow: reviewFilter === 'wrong' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Chỉ câu sai ({scoreResult.total - scoreResult.correct})
              </button>
              <button
                onClick={() => setReviewFilter('correct')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: reviewFilter === 'correct' ? '#ffffff' : 'transparent',
                  color: reviewFilter === 'correct' ? '#16a34a' : '#78716c',
                  boxShadow: reviewFilter === 'correct' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Chỉ câu đúng ({scoreResult.correct})
              </button>
            </div>
          </div>
        )}

        {/* Audio Player Choukai */}
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

        {/* Danh sách các phần thi (Question Sets / Mondai) */}
        {activeExam.questionSets && activeExam.questionSets.map((qs, setIdx) => {
          const filteredQuestions = qs.questions.filter(q => {
            if (!isSubmitted || reviewFilter === 'all') return true;
            const isRight = userAnswers[q.id] === q.correctAnswer;
            if (reviewFilter === 'wrong') return !isRight;
            if (reviewFilter === 'correct') return isRight;
            return true;
          });

          if (filteredQuestions.length === 0) return null;

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
                gap: 8
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
                {filteredQuestions.map((q, qIdx) => {
                  const selected = userAnswers[q.id];
                  const isCorrect = isSubmitted && selected === q.correctAnswer;

                  return (
                    <div
                      key={q.id || qIdx}
                      style={{
                        borderBottom: qIdx === filteredQuestions.length - 1 ? 'none' : '1px dashed #e2e8f0',
                        paddingBottom: qIdx === filteredQuestions.length - 1 ? 0 : 20
                      }}
                    >
                      {/* Thân câu hỏi */}
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#1c2536',
                        marginBottom: 12,
                        lineHeight: 1.6,
                        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#fdf2f0',
                          color: '#c53d32',
                          padding: '1px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 900,
                          marginRight: 8
                        }}>
                          Câu {q.index || (qIdx + 1)}
                        </span>
                        <span dangerouslySetInnerHTML={{ __html: q.question }} />
                      </div>

                      {/* Các phương án lựa chọn (1, 2, 3, 4) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 10
                      }}>
                        {q.options.map(opt => {
                          const isChosen = selected === opt.id;
                          const isRightAnswer = isSubmitted && q.correctAnswer === opt.id;

                          let optBg = '#ffffff';
                          let optBorder = '1.5px solid #e2e8f0';
                          let optColor = '#1c2536';
                          let badgeBg = '#f1f5f9';
                          let badgeColor = '#475569';

                          if (isSubmitted) {
                            if (isRightAnswer) {
                              optBg = '#f0fdf4';
                              optBorder = '1.5px solid #22c55e';
                              optColor = '#15803d';
                              badgeBg = '#22c55e';
                              badgeColor = '#ffffff';
                            } else if (isChosen && !isRightAnswer) {
                              optBg = '#fef2f2';
                              optBorder = '1.5px solid #ef4444';
                              optColor = '#991b1b';
                              badgeBg = '#ef4444';
                              badgeColor = '#ffffff';
                            } else {
                              optBg = '#fafafa';
                              optBorder = '1.5px solid #f1f5f9';
                              optColor = '#94a3b8';
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
                                padding: '10px 14px',
                                borderRadius: 8,
                                textAlign: 'left',
                                fontSize: 14,
                                fontWeight: isChosen || isRightAnswer ? 700 : 500,
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
                              {isSubmitted && isRightAnswer && (
                                <Check size={16} color="#16a34a" strokeWidth={3} />
                              )}
                              {isSubmitted && isChosen && !isRightAnswer && (
                                <X size={16} color="#dc2626" strokeWidth={3} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Giải thích chi tiết và kịch bản (khi đã nộp bài) */}
                      {isSubmitted && (
                        <div style={{
                          marginTop: 14,
                          background: '#faf8f5',
                          border: '1px solid #ebe7df',
                          borderRadius: 8,
                          padding: '14px 16px',
                          fontSize: 13,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 800,
                            color: isCorrect ? '#15803d' : '#dc2626'
                          }}>
                            {isCorrect ? (
                              <>
                                <CheckCircle2 size={16} color="#16a34a" />
                                <span>Đáp án chính xác!</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={16} color="#dc2626" />
                                <span>Đáp án đúng là: ({q.correctAnswer})</span>
                              </>
                            )}
                          </div>

                          {q.explanation && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 6,
                              color: '#334155',
                              lineHeight: 1.6
                            }}>
                              <Lightbulb size={14} color="#d97706" style={{ marginTop: 3, flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: '#92400e' }}>Giải thích chi tiết: </strong>
                                <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            </div>
                          )}

                          {q.script && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 6,
                              color: '#475569',
                              lineHeight: 1.6,
                              borderTop: '1px dashed #e2e8f0',
                              paddingTop: 8
                            }}>
                              <BookOpen size={14} color="#475569" style={{ marginTop: 3, flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: '#1c2536' }}>Dịch nghĩa & Kịch bản hội thoại: </strong>
                                <span dangerouslySetInnerHTML={{ __html: q.script }} />
                              </div>
                            </div>
                          )}
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
    );
  }

  // Chế độ 0: Danh mục Ngân Hàng Đề Thi JLPT
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      <style>{`
        @keyframes kanjiSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          Hệ thống 85 bộ đề thi chính thức N5 → N1 qua các năm (2011 → 2024), tích hợp audio nghe Choukai chất lượng cao, tính giờ thi thực chiến và phân tích lời giải chi tiết bằng tiếng Việt.
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
            <span>85 bộ đề chuẩn hóa</span>
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
            <Headphones size={14} color="#0d9488" />
            <span>Âm thanh Choukai chính thức</span>
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
            <span>Chấm điểm & lời giải tự động</span>
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

      {/* 3. THANH TÌM KIẾM & ĐẾM BỘ ĐỀ */}
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
          <span>{loadingExamDetail ? 'Đang mở phòng thi và tải câu hỏi...' : 'Đang nạp danh mục đề thi...'}</span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18
        }}>
          {filteredExams.map(exam => (
            <div
              key={exam.id}
              style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #ebe7df',
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
                e.currentTarget.style.borderColor = '#ebe7df';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
              }}
            >
              {/* Header card: Level & Thời lượng */}
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
                  <Clock size={13} color="#78716c" /> {exam.durationMinutes} phút
                </span>
              </div>

              {/* Tên đề thi */}
              <h3 style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#1c2536',
                margin: '0 0 10px 0',
                fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
              }}>
                {exam.label}
              </h3>

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

              {/* Nút vào làm bài thi */}
              <button
                onClick={() => handleStartExam(exam.id)}
                style={{
                  marginTop: 'auto',
                  width: '100%',
                  padding: '10px 0',
                  background: '#1c2536',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#c53d32'}
                onMouseLeave={e => e.currentTarget.style.background = '#1c2536'}
              >
                <span>Vào làm bài thi thử</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
