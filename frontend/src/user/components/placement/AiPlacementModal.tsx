import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Award, 
  Compass, 
  Check, 
  X, 
  ChevronRight, 
  RotateCcw, 
  Brain, 
  ShieldCheck, 
  GraduationCap, 
  MapPin, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { 
  SCREENING_QUESTIONS, 
  ScreeningAnswer, 
  DiagnosticQuestion,
  JLPT_LEVELS,
  PlacementLevel,
  PLACEMENT_PASS_RATE
} from '../../data/placementQuestionBank';
import { 
  formatPlacementStageTitle,
  getPassedPlacementLevels,
  getPlacementLearningLevel,
  placementService,
  PlacementAssessmentResult 
} from '../../services/placementService';
import { User } from '../../types/auth';
import { PLACEMENT_CONFIDENCE_LABELS } from '../../services/placementAssessmentApi';

interface AiPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onAssessmentComplete: (result: PlacementAssessmentResult) => void;
  onNavigateToRoadmap?: () => void;
}

type ModalStep = 'SCREENING' | 'QUIZ' | 'EVALUATING' | 'RESULT';

export const AiPlacementModal: React.FC<AiPlacementModalProps> = ({
  isOpen,
  onClose,
  user,
  onAssessmentComplete,
  onNavigateToRoadmap
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('SCREENING');
  const [screeningSubStep, setScreeningSubStep] = useState<number>(1);

  const [skipQuiz, setSkipQuiz] = useState(false);
  const [screening, setScreening] = useState<Omit<ScreeningAnswer, 'goal'> & { goal: ScreeningAnswer['goal'] | null }>({
    studyBackground: 'never',
    certificate: 'none',
    goal: null,
    weeklyHours: '3_to_7h'
  });

  // Bộ đề theo cấp JLPT
  const [activeSetId, setActiveSetId] = useState<number>(1);
  const [activeStageLevel, setActiveStageLevel] = useState<PlacementLevel>('N5');
  const [questionsPool, setQuestionsPool] = useState<DiagnosticQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<boolean>(false);
  const [testedQuestionsHistory, setTestedQuestionsHistory] = useState<DiagnosticQuestion[]>([]);

  const [assessmentResult, setAssessmentResult] = useState<PlacementAssessmentResult | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  const startQuiz = () => {
    const startLevel = JLPT_LEVELS[0];
    const chosenSetId = placementService.pickRandomSetId();
    setActiveSetId(chosenSetId);
    setActiveStageLevel(startLevel);

    const initialQuestions = placementService.getQuestionsForLevel(startLevel, chosenSetId);
    setQuestionsPool(initialQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setShowAnswerFeedback(false);
    setTestedQuestionsHistory(initialQuestions);
    setCurrentStep('QUIZ');
  };

  const handleGoalSubmit = () => {
    if (!screening.goal || isSaving) return;
    if (!skipQuiz) {
      startQuiz();
      return;
    }

    setTestedQuestionsHistory([]);
    setUserAnswers({});
    void finishAssessment([], {});
  };

  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (showAnswerFeedback) return;
    setSelectedOption(key);
  };

  const handleConfirmAnswer = () => {
    if (!selectedOption) return;
    const currentQ = questionsPool[currentQuestionIndex];
    if (!currentQ) return;

    setUserAnswers(prev => ({ ...prev, [currentQ.id]: selectedOption }));
    setShowAnswerFeedback(true);
  };

  // Chuyển sang câu hỏi tiếp theo hoặc kết thúc chặng
  const handleNextQuestion = async () => {
    setShowAnswerFeedback(false);
    setSelectedOption(null);

    if (currentQuestionIndex + 1 < questionsPool.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      return;
    }

    const currentStageQuestions = questionsPool;
    let correctInStage = 0;
    currentStageQuestions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctInStage += 1;
      }
    });

    const stagePassRate = correctInStage / currentStageQuestions.length;

    const nextLevel = JLPT_LEVELS[JLPT_LEVELS.indexOf(activeStageLevel) + 1];
    if (nextLevel && stagePassRate >= PLACEMENT_PASS_RATE) {
      const nextLevelQuestions = placementService.getQuestionsForLevel(nextLevel, activeSetId);
      setActiveStageLevel(nextLevel);
      setQuestionsPool(nextLevelQuestions);
      setCurrentQuestionIndex(0);
      setTestedQuestionsHistory(prev => [...prev, ...nextLevelQuestions]);
      return;
    }

    await finishAssessment();
  };

  const finishAssessment = async (
    questions = testedQuestionsHistory,
    answers = userAnswers,
    setId = activeSetId
  ) => {
    const { goal } = screening;
    if (!user || !goal) return;
    setCurrentStep('EVALUATING');
    setIsSaving(true);
    setRoadmapError(null);

    try {
      const result = await placementService.evaluatePlacement(user.id, { ...screening, goal }, answers, questions, setId);
      const saved = await placementService.savePlacementResult(result);
      setAssessmentResult(saved.result);
      setSyncPending(saved.status === 'pending');
      setCurrentStep('RESULT');
      onAssessmentComplete(saved.result);
    } catch (error) {
      console.error('Lỗi khi lưu kết quả xếp lớp:', error);
      setRoadmapError(error instanceof Error && error.message.startsWith('Cần tải lộ trình')
        ? error.message
        : 'Chưa lưu được kết quả. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // Làm lại bài kiểm tra với một bộ đề ngẫu nhiên mới để tạo lại lộ trình
  const handleRetake = () => {
    setCurrentStep('SCREENING');
    setScreeningSubStep(1);
    setSkipQuiz(false);
    setScreening(previous => ({ ...previous, goal: null }));
    setUserAnswers({});
    setSelectedOption(null);
    setShowAnswerFeedback(false);
    setAssessmentResult(null);
    setRoadmapError(null);
  };

  if (!isOpen) return null;

  const passedLevels = assessmentResult ? getPassedPlacementLevels(assessmentResult) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-auto">
        
        {/* Nút đóng */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ========================================================
            BƯỚC 1: KHẢO SÁT TIỀN TRẮC NGHIỆM (SCREENING SURVEY)
        ======================================================== */}
        {currentStep === 'SCREENING' && (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4" />
              <span>Khảo Sát Định Hướng Học Viên • Bước {screeningSubStep}/3</span>
            </div>
            
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(screeningSubStep / 3) * 100}%` }}
              />
            </div>

            {screeningSubStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {SCREENING_QUESTIONS.background.title}
                </h2>
                <p className="text-sm text-slate-500">
                  {SCREENING_QUESTIONS.background.subtitle}
                </p>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  {SCREENING_QUESTIONS.background.options.map((opt) => {
                    const isSelected = screening.studyBackground === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setScreening(prev => ({ ...prev, studyBackground: opt.value }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm sm:text-base">
                              {opt.label}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {screening.studyBackground === 'never' && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Bạn chưa từng học bảng chữ cái? Có thể vào thẳng bài học Mốc 1 mà không cần thi.</span>
                    </div>
                    <button
                      onClick={() => {
                        setSkipQuiz(true);
                        setScreeningSubStep(3);
                      }}
                      className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Chọn mục tiêu
                    </button>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setSkipQuiz(false);
                      setScreeningSubStep(2);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {screeningSubStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {SCREENING_QUESTIONS.certificate.title}
                </h2>
                <p className="text-sm text-slate-500">
                  {SCREENING_QUESTIONS.certificate.subtitle}
                </p>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  {SCREENING_QUESTIONS.certificate.options.map((opt) => {
                    const isSelected = screening.certificate === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setScreening(prev => ({ ...prev, certificate: opt.value }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 text-sm sm:text-base block">
                            {opt.label}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setScreeningSubStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                  <button
                    onClick={() => setScreeningSubStep(3)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {screeningSubStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {SCREENING_QUESTIONS.goal.title}
                </h2>
                <p className="text-sm text-slate-500">
                  {SCREENING_QUESTIONS.goal.subtitle}
                </p>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  {SCREENING_QUESTIONS.goal.options.map((opt) => {
                    const isSelected = screening.goal === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setScreening(prev => ({ ...prev, goal: opt.value }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 text-left ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 text-sm sm:text-base block">
                            {opt.label}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setScreeningSubStep(skipQuiz ? 1 : 2)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                  <button
                    disabled={!screening.goal || isSaving}
                    onClick={handleGoalSubmit}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{skipQuiz ? 'Bắt đầu học N5' : 'Bắt đầu bài trắc nghiệm'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            BƯỚC 2: BÀI TRẮC NGHIỆM THÍCH ỨNG (ADAPTIVE QUIZ)
        ======================================================== */}
        {currentStep === 'QUIZ' && questionsPool[currentQuestionIndex] && (
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                <Brain className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tầng {activeStageLevel} • Bộ đề #{activeSetId.toString().padStart(2, '0')}</span>
              </div>
              <div className="text-xs font-extrabold text-slate-500">
                Câu {currentQuestionIndex + 1} / {questionsPool.length}
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questionsPool.length) * 100}%` }}
              />
            </div>

            {(() => {
              const question = questionsPool[currentQuestionIndex];
              const [instruction, ...contextLines] = question.question.split('\n');
              const context = question.contextJp ?? contextLines.join('\n');

              return (
                <div className="mb-6 space-y-3">
                  <h3 className="text-base font-bold text-emerald-700">{instruction}</h3>
                  {context && (
                    <div lang="ja" className="whitespace-pre-line p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 text-lg sm:text-xl font-extrabold text-slate-900 leading-relaxed">
                      {context}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-3 mb-6">
              {questionsPool[currentQuestionIndex].options.map((opt) => {
                const isSelected = selectedOption === opt.key;
                const isCorrect = questionsPool[currentQuestionIndex].correctAnswer === opt.key;
                
                let btnStyle = 'border-slate-200 hover:border-emerald-300 bg-white text-slate-800';
                if (showAnswerFeedback) {
                  if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'border-rose-400 bg-rose-50 text-rose-900';
                  } else {
                    btnStyle = 'border-slate-100 bg-slate-50 text-slate-400 opacity-60';
                  }
                } else if (isSelected) {
                  btnStyle = 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold shadow-xs';
                }

                return (
                  <button
                    key={opt.key}
                    disabled={showAnswerFeedback}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {opt.key}
                      </span>
                      <span className="text-sm sm:text-base">{opt.text}</span>
                    </div>

                    {showAnswerFeedback && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {showAnswerFeedback && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs sm:text-sm text-slate-700 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Giải thích đáp án</span>
                </div>
                <p className="text-slate-600">
                  {questionsPool[currentQuestionIndex].explanationVi}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              {!showAnswerFeedback ? (
                <button
                  disabled={!selectedOption}
                  onClick={handleConfirmAnswer}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
                >
                  Kiểm tra đáp án
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <span>
                    {currentQuestionIndex + 1 < questionsPool.length ? 'Câu tiếp theo' : 'Hoàn thành chặng'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            BƯỚC ĐANG ĐÁNH GIÁ VÀ CHỌN CHẶNG
        ======================================================== */}
        {currentStep === 'EVALUATING' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-pulse">
              <Brain className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {roadmapError ? 'Chưa thể lưu lộ trình' : 'Đang chấm điểm và chọn chặng học…'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {roadmapError ?? 'Đang đối chiếu kết quả với các chặng học trong cơ sở dữ liệu.'}
            </p>
            {roadmapError && (
              <button
                onClick={() => void finishAssessment()}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold"
              >
                Thử lại
              </button>
            )}
          </div>
        )}

        {/* ========================================================
            BƯỚC 3: KẾT QUẢ THẨM ĐỊNH VÀ CHẶNG HỌC (RESULT)
        ======================================================== */}
        {currentStep === 'RESULT' && assessmentResult && (
          <div className="p-6 sm:p-8 space-y-5">
            
            <div className="text-center bg-radial from-emerald-500/10 via-emerald-50/50 to-white rounded-3xl p-6 border border-emerald-100">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-extrabold mb-3">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>{assessmentResult.answeredCount > 0
                  ? `KẾT QUẢ XẾP LỚP • BỘ ĐỀ #${(assessmentResult.questionSetId || activeSetId).toString().padStart(2, '0')}`
                  : 'LỘ TRÌNH NHẬP MÔN'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {assessmentResult.levelTitle}
              </h2>
              {assessmentResult.answeredCount > 0 && (
                <div className="flex items-center justify-center gap-4 mt-3 text-xs sm:text-sm font-semibold text-slate-600">
                  <span>Tỷ lệ chính xác: <strong className="text-emerald-700 font-extrabold">{assessmentResult.percentage}%</strong></span>
                  <span>•</span>
                  <span>Đúng {assessmentResult.correctCount}/{assessmentResult.answeredCount} câu</span>
                </div>
              )}
              {assessmentResult.aiAssessment && (
                <p className="mt-2 text-sm text-slate-600">
                  Độ tin cậy theo Gemini · {PLACEMENT_CONFIDENCE_LABELS[assessmentResult.aiAssessment.confidence]}
                </p>
              )}
              {syncPending && (
                <p role="status" className="mt-2 text-sm text-amber-700">Đã lưu trên thiết bị, đang chờ đồng bộ.</p>
              )}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-indigo-700 font-bold uppercase">
                    {assessmentResult.aiAssessment ? 'Gợi ý từ Gemini' : 'Điểm bắt đầu theo bài test'}
                  </div>
                  <div className="text-sm font-extrabold text-indigo-950">
                    {formatPlacementStageTitle(getPlacementLearningLevel(assessmentResult), assessmentResult.recommendedStageTitle)}
                  </div>
                  {assessmentResult.aiAssessment && (
                    <div className="text-sm text-indigo-800">{assessmentResult.recommendedMilestoneTitle}</div>
                  )}
                </div>
              </div>
              {passedLevels.length > 0 && (
                <span className="text-xs font-bold bg-white text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                  Đã mở toàn bộ mốc {passedLevels.join(', ')}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 py-2.5 px-3 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Làm lại bài test (Đổi bộ đề & Tạo lại lộ trình)</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToRoadmap) onNavigateToRoadmap();
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer ml-auto"
              >
                <span>Xem lộ trình học tập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
