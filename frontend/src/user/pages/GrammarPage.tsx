import React, { useEffect, useState, useMemo } from 'react';
import { kizunaService } from '../services/kizunaService';
import { GrammarItem, GrammarBook, GrammarUnit, GrammarCatalog } from '../types/kizuna';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
// 2 Dạng bài tập: 1 là Thẻ lật (Ôn tập), 2 là Nhìn câu ví dụ chọn mẫu ngữ pháp (Luyện ghi nhớ)
type StudyMode = 'list' | 'flip' | 'quiz';

// Phân cấp danh xưng tiếng Nhật truyền thống cho từng bậc N
const LEVEL_LABELS: Record<JlptLevelKey, { kanji: string; vi: string; desc: string }> = {
  N5: { kanji: '入門', vi: 'Nhập môn', desc: 'Nền tảng cú pháp câu & trợ từ cơ bản' },
  N4: { kanji: '初級', vi: 'Sơ cấp', desc: 'Các thể liên kết, điều kiện & giao tiếp tự nhiên' },
  N3: { kanji: '中級', vi: 'Trung cấp', desc: 'Mẫu câu xã hội, sắc thái biểu cảm đời sống' },
  N2: { kanji: '中上級', vi: 'Trung thượng cấp', desc: 'Văn phong văn phòng, thương mại & xã luận' },
  N1: { kanji: '上級', vi: 'Thượng cấp', desc: 'Ngữ pháp nghị luận cao cấp & văn kiện học thuật' }
};

interface GrammarQuizOption {
  pattern: string;
  titleVi: string;
  isCorrect: boolean;
}

interface GrammarQuizQuestion {
  item: GrammarItem;
  exampleJp: string;
  exampleVi: string;
  options: GrammarQuizOption[];
}

// Component Animation Hoa anh đào rơi động chuẩn phong cách Nhật Bản
const SakuraFallingBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0
      }}
    >
      {[
        { left: '6%', delay: '0s', duration: '6.5s', size: 14, rotate: 25 },
        { left: '22%', delay: '1.8s', duration: '7.8s', size: 18, rotate: -35 },
        { left: '38%', delay: '3.5s', duration: '6.2s', size: 13, rotate: 45 },
        { left: '54%', delay: '0.8s', duration: '8.2s', size: 16, rotate: 15 },
        { left: '69%', delay: '4.2s', duration: '7.1s', size: 15, rotate: -25 },
        { left: '83%', delay: '2.1s', duration: '6.6s', size: 17, rotate: 50 },
        { left: '94%', delay: '5.0s', duration: '8.4s', size: 12, rotate: -15 }
      ].map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size * 1.3,
            animation: `sakuraFall ${p.duration} linear infinite`,
            animationDelay: p.delay,
            opacity: 0.75,
            display: 'block'
          }}
        >
          <svg viewBox="0 0 30 40" width="100%" height="100%" style={{ transform: `rotate(${p.rotate}deg)` }}>
            <path
              d="M 15 2 C 22 10, 30 22, 24 32 C 18 40, 8 38, 4 30 C 0 20, 8 10, 15 2 Z"
              fill="#fda4af"
              opacity="0.8"
            />
          </svg>
        </span>
      ))}
    </div>
  );
};

export const GrammarPage: React.FC = () => {
  // Navigation State
  const [catalog, setCatalog] = useState<GrammarCatalog | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>('N5');
  const [selectedBook, setSelectedBook] = useState<GrammarBook | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<GrammarUnit | null>(null);

  // Unit Grammar Data
  const [unitGrammarList, setUnitGrammarList] = useState<GrammarItem[]>([]);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Study Mode State
  const [currentMode, setCurrentMode] = useState<StudyMode>('list');

  // Hướng lướt khi chuyển thẻ: 'next' (lướt sang trái) hoặc 'prev' (lướt sang phải)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // --- State Dạng 1: Flashcard Lật 3D SRS ---
  const [flipActiveIndex, setFlipActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [flipStudyList, setFlipStudyList] = useState<GrammarItem[]>([]);
  const [flipFinished, setFlipFinished] = useState(false);

  // --- State Dạng 2: Bài tập Luyện Ghi Nhớ (Nhìn ví dụ chọn mẫu ngữ pháp) ---
  const [quizQuestions, setQuizQuestions] = useState<GrammarQuizQuestion[]>([]);
  const [quizActiveIndex, setQuizActiveIndex] = useState(0);
  const [quizSelectedOptionIndex, setQuizSelectedOptionIndex] = useState<number | null>(null);
  const [quizAnswerChecked, setQuizAnswerChecked] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [quizIsSkipped, setQuizIsSkipped] = useState(false);
  const [quizWrongQuestions, setQuizWrongQuestions] = useState<GrammarQuizQuestion[]>([]);
  const [quizSkippedQuestions, setQuizSkippedQuestions] = useState<GrammarQuizQuestion[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Thứ tự học: sắp xếp ngẫu nhiên hoặc theo thứ tự mặc định
  const [isShuffle, setIsShuffle] = useState(false);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Tạo bộ câu hỏi trắc nghiệm nhìn ví dụ chọn mẫu ngữ pháp (4 lựa chọn hoặc ít hơn tùy bài)
  const buildQuizQuestions = (items: GrammarItem[]): GrammarQuizQuestion[] => {
    return items.map(item => {
      const exampleJp = item.masterExampleJp || (item.examples && item.examples[0]?.sentence) || item.pattern;
      const exampleVi = item.masterExampleVi || (item.examples && item.examples[0]?.translation) || item.titleVi;

      // Chọn các mẫu câu nhiễu từ các mẫu khác trong bài
      const otherItems = items.filter(it => it.id !== item.id);
      const shuffledOthers = shuffleArray(otherItems);
      const maxDistractors = Math.min(3, shuffledOthers.length);
      const distractors = shuffledOthers.slice(0, maxDistractors);

      const options: GrammarQuizOption[] = shuffleArray([
        { pattern: item.pattern, titleVi: item.titleVi, isCorrect: true },
        ...distractors.map(d => ({ pattern: d.pattern, titleVi: d.titleVi, isCorrect: false }))
      ]);

      return {
        item,
        exampleJp,
        exampleVi,
        options
      };
    });
  };

  // Tải catalog lúc mount
  useEffect(() => {
    kizunaService.getGrammarCatalog().then(cat => {
      if (cat) {
        setCatalog(cat);
      }
    });
  }, []);

  // Tải ngữ pháp khi chọn Unit
  useEffect(() => {
    if (!selectedUnit) {
      setUnitGrammarList([]);
      return;
    }

    async function loadUnitGrammar() {
      setLoadingUnit(true);
      try {
        const items = await kizunaService.getGrammarByUnit(selectedUnit!.unitId);
        setUnitGrammarList(items);

        const studyItems = isShuffle ? shuffleArray(items) : items;

        // Reset Dạng 1: Flashcard
        setFlipStudyList(studyItems);
        setFlipActiveIndex(0);
        setIsFlipped(false);
        setMasteredIds(new Set());
        setLearningIds(new Set());
        setFlipFinished(false);

        // Reset Dạng 2: Trắc nghiệm nhìn ví dụ chọn mẫu câu
        const questions = buildQuizQuestions(studyItems);
        setQuizQuestions(questions);
        setQuizActiveIndex(0);
        setQuizSelectedOptionIndex(null);
        setQuizAnswerChecked(false);
        setQuizIsCorrect(false);
        setQuizIsSkipped(false);
        setQuizWrongQuestions([]);
        setQuizSkippedQuestions([]);
        setQuizCorrectCount(0);
        setQuizFinished(false);

        // Mở rộng mẫu câu đầu tiên trong chế độ xem danh sách
        if (items.length > 0) {
          setExpandedItemId(items[0].id);
        }
      } finally {
        setLoadingUnit(false);
      }
    }

    loadUnitGrammar();
  }, [selectedUnit]);

  // Phát âm tiếng Nhật (Web Speech API)
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

  const handleSelectLevel = (lvl: JlptLevelKey) => {
    setSelectedLevel(lvl);
    setSelectedBook(null);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleSelectBook = (book: GrammarBook) => {
    setSelectedBook(book);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleSelectUnit = (unit: GrammarUnit) => {
    setSelectedUnit(unit);
    setCurrentMode('list');
    setSearchTerm('');
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  // --- LOGIC CHO DẠNG 1: LẬT THẺ 3D ---
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkFlipResult = (mastered: boolean) => {
    if (flipStudyList.length === 0) return;
    const currentItem = flipStudyList[flipActiveIndex];
    if (!currentItem) return;

    if (mastered) {
      setMasteredIds(prev => new Set(prev).add(currentItem.id));
      setLearningIds(prev => {
        const next = new Set(prev);
        next.delete(currentItem.id);
        return next;
      });
    } else {
      setLearningIds(prev => new Set(prev).add(currentItem.id));
    }

    setSlideDirection('next');
    if (flipActiveIndex + 1 < flipStudyList.length) {
      setFlipActiveIndex(flipActiveIndex + 1);
      setIsFlipped(false);
    } else {
      setFlipFinished(true);
    }
  };

  const restartAllFlip = () => {
    const list = isShuffle ? shuffleArray(unitGrammarList) : unitGrammarList;
    setFlipStudyList(list);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFlipFinished(false);
  };

  const restartUnlearnedFlip = () => {
    let unlearned = unitGrammarList.filter(item => learningIds.has(item.id));
    if (unlearned.length === 0) {
      restartAllFlip();
      return;
    }
    if (isShuffle) {
      unlearned = shuffleArray(unlearned);
    }
    setFlipStudyList(unlearned);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setFlipFinished(false);
  };

  // --- LOGIC CHO DẠNG 2: BÀI TẬP NHÌN VÍ DỤ CHỌN MẪU NGỮ PHÁP ---
  const handleSelectQuizOption = (optionIndex: number) => {
    if (quizAnswerChecked || quizQuestions.length === 0) return;

    const currentQuestion = quizQuestions[quizActiveIndex];
    if (!currentQuestion) return;

    const selectedOpt = currentQuestion.options[optionIndex];
    if (!selectedOpt) return;

    const isCorrect = selectedOpt.isCorrect;

    setQuizSelectedOptionIndex(optionIndex);
    setQuizIsCorrect(isCorrect);
    setQuizIsSkipped(false);
    setQuizAnswerChecked(true);

    if (isCorrect) {
      setQuizCorrectCount(prev => prev + 1);
    } else {
      setQuizWrongQuestions(prev => [...prev, currentQuestion]);
    }
  };

  const handleSkipQuizCard = () => {
    if (quizAnswerChecked || quizQuestions.length === 0) return;
    const currentQuestion = quizQuestions[quizActiveIndex];
    if (!currentQuestion) return;

    setQuizIsSkipped(true);
    setQuizIsCorrect(false);
    setQuizAnswerChecked(true);
    setQuizSkippedQuestions(prev => [...prev, currentQuestion]);
  };

  const handleNextQuizQuestion = () => {
    setSlideDirection('next');
    if (quizActiveIndex + 1 < quizQuestions.length) {
      setQuizActiveIndex(quizActiveIndex + 1);
      setQuizSelectedOptionIndex(null);
      setQuizAnswerChecked(false);
      setQuizIsCorrect(false);
      setQuizIsSkipped(false);
    } else {
      setQuizFinished(true);
    }
  };

  const restartAllQuiz = () => {
    const list = isShuffle ? shuffleArray(unitGrammarList) : unitGrammarList;
    const questions = buildQuizQuestions(list);
    setQuizQuestions(questions);
    setQuizActiveIndex(0);
    setQuizSelectedOptionIndex(null);
    setQuizAnswerChecked(false);
    setQuizIsCorrect(false);
    setQuizIsSkipped(false);
    setQuizWrongQuestions([]);
    setQuizSkippedQuestions([]);
    setQuizCorrectCount(0);
    setQuizFinished(false);
  };

  const restartWrongOrSkippedQuiz = () => {
    const combinedMap = new Map<string, GrammarQuizQuestion>();
    [...quizWrongQuestions, ...quizSkippedQuestions].forEach(q => combinedMap.set(q.item.id, q));
    let retryQuestions = Array.from(combinedMap.values());
    if (retryQuestions.length === 0) {
      restartAllQuiz();
      return;
    }
    // Tái tạo lại câu hỏi và xáo trộn các lựa chọn
    const retryItems = retryQuestions.map(q => q.item);
    const rebuilt = buildQuizQuestions(isShuffle ? shuffleArray(retryItems) : retryItems);

    setQuizQuestions(rebuilt);
    setQuizActiveIndex(0);
    setQuizSelectedOptionIndex(null);
    setQuizAnswerChecked(false);
    setQuizIsCorrect(false);
    setQuizIsSkipped(false);
    setQuizWrongQuestions([]);
    setQuizSkippedQuestions([]);
    setQuizCorrectCount(0);
    setQuizFinished(false);
  };

  // Chức năng chuyển đổi sắp xếp ngẫu nhiên hoặc theo thứ tự
  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    if (currentMode === 'flip') {
      const nextList = nextShuffle ? shuffleArray(unitGrammarList) : [...unitGrammarList];
      setFlipStudyList(nextList);
      setFlipActiveIndex(0);
      setIsFlipped(false);
      setFlipFinished(false);
    } else if (currentMode === 'quiz') {
      const nextList = nextShuffle ? shuffleArray(unitGrammarList) : [...unitGrammarList];
      const questions = buildQuizQuestions(nextList);
      setQuizQuestions(questions);
      setQuizActiveIndex(0);
      setQuizSelectedOptionIndex(null);
      setQuizAnswerChecked(false);
      setQuizIsCorrect(false);
      setQuizIsSkipped(false);
      setQuizWrongQuestions([]);
      setQuizSkippedQuestions([]);
      setQuizCorrectCount(0);
      setQuizFinished(false);
    }
  };

  // Tự động chuyển thẻ tiếp theo sau 5 giây hiển thị kết quả ở Dạng 2
  useEffect(() => {
    if (!quizAnswerChecked || quizFinished) return;

    const timer = setTimeout(() => {
      handleNextQuizQuestion();
    }, 5000);

    return () => clearTimeout(timer);
  }, [quizAnswerChecked, quizActiveIndex, quizFinished, quizQuestions.length]);

  // Lắng nghe tương tác phím: 1, 2, 3, 4, Tab, Enter và mũi tên
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      if (currentMode === 'flip' && !flipFinished && flipStudyList.length > 0) {
        // Nhấn Tab để bỏ qua thẻ ôn tập (đánh dấu chưa thuộc và chuyển tiếp)
        if (e.key === 'Tab') {
          e.preventDefault();
          handleMarkFlipResult(false);
          return;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (!isFlipped) {
            setIsFlipped(true);
          } else {
            handleMarkFlipResult(true);
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (isFlipped) {
            setIsFlipped(false);
          } else {
            if (flipActiveIndex > 0) {
              setSlideDirection('prev');
              setFlipActiveIndex(prev => prev - 1);
              setIsFlipped(false);
            }
          }
        } else if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          handleFlipCard();
        }
      } else if (currentMode === 'quiz' && !quizFinished && quizQuestions.length > 0) {
        const currentQ = quizQuestions[quizActiveIndex];
        const numOptions = currentQ ? currentQ.options.length : 0;

        // Phím Tab: Bỏ qua khi chưa chọn, hoặc chuyển tiếp khi đã kiểm tra
        if (e.key === 'Tab') {
          e.preventDefault();
          if (!quizAnswerChecked) {
            handleSkipQuizCard();
          } else {
            handleNextQuizQuestion();
          }
          return;
        }

        // Phím Enter: Chuyển tiếp khi đã kiểm tra
        if (quizAnswerChecked && e.key === 'Enter') {
          e.preventDefault();
          handleNextQuizQuestion();
          return;
        }

        // Phím 1, 2, 3, 4 hoặc A, B, C, D: Chọn phương án tương ứng
        if (!quizAnswerChecked) {
          if ((e.key === '1' || e.key.toLowerCase() === 'a') && numOptions >= 1) {
            e.preventDefault();
            handleSelectQuizOption(0);
          } else if ((e.key === '2' || e.key.toLowerCase() === 'b') && numOptions >= 2) {
            e.preventDefault();
            handleSelectQuizOption(1);
          } else if ((e.key === '3' || e.key.toLowerCase() === 'c') && numOptions >= 3) {
            e.preventDefault();
            handleSelectQuizOption(2);
          } else if ((e.key === '4' || e.key.toLowerCase() === 'd') && numOptions >= 4) {
            e.preventDefault();
            handleSelectQuizOption(3);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, isFlipped, flipActiveIndex, flipStudyList, flipFinished, quizAnswerChecked, quizActiveIndex, quizQuestions, quizFinished]);

  // Filter ngữ pháp
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return unitGrammarList;
    const q = searchTerm.toLowerCase();
    return unitGrammarList.filter(item =>
      item.pattern.toLowerCase().includes(q) ||
      item.titleVi.toLowerCase().includes(q) ||
      (item.structure && item.structure.toLowerCase().includes(q)) ||
      (item.explanation && item.explanation.toLowerCase().includes(q))
    );
  }, [unitGrammarList, searchTerm]);

  const currentLevelBooks = (catalog && catalog[selectedLevel]) || [];
  const currentQuestion = quizQuestions[quizActiveIndex];

  return (
    <div style={{
      maxWidth: 1040,
      margin: '0 auto',
      paddingBottom: 64,
      fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes sakuraFall {
          0% {
            top: -8%;
            transform: translateX(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          50% {
            transform: translateX(22px) rotate(180deg);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            top: 108%;
            transform: translateX(-15px) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes autoCountdown5s {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @keyframes cardSlideInNext {
          0% {
            opacity: 0;
            transform: translateX(36px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes cardSlideInPrev {
          0% {
            opacity: 0;
            transform: translateX(-36px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes resultSlideUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* 1. HEADER MANG PHONG CÁCH NHẬT BẢN HIỆN ĐẠI (和の美学) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: '1px solid #ebe7df'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {/* Dấu triện Hanko đỏ (印鑑) KIZUNA */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                border: '1.5px solid #c53d32',
                borderRadius: 4,
                color: '#c53d32',
                fontSize: 13,
                fontWeight: 900,
                fontFamily: 'serif',
                lineHeight: 1,
                background: '#fffcfb'
              }}>
                絆
              </span>
              <h1 style={{ fontSize: 23, fontWeight: 900, color: '#1c2536', margin: 0, letterSpacing: '-0.3px' }}>
                文法帳 <span style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>· Ngữ Pháp Tiếng Nhật</span>
              </h1>
            </div>
            <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
              Giáo trình chuẩn ngữ cảnh: <strong>みんなの日本語</strong> (Minna) & <strong>新完全マスター</strong> (Shinkanzen)
            </p>
          </div>

          {/* Thanh chuyển cấp độ N phong cách Thẻ bài Nhật Bản (札 - Fuda) */}
          <div style={{
            display: 'flex',
            background: '#f4f2ee',
            padding: 3,
            borderRadius: 10,
            border: '1px solid #e5e0d8',
            gap: 2
          }}>
            {(['N5', 'N4', 'N3', 'N2', 'N1'] as JlptLevelKey[]).map(lvl => {
              const isActive = selectedLevel === lvl;
              const meta = LEVEL_LABELS[lvl];
              return (
                <button
                  key={lvl}
                  onClick={() => handleSelectLevel(lvl)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 7,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#c53d32' : 'transparent',
                    color: isActive ? '#ffffff' : '#57534e',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    lineHeight: 1.15
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px' }}>{lvl}</span>
                  <span style={{ fontSize: 10, opacity: isActive ? 0.95 : 0.7, fontWeight: 600 }}>{meta.kanji}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Breadcrumb Navigation phong cách chỉ mục Nhật */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#78716c',
          padding: '8px 14px',
          background: '#faf8f5',
          borderRadius: 8,
          border: '1px solid #ebe7df'
        }}>
          <span
            onClick={handleBackToBooks}
            style={{
              cursor: selectedBook ? 'pointer' : 'default',
              color: selectedBook ? '#2563eb' : '#1c2536',
              fontWeight: 700
            }}
          >
            【 {selectedLevel} · {LEVEL_LABELS[selectedLevel].kanji} 】
          </span>
          {selectedBook && (
            <>
              <span style={{ color: '#d6d3d1' }}>／</span>
              <span
                onClick={handleBackToUnits}
                style={{
                  cursor: selectedUnit ? 'pointer' : 'default',
                  color: selectedUnit ? '#2563eb' : '#1c2536',
                  fontWeight: 600
                }}
              >
                {selectedBook.bookName}
              </span>
            </>
          )}
          {selectedUnit && (
            <>
              <span style={{ color: '#d6d3d1' }}>／</span>
              <span style={{ color: '#1c2536', fontWeight: 700 }}>
                {selectedUnit.unitTitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. CHỌN GIÁO TRÌNH CỦA CẤP ĐỘ HIỆN TẠI (Book Cover Wabi-sabi Style) */}
      {!selectedBook && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {currentLevelBooks.map(book => {
            const isMinna = book.bookId.includes('minna') || book.bookId.includes('n5') || book.bookId.includes('n4');
            const spineColor = isMinna ? '#c53d32' : '#1e40af';
            return (
              <div
                key={book.bookId}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #ebe7df',
                  borderLeft: `5px solid ${spineColor}`,
                  padding: 24,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleSelectBook(book)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = spineColor;
                  e.currentTarget.style.borderLeftColor = spineColor;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#ebe7df';
                  e.currentTarget.style.borderLeftColor = spineColor;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 700,
                      background: isMinna ? '#fdf2f0' : '#eff6ff',
                      color: spineColor,
                      border: `1px solid ${isMinna ? '#f3d5d2' : '#bfdbfe'}`
                    }}>
                      『文法体系 · Ngữ Pháp』
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#c53d32' }}>
                      {selectedLevel} · {LEVEL_LABELS[selectedLevel].kanji}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                    {book.bookName}
                  </h3>

                  <p style={{ color: '#78716c', fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
                    {book.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: 16,
                    background: '#faf8f5',
                    padding: '10px 14px',
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '1px solid #f0ece3'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#a8a29e', fontWeight: 600 }}>課 (Số bài)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1c2536' }}>{book.units.length} bài</div>
                    </div>
                    <div style={{ width: 1, background: '#e7e3da' }} />
                    <div>
                      <div style={{ fontSize: 11, color: '#a8a29e', fontWeight: 600 }}>文法 (Mẫu câu)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2d6d4b' }}>{book.totalItems.toLocaleString()} mẫu</div>
                    </div>
                  </div>
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: '#1c2536',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#c53d32'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1c2536'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBook(book);
                  }}
                >
                  開く (Mở sách) ➔
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. DANH SÁCH BÀI HỌC (UNITS) PHONG CÁCH THẺ CHỈ MỤC NHẬT */}
      {selectedBook && !selectedUnit && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', margin: '0 0 2px 0' }}>
                {selectedBook.bookName}
              </h2>
              <div style={{ color: '#78716c', fontSize: 13 }}>
                Tổng cộng {selectedBook.units.length} bài học · {selectedBook.totalItems.toLocaleString()} mẫu ngữ pháp
              </div>
            </div>

            <button
              onClick={handleBackToBooks}
              style={{
                background: '#ffffff',
                border: '1px solid #d6d3d1',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#57534e',
                cursor: 'pointer'
              }}
            >
              ⬅️ Chọn giáo trình khác
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 14
          }}>
            {selectedBook.units.map(unit => {
              return (
                <div
                  key={unit.unitId}
                  onClick={() => handleSelectUnit(unit)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: '1px solid #ebe7df',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#c53d32';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#ebe7df';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2d6d4b' }}>
                        {unit.itemCount} 文法
                      </span>
                      {unit.lessonNumber && (
                        <span style={{ fontSize: 11, color: '#78716c', background: '#faf8f5', padding: '2px 8px', borderRadius: 4, border: '1px solid #f0ece3' }}>
                          Bài {unit.lessonNumber}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1c2536', margin: '4px 0 4px 0', lineHeight: 1.4 }}>
                      {unit.unitTitle}
                    </h4>

                    {unit.subTitle && (
                      <div style={{ fontSize: 12, color: '#78716c', lineHeight: 1.4, marginTop: 4 }}>
                        {unit.subTitle}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #f0ece3', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#c53d32' }}>
                      Vào học bài →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. KHÔNG GIAN HỌC UNIT (DANH SÁCH + 2 BÀI TẬP: ÔN TẬP & LUYỆN GHI NHỚ) */}
      {selectedBook && selectedUnit && (
        <div>
          {/* Header của bài học */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            padding: '18px 22px',
            marginBottom: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', margin: '0 0 3px 0' }}>
                  {selectedUnit.unitTitle}
                </h2>
                <div style={{ fontSize: 13, color: '#78716c' }}>
                  {selectedBook.bookName} · {unitGrammarList.length} mẫu câu ngữ pháp
                </div>
              </div>

              <button
                onClick={handleBackToUnits}
                style={{
                  background: '#faf8f5',
                  border: '1px solid #d6d3d1',
                  padding: '6px 12px',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#44403c',
                  cursor: 'pointer'
                }}
              >
                ⬅️ Danh sách bài
              </button>
            </div>

            {/* Tabs chuyển chế độ: Danh sách + 2 bài tập (1: Ôn tập, 2: Luyện ghi nhớ) */}
            <div style={{
              display: 'flex',
              gap: 8,
              borderTop: '1px solid #f2eee8',
              paddingTop: 12,
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCurrentMode('list')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'list' ? '#1c2536' : '#faf8f5',
                  color: currentMode === 'list' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'list' ? '2px solid #1c2536' : '1px solid #e7e3da',
                  transition: 'all 0.15s ease'
                }}
              >
                Danh sách mẫu câu
              </button>

              {/* DẠNG 1: ÔN TẬP (Thẻ lật) */}
              <button
                onClick={() => {
                  setCurrentMode('flip');
                  restartAllFlip();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'flip' ? '#c53d32' : '#faf8f5',
                  color: currentMode === 'flip' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'flip' ? '2px solid #c53d32' : '1px solid #e7e3da',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  background: currentMode === 'flip' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 900
                }}>1</span>
                <span>Ôn tập</span>
              </button>

              {/* DẠNG 2: LUYỆN GHI NHỚ (Nhìn ví dụ chọn mẫu ngữ pháp) */}
              <button
                onClick={() => {
                  setCurrentMode('quiz');
                  restartAllQuiz();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'quiz' ? '#2563eb' : '#faf8f5',
                  color: currentMode === 'quiz' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'quiz' ? '2px solid #2563eb' : '1px solid #e7e3da',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  background: currentMode === 'quiz' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 900
                }}>2</span>
                <span>Luyện ghi nhớ</span>
              </button>
            </div>
          </div>

          {loadingUnit ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#78716c', fontSize: 14 }}>
              ⏳ Đang nạp ngữ pháp bài học...
            </div>
          ) : (
            <>
              {/* CHẾ ĐỘ 0: DANH SÁCH MẪU CÂU NGỮ PHÁP (6 THÀNH PHẦN HOÀN CHỈNH) */}
              {currentMode === 'list' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#57534e' }}>
                      {filteredList.length} mẫu câu trong bài:
                    </div>
                    <div style={{ minWidth: 260 }}>
                      <input
                        type="text"
                        placeholder="🔍 Tìm mẫu câu hoặc ý nghĩa..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 12px',
                          borderRadius: 7,
                          border: '1px solid #d6d3d1',
                          fontSize: 13,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredList.map((item, idx) => {
                      const isExpanded = expandedItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            border: '1px solid #ebe7df',
                            borderLeft: '4px solid #c53d32',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Card Header clickable to expand */}
                          <div
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            style={{
                              padding: '16px 20px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: isExpanded ? '#faf8f5' : '#ffffff',
                              borderBottom: isExpanded ? '1px solid #ebe7df' : 'none',
                              gap: 12
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <span style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                background: '#fdf2f0',
                                color: '#c53d32',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 800
                              }}>
                                {idx + 1}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 17, fontWeight: 900, color: '#1c2536', fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                  {item.pattern}
                                </span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#9c2a2a' }}>
                                  · {item.titleVi}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  speakJapanese(item.pattern);
                                }}
                                title="Phát âm mẫu câu"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  padding: 4,
                                  opacity: 0.8
                                }}
                              >
                                🔊
                              </button>
                              <span style={{ fontSize: 13, color: '#78716c', fontWeight: 600 }}>
                                {isExpanded ? '▲ Thu gọn' : '▼ Chi tiết'}
                              </span>
                            </div>
                          </div>

                          {/* Chi tiết 6 thành phần ngữ pháp (Khi mở rộng) */}
                          {isExpanded && (
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                              {/* 1. Cấu trúc / Công thức ghép (Structure) */}
                              {item.structure && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                                    📐 Cấu Trúc / Công Thức Ghép:
                                  </div>
                                  <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: '#1e3a8a',
                                    fontFamily: 'monospace'
                                  }}>
                                    {item.structure}
                                  </div>
                                </div>
                              )}

                              {/* 2. Giải thích ý nghĩa & cách dùng (Explanation) */}
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                                  📖 Giải Thích & Hoàn Cảnh Sử Dụng:
                                </div>
                                <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, background: '#faf8f5', padding: '12px 16px', borderRadius: 8, border: '1px solid #ebe7df' }}>
                                  {item.explanation}
                                </div>
                              </div>

                              {/* 3. Bẫy lỗi sai người Việt hay mắc (Common Mistake) */}
                              {item.commonMistake && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                                    ⚠️ Bẫy Lỗi Sai Cần Tránh:
                                  </div>
                                  <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderLeft: '4px solid #ef4444',
                                    borderRadius: 8,
                                    padding: '12px 16px',
                                    fontSize: 13,
                                    color: '#7f1d1d',
                                    lineHeight: 1.6
                                  }}>
                                    {item.commonMistake}
                                  </div>
                                </div>
                              )}

                              {/* 4. Danh sách câu ví dụ chuẩn (Examples + Pronunciation) */}
                              {item.examples && item.examples.length > 0 && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                                    ⭐ Câu Ví Dụ Điển Hình:
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {item.examples.map((ex, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #ebe7df',
                                          borderRadius: 8,
                                          padding: '10px 14px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: 12
                                        }}
                                      >
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1c2536', marginBottom: 3 }}>
                                            {ex.sentence}
                                          </div>
                                          <div style={{ fontSize: 13, color: '#57534e' }}>
                                            {ex.translation}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => speakJapanese(ex.sentence)}
                                          title="Phát âm câu"
                                          style={{
                                            background: '#faf8f5',
                                            border: '1px solid #d6d3d1',
                                            borderRadius: 6,
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: 13
                                          }}
                                        >
                                          🔊
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 5. Đoạn hội thoại mẫu thực chiến (Dialogue) */}
                              {item.dialogue && item.dialogue.lines && item.dialogue.lines.length > 0 && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                                    💬 Đoạn Hội Thoại Thực Chiến: {item.dialogue.title ? `(${item.dialogue.title})` : ''}
                                  </div>
                                  <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10
                                  }}>
                                    {item.dialogue.lines.map((line, li) => {
                                      const isSpeakerA = line.speaker === 'A';
                                      return (
                                        <div key={li} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                          <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 900,
                                            background: isSpeakerA ? '#dbeafe' : '#e0e7ff',
                                            color: isSpeakerA ? '#1e40af' : '#3730a3',
                                            minWidth: 26,
                                            textAlign: 'center'
                                          }}>
                                            {line.speaker}
                                          </span>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                              {line.text}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                                              {line.translation}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => speakJapanese(line.text)}
                                            title="Phát âm"
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.7 }}
                                          >
                                            🔊
                                          </button>
                                        </div>
                                      );
                                    })}
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
              )}

              {/* CHẾ ĐỘ 1: DẠNG 1 - ÔN TẬP (Thẻ lật Flashcard 3D) */}
              {currentMode === 'flip' && (
                <div>
                  {!flipFinished ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình và chế độ sắp xếp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c', flexWrap: 'gap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>Thẻ {flipActiveIndex + 1} / {flipStudyList.length}</span>
                          <button
                            onClick={handleToggleShuffle}
                            style={{
                              padding: '3px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 16,
                              border: '1px solid #d6d3d1',
                              background: isShuffle ? '#f3f4f6' : '#ffffff',
                              color: isShuffle ? '#1c2536' : '#78716c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease'
                            }}
                            title="Chuyển đổi giữa theo thứ tự và ngẫu nhiên"
                          >
                            {isShuffle ? 'Ngẫu nhiên' : 'Theo thứ tự'}
                          </button>
                        </div>
                        <div>
                          Đã thuộc: <strong style={{ color: '#2d6d4b' }}>{masteredIds.size}</strong> | Chưa thuộc: <strong style={{ color: '#c53d32' }}>{learningIds.size}</strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((flipActiveIndex + 1) / flipStudyList.length) * 100}%`,
                          height: '100%',
                          background: '#c53d32',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Hiệu ứng lướt thẻ mượt mà & lật 3D */}
                      {flipStudyList[flipActiveIndex] && (
                        <div
                          key={flipActiveIndex}
                          style={{
                            perspective: 1000,
                            width: '100%',
                            minHeight: 380,
                            animation: `${slideDirection === 'next' ? 'cardSlideInNext' : 'cardSlideInPrev'} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both`
                          }}
                        >
                          <div
                            onClick={handleFlipCard}
                            style={{
                              position: 'relative',
                              width: '100%',
                              minHeight: 380,
                              cursor: 'pointer',
                              transformStyle: 'preserve-3d',
                              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                            }}
                          >
                            {/* MẶT TRƯỚC: Mẫu ngữ pháp & Công thức */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                                borderRadius: 20,
                                border: '1.5px solid #e7dfd5',
                                padding: '40px 32px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                                overflow: 'hidden'
                              }}
                            >
                              <SakuraFallingBackground />

                              <span style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                fontSize: 11,
                                fontWeight: 900,
                                color: '#c53d32',
                                background: 'rgba(253, 242, 240, 0.85)',
                                border: '1px solid #f3d5d2',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontFamily: 'serif',
                                zIndex: 2
                              }}>
                                1 · 復習 (ÔN TẬP)
                              </span>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  speakJapanese(flipStudyList[flipActiveIndex].pattern);
                                }}
                                title="Phát âm"
                                style={{
                                  position: 'absolute',
                                  top: 16,
                                  right: 16,
                                  background: '#faf8f5',
                                  border: '1px solid #d6d3d1',
                                  padding: '5px 12px',
                                  borderRadius: 20,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#44403c',
                                  zIndex: 2
                                }}
                              >
                                Phát âm
                              </button>

                              <div style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{
                                  fontSize: 32,
                                  fontWeight: 900,
                                  color: '#1c2536',
                                  marginBottom: 14,
                                  letterSpacing: '0.5px',
                                  fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                                }}>
                                  {flipStudyList[flipActiveIndex].pattern}
                                </div>

                                {flipStudyList[flipActiveIndex].structure && (
                                  <div style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: '#1e3a8a',
                                    background: '#eff6ff',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    border: '1px solid #bfdbfe',
                                    display: 'inline-block',
                                    marginBottom: 16
                                  }}>
                                    {flipStudyList[flipActiveIndex].structure}
                                  </div>
                                )}

                                <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 12 }}>
                                  Chạm vào thẻ hoặc bấm phím Space để lật mặt sau
                                </div>
                              </div>
                            </div>

                            {/* MẶT SAU: Ý nghĩa tiếng Việt, Giải thích & Ví dụ */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(150deg, #fdfbf7 0%, #ffffff 100%)',
                                borderRadius: 20,
                                border: '1.5px solid #e7dfd5',
                                padding: '32px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                textAlign: 'left',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                                overflowY: 'auto'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: '#2d6d4b',
                                  background: 'rgba(241, 248, 243, 0.85)',
                                  border: '1px solid #c6e2ce',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontFamily: 'serif'
                                }}>
                                  意味 · Ý NGHĨA
                                </span>

                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    speakJapanese(flipStudyList[flipActiveIndex].masterExampleJp);
                                  }}
                                  title="Phát âm câu ví dụ"
                                  style={{
                                    background: '#faf8f5',
                                    border: '1px solid #d6d3d1',
                                    padding: '4px 10px',
                                    borderRadius: 16,
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#44403c'
                                  }}
                                >
                                  Phát âm ví dụ
                                </button>
                              </div>

                              <div style={{ fontSize: 18, fontWeight: 900, color: '#c53d32', marginBottom: 8 }}>
                                {flipStudyList[flipActiveIndex].titleVi}
                              </div>

                              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 12 }}>
                                {flipStudyList[flipActiveIndex].explanation}
                              </div>

                              {flipStudyList[flipActiveIndex].commonMistake && (
                                <div style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: 6,
                                  padding: '8px 10px',
                                  fontSize: 12,
                                  color: '#7f1d1d',
                                  marginBottom: 12
                                }}>
                                  ⚠️ {flipStudyList[flipActiveIndex].commonMistake}
                                </div>
                              )}

                              {flipStudyList[flipActiveIndex].masterExampleJp && (
                                <div style={{
                                  background: '#faf8f5',
                                  border: '1px solid #ebe7df',
                                  borderLeft: '3px solid #2d6d4b',
                                  borderRadius: 6,
                                  padding: '8px 12px'
                                }}>
                                  <div style={{ fontWeight: 700, color: '#1c2536', fontSize: 13, marginBottom: 2 }}>
                                    {flipStudyList[flipActiveIndex].masterExampleJp}
                                  </div>
                                  <div style={{ color: '#57534e', fontSize: 12 }}>
                                    {flipStudyList[flipActiveIndex].masterExampleVi}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Các nút điều hướng kiểu Nhật */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 }}>
                        <button
                          onClick={() => handleMarkFlipResult(false)}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: '#fdf2f0',
                            color: '#c53d32',
                            border: '1px solid #f3d5d2',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Chưa thuộc
                        </button>

                        <button
                          onClick={handleFlipCard}
                          style={{
                            padding: '12px 24px',
                            background: '#ffffff',
                            color: '#44403c',
                            border: '1px solid #d6d3d1',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Lật thẻ
                        </button>

                        <button
                          onClick={() => handleMarkFlipResult(true)}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: '#f1f8f3',
                            color: '#2d6d4b',
                            border: '1px solid #c6e2ce',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Đã thuộc
                        </button>
                      </div>

                      {/* Hướng dẫn phím bấm tinh tế */}
                      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#a8a29e' }}>
                        Dùng phím mũi tên trái và phải để lật và chuyển thẻ · Phím Tab để bỏ qua
                      </div>
                    </div>
                  ) : (
                    /* Tổng kết Dạng 1 */
                    <div style={{
                      maxWidth: 480,
                      margin: '0 auto',
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #ebe7df',
                      padding: 32,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: '#f1f8f3',
                        color: '#2d6d4b',
                        fontSize: 22,
                        marginBottom: 10
                      }}>
                        完
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                        Hoàn thành bài học ngữ pháp
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                        <div style={{ background: '#f1f8f3', border: '1px solid #c6e2ce', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6d4b' }}>覚えた · ĐÃ THUỘC</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#2d6d4b', marginTop: 4 }}>
                            {masteredIds.size}
                          </div>
                        </div>

                        <div style={{ background: '#fdf2f0', border: '1px solid #f3d5d2', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#c53d32' }}>まだ · CHƯA THUỘC</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#c53d32', marginTop: 4 }}>
                            {learningIds.size}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {learningIds.size > 0 && (
                          <button
                            onClick={restartUnlearnedFlip}
                            style={{
                              padding: '11px 0',
                              background: '#c53d32',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Làm lại các thẻ chưa thuộc ({learningIds.size} mẫu)
                          </button>
                        )}

                        <button
                          onClick={restartAllFlip}
                          style={{
                            padding: '11px 0',
                            background: '#1c2536',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          🔁 Làm lại tất cả ({unitGrammarList.length} mẫu)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHẾ ĐỘ 2: DẠNG 2 - LUYỆN GHI NHỚ (Nhìn câu ví dụ chọn mẫu ngữ pháp) */}
              {currentMode === 'quiz' && (
                <div>
                  {!quizFinished && currentQuestion ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình và chế độ sắp xếp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>Câu {quizActiveIndex + 1} / {quizQuestions.length}</span>
                          <button
                            onClick={handleToggleShuffle}
                            style={{
                              padding: '3px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 16,
                              border: '1px solid #d6d3d1',
                              background: isShuffle ? '#f3f4f6' : '#ffffff',
                              color: isShuffle ? '#1c2536' : '#78716c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease'
                            }}
                            title="Chuyển đổi giữa theo thứ tự và ngẫu nhiên"
                          >
                            {isShuffle ? 'Ngẫu nhiên' : 'Theo thứ tự'}
                          </button>
                        </div>
                        <div>
                          Đúng: <strong style={{ color: '#2d6d4b' }}>{quizCorrectCount}</strong> | Sai & Bỏ qua: <strong style={{ color: '#c53d32' }}>{quizWrongQuestions.length + quizSkippedQuestions.length}</strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((quizActiveIndex + 1) / quizQuestions.length) * 100}%`,
                          height: '100%',
                          background: '#2563eb',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Khung thẻ câu hỏi trắc nghiệm nhìn ví dụ */}
                      <div
                        key={quizActiveIndex}
                        style={{
                          background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                          borderRadius: 20,
                          border: '1.5px solid #e7dfd5',
                          minHeight: 380,
                          padding: '36px 28px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                          overflow: 'hidden',
                          animation: `${slideDirection === 'next' ? 'cardSlideInNext' : 'cardSlideInPrev'} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both`
                        }}
                      >
                        <SakuraFallingBackground />

                        {/* Hanko Seal chế độ */}
                        <span style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          fontSize: 11,
                          fontWeight: 900,
                          color: '#2563eb',
                          background: 'rgba(239, 246, 255, 0.9)',
                          border: '1px solid #bfdbfe',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontFamily: 'serif',
                          zIndex: 2
                        }}>
                          2 · 記憶 (LUYỆN GHI NHỚ)
                        </span>

                        {/* Nút phát âm câu ví dụ */}
                        <button
                          onClick={() => speakJapanese(currentQuestion.exampleJp)}
                          title="Phát âm câu ví dụ"
                          style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            background: '#faf8f5',
                            border: '1px solid #d6d3d1',
                            padding: '5px 12px',
                            borderRadius: 20,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#44403c',
                            zIndex: 2
                          }}
                        >
                          🔊 Nghe câu
                        </button>

                        {/* Nội dung câu ví dụ điển hình */}
                        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 560 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#78716c', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                            例文 · CÂU VÍ DỤ ĐIỂN HÌNH
                          </div>

                          <div style={{
                            fontSize: 23,
                            fontWeight: 900,
                            color: '#1c2536',
                            lineHeight: 1.5,
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                            marginBottom: 8
                          }}>
                            {currentQuestion.exampleJp}
                          </div>

                          <div style={{
                            fontSize: 14,
                            color: '#57534e',
                            marginBottom: 16,
                            lineHeight: 1.4
                          }}>
                            {currentQuestion.exampleVi}
                          </div>

                          <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#9c2a2a',
                            background: '#fef2f2',
                            padding: '4px 12px',
                            borderRadius: 16,
                            display: 'inline-block',
                            marginBottom: 20,
                            border: '1px solid #fee2e2'
                          }}>
                            Chọn mẫu ngữ pháp được sử dụng trong câu trên:
                          </div>

                          {/* 4 Lựa chọn (hoặc ít hơn tùy bài) */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: currentQuestion.options.length <= 2 ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 10,
                            width: '100%',
                            marginBottom: 16
                          }}>
                            {currentQuestion.options.map((opt, optIdx) => {
                              const optionLetter = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'
                              const isSelected = quizSelectedOptionIndex === optIdx;

                              let optBg = '#ffffff';
                              let optBorder = '1.5px solid #e2e8f0';
                              let optTextColor = '#1c2536';
                              let badgeBg = '#f1f5f9';
                              let badgeColor = '#475569';

                              if (quizAnswerChecked) {
                                if (opt.isCorrect) {
                                  optBg = '#f0fdf4';
                                  optBorder = '1.5px solid #22c55e';
                                  optTextColor = '#15803d';
                                  badgeBg = '#22c55e';
                                  badgeColor = '#ffffff';
                                } else if (isSelected && !opt.isCorrect) {
                                  optBg = '#fef2f2';
                                  optBorder = '1.5px solid #ef4444';
                                  optTextColor = '#b91c1c';
                                  badgeBg = '#ef4444';
                                  badgeColor = '#ffffff';
                                } else {
                                  optBg = '#fafafa';
                                  optBorder = '1.5px solid #f1f5f9';
                                  optTextColor = '#94a3b8';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={quizAnswerChecked}
                                  onClick={() => handleSelectQuizOption(optIdx)}
                                  style={{
                                    background: optBg,
                                    border: optBorder,
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    textAlign: 'left',
                                    cursor: quizAnswerChecked ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                  }}
                                  onMouseEnter={e => {
                                    if (!quizAnswerChecked) {
                                      e.currentTarget.style.borderColor = '#2563eb';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!quizAnswerChecked) {
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                  }}
                                >
                                  <span style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 6,
                                    background: badgeBg,
                                    color: badgeColor,
                                    fontSize: 12,
                                    fontWeight: 900,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {optionLetter}
                                  </span>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: 15,
                                      fontWeight: 800,
                                      color: optTextColor,
                                      fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {opt.pattern}
                                    </div>
                                    <div style={{
                                      fontSize: 11,
                                      color: quizAnswerChecked && !opt.isCorrect && !isSelected ? '#94a3b8' : '#64748b',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {opt.titleVi}
                                    </div>
                                  </div>

                                  {quizAnswerChecked && opt.isCorrect && (
                                    <span style={{ color: '#16a34a', fontWeight: 900, fontSize: 16 }}>✓</span>
                                  )}
                                  {quizAnswerChecked && isSelected && !opt.isCorrect && (
                                    <span style={{ color: '#dc2626', fontWeight: 900, fontSize: 16 }}>✗</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Khi CHƯA kiểm tra: Nút Bỏ qua */}
                          {!quizAnswerChecked && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                              <button
                                type="button"
                                onClick={handleSkipQuizCard}
                                style={{
                                  padding: '8px 20px',
                                  background: '#faf8f5',
                                  color: '#78716c',
                                  border: '1px solid #d6d3d1',
                                  borderRadius: 8,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Bỏ qua (Tab)
                              </button>
                            </div>
                          )}

                          {/* Khi ĐÃ kiểm tra: Khung kết quả chi tiết & Thanh đếm ngược 5s */}
                          {quizAnswerChecked && (
                            <div style={{
                              width: '100%',
                              padding: '16px 20px',
                              borderRadius: 12,
                              background: quizIsCorrect ? '#f1f8f3' : quizIsSkipped ? '#fffbeb' : '#fdf2f0',
                              border: `1.5px solid ${quizIsCorrect ? '#c6e2ce' : quizIsSkipped ? '#fde68a' : '#f3d5d2'}`,
                              textAlign: 'center',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                              animation: 'resultSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both'
                            }}>
                              {/* Badge trạng thái */}
                              <div style={{
                                display: 'inline-block',
                                padding: '3px 12px',
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: 12,
                                background: quizIsCorrect ? 'rgba(45, 109, 75, 0.12)' : quizIsSkipped ? 'rgba(217, 119, 6, 0.12)' : 'rgba(197, 61, 50, 0.12)',
                                color: quizIsCorrect ? '#2d6d4b' : quizIsSkipped ? '#b45309' : '#c53d32',
                                marginBottom: 6
                              }}>
                                {quizIsCorrect ? 'Chính xác' : quizIsSkipped ? 'Đã bỏ qua' : 'Chưa chính xác'}
                              </div>

                              <div style={{ fontSize: 18, fontWeight: 900, color: '#1c2536', fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                {currentQuestion.item.pattern} · <span style={{ color: '#9c2a2a' }}>{currentQuestion.item.titleVi}</span>
                              </div>

                              {currentQuestion.item.structure && (
                                <div style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#1e3a8a',
                                  background: 'rgba(239, 246, 255, 0.7)',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  display: 'inline-block',
                                  margin: '6px 0',
                                  fontFamily: 'monospace'
                                }}>
                                  {currentQuestion.item.structure}
                                </div>
                              )}

                              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, textAlign: 'left', marginTop: 4 }}>
                                {currentQuestion.item.explanation}
                              </div>

                              {/* Nút Tiếp theo và thanh đếm ngược 5 giây */}
                              <div style={{ marginTop: 12 }}>
                                <button
                                  type="button"
                                  onClick={handleNextQuizQuestion}
                                  style={{
                                    padding: '8px 26px',
                                    background: '#1c2536',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Tiếp theo (Enter)
                                </button>

                                <div style={{
                                  height: 3,
                                  background: 'rgba(0,0,0,0.06)',
                                  borderRadius: 2,
                                  marginTop: 10,
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    background: quizIsCorrect ? '#2d6d4b' : '#c53d32',
                                    animation: 'autoCountdown5s 5s linear forwards'
                                  }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hướng dẫn phím bấm */}
                      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#a8a29e' }}>
                        Bấm phím 1, 2, 3, 4 hoặc A, B, C, D để chọn đáp án · Phím Tab để bỏ qua · Phím Enter để chuyển tiếp
                      </div>
                    </div>
                  ) : (
                    /* Tổng kết Dạng 2 */
                    <div style={{
                      maxWidth: 480,
                      margin: '0 auto',
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #ebe7df',
                      padding: 32,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: '#f1f8f3',
                        color: '#2d6d4b',
                        fontSize: 22,
                        marginBottom: 10
                      }}>
                        完
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                        Hoàn thành bài luyện ghi nhớ ngữ pháp
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                        <div style={{ background: '#f1f8f3', border: '1px solid #c6e2ce', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6d4b' }}>正解 · ĐÚNG</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#2d6d4b', marginTop: 4 }}>
                            {quizCorrectCount}
                          </div>
                        </div>

                        <div style={{ background: '#fdf2f0', border: '1px solid #f3d5d2', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#c53d32' }}>要復習 · SAI & BỎ QUA</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#c53d32', marginTop: 4 }}>
                            {quizWrongQuestions.length + quizSkippedQuestions.length}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(quizWrongQuestions.length > 0 || quizSkippedQuestions.length > 0) && (
                          <button
                            onClick={restartWrongOrSkippedQuiz}
                            style={{
                              padding: '11px 0',
                              background: '#c53d32',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Làm lại các câu sai & bỏ qua ({quizWrongQuestions.length + quizSkippedQuestions.length} câu)
                          </button>
                        )}

                        <button
                          onClick={restartAllQuiz}
                          style={{
                            padding: '11px 0',
                            background: '#1c2536',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          🔁 Làm lại tất cả ({unitGrammarList.length} câu)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
