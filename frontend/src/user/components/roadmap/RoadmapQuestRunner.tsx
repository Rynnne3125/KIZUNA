import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Milestone } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { 
  ArrowLeft, 
  Volume2, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ShieldAlert, 
  Trophy, 
  Send, 
  HelpCircle, 
  Layers, 
  Zap, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Shuffle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

interface RoadmapQuestRunnerProps {
  milestone: Milestone;
  questIndex: number; // 1, 2, 3, or 4
  questData?: any;
  onBack: () => void;
  onCompleteQuest: (questIndex: number, xp: number, activePoints: number) => Promise<void>;
}

export const RoadmapQuestRunner: React.FC<RoadmapQuestRunnerProps> = ({
  milestone,
  questIndex,
  questData,
  onBack,
  onCompleteQuest
}) => {
  const [loading, setLoading] = useState(true);
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [grammarList, setGrammarList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isQuestDone, setIsQuestDone] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const runnerContainerRef = useRef<HTMLDivElement>(null);

  // Audio helper
  const speakJapanese = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = runnerContainerRef.current || document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen change with ESC key
  useEffect(() => {
    const handleFsChange = () => {
      const isNativeFs = Boolean(document.fullscreenElement);
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isFullscreen]);

  // Load real data from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [v, g] = await Promise.all([
          kizunaService.getVocabularyByMilestone(milestone.id),
          kizunaService.getGrammarByMilestone(milestone.id)
        ]);
        if (isMounted) {
          setVocabList(v);
          setGrammarList(g);
        }
      } catch (e) {
        console.warn('Error loading quest data:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [milestone.id]);

  // -------------------------------------------------------------
  // QUEST 1: SRS FLASHCARDS (ĐỒNG BỘ TÍNH NĂNG NHƯ VOCABPAGE)
  // -------------------------------------------------------------
  const [isShuffle, setIsShuffle] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());
  const [learningCards, setLearningCards] = useState<Set<number>>(new Set());

  // Swipe / Touch gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const displayVocabList = useMemo(() => {
    if (!vocabList || vocabList.length === 0) return [];
    if (!isShuffle) return vocabList;
    return [...vocabList].sort(() => Math.random() - 0.5);
  }, [vocabList, isShuffle]);

  const currentVocab = displayVocabList[cardIndex] || null;

  const handleNextCard = (mastered?: boolean) => {
    if (typeof mastered === 'boolean') {
      if (mastered) {
        setMasteredCards(prev => new Set(prev).add(cardIndex));
        setLearningCards(prev => {
          const next = new Set(prev);
          next.delete(cardIndex);
          return next;
        });
      } else {
        setLearningCards(prev => new Set(prev).add(cardIndex));
        setMasteredCards(prev => {
          const next = new Set(prev);
          next.delete(cardIndex);
          return next;
        });
      }
    }
    setIsFlipped(false);
    setDragX(0);
    if (cardIndex < displayVocabList.length - 1) {
      setCardIndex(prev => prev + 1);
    }
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setDragX(0);
    if (cardIndex > 0) {
      setCardIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation for Flashcards
  useEffect(() => {
    if (questIndex !== 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questIndex, cardIndex, displayVocabList.length]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (Math.abs(diff) < 140) {
      setDragX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragX > 45) {
      // Swiped Right -> Mastered
      handleNextCard(true);
    } else if (dragX < -45) {
      // Swiped Left -> Learning
      handleNextCard(false);
    }
    setDragX(0);
    setTouchStartX(null);
  };

  // -------------------------------------------------------------
  // QUEST 2: GATEKEEPER 100% QUIZ (THUẦN TIẾNG VIỆT 100%)
  // -------------------------------------------------------------
  const gatekeeperQuestions = useMemo(() => {
    // 1. Ưu tiên lấy trực tiếp câu hỏi chuẩn từ Firestore (milestone.gatekeeperQuiz)
    if (Array.isArray(milestone.gatekeeperQuiz) && milestone.gatekeeperQuiz.length > 0) {
      return milestone.gatekeeperQuiz;
    }

    // 2. Fallback sinh 10 câu hỏi thuần tiếng Việt từ vocabList
    if (vocabList.length < 4) return [];
    const pool = [...vocabList].sort(() => Math.random() - 0.5);
    const selected = pool.slice(0, Math.min(10, pool.length));

    return selected.map(item => {
      const correctVi = item.meaning_vi || item.vietnameseMeaning || 'Nghĩa từ vựng';
      const wrongOptions = pool
        .filter(w => w.id !== item.id)
        .map(w => w.meaning_vi || w.vietnameseMeaning)
        .filter(vi => vi && vi !== correctVi && !/^[A-Za-z\s,.\-()'\"]+$/.test(vi))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const allOptions = [...wrongOptions, correctVi].sort(() => Math.random() - 0.5);

      return {
        word: item.term || item.kanji || item.reading,
        reading: item.reading || item.hiragana || '',
        correctAnswer: correctVi,
        options: allOptions
      };
    });
  }, [milestone.gatekeeperQuiz, vocabList]);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleSelectQuizOption = (opt: string) => {
    if (quizAnswered) return;
    setSelectedAnswer(opt);
    setQuizAnswered(true);
    const currentQ = gatekeeperQuestions[quizIndex];
    if (opt === currentQ.correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex < gatekeeperQuestions.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuizAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRetryQuiz = () => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setQuizAnswered(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  // -------------------------------------------------------------
  // QUEST 3: GRAMMAR SCRAMBLE VỚI KÉO THẢ (DRAG & DROP)
  // -------------------------------------------------------------
  const scrambleSentences = useMemo(() => {
    const list: Array<{ original: string; translation: string; tokens: string[] }> = [];

    // Từ grammar_items
    grammarList.forEach(g => {
      if (Array.isArray(g.examples)) {
        g.examples.forEach((ex: any) => {
          if (ex.sentence && ex.translation && ex.sentence.length >= 4 && ex.sentence.length <= 30) {
            const clean = ex.sentence.replace(/。$/, '');
            const rawTokens = clean.match(/[\u4e00-\u9faf]+|[ぁ-ん]+|[ァ-ヴー]+|[A-Za-z0-9]+|[^\s]/g) || [clean];
            if (rawTokens.length >= 3 && rawTokens.length <= 7) {
              list.push({
                original: ex.sentence,
                translation: ex.translation,
                tokens: [...rawTokens].sort(() => Math.random() - 0.5)
              });
            }
          }
        });
      }
    });

    if (list.length === 0) {
      list.push(
        { original: '私は学生です。', translation: 'Tôi là học sinh / sinh viên.', tokens: ['です', '学生', '私は'].sort(() => Math.random() - 0.5) },
        { original: '田中さんは先生です。', translation: 'Anh Tanaka là giáo viên.', tokens: ['先生', '田中さんは', 'です'].sort(() => Math.random() - 0.5) },
        { original: 'これは私の本です。', translation: 'Cái này là sách của tôi.', tokens: ['本です', '私の', 'これは'].sort(() => Math.random() - 0.5) }
      );
    }

    return list.slice(0, 3);
  }, [grammarList]);

  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [userTokens, setUserTokens] = useState<string[]>([]);
  const [scrambleChecked, setScrambleChecked] = useState(false);
  const [scramblePassed, setScramblePassed] = useState(false);
  const [scrambleCompletedCount, setScrambleCompletedCount] = useState(0);
  const [draggedTokenIndex, setDraggedTokenIndex] = useState<number | null>(null);

  const currentScramble = scrambleSentences[scrambleIndex];

  // Drag & drop handlers
  const handleDragStartToken = (e: React.DragEvent, index: number) => {
    setDraggedTokenIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDropToTray = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTokenIndex === null || scrambleChecked || !currentScramble) return;
    const token = currentScramble.tokens[draggedTokenIndex];
    setUserTokens(prev => [...prev, token]);
    setDraggedTokenIndex(null);
  };

  const handlePickToken = (tok: string) => {
    if (scrambleChecked) return;
    setUserTokens(prev => [...prev, tok]);
  };

  const handleRemoveToken = (idx: number) => {
    if (scrambleChecked) return;
    setUserTokens(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckScramble = () => {
    if (!currentScramble) return;
    const constructed = userTokens.join('');
    const targetClean = currentScramble.original.replace(/。$/, '').replace(/\s+/g, '');
    const userClean = constructed.replace(/。$/, '').replace(/\s+/g, '');

    const correct = userClean === targetClean;
    setScramblePassed(correct);
    setScrambleChecked(true);

    if (correct) {
      setScrambleCompletedCount(prev => prev + 1);
    }
  };

  const handleNextScramble = () => {
    setUserTokens([]);
    setScrambleChecked(false);
    setScramblePassed(false);
    if (scrambleIndex < scrambleSentences.length - 1) {
      setScrambleIndex(prev => prev + 1);
    }
  };

  // -------------------------------------------------------------
  // QUEST 4: HỘI THOẠI TÌNH HUỐNG 2 BÊN VỚI AI SENSEI (ROLEPLAY)
  // -------------------------------------------------------------
  const dialogues = useMemo(() => {
    if (Array.isArray(milestone.roleplayDialogues) && milestone.roleplayDialogues.length > 0) {
      return milestone.roleplayDialogues;
    }

    return [
      {
        id: 'dial_default_01',
        title: 'Tình huống 1: Gặp gỡ đồng nghiệp mới ở văn phòng',
        partnerName: 'Tanaka-san (田中さん)',
        partnerRole: 'Đồng nghiệp công ty Nhật',
        partnerSpeechJp: '初めまして！営業部の田中です。お名前は何ですか。',
        partnerSpeechVi: 'Rất vui được gặp bạn! Tôi là Tanaka ở phòng kinh doanh. Tên bạn là gì vậy?',
        learnerPrompt: 'Hãy chào lại Tanaka-san, tự giới thiệu tên và quốc tịch của bạn bằng cấu trúc 「私は〜です」.',
        sampleAnswer: '初めまして。私はアンです。ベトナム人です。どうぞよろしくお願いします。',
        requiredKeywords: ['です', '初めまして']
      },
      {
        id: 'dial_default_02',
        title: 'Tình huống 2: Xác nhận nghề nghiệp tại lớp học',
        partnerName: 'Yamada Sensei (山田先生)',
        partnerRole: 'Giáo viên tiếng Nhật',
        partnerSpeechJp: 'アンさんは会社員ですか、それとも学生ですか。',
        partnerSpeechVi: 'An-san là nhân viên công ty hay là học sinh/sinh viên vậy?',
        learnerPrompt: 'Hãy trả lời xác nhận bạn là sinh viên, đồng thời phủ định nghề còn lại bằng 「〜ではありません」.',
        sampleAnswer: '私は学生です。会社員ではありません。',
        requiredKeywords: ['です', 'ではありません', 'じゃありません']
      }
    ];
  }, [milestone.roleplayDialogues]);

  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [learnerInput, setLearnerInput] = useState('');
  const [dialogueFeedback, setDialogueFeedback] = useState<string | null>(null);
  const [dialoguePassed, setDialoguePassed] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [showPartnerVi, setShowPartnerVi] = useState(false);
  const [completedDialoguesCount, setCompletedDialoguesCount] = useState(0);

  const currentDialogue = dialogues[dialogueIndex];

  const handleEvaluateDialogue = () => {
    if (!learnerInput.trim() || !currentDialogue) return;
    const input = learnerInput.trim();
    const required = currentDialogue.requiredKeywords || ['です'];
    const hasRequired = required.some((k: string) => input.includes(k));

    if (input.length < 4) {
      setDialogueFeedback('⚠️ Câu trả lời quá ngắn. Hãy diễn đạt đầy đủ câu có vị ngữ lịch sự (〜です／〜ます) nhé!');
      setDialoguePassed(false);
      return;
    }

    if (!hasRequired) {
      setDialogueFeedback(`⚠️ Bạn nên vận dụng mẫu câu trọng tâm [${required.join(' / ')}] theo đúng hướng dẫn tình huống nhé!`);
      setDialoguePassed(false);
      return;
    }

    // Success
    setDialogueFeedback('🎉 Tuyệt vời! Bạn đã đáp lại đúng mẫu câu, ngữ pháp chính xác và phong thái rất tự nhiên!');
    setDialoguePassed(true);
    setCompletedDialoguesCount(prev => prev + 1);
  };

  const handleNextDialogue = () => {
    setLearnerInput('');
    setDialogueFeedback(null);
    setDialoguePassed(false);
    setShowSample(false);
    setShowPartnerVi(false);
    if (dialogueIndex < dialogues.length - 1) {
      setDialogueIndex(prev => prev + 1);
    }
  };

  // Submit quest completion
  const handleCompleteCurrentQuest = async () => {
    setSubmitting(true);
    const xp = questIndex === 1 ? 30 : questIndex === 2 ? 35 : questIndex === 3 ? 40 : 50;
    const ap = questIndex === 1 ? 15 : questIndex === 2 ? 20 : questIndex === 3 ? 25 : 30;
    try {
      await onCompleteQuest(questIndex, xp, ap);
      setIsQuestDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌸</div>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải bài học từ Firestore...</p>
      </div>
    );
  }

  return (
    <div
      ref={runnerContainerRef}
      style={{
        animation: 'fadeIn 0.25s ease-out',
        ...(isFullscreen ? {
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: '#fcfbf9',
          overflowY: 'auto',
          padding: '20px 24px'
        } : {})
      }}
    >
      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#334155',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <ArrowLeft size={16} />
          <span>Trở về chi tiết mốc</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
            Nhiệm vụ {questIndex}/4:
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0'
            }}
          >
            {questIndex === 1 && '🎴 Thẻ Ghi Nhớ (SRS Flashcards)'}
            {questIndex === 2 && '🛡️ Cổng Phản Xạ 100% (Gatekeeper)'}
            {questIndex === 3 && '🧩 Ngữ Pháp Ghép Câu Kéo Thả'}
            {questIndex === 4 && '🌸 Đối Thoại Tình Huống AI Sensei'}
          </span>

          <button
            onClick={toggleFullscreen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Toàn màn hình (F / Esc)"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER WHEN QUEST IS COMPLETED */}
      {isQuestDone ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            border: '2px solid #10b981',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15)'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#065f46', marginBottom: 8 }}>
            XUẤT SẮC! BẠN ĐÃ HOÀN THÀNH NHIỆM VỤ {questIndex}!
          </h2>
          <p style={{ color: '#475569', fontSize: 14, maxWidth: 500, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            Dữ liệu đã được lưu trực tiếp vào Firestore. Điểm năng động, kinh nghiệm XP và chuỗi ngày học Streak đã được cộng vào tài khoản của bạn!
          </p>

          <button
            onClick={onBack}
            style={{
              padding: '12px 28px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            Tiếp tục lộ trình học tập ➔
          </button>
        </div>
      ) : (
        <>
          {/* ========================================================
              QUEST 1: SRS FLASHCARDS (TRỘN THẺ, VUỐT TRÁI/PHẢI, 100% VIỆT HÓA)
              ======================================================== */}
          {questIndex === 1 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              {/* Controls bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    Thẻ {cardIndex + 1} / {displayVocabList.length || 1}
                  </span>

                  {/* Shuffle Button */}
                  <button
                    onClick={() => {
                      setIsShuffle(!isShuffle);
                      setCardIndex(0);
                      setIsFlipped(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      borderRadius: 14,
                      border: '1px solid #cbd5e1',
                      backgroundColor: isShuffle ? '#c53d32' : '#f8fafc',
                      color: isShuffle ? '#ffffff' : '#334155',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isShuffle ? <Shuffle size={12} /> : <ArrowUpDown size={12} />}
                    <span>{isShuffle ? 'Ngẫu nhiên' : 'Thứ tự bài'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 800 }}>
                    Đã nhớ: {masteredCards.size}
                  </span>
                  <span style={{ fontSize: 13, color: '#b45309', fontWeight: 800 }}>
                    Cần ôn: {learningCards.size}
                  </span>

                  <button
                    onClick={handleCompleteCurrentQuest}
                    disabled={submitting || masteredCards.size === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 16px',
                      borderRadius: 8,
                      backgroundColor: masteredCards.size > 0 ? '#10b981' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: masteredCards.size > 0 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Hoàn thành Quest 1</span>
                  </button>
                </div>
              </div>

              {currentVocab ? (
                <div>
                  {/* Swipeable 3D Flip Card */}
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                      if (Math.abs(dragX) < 10) {
                        setIsFlipped(!isFlipped);
                      }
                    }}
                    style={{
                      minHeight: 280,
                      backgroundColor: isFlipped ? '#fcfbf9' : '#ffffff',
                      border: isFlipped ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '32px 24px',
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: 'var(--shadow-md)',
                      textAlign: 'center',
                      marginBottom: 20,
                      userSelect: 'none',
                      transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.25s ease-out'
                    }}
                  >
                    {/* Badge when dragging */}
                    {dragX > 25 && (
                      <span style={{ position: 'absolute', top: 16, left: 16, backgroundColor: '#15803d', color: '#ffffff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800 }}>
                        ✓ ĐÃ NHỚ
                      </span>
                    )}
                    {dragX < -25 && (
                      <span style={{ position: 'absolute', top: 16, right: 16, backgroundColor: '#b45309', color: '#ffffff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800 }}>
                        ↺ CẦN ÔN LẠI
                      </span>
                    )}

                    <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                      <RotateCw size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Chạm để lật (Phím Space)
                    </span>

                    {!isFlipped ? (
                      /* FRONT: JAPANESE */
                      <div>
                        <div style={{ fontSize: 15, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>
                          {currentVocab.reading || currentVocab.hiragana}
                        </div>
                        <div style={{ fontSize: 46, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
                          {currentVocab.term || currentVocab.kanji || currentVocab.reading}
                        </div>
                        {currentVocab.part_of_speech && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                            {currentVocab.part_of_speech}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* BACK: PURE VIETNAMESE */
                      <div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#15803d', marginBottom: 8 }}>
                          {currentVocab.meaning_vi || currentVocab.vietnameseMeaning}
                        </div>
                        {currentVocab.sinoVietnamese && (
                          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 700 }}>
                            Âm Hán Việt: [<b>{currentVocab.sinoVietnamese}</b>]
                          </div>
                        )}
                        {currentVocab.exampleSentenceJp && (
                          <div style={{ backgroundColor: '#ffffff', padding: '12px 18px', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 12, textAlign: 'left', maxWidth: 500 }}>
                            <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>
                              {currentVocab.exampleSentenceJp}
                            </div>
                            <div style={{ fontSize: 13, color: '#475569' }}>
                              {currentVocab.exampleSentenceVi || 'Câu ví dụ tiếng Nhật chuẩn.'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions & Navigation Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handlePrevCard}
                        disabled={cardIndex === 0}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: cardIndex > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <ChevronLeft size={16} /> Trước
                      </button>

                      <button
                        onClick={() => handleNextCard()}
                        disabled={cardIndex === displayVocabList.length - 1}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: cardIndex < displayVocabList.length - 1 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        Sau <ChevronRight size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => speakJapanese(currentVocab.term || currentVocab.reading)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 8,
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Volume2 size={16} /> Nghe
                      </button>

                      <button
                        onClick={() => handleNextCard(false)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 8,
                          backgroundColor: '#fffbeb',
                          border: '1.5px solid #fde68a',
                          color: '#b45309',
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        ↺ Cần ôn lại
                      </button>

                      <button
                        onClick={() => handleNextCard(true)}
                        style={{
                          padding: '10px 24px',
                          borderRadius: 8,
                          backgroundColor: '#ecfdf5',
                          border: '1.5px solid #86efac',
                          color: '#15803d',
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Đã nhớ
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  Đang đồng bộ danh sách từ vựng từ Firestore...
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 2: GATEKEEPER 100% (TRẮC NGHIỆM PHẢN XẠ THUẦN TIẾNG VIỆT)
              ======================================================== */}
          {questIndex === 2 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    🛡️ Cổng Phản Xạ 100% (Vocab Gatekeeper)
                  </h3>
                  <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                    Tiêu chuẩn Người gác cổng: Đạt 100% (10/10 câu đúng) để mở khóa mốc!
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Câu {quizIndex + 1} / {gatekeeperQuestions.length || 1} • Đúng: <b style={{ color: '#16a34a' }}>{quizScore}</b>
                </div>
              </div>

              {!quizFinished ? (
                gatekeeperQuestions[quizIndex] ? (
                  <div>
                    {/* Word display card */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '24px 20px', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: 24 }}>
                      <div style={{ fontSize: 13.5, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                        {gatekeeperQuestions[quizIndex].reading}
                      </div>
                      <div style={{ fontSize: 38, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                        {gatekeeperQuestions[quizIndex].word}
                      </div>
                      <button
                        onClick={() => speakJapanese(gatekeeperQuestions[quizIndex].word)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}
                      >
                        <Volume2 size={16} /> Nghe phát âm
                      </button>
                    </div>

                    {/* Options list: Pure Vietnamese */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
                      {gatekeeperQuestions[quizIndex].options.map((opt: string, i: number) => {
                        const isCorrect = opt === gatekeeperQuestions[quizIndex].correctAnswer;
                        const isChosen = opt === selectedAnswer;

                        let bg = '#ffffff';
                        let border = '1.5px solid #cbd5e1';
                        let color = '#1e293b';

                        if (quizAnswered) {
                          if (isCorrect) {
                            bg = '#ecfdf5';
                            border = '2px solid #10b981';
                            color = '#065f46';
                          } else if (isChosen && !isCorrect) {
                            bg = '#fff1f2';
                            border = '2px solid #f43f5e';
                            color = '#9f1239';
                          }
                        }

                        return (
                          <div
                            key={i}
                            onClick={() => handleSelectQuizOption(opt)}
                            style={{
                              padding: '16px 20px',
                              borderRadius: 10,
                              backgroundColor: bg,
                              border,
                              color,
                              fontSize: 14.5,
                              fontWeight: 700,
                              cursor: quizAnswered ? 'default' : 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span style={{ marginRight: 8, color: '#64748b' }}>{String.fromCharCode(65 + i)}.</span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {quizAnswered && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleNextQuizQuestion}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 14,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {quizIndex < gatekeeperQuestions.length - 1 ? 'Câu tiếp theo ➔' : 'Xem kết quả qua cổng ➔'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Đang nạp câu hỏi trắc nghiệm...</div>
                )
              ) : (
                /* Gatekeeper Finished */
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  {quizScore === gatekeeperQuestions.length ? (
                    <div>
                      <div style={{ fontSize: 56, marginBottom: 12 }}>👑</div>
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', marginBottom: 8 }}>
                        XUẤT SẮC! BẠN ĐẠT ĐIỂM TUYỆT ĐỐI 100%!
                      </h3>
                      <p style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>
                        Bạn đã trả lời đúng {quizScore}/{gatekeeperQuestions.length} câu. Cổng phản xạ từ vựng đã mở ra thành công!
                      </p>
                      <button
                        onClick={handleCompleteCurrentQuest}
                        disabled={submitting}
                        style={{
                          padding: '12px 32px',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          borderRadius: 10,
                          fontSize: 15,
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {submitting ? 'Đang lưu...' : 'Lưu kết quả & Hoàn thành Quest 2 ➔'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>
                        CHƯA ĐẠT 100% — CỔNG VẪN ĐANG KHÓA!
                      </h3>
                      <p style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>
                        Bạn đạt {quizScore}/{gatekeeperQuestions.length} câu đúng. Người gác cổng yêu cầu 100% để đảm bảo phản xạ tiếng Nhật chuẩn mực.
                      </p>
                      <button
                        onClick={handleRetryQuiz}
                        style={{
                          padding: '12px 28px',
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Làm lại bài kiểm tra 100%
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 3: GRAMMAR SCRAMBLE VỚI KÉO THẢ (DRAG & DROP)
              ======================================================== */}
          {questIndex === 3 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    🧩 Kéo Thả Ghép Câu & Bẫy Trợ Từ
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Kéo thẻ từ hoặc nhấn vào thẻ để xếp vào khay câu tiếng Nhật ({scrambleIndex + 1}/{scrambleSentences.length || 1})
                  </div>
                </div>

                <button
                  onClick={handleCompleteCurrentQuest}
                  disabled={submitting || scrambleCompletedCount === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 18px',
                    borderRadius: 8,
                    backgroundColor: scrambleCompletedCount > 0 ? '#10b981' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: scrambleCompletedCount > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Hoàn thành Quest 3</span>
                </button>
              </div>

              {currentScramble ? (
                <div>
                  {/* Vietnamese target */}
                  <div style={{ backgroundColor: '#f0fdf4', padding: '16px 20px', borderRadius: 12, border: '1px solid #bbf7d0', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: '#166534', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                      Ý nghĩa tiếng Việt cần diễn đạt:
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {currentScramble.translation}
                    </div>
                  </div>

                  {/* DROP ZONE / ANSWER TRAY */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDropToTray}
                    style={{
                      minHeight: 70,
                      backgroundColor: '#f8fafc',
                      border: scrambleChecked ? (scramblePassed ? '2px solid #16a34a' : '2px solid #ef4444') : '2px dashed #94a3b8',
                      borderRadius: 14,
                      padding: 16,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                      marginBottom: 20
                    }}
                  >
                    {userTokens.length === 0 ? (
                      <span style={{ color: '#94a3b8', fontSize: 13.5 }}>
                        👉 Kéo thẻ từ hoặc bấm vào các thẻ bên dưới để xếp vào đây...
                      </span>
                    ) : (
                      userTokens.map((tok, idx) => (
                        <span
                          key={idx}
                          onClick={() => handleRemoveToken(idx)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#ffffff',
                            border: '1.5px solid #0f172a',
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#0f172a',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                          title="Bấm để gỡ bỏ thẻ"
                        >
                          {tok} ✕
                        </span>
                      ))
                    )}
                  </div>

                  {/* Feedback */}
                  {scrambleChecked && (
                    <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 8, backgroundColor: scramblePassed ? '#dcfce7' : '#fee2e2', color: scramblePassed ? '#166534' : '#991b1b', fontSize: 13.5, fontWeight: 700 }}>
                      {scramblePassed ? (
                        <div>✓ Rất chính xác! Câu tiếng Nhật hoàn chỉnh: <b>{currentScramble.original}</b></div>
                      ) : (
                        <div>✕ Chưa chính xác! Câu mẫu chuẩn là: <b>{currentScramble.original}</b></div>
                      )}
                    </div>
                  )}

                  {/* Scrambled tokens pool (Draggable) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
                    {currentScramble.tokens.map((tok, idx) => (
                      <div
                        key={idx}
                        draggable={!scrambleChecked}
                        onDragStart={e => handleDragStartToken(e, idx)}
                        onClick={() => handlePickToken(tok)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 8,
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#1e293b',
                          fontSize: 15,
                          fontWeight: 800,
                          cursor: 'grab',
                          boxShadow: 'var(--shadow-sm)',
                          userSelect: 'none'
                        }}
                      >
                        {tok}
                      </div>
                    ))}
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    {!scrambleChecked ? (
                      <button
                        onClick={handleCheckScramble}
                        disabled={userTokens.length === 0}
                        style={{
                          padding: '10px 24px',
                          backgroundColor: userTokens.length > 0 ? '#0f172a' : '#94a3b8',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 14,
                          border: 'none',
                          cursor: userTokens.length > 0 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Kiểm tra câu ghép
                      </button>
                    ) : (
                      <button
                        onClick={handleNextScramble}
                        style={{
                          padding: '10px 24px',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 14,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Câu tiếp theo ➔
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  Đang tải câu mẫu ngữ pháp từ Firestore...
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 4: ĐỐI THOẠI TÌNH HUỐNG 2 BÊN VỚI AI SENSEI (ROLEPLAY)
              ======================================================== */}
          {questIndex === 4 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    🌸 Đối Thoại Tình Huống 2 Bên & Gặp Gỡ AI Sensei
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Tình huống thực tế {dialogueIndex + 1} / {dialogues.length}
                  </div>
                </div>

                <button
                  onClick={handleCompleteCurrentQuest}
                  disabled={submitting || completedDialoguesCount === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 18px',
                    borderRadius: 8,
                    backgroundColor: completedDialoguesCount > 0 ? '#10b981' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: completedDialoguesCount > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Hoàn thành Quest 4</span>
                </button>
              </div>

              {currentDialogue && (
                <div>
                  {/* Context Header */}
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0284c7', marginBottom: 16 }}>
                    🎯 {currentDialogue.title}
                  </div>

                  {/* SIDE A: SENSEI SPEECH BUBBLE */}
                  <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: '#e0f2fe',
                        border: '2px solid #bae6fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0
                      }}
                    >
                      🎎
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0369a1', marginBottom: 4 }}>
                        {currentDialogue.partnerName} · <span style={{ color: '#64748b', fontWeight: 600 }}>{currentDialogue.partnerRole}</span>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#f0f9ff',
                          border: '1.5px solid #bae6fd',
                          borderRadius: '0 16px 16px 16px',
                          padding: '16px 20px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.5 }}>
                          {currentDialogue.partnerSpeechJp}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            onClick={() => speakJapanese(currentDialogue.partnerSpeechJp)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Volume2 size={14} /> Nghe Sensei nói
                          </button>

                          <button
                            onClick={() => setShowPartnerVi(!showPartnerVi)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {showPartnerVi ? 'Ẩn nghĩa' : 'Xem nghĩa tiếng Việt'}
                          </button>
                        </div>

                        {showPartnerVi && (
                          <div style={{ marginTop: 8, fontSize: 13, color: '#0369a1', fontStyle: 'italic', borderTop: '1px solid #e0f2fe', paddingTop: 6 }}>
                            {currentDialogue.partnerSpeechVi}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SIDE B: LEARNER RESPONSE AREA */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '20px 22px', borderRadius: 16, border: '1.5px solid #e2e8f0', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 6 }}>
                      👉 Nhiệm vụ của bạn:
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.5, marginBottom: 12 }}>
                      {currentDialogue.learnerPrompt}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <textarea
                        value={learnerInput}
                        onChange={e => setLearnerInput(e.target.value)}
                        placeholder="Nhập câu tiếng Nhật đáp lại Sensei vào đây..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 15,
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Sample Answer Toggle */}
                    <div style={{ marginBottom: 14 }}>
                      <button
                        onClick={() => setShowSample(!showSample)}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {showSample ? 'Ẩn câu mẫu ví dụ' : '💡 Xem câu mẫu ví dụ'}
                      </button>

                      {showSample && (
                        <div style={{ marginTop: 6, padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, color: '#0f172a' }}>
                          Mẫu: <b>{currentDialogue.sampleAnswer}</b>
                        </div>
                      )}
                    </div>

                    {/* Evaluation Feedback */}
                    {dialogueFeedback && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          backgroundColor: dialoguePassed ? '#ecfdf5' : '#fffbeb',
                          border: dialoguePassed ? '1px solid #86efac' : '1px solid #fde68a',
                          color: dialoguePassed ? '#166534' : '#b45309',
                          fontSize: 13.5,
                          fontWeight: 700,
                          marginBottom: 16
                        }}
                      >
                        {dialogueFeedback}
                      </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        onClick={handleEvaluateDialogue}
                        disabled={!learnerInput.trim()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '10px 22px',
                          backgroundColor: learnerInput.trim() ? '#0f172a' : '#94a3b8',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 13.5,
                          border: 'none',
                          cursor: learnerInput.trim() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <Send size={14} /> Gửi câu trả lời
                      </button>

                      {dialoguePassed && dialogueIndex < dialogues.length - 1 && (
                        <button
                          onClick={handleNextDialogue}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 13.5,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Tình huống tiếp theo ➔
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
