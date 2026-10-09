import React, { useEffect, useState, useMemo } from 'react';
import { kizunaService } from '../services/kizunaService';
import { VocabularyItem, VocabularyBook, VocabularyUnit, VocabularyCatalog } from '../types/kizuna';
import { VOCABULARY_CATALOG } from '../data/vocabularyCatalog';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type StudyMode = 'list' | 'flip' | 'vi_to_ja' | 'ja_to_hira';

// Phân cấp danh xưng tiếng Nhật truyền thống cho từng bậc N
const LEVEL_LABELS: Record<JlptLevelKey, { kanji: string; vi: string; desc: string }> = {
  N5: { kanji: '入門', vi: 'Nhập môn', desc: 'Nền tảng giao tiếp & đời sống cơ bản' },
  N4: { kanji: '初級', vi: 'Sơ cấp', desc: 'Phản xạ tình huống thực tế thường nhật' },
  N3: { kanji: '中級', vi: 'Trung cấp', desc: 'Giao tiếp công sở & xã hội tự nhiên' },
  N2: { kanji: '中上級', vi: 'Trung thượng cấp', desc: 'Thương mại & đàm phán doanh nghiệp' },
  N1: { kanji: '上級', vi: 'Thượng cấp', desc: 'Văn kiện chuyên sâu & học thuật cao cấp' }
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

  // Study Mode State
  const [currentMode, setCurrentMode] = useState<StudyMode>('list');

  // --- State Dạng 1: Flashcard Lật 3D SRS ---
  const [flipActiveIndex, setFlipActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [flipStudyList, setFlipStudyList] = useState<VocabularyItem[]>([]);
  const [flipFinished, setFlipFinished] = useState(false);

  // --- State Dạng 2 & Dạng 3: Thẻ Ôn tập Nhập liệu & Bỏ qua ---
  const [quizActiveIndex, setQuizActiveIndex] = useState(0);
  const [quizInput, setQuizInput] = useState('');
  const [quizAnswerChecked, setQuizAnswerChecked] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [quizIsSkipped, setQuizIsSkipped] = useState(false);
  const [quizWrongItems, setQuizWrongItems] = useState<VocabularyItem[]>([]);
  const [quizSkippedItems, setQuizSkippedItems] = useState<VocabularyItem[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizStudyList, setQuizStudyList] = useState<VocabularyItem[]>([]);

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
        
        // Reset Dạng 1
        setFlipStudyList(words);
        setFlipActiveIndex(0);
        setIsFlipped(false);
        setMasteredIds(new Set());
        setLearningIds(new Set());
        setFlipFinished(false);

        // Reset Dạng 2 & 3
        setQuizStudyList(words);
        setQuizActiveIndex(0);
        setQuizInput('');
        setQuizAnswerChecked(false);
        setQuizIsCorrect(false);
        setQuizIsSkipped(false);
        setQuizWrongItems([]);
        setQuizSkippedItems([]);
        setQuizCorrectCount(0);
        setQuizFinished(false);
      } finally {
        setLoadingUnit(false);
      }
    }

    loadUnitWords();
  }, [selectedBook, selectedUnit]);

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

  const handleSelectBook = (book: VocabularyBook) => {
    setSelectedBook(book);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleSelectUnit = (unit: VocabularyUnit) => {
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

    if (flipActiveIndex + 1 < flipStudyList.length) {
      setFlipActiveIndex(flipActiveIndex + 1);
      setIsFlipped(false);
    } else {
      setFlipFinished(true);
    }
  };

  const restartAllFlip = () => {
    setFlipStudyList(unitVocabList);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFlipFinished(false);
  };

  const restartUnlearnedFlip = () => {
    const unlearned = unitVocabList.filter(item => learningIds.has(item.id));
    if (unlearned.length === 0) {
      restartAllFlip();
      return;
    }
    setFlipStudyList(unlearned);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setFlipFinished(false);
  };

  // --- LOGIC CHO DẠNG 2 & 3: ÔN TẬP & BỎ QUA ---
  const handleCheckQuizAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quizAnswerChecked || quizStudyList.length === 0) return;

    const currentItem = quizStudyList[quizActiveIndex];
    if (!currentItem) return;

    const cleanInput = quizInput.trim().toLowerCase();
    if (!cleanInput) return;

    let isCorrect = false;

    if (currentMode === 'vi_to_ja') {
      const validAnswers = [
        currentItem.term.toLowerCase(),
        currentItem.reading.toLowerCase(),
        (currentItem.hiragana || '').toLowerCase(),
        (currentItem.kanji || '').toLowerCase()
      ].filter(Boolean);
      isCorrect = validAnswers.includes(cleanInput);
    } else {
      const validReadings = [
        currentItem.reading.toLowerCase(),
        (currentItem.hiragana || '').toLowerCase()
      ].filter(Boolean);
      isCorrect = validReadings.includes(cleanInput);
    }

    setQuizIsCorrect(isCorrect);
    setQuizIsSkipped(false);
    setQuizAnswerChecked(true);

    if (isCorrect) {
      setQuizCorrectCount(prev => prev + 1);
    } else {
      setQuizWrongItems(prev => [...prev, currentItem]);
    }
  };

  const handleSkipQuizCard = () => {
    if (quizAnswerChecked || quizStudyList.length === 0) return;
    const currentItem = quizStudyList[quizActiveIndex];
    if (!currentItem) return;

    setQuizIsSkipped(true);
    setQuizIsCorrect(false);
    setQuizAnswerChecked(true);
    setQuizSkippedItems(prev => [...prev, currentItem]);
  };

  const handleNextQuizQuestion = () => {
    if (quizActiveIndex + 1 < quizStudyList.length) {
      setQuizActiveIndex(quizActiveIndex + 1);
      setQuizInput('');
      setQuizAnswerChecked(false);
      setQuizIsCorrect(false);
      setQuizIsSkipped(false);
    } else {
      setQuizFinished(true);
    }
  };

  const restartAllQuiz = () => {
    setQuizStudyList(unitVocabList);
    setQuizActiveIndex(0);
    setQuizInput('');
    setQuizAnswerChecked(false);
    setQuizIsCorrect(false);
    setQuizIsSkipped(false);
    setQuizWrongItems([]);
    setQuizSkippedItems([]);
    setQuizCorrectCount(0);
    setQuizFinished(false);
  };

  const restartWrongOrSkippedQuiz = () => {
    const combinedMap = new Map<string, VocabularyItem>();
    [...quizWrongItems, ...quizSkippedItems].forEach(item => combinedMap.set(item.id, item));
    const retryList = Array.from(combinedMap.values());
    if (retryList.length === 0) {
      restartAllQuiz();
      return;
    }
    setQuizStudyList(retryList);
    setQuizActiveIndex(0);
    setQuizInput('');
    setQuizAnswerChecked(false);
    setQuizIsCorrect(false);
    setQuizIsSkipped(false);
    setQuizWrongItems([]);
    setQuizSkippedItems([]);
    setQuizCorrectCount(0);
    setQuizFinished(false);
  };

  // Filter từ vựng
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
                単語帳 <span style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>· Từ Vựng Tiếng Nhật</span>
              </h1>
            </div>
            <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
              Giáo trình chuẩn ngữ cảnh: <strong>耳から覚える</strong> (Mimi Kara) & <strong>新完全単語</strong> (Tango)
            </p>
          </div>

          {/* Thanh chuyển cấp độ N phong cách Thẻ thẻ bài Nhật Bản (札 - Fuda) */}
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

      {/* 2. CHỌN 1 TRONG 2 BỘ SÁCH CỦA CẤP ĐỘ HIỆN TẠI (Book Cover Wabi-sabi Style) */}
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
                      {isTango ? '『新完全 · 単語』' : '『耳から覚える』'}
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
                cursor: 'pointer'
              }}
            >
              ⬅️ Chọn bộ sách khác
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                    transition: 'all 0.15s ease'
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2d6d4b' }}>
                      {unit.wordCount} 語
                    </span>
                    {unit.chapterTitle && (
                      <span style={{ fontSize: 11, color: '#78716c', background: '#faf8f5', padding: '2px 8px', borderRadius: 4, border: '1px solid #f0ece3' }}>
                        {unit.chapterTitle}
                      </span>
                    )}
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

      {/* 4. KHÔNG GIAN HỌC UNIT (DANH SÁCH + 3 CHẾ ĐỘ THẺ) */}
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
                  cursor: 'pointer'
                }}
              >
                ⬅️ Danh sách bài
              </button>
            </div>

            {/* Tabs chuyển chế độ phong cách thẻ học Nhật Bản */}
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
                  borderBottom: currentMode === 'list' ? '2px solid #1c2536' : '1px solid #e7e3da'
                }}
              >
                一覧 · Danh sách từ
              </button>

              <button
                onClick={() => {
                  setCurrentMode('flip');
                  restartAllFlip();
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'flip' ? '#c53d32' : '#faf8f5',
                  color: currentMode === 'flip' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'flip' ? '2px solid #c53d32' : '1px solid #e7e3da'
                }}
              >
                暗記 · Lật thẻ 3D
              </button>

              <button
                onClick={() => {
                  setCurrentMode('vi_to_ja');
                  restartAllQuiz();
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'vi_to_ja' ? '#2563eb' : '#faf8f5',
                  color: currentMode === 'vi_to_ja' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'vi_to_ja' ? '2px solid #2563eb' : '1px solid #e7e3da'
                }}
              >
                和訳 · Dịch sang tiếng Nhật
              </button>

              <button
                onClick={() => {
                  setCurrentMode('ja_to_hira');
                  restartAllQuiz();
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'ja_to_hira' ? '#2d6d4b' : '#faf8f5',
                  color: currentMode === 'ja_to_hira' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'ja_to_hira' ? '2px solid #2d6d4b' : '1px solid #e7e3da'
                }}
              >
                仮名 · Gõ Hiragana
              </button>
            </div>
          </div>

          {loadingUnit ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#78716c', fontSize: 14 }}>
              ⏳ Đang nạp từ vựng...
            </div>
          ) : (
            <>
              {/* CHẾ ĐỘ 0: DANH SÁCH BẢNG TỪ VỰNG */}
              {currentMode === 'list' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#57534e' }}>
                      {filteredList.length} từ vựng trong bài:
                    </div>
                    <div style={{ minWidth: 220 }}>
                      <input
                        type="text"
                        placeholder="🔍 Tìm từ trong bài..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          borderRadius: 7,
                          border: '1px solid #d6d3d1',
                          fontSize: 13,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
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
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534e', width: '24%' }}>単語 · Từ vựng</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534e', width: '28%' }}>意味 · Nghĩa tiếng Việt</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#57534e', width: '48%' }}>例文 · Câu ví dụ</th>
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
                                    title="Phát âm"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: 14,
                                      padding: 0,
                                      opacity: 0.8
                                    }}
                                  >
                                    🔊
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
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.8 }}
                                      >
                                        🔊
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
                </div>
              )}

              {/* CHẾ ĐỘ 1: DẠNG 1 - LẬT THẺ 3D GHI NHỚ (Washi Flashcard Style) */}
              {currentMode === 'flip' && (
                <div>
                  {!flipFinished ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c' }}>
                        <span>Thẻ {flipActiveIndex + 1} / {flipStudyList.length}</span>
                        <span>Đã thuộc: <strong style={{ color: '#2d6d4b' }}>{masteredIds.size}</strong> | Chưa thuộc: <strong style={{ color: '#c53d32' }}>{learningIds.size}</strong></span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((flipActiveIndex + 1) / flipStudyList.length) * 100}%`,
                          height: '100%',
                          background: '#c53d32',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Hiệu ứng lật thẻ 3D mượt mà */}
                      {flipStudyList[flipActiveIndex] && (
                        <div style={{ perspective: 1000, width: '100%', minHeight: 340 }}>
                          <div
                            onClick={handleFlipCard}
                            style={{
                              position: 'relative',
                              width: '100%',
                              minHeight: 340,
                              cursor: 'pointer',
                              transformStyle: 'preserve-3d',
                              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                            }}
                          >
                            {/* MẶT TRƯỚC: 単語 (Chữ Hán & Hiragana) */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: '#ffffff',
                                borderRadius: 16,
                                border: '2px solid #e5e0d8',
                                padding: '36px 30px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden'
                              }}
                            >
                              {/* Hanko Seal Mặt trước */}
                              <span style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                fontSize: 11,
                                fontWeight: 900,
                                color: '#c53d32',
                                background: '#fffcfb',
                                border: '1px solid #c53d32',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontFamily: 'serif'
                              }}>
                                単語
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
                                  padding: '5px 11px',
                                  borderRadius: 20,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#44403c'
                                }}
                              >
                                🔊 音声
                              </button>

                              <div style={{ fontSize: 46, fontWeight: 900, color: '#1c2536', marginBottom: 8, letterSpacing: '1px' }}>
                                {flipStudyList[flipActiveIndex].term}
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: '#2d6d4b', marginBottom: 6 }}>
                                {flipStudyList[flipActiveIndex].reading}
                              </div>
                              {flipStudyList[flipActiveIndex].sinoVietnamese && (
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#78716c', letterSpacing: '1px' }}>
                                  〔 {flipStudyList[flipActiveIndex].sinoVietnamese} 〕
                                </div>
                              )}
                            </div>

                            {/* MẶT SAU: 意味 (Nghĩa tiếng Việt & Ví dụ) */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: '#ffffff',
                                borderRadius: 16,
                                border: '2px solid #e5e0d8',
                                padding: '36px 30px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
                                transform: 'rotateY(180deg)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden'
                              }}
                            >
                              {/* Hanko Seal Mặt sau */}
                              <span style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                fontSize: 11,
                                fontWeight: 900,
                                color: '#2563eb',
                                background: '#f8faff',
                                border: '1px solid #bfdbfe',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontFamily: 'serif'
                              }}>
                                意味
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
                                  padding: '5px 11px',
                                  borderRadius: 20,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#44403c'
                                }}
                              >
                                🔊 音声
                              </button>

                              <div style={{ fontSize: 25, fontWeight: 800, color: '#9c2a2a', marginBottom: 16 }}>
                                {flipStudyList[flipActiveIndex].vietnameseMeaning}
                              </div>

                              {flipStudyList[flipActiveIndex].exampleSentenceJp && (
                                <div style={{
                                  background: '#faf8f5',
                                  padding: '12px 16px',
                                  borderRadius: 8,
                                  border: '1px solid #ebe7df',
                                  borderLeft: '3px solid #c53d32',
                                  textAlign: 'left',
                                  maxWidth: 500,
                                  width: '100%'
                                }}>
                                  <div style={{ fontWeight: 700, color: '#1c2536', fontSize: 14, marginBottom: 3 }}>
                                    {flipStudyList[flipActiveIndex].exampleSentenceJp}
                                  </div>
                                  <div style={{ color: '#57534e', fontSize: 13 }}>
                                    {flipStudyList[flipActiveIndex].exampleSentenceVi}
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
                            padding: '11px 16px',
                            background: '#fdf2f0',
                            color: '#c53d32',
                            border: '1px solid #f3d5d2',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          まだ · Chưa thuộc
                        </button>

                        <button
                          onClick={handleFlipCard}
                          style={{
                            padding: '11px 20px',
                            background: '#ffffff',
                            color: '#44403c',
                            border: '1px solid #d6d3d1',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          🔄 反転 (Lật thẻ)
                        </button>

                        <button
                          onClick={() => handleMarkFlipResult(true)}
                          style={{
                            flex: 1,
                            padding: '11px 16px',
                            background: '#f1f8f3',
                            color: '#2d6d4b',
                            border: '1px solid #c6e2ce',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          覚えた · Đã thuộc
                        </button>
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
                        Hoàn thành bài học
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
                            🔄 Làm lại các thẻ chưa thuộc ({learningIds.size} từ)
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
                          🔁 Làm lại tất cả ({unitVocabList.length} từ)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHẾ ĐỘ 2 & 3: BỐ CỤC THẺ GIỐNG DẠNG 1 + CÓ NÚT BỎ QUA */}
              {(currentMode === 'vi_to_ja' || currentMode === 'ja_to_hira') && (
                <div>
                  {!quizFinished ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c' }}>
                        <span>Thẻ {quizActiveIndex + 1} / {quizStudyList.length}</span>
                        <span>Đúng: <strong style={{ color: '#2d6d4b' }}>{quizCorrectCount}</strong> | Sai & Bỏ qua: <strong style={{ color: '#c53d32' }}>{quizWrongItems.length + quizSkippedItems.length}</strong></span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((quizActiveIndex + 1) / quizStudyList.length) * 100}%`,
                          height: '100%',
                          background: currentMode === 'vi_to_ja' ? '#2563eb' : '#2d6d4b',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Khung thẻ câu hỏi có kích thước và vẻ ngoài đồng nhất với Dạng 1 */}
                      {quizStudyList[quizActiveIndex] && (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: 16,
                          border: '2px solid #e5e0d8',
                          minHeight: 340,
                          padding: '36px 30px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)'
                        }}>
                          {/* Hanko Seal chế độ */}
                          <span style={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            fontSize: 11,
                            fontWeight: 900,
                            color: currentMode === 'vi_to_ja' ? '#2563eb' : '#2d6d4b',
                            background: currentMode === 'vi_to_ja' ? '#f8faff' : '#f1f8f3',
                            border: `1px solid ${currentMode === 'vi_to_ja' ? '#bfdbfe' : '#c6e2ce'}`,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: 'serif'
                          }}>
                            {currentMode === 'vi_to_ja' ? '和訳' : '読み'}
                          </span>

                          {/* Nút phát âm */}
                          {(currentMode === 'ja_to_hira' || quizAnswerChecked) && (
                            <button
                              onClick={() => speakJapanese(quizStudyList[quizActiveIndex].term)}
                              title="Phát âm"
                              style={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                background: '#faf8f5',
                                border: '1px solid #d6d3d1',
                                padding: '5px 11px',
                                borderRadius: 20,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#44403c'
                              }}
                            >
                              🔊 音声
                            </button>
                          )}

                          {/* Từ vựng câu hỏi */}
                          {currentMode === 'vi_to_ja' ? (
                            <div style={{ fontSize: 26, fontWeight: 800, color: '#9c2a2a', marginBottom: 24, maxWidth: 500 }}>
                              {quizStudyList[quizActiveIndex].vietnameseMeaning}
                            </div>
                          ) : (
                            <div style={{ marginBottom: 20 }}>
                              <div style={{ fontSize: 46, fontWeight: 900, color: '#1c2536', marginBottom: 6, letterSpacing: '1px' }}>
                                {quizStudyList[quizActiveIndex].term}
                              </div>
                              {quizStudyList[quizActiveIndex].sinoVietnamese && (
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#78716c', letterSpacing: '1px' }}>
                                  〔 {quizStudyList[quizActiveIndex].sinoVietnamese} 〕
                                </div>
                              )}
                            </div>
                          )}

                          {/* Form nhập đáp án */}
                          <form onSubmit={handleCheckQuizAnswer} style={{ width: '100%', maxWidth: 440 }}>
                            <div style={{ marginBottom: 14 }}>
                              <input
                                type="text"
                                autoFocus
                                disabled={quizAnswerChecked}
                                placeholder={currentMode === 'vi_to_ja' ? 'Nhập tiếng Nhật...' : 'Nhập Hiragana...'}
                                value={quizInput}
                                onChange={e => setQuizInput(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '11px 16px',
                                  fontSize: 16,
                                  borderRadius: 8,
                                  border: `2px solid ${
                                    quizAnswerChecked
                                      ? (quizIsCorrect ? '#2d6d4b' : quizIsSkipped ? '#d97706' : '#c53d32')
                                      : '#d6d3d1'
                                  }`,
                                  outline: 'none',
                                  textAlign: 'center',
                                  background: '#faf8f5'
                                }}
                              />
                            </div>

                            {!quizAnswerChecked ? (
                              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={handleSkipQuizCard}
                                  style={{
                                    padding: '9px 18px',
                                    background: '#faf8f5',
                                    color: '#78716c',
                                    border: '1px solid #d6d3d1',
                                    borderRadius: 7,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                  }}
                                >
                                  スキップ (Bỏ qua)
                                </button>

                                <button
                                  type="submit"
                                  disabled={!quizInput.trim()}
                                  style={{
                                    padding: '9px 24px',
                                    background: currentMode === 'vi_to_ja' ? '#2563eb' : '#2d6d4b',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    borderRadius: 7,
                                    border: 'none',
                                    cursor: quizInput.trim() ? 'pointer' : 'not-allowed',
                                    opacity: quizInput.trim() ? 1 : 0.6
                                  }}
                                >
                                  確認 (Kiểm tra)
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={handleNextQuizQuestion}
                                  style={{
                                    padding: '10px 28px',
                                    background: '#1c2536',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    borderRadius: 7,
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  次へ (Tiếp theo) ➔
                                </button>
                              </div>
                            )}
                          </form>

                          {/* Kết quả sau khi kiểm tra hoặc bỏ qua */}
                          {quizAnswerChecked && (
                            <div style={{
                              width: '100%',
                              maxWidth: 480,
                              marginTop: 18,
                              padding: '12px 16px',
                              borderRadius: 8,
                              background: quizIsCorrect ? '#f1f8f3' : quizIsSkipped ? '#fffbeb' : '#fdf2f0',
                              border: `1px solid ${quizIsCorrect ? '#c6e2ce' : quizIsSkipped ? '#fde68a' : '#f3d5d2'}`,
                              textAlign: 'left'
                            }}>
                              <div style={{
                                fontWeight: 800,
                                fontSize: 13,
                                color: quizIsCorrect ? '#2d6d4b' : quizIsSkipped ? '#b45309' : '#c53d32',
                                marginBottom: 6
                              }}>
                                {quizIsCorrect ? '正解 · Chính xác' : quizIsSkipped ? 'スキップ · Đã bỏ qua' : '不正解 · Chưa chính xác'}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 17, fontWeight: 900, color: '#1c2536' }}>
                                  {quizStudyList[quizActiveIndex].term}
                                </span>
                                <span style={{ fontSize: 14, color: '#2d6d4b', fontWeight: 700 }}>
                                  ({quizStudyList[quizActiveIndex].reading})
                                </span>
                                {quizStudyList[quizActiveIndex].sinoVietnamese && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>
                                    〔 {quizStudyList[quizActiveIndex].sinoVietnamese} 〕
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: 13, fontWeight: 600, color: '#9c2a2a', marginTop: 3 }}>
                                {quizStudyList[quizActiveIndex].vietnameseMeaning}
                              </div>

                              {quizStudyList[quizActiveIndex].exampleSentenceJp && (
                                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #d6d3d1', fontSize: 12 }}>
                                  <div style={{ fontWeight: 600, color: '#1c2536' }}>
                                    {quizStudyList[quizActiveIndex].exampleSentenceJp}
                                  </div>
                                  <div style={{ color: '#78716c' }}>
                                    {quizStudyList[quizActiveIndex].exampleSentenceVi}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Màn hình Tổng kết Dạng 2 & 3 */
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
                        Hoàn thành bài luyện tập
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
                            {quizWrongItems.length + quizSkippedItems.length}
                          </div>
                          {(quizWrongItems.length > 0 || quizSkippedItems.length > 0) && (
                            <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                              Sai: {quizWrongItems.length} · Bỏ qua: {quizSkippedItems.length}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(quizWrongItems.length > 0 || quizSkippedItems.length > 0) && (
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
                            🔄 Làm lại các thẻ sai & bỏ qua ({quizWrongItems.length + quizSkippedItems.length} câu)
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
                          🔁 Làm lại tất cả ({unitVocabList.length} câu)
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
