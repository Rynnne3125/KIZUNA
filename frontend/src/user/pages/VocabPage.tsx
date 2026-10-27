import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Volume2, 
  Search, 
  RotateCcw, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  Shuffle,
  ArrowUpDown
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { authService } from '../services/authService';
import { progressService } from '../services/progressService';
import { VocabularyItem, VocabularyBook, VocabularyUnit, VocabularyCatalog } from '../types/kizuna';
import { VOCABULARY_CATALOG } from '../data/vocabularyCatalog';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
// 4 Chế độ học tập hoàn chỉnh:
// 0: Danh sách từ vựng (List)
// 1: Ôn tập (Flip - Flashcard lật 3D SRS & Vuốt chạm mobile)
// 2: Luyện ghi nhớ (Quiz - Trắc nghiệm 4 đáp án chọn nghĩa từ)
// 3: Gõ ghi nhớ (Typing - Nhìn chữ Hán/Từ vựng gõ cách đọc Hiragana)
type StudyMode = 'list' | 'flip' | 'quiz' | 'typing';

// Phân cấp danh xưng tiếng Nhật truyền thống cho từng bậc N
const LEVEL_LABELS: Record<JlptLevelKey, { kanji: string; vi: string; desc: string }> = {
  N5: { kanji: '入門', vi: 'Nhập môn', desc: 'Nền tảng giao tiếp & đời sống cơ bản' },
  N4: { kanji: '初級', vi: 'Sơ cấp', desc: 'Phản xạ tình huống thực tế thường nhật' },
  N3: { kanji: '中級', vi: 'Trung cấp', desc: 'Giao tiếp công sở & xã hội tự nhiên' },
  N2: { kanji: '中上級', vi: 'Trung thượng cấp', desc: 'Thương mại & đàm phán doanh nghiệp' },
  N1: { kanji: '上級', vi: 'Thượng cấp', desc: 'Văn kiện chuyên sâu & học thuật cao cấp' }
};

interface VocabQuizOption {
  text: string;
  isCorrect: boolean;
}

interface VocabQuizQuestion {
  item: VocabularyItem;
  options: VocabQuizOption[];
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

export const VocabPage: React.FC = () => {
  // Navigation State
  const [catalog, setCatalog] = useState<VocabularyCatalog>(VOCABULARY_CATALOG);
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>('N5');
  const [selectedBook, setSelectedBook] = useState<VocabularyBook | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<VocabularyUnit | null>(null);

  // Unit Vocabulary Data
  const [unitVocabList, setUnitVocabList] = useState<VocabularyItem[]>([]);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const currentUser = authService.getCurrentUser();
  const [completedUnits, setCompletedUnits] = useState<string[]>(() => {
    return currentUser?.id ? progressService.getCompletedVocabUnits(currentUser.id) : [];
  });

  // Study Mode State
  const [currentMode, setCurrentMode] = useState<StudyMode>('list');

  // Hướng lướt khi chuyển thẻ: 'next' (lướt sang trái) hoặc 'prev' (lướt sang phải)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // Thứ tự học: sắp xếp ngẫu nhiên hoặc theo thứ tự mặc định
  const [isShuffle, setIsShuffle] = useState(false);
  // Chế độ toàn màn hình cho thẻ học
  const [isFullscreen, setIsFullscreen] = useState(false);
  const studyContainerRef = useRef<HTMLDivElement>(null);

  // --- State Chế độ 1: Flashcard Lật 3D SRS ---
  const [flipActiveIndex, setFlipActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [flipStudyList, setFlipStudyList] = useState<VocabularyItem[]>([]);
  const [flipFinished, setFlipFinished] = useState(false);

  // --- Touch Gesture State cho lướt thẻ trên Mobile ---
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // --- State Chế độ 2: Luyện Ghi Nhớ (Trắc nghiệm 4 đáp án) ---
  const [quizQuestions, setQuizQuestions] = useState<VocabQuizQuestion[]>([]);
  const [quizActiveIndex, setQuizActiveIndex] = useState(0);
  const [quizSelectedOptionIndex, setQuizSelectedOptionIndex] = useState<number | null>(null);
  const [quizAnswerChecked, setQuizAnswerChecked] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [quizIsSkipped, setQuizIsSkipped] = useState(false);
  const [quizWrongQuestions, setQuizWrongQuestions] = useState<VocabQuizQuestion[]>([]);
  const [quizSkippedQuestions, setQuizSkippedQuestions] = useState<VocabQuizQuestion[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // --- State Chế độ 3: Gõ Ghi Nhớ (Nhập Hiragana) ---
  const [typingStudyList, setTypingStudyList] = useState<VocabularyItem[]>([]);
  const [typingActiveIndex, setTypingActiveIndex] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [typingAnswerChecked, setTypingAnswerChecked] = useState(false);
  const [typingIsCorrect, setTypingIsCorrect] = useState(false);
  const [typingIsSkipped, setTypingIsSkipped] = useState(false);
  const [typingWrongItems, setTypingWrongItems] = useState<VocabularyItem[]>([]);
  const [typingSkippedItems, setTypingSkippedItems] = useState<VocabularyItem[]>([]);
  const [typingCorrectCount, setTypingCorrectCount] = useState(0);
  const [typingFinished, setTypingFinished] = useState(false);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Tạo bộ câu hỏi trắc nghiệm 4 đáp án chọn nghĩa tiếng Việt
  const buildQuizQuestions = (items: VocabularyItem[]): VocabQuizQuestion[] => {
    return items.map(item => {
      const otherItems = items.filter(it => it.id !== item.id);
      const shuffledOthers = shuffleArray(otherItems);
      const maxDistractors = Math.min(3, shuffledOthers.length);
      const distractors = shuffledOthers.slice(0, maxDistractors);

      const options: VocabQuizOption[] = shuffleArray([
        { text: item.vietnameseMeaning, isCorrect: true },
        ...distractors.map(d => ({ text: d.vietnameseMeaning, isCorrect: false }))
      ]);

      return {
        item,
        options
      };
    });
  };

  // Phát âm tiếng Nhật với Web Speech API
  const speakJapanese = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech error:', err);
    }
  };

  // Tải catalog lúc mount
  useEffect(() => {
    kizunaService.getVocabularyCatalog().then(cat => {
      if (cat) setCatalog(cat);
    });
  }, []);

  // Tải từ vựng khi chọn Unit
  useEffect(() => {
    if (!selectedBook || !selectedUnit) {
      setUnitVocabList([]);
      return;
    }

    async function loadUnitWords() {
      setLoadingUnit(true);
      try {
        const words = await kizunaService.getVocabularyByUnit(selectedBook!.bookId, selectedUnit!.unitId);
        setUnitVocabList(words);
        
        const studyWords = isShuffle ? shuffleArray(words) : words;

        // Reset Dạng 1: Flashcard
        setFlipStudyList(studyWords);
        setFlipActiveIndex(0);
        setIsFlipped(false);
        setMasteredIds(new Set());
        setLearningIds(new Set());
        setFlipFinished(false);

        // Reset Dạng 2: Trắc nghiệm
        const questions = buildQuizQuestions(studyWords);
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

        // Reset Dạng 3: Gõ ghi nhớ
        setTypingStudyList(studyWords);
        setTypingActiveIndex(0);
        setTypingInput('');
        setTypingAnswerChecked(false);
        setTypingIsCorrect(false);
        setTypingIsSkipped(false);
        setTypingWrongItems([]);
        setTypingSkippedItems([]);
        setTypingCorrectCount(0);
        setTypingFinished(false);
      } catch (err) {
        console.error('Lỗi tải từ vựng:', err);
      } finally {
        setLoadingUnit(false);
      }
    }

    loadUnitWords();
  }, [selectedBook, selectedUnit]);

  // Điều hướng bộ sách & bài học
  const handleSelectLevel = (lvl: JlptLevelKey) => {
    setSelectedLevel(lvl);
    setSelectedBook(null);
    setSelectedUnit(null);
    setSearchTerm('');
    setCurrentMode('list');
  };

  const handleSelectBook = (book: VocabularyBook) => {
    setSelectedBook(book);
    setSelectedUnit(null);
    setSearchTerm('');
    setCurrentMode('list');
  };

  const handleSelectUnit = (unit: VocabularyUnit) => {
    setSelectedUnit(unit);
    setSearchTerm('');
    setCurrentMode('list');
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
    setSelectedUnit(null);
    setSearchTerm('');
    setCurrentMode('list');
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setSearchTerm('');
    setCurrentMode('list');
  };

  // --- LOGIC CHO DẠNG 1: FLASHCARD SRS & TOUCH SWIPE ---
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
      const finalMastered = mastered ? new Set(masteredIds).add(currentItem.id) : masteredIds;
      if (finalMastered.size === unitVocabList.length && currentUser?.id && selectedBook && selectedUnit) {
        progressService.saveVocabUnitProgress(currentUser.id, selectedBook.bookId, selectedUnit.unitId, unitVocabList.length);
        setCompletedUnits(prev => prev.includes(selectedUnit.unitId) ? prev : [...prev, selectedUnit.unitId]);
      }
    }
  };

  const restartAllFlip = () => {
    const list = isShuffle ? shuffleArray(unitVocabList) : unitVocabList;
    setFlipStudyList(list);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFlipFinished(false);
  };

  const restartUnlearnedFlip = () => {
    let unlearned = unitVocabList.filter(item => learningIds.has(item.id));
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

  // --- XỬ LÝ TOUCH SWIPE CHO ĐIỆN THOẠI TRÊN FLASHCARD ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setTouchStartTime(Date.now());
    setIsDragging(true);
    setDragX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null || !isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      const damp = Math.abs(diffX) > 130 ? 130 + (Math.abs(diffX) - 130) * 0.25 : Math.abs(diffX);
      setDragX(diffX < 0 ? -damp : damp);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const duration = Date.now() - touchStartTime;
    const distance = dragX;
    const absDistance = Math.abs(distance);

    setIsDragging(false);
    setDragX(0);
    setTouchStartX(null);
    setTouchStartY(null);

    if (absDistance < 14 && duration < 300) {
      handleFlipCard();
      return;
    }

    const isSwipe = absDistance > 55 || (absDistance > 30 && duration < 250);
    if (isSwipe) {
      if (distance > 0) {
        handleMarkFlipResult(true);
      } else {
        handleMarkFlipResult(false);
      }
    }
  };

  // --- LOGIC CHO DẠNG 2: BÀI TẬP TRẮC NGHIỆM LUYỆN GHI NHỚ ---
  const initQuizMode = () => {
    const list = isShuffle ? shuffleArray(unitVocabList) : unitVocabList;
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

  const currentQuizQuestion = quizQuestions[quizActiveIndex];

  const handleSelectQuizOption = (optionIndex: number) => {
    if (quizAnswerChecked || !currentQuizQuestion) return;

    setQuizSelectedOptionIndex(optionIndex);
    setQuizAnswerChecked(true);

    const selectedOption = currentQuizQuestion.options[optionIndex];
    const isCorrect = selectedOption.isCorrect;

    setQuizIsCorrect(isCorrect);
    setQuizIsSkipped(false);

    if (isCorrect) {
      setQuizCorrectCount(prev => prev + 1);
    } else {
      setQuizWrongQuestions(prev => [...prev, currentQuizQuestion]);
    }
  };

  const handleSkipQuizQuestion = () => {
    if (quizAnswerChecked || !currentQuizQuestion) return;

    setQuizIsSkipped(true);
    setQuizIsCorrect(false);
    setQuizAnswerChecked(true);
    setQuizSelectedOptionIndex(null);
    setQuizSkippedQuestions(prev => [...prev, currentQuizQuestion]);
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
      if (quizWrongQuestions.length === 0 && quizSkippedQuestions.length === 0 && currentUser?.id && selectedBook && selectedUnit) {
        progressService.saveVocabUnitProgress(currentUser.id, selectedBook.bookId, selectedUnit.unitId, unitVocabList.length);
        setCompletedUnits(prev => prev.includes(selectedUnit.unitId) ? prev : [...prev, selectedUnit.unitId]);
      }
    }
  };

  const restartAllQuiz = () => {
    initQuizMode();
  };

  const restartWrongOrSkippedQuiz = () => {
    const combinedMap = new Map<string, VocabQuizQuestion>();
    [...quizWrongQuestions, ...quizSkippedQuestions].forEach(q => combinedMap.set(q.item.id, q));
    let retryQuestions = Array.from(combinedMap.values());
    if (retryQuestions.length === 0) {
      restartAllQuiz();
      return;
    }
    if (isShuffle) {
      retryQuestions = shuffleArray(retryQuestions);
    }
    setQuizQuestions(retryQuestions);
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

  // --- LOGIC CHO DẠNG 3: GÕ GHI NHỚ (NHẬP HIRAGANA) ---
  const initTypingMode = () => {
    const list = isShuffle ? shuffleArray(unitVocabList) : unitVocabList;
    setTypingStudyList(list);
    setTypingActiveIndex(0);
    setTypingInput('');
    setTypingAnswerChecked(false);
    setTypingIsCorrect(false);
    setTypingIsSkipped(false);
    setTypingWrongItems([]);
    setTypingSkippedItems([]);
    setTypingCorrectCount(0);
    setTypingFinished(false);
  };

  const handleCheckTypingAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typingAnswerChecked || typingStudyList.length === 0) return;

    const currentItem = typingStudyList[typingActiveIndex];
    if (!currentItem) return;

    const cleanInput = typingInput.trim().toLowerCase();
    if (!cleanInput) return;

    const validReadings = [
      currentItem.reading.toLowerCase(),
      (currentItem.hiragana || '').toLowerCase(),
      currentItem.term.toLowerCase()
    ].filter(Boolean);

    const isCorrect = validReadings.includes(cleanInput);

    setTypingIsCorrect(isCorrect);
    setTypingIsSkipped(false);
    setTypingAnswerChecked(true);

    if (isCorrect) {
      setTypingCorrectCount(prev => prev + 1);
    } else {
      setTypingWrongItems(prev => [...prev, currentItem]);
    }
  };

  const handleSkipTypingCard = () => {
    if (typingAnswerChecked || typingStudyList.length === 0) return;
    const currentItem = typingStudyList[typingActiveIndex];
    if (!currentItem) return;

    setTypingIsSkipped(true);
    setTypingIsCorrect(false);
    setTypingAnswerChecked(true);
    setTypingSkippedItems(prev => [...prev, currentItem]);
  };

  const handleNextTypingQuestion = () => {
    setSlideDirection('next');
    if (typingActiveIndex + 1 < typingStudyList.length) {
      setTypingActiveIndex(typingActiveIndex + 1);
      setTypingInput('');
      setTypingAnswerChecked(false);
      setTypingIsCorrect(false);
      setTypingIsSkipped(false);
    } else {
      setTypingFinished(true);
      if (typingWrongItems.length === 0 && typingSkippedItems.length === 0 && currentUser?.id && selectedBook && selectedUnit) {
        progressService.saveVocabUnitProgress(currentUser.id, selectedBook.bookId, selectedUnit.unitId, unitVocabList.length);
        setCompletedUnits(prev => prev.includes(selectedUnit.unitId) ? prev : [...prev, selectedUnit.unitId]);
      }
    }
  };

  const restartAllTyping = () => {
    initTypingMode();
  };

  const restartWrongOrSkippedTyping = () => {
    const combinedMap = new Map<string, VocabularyItem>();
    [...typingWrongItems, ...typingSkippedItems].forEach(item => combinedMap.set(item.id, item));
    let retryList = Array.from(combinedMap.values());
    if (retryList.length === 0) {
      restartAllTyping();
      return;
    }
    if (isShuffle) {
      retryList = shuffleArray(retryList);
    }
    setTypingStudyList(retryList);
    setTypingActiveIndex(0);
    setTypingInput('');
    setTypingAnswerChecked(false);
    setTypingIsCorrect(false);
    setTypingIsSkipped(false);
    setTypingWrongItems([]);
    setTypingSkippedItems([]);
    setTypingCorrectCount(0);
    setTypingFinished(false);
  };

  // Chuyển đổi giữa ngẫu nhiên và theo thứ tự (hoặc ép chọn chế độ cụ thể)
  const handleSetShuffle = (targetShuffle?: boolean) => {
    const nextShuffle = targetShuffle !== undefined ? targetShuffle : !isShuffle;
    setIsShuffle(nextShuffle);

    if (currentMode === 'flip') {
      const nextList = nextShuffle ? shuffleArray(unitVocabList) : [...unitVocabList];
      setFlipStudyList(nextList);
      setFlipActiveIndex(0);
      setIsFlipped(false);
      setFlipFinished(false);
    } else if (currentMode === 'quiz') {
      const nextList = nextShuffle ? shuffleArray(unitVocabList) : [...unitVocabList];
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
    } else if (currentMode === 'typing') {
      const nextList = nextShuffle ? shuffleArray(unitVocabList) : [...unitVocabList];
      setTypingStudyList(nextList);
      setTypingActiveIndex(0);
      setTypingInput('');
      setTypingAnswerChecked(false);
      setTypingIsCorrect(false);
      setTypingIsSkipped(false);
      setTypingWrongItems([]);
      setTypingSkippedItems([]);
      setTypingCorrectCount(0);
      setTypingFinished(false);
    }
  };

  const handleToggleShuffle = () => handleSetShuffle();

  // Xáo trộn lại thẻ khi đang ở chế độ ngẫu nhiên
  const handleReshuffleCurrent = () => {
    if (currentMode === 'flip') {
      setFlipStudyList(shuffleArray(unitVocabList));
      setFlipActiveIndex(0);
      setIsFlipped(false);
      setFlipFinished(false);
    } else if (currentMode === 'quiz') {
      setQuizQuestions(buildQuizQuestions(shuffleArray(unitVocabList)));
      setQuizActiveIndex(0);
      setQuizSelectedOptionIndex(null);
      setQuizAnswerChecked(false);
      setQuizIsCorrect(false);
      setQuizIsSkipped(false);
      setQuizWrongQuestions([]);
      setQuizSkippedQuestions([]);
      setQuizCorrectCount(0);
      setQuizFinished(false);
    } else if (currentMode === 'typing') {
      setTypingStudyList(shuffleArray(unitVocabList));
      setTypingActiveIndex(0);
      setTypingInput('');
      setTypingAnswerChecked(false);
      setTypingIsCorrect(false);
      setTypingIsSkipped(false);
      setTypingWrongItems([]);
      setTypingSkippedItems([]);
      setTypingCorrectCount(0);
      setTypingFinished(false);
    }
  };

  const handlePrevCard = () => {
    if (flipActiveIndex > 0) {
      setSlideDirection('prev');
      setFlipActiveIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleNextCard = () => {
    if (flipActiveIndex + 1 < flipStudyList.length) {
      setSlideDirection('next');
      setFlipActiveIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  // Bật/tắt chế độ toàn màn hình
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = studyContainerRef.current || document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    }
  };

  // Đồng bộ trạng thái toàn màn hình khi người dùng bấm phím ESC trình duyệt
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Tự động chuyển câu hỏi tiếp theo sau 3 giây hiển thị kết quả đúng ở Trắc nghiệm & Gõ ghi nhớ
  useEffect(() => {
    if (currentMode === 'quiz') {
      if (!quizAnswerChecked || quizFinished || !quizIsCorrect) return;
      const timer = setTimeout(() => {
        handleNextQuizQuestion();
      }, 2800);
      return () => clearTimeout(timer);
    } else if (currentMode === 'typing') {
      if (!typingAnswerChecked || typingFinished || !typingIsCorrect) return;
      const timer = setTimeout(() => {
        handleNextTypingQuestion();
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [quizAnswerChecked, quizActiveIndex, quizFinished, quizIsCorrect, typingAnswerChecked, typingActiveIndex, typingFinished, typingIsCorrect, currentMode]);

  // Lắng nghe bàn phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if ((e.key === 'f' || e.key === 'F') && !isInput && currentMode === 'flip') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if ((e.key === 's' || e.key === 'S') && !isInput && currentMode === 'flip') {
        e.preventDefault();
        handleToggleShuffle();
        return;
      }

      if (currentMode === 'flip' && !flipFinished && flipStudyList.length > 0) {
        if (e.key === 'Tab') {
          e.preventDefault();
          handleMarkFlipResult(false);
          return;
        }

        if (isInput) return;

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
      } else if (currentMode === 'quiz' && !quizFinished) {
        if (e.key === 'Tab') {
          e.preventDefault();
          if (!quizAnswerChecked) {
            handleSkipQuizQuestion();
          } else {
            handleNextQuizQuestion();
          }
          return;
        }

        if (quizAnswerChecked && e.key === 'Enter') {
          e.preventDefault();
          handleNextQuizQuestion();
        }
      } else if (currentMode === 'typing' && !typingFinished) {
        if (e.key === 'Tab') {
          e.preventDefault();
          if (!typingAnswerChecked) {
            handleSkipTypingCard();
          } else {
            handleNextTypingQuestion();
          }
          return;
        }

        if (typingAnswerChecked && e.key === 'Enter') {
          e.preventDefault();
          handleNextTypingQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentMode, 
    isFlipped, 
    flipActiveIndex, 
    flipStudyList, 
    flipFinished, 
    quizAnswerChecked, 
    quizActiveIndex, 
    quizQuestions, 
    quizFinished,
    typingAnswerChecked,
    typingActiveIndex,
    typingStudyList,
    typingFinished,
    isFullscreen
  ]);

  // Lọc từ vựng
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return unitVocabList;
    const q = searchTerm.toLowerCase();
    return unitVocabList.filter(item =>
      item.term.toLowerCase().includes(q) ||
      item.reading.toLowerCase().includes(q) ||
      item.vietnameseMeaning.toLowerCase().includes(q) ||
      (item.sinoVietnamese && item.sinoVietnamese.toLowerCase().includes(q))
    );
  }, [unitVocabList, searchTerm]);

  const currentLevelBooks = catalog[selectedLevel] || [];

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

        @keyframes kanjiSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes autoCountdown3s {
          from { width: 100%; }
          to { width: 0%; }
        }

        /* Responsive Media Queries */
        @media (max-width: 768px) {
          .vocab-desktop-table {
            display: none !important;
          }
          .vocab-mobile-cards {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
          }
          .vocab-quiz-options-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 769px) {
          .vocab-desktop-table {
            display: block !important;
          }
          .vocab-mobile-cards {
            display: none !important;
          }
          .vocab-quiz-options-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
      
      {/* 1. HEADER MANG PHONG CÁCH NHẬT BẢN HIỆN ĐẠI (和の美学) ĐỒNG BỘ KANJI & NGỮ PHÁP */}
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
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#c53d32',
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 900,
                fontFamily: 'serif',
                lineHeight: 1,
                boxShadow: '0 3px 8px rgba(197, 61, 50, 0.25)'
              }}>
                絆
              </span>
              <h1 style={{ fontSize: 23, fontWeight: 900, color: '#1c2536', margin: 0, letterSpacing: '-0.3px' }}>
                単語帳 <span style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>· Từ Vựng Tiếng Nhật</span>
              </h1>
            </div>
            <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
              Giáo trình chuẩn ngữ cảnh: <strong>耳から覚える</strong> (Mimi Kara) & <strong>新完全マスター</strong> (Tango)
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

      {/* 2. CHỌN BỘ SÁCH CỦA CẤP ĐỘ HIỆN TẠI (Book Cover Wabi-sabi Style) */}
      {!selectedBook && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {currentLevelBooks.map(book => {
            const isTango = book.bookId.includes('tango');
            const spineColor = isTango ? '#2d6d4b' : '#c53d32';
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
                      background: isTango ? '#f1f8f3' : '#fdf2f0',
                      color: spineColor,
                      border: `1px solid ${isTango ? '#c6e2ce' : '#f3d5d2'}`
                    }}>
                      {isTango ? '『新完全マスター · 単語』' : '『耳から覚える』'}
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
                      <div style={{ fontSize: 11, color: '#a8a29e', fontWeight: 600 }}>語 (Từ vựng)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2d6d4b' }}>{book.totalWords.toLocaleString()} từ</div>
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
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#c53d32'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1c2536'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBook(book);
                  }}
                >
                  <span>開く (Mở sách)</span>
                  <ChevronRight size={16} />
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
                Tổng cộng {selectedBook.units.length} bài học · {selectedBook.totalWords.toLocaleString()} từ vựng
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
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ChevronLeft size={14} /> Chọn bộ sách khác
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14
          }}>
            {selectedBook.units.map(unit => {
              const isUnitDone = completedUnits.includes(unit.unitId);
              return (
                <div
                  key={unit.unitId}
                  onClick={() => handleSelectUnit(unit)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: isUnitDone ? '1px solid #c6e2ce' : '1px solid #ebe7df',
                    borderLeft: isUnitDone ? '4px solid #16a34a' : '1px solid #ebe7df',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#c53d32';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isUnitDone ? '#c6e2ce' : '#ebe7df';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2d6d4b' }}>
                      {unit.wordCount} 語
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isUnitDone && (
                        <span style={{
                          background: '#f0fdf4',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontSize: 10,
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2
                        }}>
                          <Check size={10} strokeWidth={3} /> Đã thuộc 100%
                        </span>
                      )}
                      {unit.chapterTitle && (
                        <span style={{ fontSize: 11, color: '#78716c', background: '#faf8f5', padding: '2px 8px', borderRadius: 4, border: '1px solid #f0ece3' }}>
                          {unit.chapterTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1c2536', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    {unit.unitTitle}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. KHÔNG GIAN HỌC UNIT (DANH SÁCH + 3 CHẾ ĐỘ BÀI TẬP) */}
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
                  {selectedBook.bookName} · {unitVocabList.length} từ vựng
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
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <ChevronLeft size={15} />
                <span>Danh sách bài</span>
              </button>
            </div>

            {/* Tabs chuyển chế độ: Danh sách + 3 dạng bài tập (1: Ôn tập, 2: Luyện ghi nhớ, 3: Gõ ghi nhớ) */}
            <div style={{
              display: 'flex',
              gap: 8,
              borderTop: '1px solid #f2eee8',
              paddingTop: 12,
              flexWrap: 'wrap'
            }}>
              {/* CHẾ ĐỘ 0: DANH SÁCH TỪ */}
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
                Danh sách từ vựng
              </button>

              {/* DẠNG 1: ÔN TẬP (Flashcard Lật 3D SRS) */}
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

              {/* DẠNG 2: LUYỆN GHI NHỚ (Trắc nghiệm 4 đáp án chọn nghĩa từ) */}
              <button
                onClick={() => {
                  setCurrentMode('quiz');
                  initQuizMode();
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

              {/* DẠNG 3: GÕ GHI NHỚ (Nhập Hiragana cách đọc từ vựng) */}
              <button
                onClick={() => {
                  setCurrentMode('typing');
                  initTypingMode();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'typing' ? '#2d6d4b' : '#faf8f5',
                  color: currentMode === 'typing' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'typing' ? '2px solid #2d6d4b' : '1px solid #e7e3da',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  background: currentMode === 'typing' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 900
                }}>3</span>
                <span>Gõ ghi nhớ</span>
              </button>
            </div>
          </div>

          {loadingUnit ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#78716c', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 28,
                height: 28,
                border: '3px solid #e7e5e4',
                borderTop: '3px solid #c53d32',
                borderRadius: '50%',
                animation: 'kanjiSpin 0.8s linear infinite'
              }} />
              <span>Đang nạp từ vựng...</span>
            </div>
          ) : (
            <>
              {/* CHẾ ĐỘ 0: DANH SÁCH BẢNG TỪ VỰNG (TỐI ƯU CẢ DESKTOP & MOBILE CARDS) */}
              {currentMode === 'list' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#57534e' }}>
                      {filteredList.length} từ vựng trong bài:
                    </div>
                    <div style={{ position: 'relative', minWidth: 240 }}>
                      <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Tìm từ trong bài..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 12px 7px 30px',
                          borderRadius: 8,
                          border: '1px solid #d6d3d1',
                          fontSize: 13,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  {/* BẢNG DESKTOP */}
                  <div className="vocab-desktop-table" style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #ebe7df',
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: '#faf8f5', borderBottom: '2px solid #e7e3da' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534e', width: '26%' }}>単語 · Từ vựng</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534e', width: '28%' }}>意味 · Nghĩa tiếng Việt</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534e', width: '46%' }}>例文 · Câu ví dụ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredList.map((item, idx) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f2eee8', background: idx % 2 === 0 ? '#ffffff' : '#fdfcfa' }}>
                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 18, fontWeight: 900, color: '#1c2536' }}>
                                    {item.term}
                                  </span>
                                  <button
                                    onClick={() => speakJapanese(item.term)}
                                    title="Phát âm từ"
                                    style={{
                                      background: '#faf8f5',
                                      border: '1px solid #e7e5e4',
                                      borderRadius: '50%',
                                      width: 26,
                                      height: 26,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      color: '#57534e',
                                      padding: 0
                                    }}
                                  >
                                    <Volume2 size={13} />
                                  </button>
                                </div>
                                <div style={{ fontSize: 13, color: '#2d6d4b', fontWeight: 600, marginTop: 2 }}>
                                  {item.reading}
                                </div>
                                {item.sinoVietnamese && (
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c', marginTop: 2 }}>
                                    〔 {item.sinoVietnamese} 〕
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 700, color: '#9c2a2a', fontSize: 14 }}>
                                  {item.vietnameseMeaning}
                                </div>
                              </td>

                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                {item.exampleSentenceJp ? (
                                  <div style={{
                                    background: '#faf8f5',
                                    padding: '8px 12px',
                                    borderRadius: 7,
                                    border: '1px solid #ebe7df',
                                    borderLeft: '3px solid #c53d32'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                      <div style={{ fontWeight: 600, color: '#1c2536', fontSize: 13, marginBottom: 2 }}>
                                        {item.exampleSentenceJp}
                                      </div>
                                      <button
                                        onClick={() => speakJapanese(item.exampleSentenceJp || '')}
                                        title="Phát âm câu"
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: 2,
                                          color: '#78716c',
                                          display: 'inline-flex',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <Volume2 size={13} />
                                      </button>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#57534e' }}>
                                      {item.exampleSentenceVi}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#a8a29e', fontSize: 12 }}>-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* THẺ MOBILE THÂN THIỆN MÀN HÌNH NHỎ (MOBILE CARDS) */}
                  <div className="vocab-mobile-cards">
                    {filteredList.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: '#ffffff',
                          borderRadius: 12,
                          border: '1px solid #ebe7df',
                          padding: '14px 16px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 20, fontWeight: 900, color: '#1c2536' }}>
                                {item.term}
                              </span>
                              <button
                                onClick={() => speakJapanese(item.term)}
                                style={{
                                  background: '#faf8f5',
                                  border: '1px solid #e7e5e4',
                                  borderRadius: '50%',
                                  width: 28,
                                  height: 28,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#57534e'
                                }}
                              >
                                <Volume2 size={14} />
                              </button>
                            </div>
                            <div style={{ fontSize: 13, color: '#2d6d4b', fontWeight: 700, marginTop: 1 }}>
                              {item.reading}
                            </div>
                            {item.sinoVietnamese && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>
                                〔 {item.sinoVietnamese} 〕
                              </div>
                            )}
                          </div>

                          <div style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: '#9c2a2a',
                            textAlign: 'right',
                            maxWidth: '48%'
                          }}>
                            {item.vietnameseMeaning}
                          </div>
                        </div>

                        {item.exampleSentenceJp && (
                          <div style={{
                            background: '#faf8f5',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #ebe7df',
                            borderLeft: '3px solid #c53d32',
                            marginTop: 10
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <div style={{ fontWeight: 600, color: '#1c2536', fontSize: 12 }}>
                                {item.exampleSentenceJp}
                              </div>
                              <button
                                onClick={() => speakJapanese(item.exampleSentenceJp || '')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  color: '#78716c',
                                  cursor: 'pointer'
                                }}
                              >
                                <Volume2 size={13} />
                              </button>
                            </div>
                            <div style={{ fontSize: 11, color: '#57534e', marginTop: 2 }}>
                              {item.exampleSentenceVi}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHẾ ĐỘ 1: DẠNG 1 - ÔN TẬP (Flashcard Lật 3D SRS & Vuốt Chạm Điện Thoại) */}
              {currentMode === 'flip' && (
                <div
                  ref={studyContainerRef}
                  style={isFullscreen ? {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    width: '100vw',
                    height: '100vh',
                    background: 'linear-gradient(180deg, #fcfbf9 0%, #f4efe6 100%)',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    boxSizing: 'border-box'
                  } : undefined}
                >
                  {/* Sakura background khi toàn màn hình */}
                  {isFullscreen && <SakuraFallingBackground />}

                  {!flipFinished ? (
                    <div style={{
                      width: '100%',
                      maxWidth: isFullscreen ? 720 : 640,
                      margin: '0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: isFullscreen ? 'space-between' : 'flex-start',
                      minHeight: isFullscreen ? '100%' : 'auto',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      {/* Thanh Header: Tiến trình & Chế độ sắp xếp */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13, color: '#78716c', flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {isFullscreen && (
                              <button
                                onClick={toggleFullscreen}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '5px 12px',
                                  borderRadius: 16,
                                  border: '1px solid #d6d3d1',
                                  background: '#ffffff',
                                  color: '#1c2536',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}
                                title="Thoát toàn màn hình (Phím F hoặc Esc)"
                              >
                                <Minimize2 size={13} />
                                <span>Thu nhỏ</span>
                                <span style={{ fontSize: 10, color: '#78716c', background: '#f3f4f6', padding: '1px 4px', borderRadius: 4 }}>Esc</span>
                              </button>
                            )}

                            <span style={{ fontWeight: 700, color: '#1c2536' }}>
                              Thẻ {flipActiveIndex + 1} / {flipStudyList.length}
                            </span>

                            {/* BỘ CHỌN SẮP XẾP THẺ: THỨ TỰ CÓ SẴN / NGẪU NHIÊN */}
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#f1ede6',
                              borderRadius: 16,
                              padding: '2px',
                              border: '1px solid #e2ddd5'
                            }}>
                              <button
                                onClick={() => handleSetShuffle(false)}
                                style={{
                                  padding: '3px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 14,
                                  border: 'none',
                                  background: !isShuffle ? '#ffffff' : 'transparent',
                                  color: !isShuffle ? '#1c2536' : '#78716c',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: !isShuffle ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                title="Sắp xếp thẻ theo thứ tự bài học có sẵn"
                              >
                                <ArrowUpDown size={11} />
                                <span>Thứ tự có sẵn</span>
                              </button>

                              <button
                                onClick={() => {
                                  if (isShuffle) {
                                    handleReshuffleCurrent();
                                  } else {
                                    handleSetShuffle(true);
                                  }
                                }}
                                style={{
                                  padding: '3px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 14,
                                  border: 'none',
                                  background: isShuffle ? '#c53d32' : 'transparent',
                                  color: isShuffle ? '#ffffff' : '#78716c',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: isShuffle ? '0 1px 2px rgba(197,61,50,0.25)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                                title={isShuffle ? "Nhấn để xáo trộn lại thẻ" : "Sắp xếp thẻ ngẫu nhiên"}
                              >
                                <Shuffle size={11} />
                                <span>Ngẫu nhiên</span>
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: 12 }}>
                              Đã thuộc: <strong style={{ color: '#2d6d4b' }}>{masteredIds.size}</strong> | Chưa thuộc: <strong style={{ color: '#c53d32' }}>{learningIds.size}</strong>
                            </div>

                            {!isFullscreen && (
                              <button
                                onClick={toggleFullscreen}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 16,
                                  border: '1px solid #d6d3d1',
                                  background: '#ffffff',
                                  color: '#1c2536',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  transition: 'all 0.15s ease'
                                }}
                                title="Bật chế độ học toàn màn hình (Phím F)"
                              >
                                <Maximize2 size={12} />
                                <span>Toàn màn hình</span>
                                <span style={{ fontSize: 10, color: '#78716c', background: '#f3f4f6', padding: '0 4px', borderRadius: 3 }}>F</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Thanh tiến trình */}
                        <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                          <div style={{
                            width: `${((flipActiveIndex + 1) / Math.max(1, flipStudyList.length)) * 100}%`,
                            height: '100%',
                            background: '#c53d32',
                            transition: 'width 0.2s ease'
                          }} />
                        </div>
                      </div>

                      {/* KHUNG THẺ VUỐT CHẠM CẢM ỨNG & LẬT 3D */}
                      {flipStudyList[flipActiveIndex] && (
                        <div
                          key={flipActiveIndex}
                          style={{
                            perspective: 1000,
                            width: '100%',
                            minHeight: isFullscreen ? 410 : 380,
                            position: 'relative',
                            animation: `${slideDirection === 'next' ? 'cardSlideInNext' : 'cardSlideInPrev'} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both`
                          }}
                        >
                          <div
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={() => {
                              if (Math.abs(dragX) < 8) {
                                handleFlipCard();
                              }
                            }}
                            style={{
                              position: 'relative',
                              width: '100%',
                              minHeight: isFullscreen ? 410 : 380,
                              cursor: 'pointer',
                              transformStyle: 'preserve-3d',
                              transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: `${isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'} translateX(${dragX}px) rotate(${dragX * 0.045}deg)`,
                              touchAction: 'pan-y',
                              userSelect: 'none'
                            }}
                          >
                            {/* Visual Feedback Badge khi vuốt sang phải: ĐÃ THUỘC */}
                            {dragX > 20 && (
                              <div style={{
                                position: 'absolute',
                                top: 24,
                                left: 24,
                                background: '#15803d',
                                color: '#ffffff',
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontWeight: 900,
                                fontSize: 13,
                                letterSpacing: '1px',
                                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.35)',
                                opacity: Math.min(1, (dragX - 20) / 45),
                                transform: 'rotate(-10deg)',
                                zIndex: 20,
                                pointerEvents: 'none'
                              }}>
                                ✓ ĐÃ THUỘC
                              </div>
                            )}

                            {/* Visual Feedback Badge khi vuốt sang trái: CHƯA THUỘC */}
                            {dragX < -20 && (
                              <div style={{
                                position: 'absolute',
                                top: 24,
                                right: 24,
                                background: '#c53d32',
                                color: '#ffffff',
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontWeight: 900,
                                fontSize: 13,
                                letterSpacing: '1px',
                                boxShadow: '0 4px 12px rgba(197, 61, 50, 0.35)',
                                opacity: Math.min(1, (-dragX - 20) / 45),
                                transform: 'rotate(10deg)',
                                zIndex: 20,
                                pointerEvents: 'none'
                              }}>
                                ✕ CHƯA THUỘC
                              </div>
                            )}

                            {/* MẶT TRƯỚC: 単語 (Chữ Hán & Hiragana) */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                                borderRadius: 20,
                                border: '1.5px solid #e7dfd5',
                                padding: '40px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                overflow: 'hidden'
                              }}
                            >
                              <SakuraFallingBackground />

                              {/* Hanko Seal Mặt trước */}
                              <span style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                fontSize: 11,
                                fontWeight: 900,
                                color: '#c53d32',
                                background: 'rgba(255, 252, 251, 0.85)',
                                border: '1px solid #c53d32',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontFamily: 'serif',
                                zIndex: 2
                              }}>
                                1 · 単語 (TỪ VỰNG)
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakJapanese(flipStudyList[flipActiveIndex].term);
                                }}
                                title="Phát âm từ"
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
                                  zIndex: 2,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5
                                }}
                              >
                                <Volume2 size={13} />
                                <span>Phát âm</span>
                              </button>

                              <div style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{ fontSize: isFullscreen ? 54 : 46, fontWeight: 900, color: '#1c2536', marginBottom: 8, letterSpacing: '1px', fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                  {flipStudyList[flipActiveIndex].term}
                                </div>
                                <div style={{ fontSize: isFullscreen ? 24 : 20, fontWeight: 700, color: '#2d6d4b', marginBottom: 6 }}>
                                  {flipStudyList[flipActiveIndex].reading}
                                </div>
                                {flipStudyList[flipActiveIndex].sinoVietnamese && (
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#78716c', letterSpacing: '1px' }}>
                                    〔 {flipStudyList[flipActiveIndex].sinoVietnamese} 〕
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* MẶT SAU: 意味 (Nghĩa tiếng Việt & Câu ví dụ) */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                                borderRadius: 20,
                                border: '1.5px solid #e7dfd5',
                                padding: '40px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                                transform: 'rotateY(180deg)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                overflow: 'hidden'
                              }}
                            >
                              <SakuraFallingBackground />

                              {/* Hanko Seal Mặt sau */}
                              <span style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                fontSize: 11,
                                fontWeight: 900,
                                color: '#2563eb',
                                background: 'rgba(248, 250, 255, 0.85)',
                                border: '1px solid #bfdbfe',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontFamily: 'serif',
                                zIndex: 2
                              }}>
                                1 · 意味 (Ý NGHĨA)
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakJapanese(flipStudyList[flipActiveIndex].term);
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
                                  zIndex: 2,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5
                                }}
                              >
                                <Volume2 size={13} />
                                <span>Phát âm</span>
                              </button>

                              <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                                <div style={{ fontSize: isFullscreen ? 28 : 25, fontWeight: 800, color: '#9c2a2a', marginBottom: 16 }}>
                                  {flipStudyList[flipActiveIndex].vietnameseMeaning}
                                </div>

                                {flipStudyList[flipActiveIndex].exampleSentenceJp && (
                                  <div style={{
                                    background: 'rgba(250, 248, 245, 0.9)',
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    border: '1px solid #ebe7df',
                                    borderLeft: '3px solid #c53d32',
                                    textAlign: 'left',
                                    maxWidth: 500,
                                    margin: '0 auto',
                                    width: '100%'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                                      <div style={{ fontWeight: 700, color: '#1c2536', fontSize: 13 }}>
                                        {flipStudyList[flipActiveIndex].exampleSentenceJp}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          speakJapanese(flipStudyList[flipActiveIndex].exampleSentenceJp || '');
                                        }}
                                        style={{ background: 'transparent', border: 'none', padding: 0, color: '#78716c', cursor: 'pointer' }}
                                      >
                                        <Volume2 size={13} />
                                      </button>
                                    </div>
                                    <div style={{ color: '#57534e', fontSize: 12 }}>
                                      {flipStudyList[flipActiveIndex].exampleSentenceVi}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Các nút điều hướng thẻ */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 10 }}>
                          <button
                            onClick={handlePrevCard}
                            disabled={flipActiveIndex === 0}
                            style={{
                              padding: '12px 14px',
                              background: '#ffffff',
                              color: flipActiveIndex === 0 ? '#d6d3d1' : '#57534e',
                              border: '1px solid #e7dfd5',
                              borderRadius: 10,
                              cursor: flipActiveIndex === 0 ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title="Thẻ trước (←)"
                          >
                            <ChevronLeft size={18} />
                          </button>

                          <button
                            onClick={() => handleMarkFlipResult(false)}
                            style={{
                              flex: 1,
                              padding: '12px 14px',
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
                              padding: '12px 22px',
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
                              padding: '12px 14px',
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

                          <button
                            onClick={handleNextCard}
                            disabled={flipActiveIndex >= flipStudyList.length - 1}
                            style={{
                              padding: '12px 14px',
                              background: '#ffffff',
                              color: flipActiveIndex >= flipStudyList.length - 1 ? '#d6d3d1' : '#57534e',
                              border: '1px solid #e7dfd5',
                              borderRadius: 10,
                              cursor: flipActiveIndex >= flipStudyList.length - 1 ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title="Thẻ tiếp theo (→)"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>

                        {/* Chỉ dẫn vuốt chạm & phím tắt */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          marginTop: 12,
                          fontSize: 12,
                          color: '#78716c',
                          background: '#faf8f5',
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: '1px solid #ebe7df',
                          maxWidth: 460,
                          margin: '12px auto 0 auto',
                          flexWrap: 'wrap'
                        }}>
                          <span>Space: Lật thẻ</span>
                          <span style={{ color: '#d6d3d1' }}>·</span>
                          <span>← / →: Trước / Sau</span>
                          <span style={{ color: '#d6d3d1' }}>·</span>
                          <span>S: Đổi thứ tự</span>
                          <span style={{ color: '#d6d3d1' }}>·</span>
                          <span>F: Toàn màn hình</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Tổng kết Dạng 1 */
                    <div style={{
                      maxWidth: 480,
                      width: '100%',
                      margin: 'auto',
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #ebe7df',
                      padding: 32,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      position: 'relative',
                      zIndex: 2
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
                        Hoàn thành bài học từ vựng
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
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8
                            }}
                          >
                            <RotateCcw size={16} /> Làm lại các thẻ chưa thuộc ({learningIds.size} từ)
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
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                          }}
                        >
                          <RotateCcw size={16} /> Làm lại tất cả ({unitVocabList.length} từ)
                        </button>

                        {isFullscreen && (
                          <button
                            onClick={toggleFullscreen}
                            style={{
                              padding: '10px 0',
                              background: '#ffffff',
                              color: '#44403c',
                              border: '1px solid #d6d3d1',
                              borderRadius: 8,
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                          >
                            <Minimize2 size={15} />
                            Thoát toàn màn hình (Esc)
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHẾ ĐỘ 2: DẠNG 2 - LUYỆN GHI NHỚ (Trắc nghiệm 4 đáp án chọn nghĩa từ) */}
              {currentMode === 'quiz' && (
                <div>
                  {!quizFinished && currentQuizQuestion ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình và chế độ sắp xếp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>Câu {quizActiveIndex + 1} / {quizQuestions.length}</span>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#f1ede6',
                            borderRadius: 16,
                            padding: '2px',
                            border: '1px solid #e2ddd5'
                          }}>
                            <button
                              onClick={() => handleSetShuffle(false)}
                              style={{
                                padding: '3px 9px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 14,
                                border: 'none',
                                background: !isShuffle ? '#ffffff' : 'transparent',
                                color: !isShuffle ? '#1c2536' : '#78716c',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: !isShuffle ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title="Câu hỏi theo thứ tự có sẵn"
                            >
                              <ArrowUpDown size={11} />
                              <span>Thứ tự có sẵn</span>
                            </button>
                            <button
                              onClick={() => {
                                if (isShuffle) {
                                  handleReshuffleCurrent();
                                } else {
                                  handleSetShuffle(true);
                                }
                              }}
                              style={{
                                padding: '3px 9px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 14,
                                border: 'none',
                                background: isShuffle ? '#c53d32' : 'transparent',
                                color: isShuffle ? '#ffffff' : '#78716c',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: isShuffle ? '0 1px 2px rgba(197,61,50,0.25)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title={isShuffle ? "Bấm để xáo trộn lại câu hỏi" : "Câu hỏi ngẫu nhiên"}
                            >
                              <Shuffle size={11} />
                              <span>Ngẫu nhiên</span>
                            </button>
                          </div>
                        </div>
                        <div>
                          Đúng: <strong style={{ color: '#2d6d4b' }}>{quizCorrectCount}</strong> | Sai & Bỏ qua: <strong style={{ color: '#c53d32' }}>{quizWrongQuestions.length + quizSkippedQuestions.length}</strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((quizActiveIndex + 1) / Math.max(1, quizQuestions.length)) * 100}%`,
                          height: '100%',
                          background: '#2563eb',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Khung thẻ câu hỏi trắc nghiệm */}
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

                        {/* Nút phát âm */}
                        <button
                          onClick={() => speakJapanese(currentQuizQuestion.item.term)}
                          title="Phát âm từ"
                          style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            background: '#faf8f5',
                            border: '1px solid #d6d3d1',
                            padding: '6px 12px',
                            borderRadius: 20,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#44403c',
                            zIndex: 2,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Volume2 size={14} />
                          <span>Nghe từ</span>
                        </button>

                        {/* Nội dung câu hỏi từ vựng */}
                        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 560 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#78716c', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                            単語 · TỪ VỰNG TIẾNG NHẬT
                          </div>

                          <div style={{
                            fontSize: 42,
                            fontWeight: 900,
                            color: '#1c2536',
                            lineHeight: 1.2,
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                            marginBottom: 4
                          }}>
                            {currentQuizQuestion.item.term}
                          </div>

                          <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#2d6d4b',
                            marginBottom: 6
                          }}>
                            {currentQuizQuestion.item.reading}
                          </div>

                          {currentQuizQuestion.item.sinoVietnamese && (
                            <div style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#78716c',
                              marginBottom: 16
                            }}>
                              〔 {currentQuizQuestion.item.sinoVietnamese} 〕
                            </div>
                          )}

                          <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#9c2a2a',
                            background: '#fef2f2',
                            padding: '4px 12px',
                            borderRadius: 16,
                            display: 'inline-block',
                            marginBottom: 18,
                            border: '1px solid #fee2e2'
                          }}>
                            Chọn nghĩa tiếng Việt chính xác:
                          </div>

                          {/* 4 Lựa chọn trắc nghiệm */}
                          <div className="vocab-quiz-options-grid" style={{
                            display: 'grid',
                            gap: 10,
                            width: '100%',
                            marginBottom: 16
                          }}>
                            {currentQuizQuestion.options.map((opt, optIdx) => {
                              const optionLetter = String.fromCharCode(65 + optIdx);
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
                                    boxShadow: isSelected && !quizAnswerChecked ? '0 0 0 2px #2563eb' : '0 1px 3px rgba(0,0,0,0.02)'
                                  }}
                                >
                                  <span style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: badgeBg,
                                    color: badgeColor,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    {optionLetter}
                                  </span>
                                  <span style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: optTextColor,
                                    flex: 1,
                                    lineHeight: 1.3
                                  }}>
                                    {opt.text}
                                  </span>
                                  {quizAnswerChecked && opt.isCorrect && (
                                    <Check size={16} color="#16a34a" strokeWidth={3} />
                                  )}
                                  {quizAnswerChecked && isSelected && !opt.isCorrect && (
                                    <X size={16} color="#dc2626" strokeWidth={3} />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Hành động khi làm bài */}
                          {!quizAnswerChecked ? (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={handleSkipQuizQuestion}
                                style={{
                                  padding: '8px 20px',
                                  background: '#faf8f5',
                                  color: '#78716c',
                                  border: '1px solid #d6d3d1',
                                  borderRadius: 8,
                                  fontWeight: 600,
                                  fontSize: 13,
                                  cursor: 'pointer'
                                }}
                              >
                                Bỏ qua câu này
                              </button>
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: quizIsCorrect ? '#f0fdf4' : quizIsSkipped ? '#fffbeb' : '#fef2f2',
                              border: `1px solid ${quizIsCorrect ? '#bbf7d0' : quizIsSkipped ? '#fef08a' : '#fecaca'}`,
                              borderRadius: 10,
                              padding: '10px 16px',
                              marginTop: 10,
                              flexWrap: 'wrap',
                              gap: 10
                            }}>
                              <div style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: quizIsCorrect ? '#15803d' : quizIsSkipped ? '#854d0e' : '#b91c1c'
                              }}>
                                {quizIsCorrect ? '✓ Chính xác!' : quizIsSkipped ? 'Đã bỏ qua câu này' : '✕ Chưa chính xác!'}
                              </div>

                              <button
                                type="button"
                                onClick={handleNextQuizQuestion}
                                style={{
                                  padding: '8px 18px',
                                  background: '#1c2536',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontWeight: 700,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <span>Tiếp theo</span>
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Màn hình Tổng kết Dạng 2 */
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
                        Hoàn thành bài luyện ghi nhớ
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                        <div style={{ background: '#f1f8f3', border: '1px solid #c6e2ce', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6d4b' }}>正解 · ĐÚNG</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#2d6d4b', marginTop: 4 }}>
                            {quizCorrectCount}
                          </div>
                        </div>

                        <div style={{ background: '#fdf2f0', border: '1px solid #f3d5d2', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#c53d32' }}>SAI & BỎ QUA</div>
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
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8
                            }}
                          >
                            <RotateCcw size={16} /> Làm lại các câu sai & bỏ qua ({quizWrongQuestions.length + quizSkippedQuestions.length} câu)
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
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                          }}
                        >
                          <RotateCcw size={16} /> Làm lại tất cả ({unitVocabList.length} câu)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHẾ ĐỘ 3: DẠNG 3 - GÕ GHI NHỚ (Nhìn chữ Hán/Từ vựng gõ cách đọc Hiragana) */}
              {currentMode === 'typing' && (
                <div>
                  {!typingFinished && typingStudyList[typingActiveIndex] ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình và chế độ sắp xếp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>Thẻ {typingActiveIndex + 1} / {typingStudyList.length}</span>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#f1ede6',
                            borderRadius: 16,
                            padding: '2px',
                            border: '1px solid #e2ddd5'
                          }}>
                            <button
                              onClick={() => handleSetShuffle(false)}
                              style={{
                                padding: '3px 9px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 14,
                                border: 'none',
                                background: !isShuffle ? '#ffffff' : 'transparent',
                                color: !isShuffle ? '#1c2536' : '#78716c',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: !isShuffle ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title="Thẻ theo thứ tự có sẵn"
                            >
                              <ArrowUpDown size={11} />
                              <span>Thứ tự có sẵn</span>
                            </button>
                            <button
                              onClick={() => {
                                if (isShuffle) {
                                  handleReshuffleCurrent();
                                } else {
                                  handleSetShuffle(true);
                                }
                              }}
                              style={{
                                padding: '3px 9px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 14,
                                border: 'none',
                                background: isShuffle ? '#c53d32' : 'transparent',
                                color: isShuffle ? '#ffffff' : '#78716c',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: isShuffle ? '0 1px 2px rgba(197,61,50,0.25)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title={isShuffle ? "Bấm để xáo trộn lại thẻ" : "Thẻ ngẫu nhiên"}
                            >
                              <Shuffle size={11} />
                              <span>Ngẫu nhiên</span>
                            </button>
                          </div>
                        </div>
                        <div>
                          Đúng: <strong style={{ color: '#2d6d4b' }}>{typingCorrectCount}</strong> | Sai & Bỏ qua: <strong style={{ color: '#c53d32' }}>{typingWrongItems.length + typingSkippedItems.length}</strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((typingActiveIndex + 1) / Math.max(1, typingStudyList.length)) * 100}%`,
                          height: '100%',
                          background: '#2d6d4b',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Khung thẻ câu hỏi gõ Hiragana */}
                      <div
                        key={typingActiveIndex}
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
                          color: '#2d6d4b',
                          background: 'rgba(241, 248, 243, 0.9)',
                          border: '1px solid #c6e2ce',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontFamily: 'serif',
                          zIndex: 2
                        }}>
                          3 · 仮名 (GÕ GHI NHỚ)
                        </span>

                        {/* Nút phát âm khi đã kiểm tra hoặc khi làm */}
                        <button
                          onClick={() => speakJapanese(typingStudyList[typingActiveIndex].term)}
                          title="Phát âm từ"
                          style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            background: '#faf8f5',
                            border: '1px solid #d6d3d1',
                            padding: '6px 12px',
                            borderRadius: 20,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#44403c',
                            zIndex: 2,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Volume2 size={14} />
                          <span>Nghe từ</span>
                        </button>

                        {/* Từ vựng câu hỏi */}
                        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 500 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#78716c', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                            単語 · TỪ VỰNG TIẾNG NHẬT
                          </div>

                          <div style={{
                            fontSize: 44,
                            fontWeight: 900,
                            color: '#1c2536',
                            lineHeight: 1.2,
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                            marginBottom: 6
                          }}>
                            {typingStudyList[typingActiveIndex].term}
                          </div>

                          {typingStudyList[typingActiveIndex].sinoVietnamese && (
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#78716c', marginBottom: 8 }}>
                              〔 {typingStudyList[typingActiveIndex].sinoVietnamese} 〕
                            </div>
                          )}

                          <div style={{ fontSize: 15, fontWeight: 700, color: '#9c2a2a', marginBottom: 20 }}>
                            {typingStudyList[typingActiveIndex].vietnameseMeaning}
                          </div>

                          {/* Khi CHƯA kiểm tra: Form nhập Hiragana */}
                          {!typingAnswerChecked ? (
                            <form onSubmit={handleCheckTypingAnswer} style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
                              <div style={{ marginBottom: 14 }}>
                                <input
                                  key={typingActiveIndex}
                                  type="text"
                                  autoFocus
                                  placeholder="Nhập Hiragana cách đọc..."
                                  value={typingInput}
                                  onChange={e => setTypingInput(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: 17,
                                    fontWeight: 700,
                                    borderRadius: 10,
                                    border: '2px solid #d6d3d1',
                                    outline: 'none',
                                    textAlign: 'center',
                                    background: '#faf8f5',
                                    color: '#1c2536',
                                    transition: 'border 0.2s ease'
                                  }}
                                  onFocus={e => e.target.style.borderColor = '#2d6d4b'}
                                  onBlur={e => e.target.style.borderColor = '#d6d3d1'}
                                />
                              </div>

                              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={handleSkipTypingCard}
                                  style={{
                                    padding: '9px 20px',
                                    background: '#faf8f5',
                                    color: '#78716c',
                                    border: '1px solid #d6d3d1',
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Bỏ qua (Tab)
                                </button>

                                <button
                                  type="submit"
                                  disabled={!typingInput.trim()}
                                  style={{
                                    padding: '9px 26px',
                                    background: '#2d6d4b',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: typingInput.trim() ? 'pointer' : 'not-allowed',
                                    opacity: typingInput.trim() ? 1 : 0.6
                                  }}
                                >
                                  Kiểm tra (Enter)
                                </button>
                              </div>
                            </form>
                          ) : (
                            /* Khi ĐÃ kiểm tra: Hiển thị kết quả chi tiết */
                            <div style={{
                              width: '100%',
                              padding: '16px 20px',
                              borderRadius: 12,
                              background: typingIsCorrect ? '#f1f8f3' : typingIsSkipped ? '#fffbeb' : '#fdf2f0',
                              border: `1.5px solid ${typingIsCorrect ? '#c6e2ce' : typingIsSkipped ? '#fde68a' : '#f3d5d2'}`,
                              textAlign: 'center',
                              position: 'relative',
                              zIndex: 2,
                              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                              animation: 'resultSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both'
                            }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '3px 12px',
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: 12,
                                background: typingIsCorrect ? 'rgba(45, 109, 75, 0.12)' : typingIsSkipped ? 'rgba(217, 119, 6, 0.12)' : 'rgba(197, 61, 50, 0.12)',
                                color: typingIsCorrect ? '#2d6d4b' : typingIsSkipped ? '#b45309' : '#c53d32',
                                marginBottom: 8
                              }}>
                                {typingIsCorrect ? '✓ Chính xác!' : typingIsSkipped ? 'Đã bỏ qua' : '✕ Chưa chính xác!'}
                              </div>

                              {!typingIsCorrect && !typingIsSkipped && typingInput.trim() && (
                                <div style={{ fontSize: 13, color: '#78716c', marginBottom: 6 }}>
                                  Bạn đã nhập: <span style={{ textDecoration: 'line-through', color: '#c53d32', fontWeight: 600 }}>{typingInput}</span>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                <span style={{ fontSize: 24, fontWeight: 900, color: '#1c2536' }}>
                                  {typingStudyList[typingActiveIndex].term}
                                </span>
                                <span style={{ fontSize: 20, color: '#2d6d4b', fontWeight: 800 }}>
                                  = {typingStudyList[typingActiveIndex].reading}
                                </span>
                              </div>

                              {typingStudyList[typingActiveIndex].exampleSentenceJp && (
                                <div style={{
                                  marginTop: 10,
                                  paddingTop: 10,
                                  borderTop: '1px dashed #d6d3d1',
                                  fontSize: 13,
                                  textAlign: 'left'
                                }}>
                                  <div style={{ fontWeight: 600, color: '#1c2536', marginBottom: 2 }}>
                                    {typingStudyList[typingActiveIndex].exampleSentenceJp}
                                  </div>
                                  <div style={{ color: '#78716c', fontSize: 12 }}>
                                    {typingStudyList[typingActiveIndex].exampleSentenceVi}
                                  </div>
                                </div>
                              )}

                              <div style={{ marginTop: 14 }}>
                                <button
                                  type="button"
                                  onClick={handleNextTypingQuestion}
                                  style={{
                                    padding: '9px 28px',
                                    background: '#1c2536',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                >
                                  <span>Tiếp theo</span>
                                  <ArrowRight size={14} />
                                </button>

                                <div style={{
                                  width: 140,
                                  height: 3,
                                  background: 'rgba(0,0,0,0.08)',
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  margin: '8px auto 0 auto'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    background: typingIsCorrect ? '#2d6d4b' : typingIsSkipped ? '#d97706' : '#c53d32',
                                    animation: 'autoCountdown3s 3.2s linear forwards'
                                  }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Màn hình Tổng kết Dạng 3 */
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
                        Hoàn thành bài gõ ghi nhớ Hiragana
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                        <div style={{ background: '#f1f8f3', border: '1px solid #c6e2ce', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6d4b' }}>正解 · ĐÚNG</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#2d6d4b', marginTop: 4 }}>
                            {typingCorrectCount}
                          </div>
                        </div>

                        <div style={{ background: '#fdf2f0', border: '1px solid #f3d5d2', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#c53d32' }}>SAI & BỎ QUA</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#c53d32', marginTop: 4 }}>
                            {typingWrongItems.length + typingSkippedItems.length}
                          </div>
                          {(typingWrongItems.length > 0 || typingSkippedItems.length > 0) && (
                            <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                              Sai: {typingWrongItems.length} · Bỏ qua: {typingSkippedItems.length}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(typingWrongItems.length > 0 || typingSkippedItems.length > 0) && (
                          <button
                            onClick={restartWrongOrSkippedTyping}
                            style={{
                              padding: '11px 0',
                              background: '#c53d32',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8
                            }}
                          >
                            <RotateCcw size={16} /> Làm lại các thẻ sai & bỏ qua ({typingWrongItems.length + typingSkippedItems.length} câu)
                          </button>
                        )}

                        <button
                          onClick={restartAllTyping}
                          style={{
                            padding: '11px 0',
                            background: '#1c2536',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                          }}
                        >
                          <RotateCcw size={16} /> Làm lại tất cả ({unitVocabList.length} câu)
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
