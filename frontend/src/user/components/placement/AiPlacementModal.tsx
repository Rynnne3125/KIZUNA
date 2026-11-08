import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Award, 
  Compass, 
  BookOpen, 
  Check, 
  X, 
  ChevronRight, 
  RotateCcw, 
  Brain, 
  ShieldCheck, 
  GraduationCap, 
  MapPin, 
  Flame,
  ArrowLeft
} from 'lucide-react';
import { 
  SCREENING_QUESTIONS, 
  ScreeningAnswer, 
  DiagnosticQuestion 
} from '../../data/placementQuestionBank';
import { 
  placementService, 
  PlacementAssessmentResult 
} from '../../services/placementService';
import { User } from '../../types/auth';

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
  // Trạng thái bước hiện tại
  const [currentStep, setCurrentStep] = useState<ModalStep>('SCREENING');
  const [screeningSubStep, setScreeningSubStep] = useState<number>(1); // 1: background, 2: certificate, 3: goal

  // Dữ liệu khảo sát
  const [screening, setScreening] = useState<ScreeningAnswer>({
    studyBackground: 'never',
    certificate: 'none',
    goal: 'it_career',
    weeklyHours: '3_to_7h'
  });

  // Dữ liệu làm bài test thích ứng
  const [activeStageLevel, setActiveStageLevel] = useState<'N5' | 'N4' | 'N3'>('N5');
  const [questionsPool, setQuestionsPool] = useState<DiagnosticQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<boolean>(false);
  const [testedQuestionsHistory, setTestedQuestionsHistory] = useState<DiagnosticQuestion[]>([]);

  // Kết quả thẩm định
  const [assessmentResult, setAssessmentResult] = useState<PlacementAssessmentResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Khởi tạo pool câu hỏi khi bắt đầu vào QUIZ
  const startQuizWithLevel = (startLevel: 'N5' | 'N4' | 'N3') => {
    setActiveStageLevel(startLevel);
    const initialQuestions = placementService.getQuestionsForLevel(startLevel);
    setQuestionsPool(initialQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setShowAnswerFeedback(false);
    setTestedQuestionsHistory(initialQuestions);
    setCurrentStep('QUIZ');
  };

  // Người mới chưa từng học có thể xác nhận bắt đầu ngay từ Mốc 1 Kyushu
  const handleDirectBeginnerStart = async () => {
    if (!user) return;
    setIsSaving(true);
    setCurrentStep('EVALUATING');

    const result = await placementService.evaluatePlacement(
      user.id,
      screening,
      {},
      []
    );

    await placementService.savePlacementResult(result);
    setAssessmentResult(result);
    setIsSaving(false);
    setCurrentStep('RESULT');
    onAssessmentComplete(result);
  };

  // Chọn đáp án trắc nghiệm
  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (showAnswerFeedback) return;
    setSelectedOption(key);
  };

  // Xác nhận câu trả lời hiện tại
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

    // Nếu vẫn còn câu hỏi trong chặng hiện tại
    if (currentQuestionIndex + 1 < questionsPool.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      return;
    }

    // Đã làm hết các câu của chặng hiện tại -> Kiểm tra tỷ lệ đúng để quyết định nâng cấp
    const currentStageQuestions = questionsPool;
    let correctInStage = 0;
    currentStageQuestions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correctInStage += 1;
      }
    });

    const stagePassRate = correctInStage / currentStageQuestions.length;

    // Phân nhánh thích ứng:
    // Nếu ở N5 và đạt >= 75% -> tự động nâng lên N4
    if (activeStageLevel === 'N5' && stagePassRate >= 0.75) {
      const nextLevelQuestions = placementService.getQuestionsForLevel('N4');
      setActiveStageLevel('N4');
      setQuestionsPool(nextLevelQuestions);
      setCurrentQuestionIndex(0);
      setTestedQuestionsHistory(prev => [...prev, ...nextLevelQuestions]);
      return;
    }

    // Nếu ở N4 và đạt >= 75% -> nâng tiếp lên N3
    if (activeStageLevel === 'N4' && stagePassRate >= 0.75) {
      const nextLevelQuestions = placementService.getQuestionsForLevel('N3');
      setActiveStageLevel('N3');
      setQuestionsPool(nextLevelQuestions);
      setCurrentQuestionIndex(0);
      setTestedQuestionsHistory(prev => [...prev, ...nextLevelQuestions]);
      return;
    }

    // Kết thúc bài kiểm tra -> Đánh giá tổng hợp
    finishAssessment();
  };

  // Đánh giá và lưu kết quả
  const finishAssessment = async () => {
    if (!user) return;
    setCurrentStep('EVALUATING');
    setIsSaving(true);

    try {
      const result = await placementService.evaluatePlacement(
        user.id,
        screening,
        userAnswers,
        testedQuestionsHistory
      );

      await placementService.savePlacementResult(result);
      setAssessmentResult(result);
      setCurrentStep('RESULT');
      onAssessmentComplete(result);
    } catch (err) {
      console.error('Lỗi khi chấm điểm đánh giá:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset về ban đầu để kiểm tra lại
  const handleRetake = () => {
    setCurrentStep('SCREENING');
    setScreeningSubStep(1);
    setUserAnswers({});
    setSelectedOption(null);
    setShowAnswerFeedback(false);
    setAssessmentResult(null);
  };

  if (!isOpen) return null;

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
            {/* Header */}
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4" />
              <span>Khảo Sát Định Hướng Học Viên • Bước {screeningSubStep}/3</span>
            </div>
            
            {/* Thanh tiến trình khảo sát */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(screeningSubStep / 3) * 100}%` }}
              />
            </div>

            {/* Sub-step 1: Nền tảng học tập */}
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
                        onClick={() => setScreening(prev => ({ ...prev, studyBackground: opt.value as any }))}
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

                {/* Nếu chọn Chưa biết gì: Gợi ý bắt đầu ngay */}
                {screening.studyBackground === 'never' && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Bạn chưa từng học bảng chữ cái? Có thể vào thẳng bài học Mốc 1 mà không cần thi.</span>
                    </div>
                    <button
                      onClick={handleDirectBeginnerStart}
                      className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Bắt đầu ngay
                    </button>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setScreeningSubStep(2)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 2: Bằng cấp & Chứng chỉ */}
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
                        onClick={() => setScreening(prev => ({ ...prev, certificate: opt.value as any }))}
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

            {/* Sub-step 3: Mục tiêu học tập */}
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
                      <div
                        key={opt.value}
                        onClick={() => setScreening(prev => ({ ...prev, goal: opt.value as any }))}
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
                    onClick={() => setScreeningSubStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                  <button
                    onClick={() => {
                      // Định tuyến độ khó xuất phát dựa theo khảo sát
                      if (screening.certificate === 'has_n4' || screening.studyBackground === 'finished_n5') {
                        startQuizWithLevel('N4');
                      } else if (screening.certificate === 'has_n3' || screening.studyBackground === 'intermediate_or_higher') {
                        startQuizWithLevel('N3');
                      } else {
                        startQuizWithLevel('N5');
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt đầu bài trắc nghiệm thích ứng</span>
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
            {/* Header chặng thi */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                <Brain className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đang thẩm định: Tầng {activeStageLevel}</span>
              </div>
              <div className="text-xs font-extrabold text-slate-500">
                Câu {currentQuestionIndex + 1} / {questionsPool.length}
              </div>
            </div>

            {/* Thanh tiến trình trong chặng */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questionsPool.length) * 100}%` }}
              />
            </div>

            {/* Nội dung câu hỏi */}
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Lĩnh vực: {questionsPool[currentQuestionIndex].category}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug whitespace-pre-line">
                {questionsPool[currentQuestionIndex].question}
              </h3>
            </div>

            {/* Danh sách 4 đáp án */}
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

            {/* Giải thích đáp án sau khi bấm xác nhận */}
            {showAnswerFeedback && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs sm:text-sm text-slate-700 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Giải thích từ AI Sensei:</span>
                </div>
                <p className="text-slate-600">
                  {questionsPool[currentQuestionIndex].explanationVi}
                </p>
              </div>
            )}

            {/* Nút hành động */}
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
            BƯỚC ĐANG ĐÁNH GIÁ (EVALUATING ANIMATION)
        ======================================================== */}
        {currentStep === 'EVALUATING' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-pulse">
              <Brain className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              AI Sensei Đang Tổng Hợp Kết Quả...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Đang phân tích ma trận đáp án, đối soát với khảo sát bằng cấp và lập bản đồ học tập tối ưu cho bạn.
            </p>
          </div>
        )}

        {/* ========================================================
            BƯỚC 3: KẾT QUẢ THẨM ĐỊNH & MỞ KHÓA LỘ TRÌNH (RESULT)
        ======================================================== */}
        {currentStep === 'RESULT' && assessmentResult && (
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Huy hiệu Level đạt được */}
            <div className="text-center bg-radial from-emerald-500/10 via-emerald-50/50 to-white rounded-3xl p-6 border border-emerald-100">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-extrabold mb-3">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>CHỨNG NHẬN TRÌNH ĐỘ ĐẦU VÀO</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {assessmentResult.levelTitle}
              </h2>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs sm:text-sm font-semibold text-slate-600">
                <span>Tỷ lệ chính xác: <strong className="text-emerald-700 font-extrabold">{assessmentResult.percentage}%</strong></span>
                <span>•</span>
                <span>Đúng {assessmentResult.correctCount}/{assessmentResult.answeredCount} câu</span>
              </div>
            </div>

            {/* Lời khuyên cá nhân hóa từ AI Sensei */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 sm:p-5 relative">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Nhận xét chuyên môn từ KIZUNA Sensei</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                "{assessmentResult.aiSenseiFeedback}"
              </p>
            </div>

            {/* Điểm mạnh & Điểm cần cải thiện */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Điểm mạnh ghi nhận:
                </span>
                <ul className="list-disc list-inside text-emerald-800/90 space-y-1">
                  {assessmentResult.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                  {assessmentResult.strengths.length === 0 && (
                    <li>Sẵn sàng tiếp thu kiến thức mới một cách bài bản</li>
                  )}
                </ul>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Trọng tâm cần rèn luyện:
                </span>
                <ul className="list-disc list-inside text-amber-800/90 space-y-1">
                  {assessmentResult.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {assessmentResult.weaknesses.length === 0 && (
                    <li>Duy trì thói quen ôn luyện hàng ngày để giữ phản xạ</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Điểm xuất phát lộ trình học */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-indigo-700 font-bold uppercase">Điểm xuất phát trên Bản đồ Nhật Bản:</div>
                  <div className="text-sm font-extrabold text-indigo-950">
                    {assessmentResult.recommendedRegionName}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold bg-white text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                Đã mở khóa {assessmentResult.unlockedRegionIds.length} vùng
              </span>
            </div>

            {/* Các nút điều hướng */}
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 py-2.5 px-3 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thực hiện lại bài kiểm tra</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToRoadmap) onNavigateToRoadmap();
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer ml-auto"
              >
                <span>Bắt đầu học theo lộ trình</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
