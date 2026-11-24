import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Milestone } from '../../types/kizuna';
import { kizunaService } from '../../services/kizunaService';
import { soundService } from '../../services/soundService';
import { aiSenseiService, AiSenseiEvaluationResult } from '../../services/aiSenseiService';
import { 
  ArrowLeft, 
  Volume2, 
  RotateCw, 
  RotateCcw,
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
  MessageSquare,
  Shield,
  Puzzle,
  Crown,
  Lock,
  Target,
  Lightbulb,
  MessageCircle
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

  // Audio helper (Hỗ trợ cả Web & Android APK)
  const speakJapanese = (text: string) => {
    soundService.speakJapanese(text);
  };

  const handleBack = () => {
    soundService.stop();
    onBack();
  };

  // Tự động ngắt toàn bộ âm thanh khi người dùng rời khỏi nhiệm vụ
  useEffect(() => {
    return () => {
      soundService.stop();
    };
  }, []);

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

  // Drag / Swipe state cho Flashcard (Áp dụng cho cả Web chuột lẫn App điện thoại)
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number; active: boolean; pointerId: number }>({
    x: 0,
    y: 0,
    time: 0,
    active: false,
    pointerId: -1
  });

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
        handleNextCard(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNextCard(false);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questIndex, cardIndex, displayVocabList.length]);

  // Pointer Drag & Swipe Handlers (Web & App)
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, [role="button"]')) {
      return;
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      active: true,
      pointerId: e.pointerId
    };
    setIsDragging(true);
    setDragX(0);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current.active) return;
    const diffX = e.clientX - dragStartRef.current.x;
    const diffY = e.clientY - dragStartRef.current.y;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      const damp = Math.abs(diffX) > 130 ? 130 + (Math.abs(diffX) - 130) * 0.25 : Math.abs(diffX);
      setDragX(diffX < 0 ? -damp : damp);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current.active) return;
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}

    const duration = Date.now() - dragStartRef.current.time;
    const distance = dragX;
    const absDistance = Math.abs(distance);

    dragStartRef.current.active = false;
    setIsDragging(false);
    setDragX(0);

    if (absDistance < 10 && duration < 350) {
      setIsFlipped(prev => !prev);
      return;
    }

    const isSwipe = absDistance > 50 || (absDistance > 25 && duration < 250);
    if (isSwipe) {
      if (distance > 0) {
        handleNextCard(true);
      } else {
        handleNextCard(false);
      }
    }
  };

  const handlePointerCancel = () => {
    dragStartRef.current.active = false;
    setIsDragging(false);
    setDragX(0);
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

  // Stage 3 (P2): AI Sensei Whitelist evaluation & Human-in-the-loop Appeal states
  const [evaluatingSensei, setEvaluatingSensei] = useState(false);
  const [senseiResult, setSenseiResult] = useState<AiSenseiEvaluationResult | null>(null);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSubmittedId, setAppealSubmittedId] = useState<string | null>(null);

  const currentDialogue = dialogues[dialogueIndex];

  const handleEvaluateDialogue = async () => {
    if (!learnerInput.trim() || !currentDialogue || evaluatingSensei) return;
    const input = learnerInput.trim();

    setEvaluatingSensei(true);
    setShowAppealForm(false);
    setAppealSubmittedId(null);

    try {
      const whitelistVocab = vocabList
        .map(v => v.term || v.kanji || v.reading)
        .filter((t): t is string => Boolean(t))
        .slice(0, 40);
      const whitelistGram = grammarList
        .map(g => g.pattern || g.title)
        .filter((p): p is string => Boolean(p))
        .slice(0, 15);

      const result = await aiSenseiService.evaluateSentence({
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        dialogueTitle: currentDialogue.title,
        partnerSpeechJp: currentDialogue.partnerSpeechJp,
        learnerPrompt: currentDialogue.learnerPrompt,
        sampleAnswer: currentDialogue.sampleAnswer,
        studentInput: input,
        requiredKeywords: currentDialogue.requiredKeywords || ['です'],
        whitelistVocabulary: whitelistVocab,
        whitelistGrammar: whitelistGram
      });

      setSenseiResult(result);
      setDialogueFeedback(result.pedagogicalFeedback);
      setDialoguePassed(result.passed);
      if (result.passed) {
        setCompletedDialoguesCount(prev => prev + 1);
      }
    } finally {
      setEvaluatingSensei(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!senseiResult || !appealReason.trim() || submittingAppeal) return;
    setSubmittingAppeal(true);
    try {
      const res = await aiSenseiService.submitAppeal({
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        questTitle: `Quest 4: ${currentDialogue?.title || 'Đối thoại AI Sensei'}`,
        promptText: currentDialogue?.learnerPrompt || 'Viết câu tiếng Nhật theo tình huống',
        studentInput: senseiResult.studentInput,
        aiFeedback: senseiResult.pedagogicalFeedback,
        aiScore: senseiResult.evaluatedScore,
        studentReason: appealReason.trim()
      });
      if (res.ok) {
        setAppealSubmittedId(res.id);
        setShowAppealForm(false);
        setAppealReason('');
      }
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleNextDialogue = () => {
    setLearnerInput('');
    setDialogueFeedback(null);
    setDialoguePassed(false);
    setSenseiResult(null);
    setShowAppealForm(false);
    setAppealReason('');
    setAppealSubmittedId(null);
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
        <Sparkles size={32} style={{ color: '#c53d32', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải bài học từ Firestore...</p>
      </div>
    );
  }

  return (
    <div
      ref={runnerContainerRef}
      className="roadmap-quest-runner-root transition-colors"
      style={{
        animation: 'fadeIn 0.25s ease-out',
        ...(isFullscreen ? {
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'var(--bg-main, #fcfbf9)',
          overflowY: 'auto',
          padding: '20px 24px'
        } : {})
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .roadmap-runner-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .roadmap-runner-actions {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .roadmap-flashcard-box {
            padding: 28px 16px !important;
            min-height: 240px !important;
          }
          .roadmap-flashcard-term {
            font-size: clamp(22px, 7vw, 34px) !important;
          }
        }

        /* Dark Mode Support cho toàn bộ Nhiệm vụ Lộ Trình */
        .dark .roadmap-quest-runner-root {
          color: #f8fafc !important;
        }
        .dark .roadmap-btn-back {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        .dark .roadmap-btn-back:hover {
          background-color: #334155 !important;
        }
        .dark .roadmap-runner-actions span {
          color: #f8fafc !important;
        }
        .dark .roadmap-quest-badge {
          background-color: rgba(6, 78, 59, 0.7) !important;
          color: #6ee7b7 !important;
          border-color: #047857 !important;
        }
        .dark .roadmap-btn-fullscreen {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }
        .dark .roadmap-runner-card {
          background-color: #0f172a !important;
          border-color: #1e293b !important;
          color: #f8fafc !important;
        }
        .dark .roadmap-runner-title {
          color: #f8fafc !important;
        }
        .dark .roadmap-runner-muted {
          color: #94a3b8 !important;
        }
        .dark .roadmap-success-box {
          background-color: #0f172a !important;
          border-color: #059669 !important;
          box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.25) !important;
        }
        .dark .roadmap-success-title {
          color: #34d399 !important;
        }
        .dark .roadmap-success-desc {
          color: #94a3b8 !important;
        }

        /* Quest 1 Flashcard Dark Mode */
        .dark .roadmap-flashcard-box {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        }
        .dark .roadmap-flashcard-box.is-flipped {
          border-color: #e11d48 !important;
          background-color: #0b1120 !important;
        }
        .dark .roadmap-flashcard-term {
          color: #ffffff !important;
        }
        .dark .roadmap-flashcard-reading {
          color: #34d399 !important;
        }
        .dark .roadmap-flashcard-meaning {
          color: #fb7185 !important;
        }
        .dark .roadmap-flashcard-sino {
          color: #94a3b8 !important;
        }
        .dark .roadmap-flashcard-pos {
          background-color: #1e293b !important;
          color: #cbd5e1 !important;
          border-color: #334155 !important;
        }
        .dark .roadmap-flashcard-sound-btn {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        .dark .roadmap-flashcard-fuda-front {
          background-color: rgba(153, 27, 27, 0.4) !important;
          color: #fca5a5 !important;
          border-color: #991b1b !important;
        }
        .dark .roadmap-flashcard-fuda-back {
          background-color: rgba(30, 58, 138, 0.4) !important;
          color: #93c5fd !important;
          border-color: #1e40af !important;
        }
        .dark .roadmap-flashcard-example-box {
          background: rgba(15, 23, 42, 0.95) !important;
          border-color: #334155 !important;
          border-left-color: #f43f5e !important;
        }
        .dark .roadmap-flashcard-example-jp {
          color: #f8fafc !important;
        }
        .dark .roadmap-flashcard-example-vi {
          color: #94a3b8 !important;
        }
        .dark .roadmap-shuffle-btn-inactive {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }

        /* Quest 2 Gatekeeper Dark Mode */
        .dark .roadmap-gatekeeper-wordbox {
          background-color: #020617 !important;
          border-color: #1e293b !important;
        }
        .dark .roadmap-gatekeeper-word {
          color: #ffffff !important;
        }
        .dark .roadmap-gatekeeper-reading {
          color: #94a3b8 !important;
        }
        .dark .roadmap-gatekeeper-option {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        .dark .roadmap-gatekeeper-option:hover {
          background-color: #334155 !important;
        }
        .dark .roadmap-gatekeeper-option.is-correct {
          background-color: rgba(6, 78, 59, 0.7) !important;
          border-color: #10b981 !important;
          color: #6ee7b7 !important;
        }
        .dark .roadmap-gatekeeper-option.is-wrong {
          background-color: rgba(136, 19, 55, 0.7) !important;
          border-color: #f43f5e !important;
          color: #fda4af !important;
        }
        .dark .roadmap-btn-next {
          background-color: #059669 !important;
          color: #ffffff !important;
        }
        .dark .roadmap-btn-next:hover {
          background-color: #047857 !important;
        }

        /* Quest 3 Drag & Drop Scramble Dark Mode */
        .dark .roadmap-scramble-target {
          background-color: rgba(6, 78, 59, 0.3) !important;
          border-color: #047857 !important;
        }
        .dark .roadmap-scramble-target-title {
          color: #34d399 !important;
        }
        .dark .roadmap-scramble-target-text {
          color: #f8fafc !important;
        }
        .dark .roadmap-scramble-tray {
          background-color: #020617 !important;
          border-color: #475569 !important;
        }
        .dark .roadmap-scramble-tray-token {
          background-color: #1e293b !important;
          border-color: #10b981 !important;
          color: #f8fafc !important;
        }
        .dark .roadmap-scramble-pool {
          background-color: #020617 !important;
        }
        .dark .roadmap-scramble-pool-token {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        .dark .roadmap-scramble-pool-token:hover {
          background-color: #334155 !important;
        }
        .dark .roadmap-scramble-feedback-pass {
          background-color: rgba(6, 78, 59, 0.6) !important;
          color: #6ee7b7 !important;
          border: 1px solid #047857 !important;
        }
        .dark .roadmap-scramble-feedback-fail {
          background-color: rgba(136, 19, 55, 0.6) !important;
          color: #fda4af !important;
          border: 1px solid #9f1239 !important;
        }

        /* Quest 4 AI Sensei Roleplay Dark Mode */
        .dark .roadmap-sensei-avatar {
          background-color: rgba(3, 105, 161, 0.4) !important;
          border-color: #0284c7 !important;
          color: #38bdf8 !important;
        }
        .dark .roadmap-sensei-bubble {
          background-color: #1e293b !important;
          border-color: #0369a1 !important;
        }
        .dark .roadmap-sensei-speech {
          color: #f8fafc !important;
        }
        .dark .roadmap-sensei-name {
          color: #38bdf8 !important;
        }
        .dark .roadmap-sensei-vi {
          color: #7dd3fc !important;
          border-top-color: #334155 !important;
        }
        .dark .roadmap-learner-box {
          background-color: #020617 !important;
          border-color: #1e293b !important;
        }
        .dark .roadmap-learner-title {
          color: #34d399 !important;
        }
        .dark .roadmap-learner-prompt {
          color: #f8fafc !important;
        }
        .dark .roadmap-learner-textarea {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        .dark .roadmap-sample-answer {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        .dark .roadmap-btn-send {
          background-color: #059669 !important;
          color: #ffffff !important;
        }
        .dark .roadmap-btn-send:hover {
          background-color: #047857 !important;
        }
      `}</style>

      {/* Top action header */}
      <div className="roadmap-runner-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={handleBack}
          className="roadmap-btn-back"
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

        <div className="roadmap-runner-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="roadmap-runner-title" style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
            Nhiệm vụ {questIndex}/4:
          </span>
          <span
            className="roadmap-quest-badge"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            {questIndex === 1 && (
              <>
                <Layers size={14} />
                <span>Thẻ Ghi Nhớ (SRS Flashcards)</span>
              </>
            )}
            {questIndex === 2 && (
              <>
                <Shield size={14} />
                <span>Cổng Phản Xạ 100% (Gatekeeper)</span>
              </>
            )}
            {questIndex === 3 && (
              <>
                <Puzzle size={14} />
                <span>Ngữ Pháp Ghép Câu Kéo Thả</span>
              </>
            )}
            {questIndex === 4 && (
              <>
                <MessageCircle size={14} />
                <span>Đối Thoại Tình Huống AI Sensei</span>
              </>
            )}
          </span>

          <button
            onClick={toggleFullscreen}
            className="roadmap-btn-fullscreen"
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
          className="roadmap-success-box"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            border: '2px solid #10b981',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15)'
          }}
        >
          <Trophy size={48} style={{ color: '#eab308', margin: '0 auto 16px', display: 'block' }} />
          <h2 className="roadmap-success-title" style={{ fontSize: 22, fontWeight: 900, color: '#065f46', marginBottom: 8 }}>
            XUẤT SẮC! BẠN ĐÃ HOÀN THÀNH NHIỆM VỤ {questIndex}!
          </h2>
          <p className="roadmap-success-desc" style={{ color: '#475569', fontSize: 14, maxWidth: 500, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            Dữ liệu đã được lưu trực tiếp vào Firestore. Điểm năng động, kinh nghiệm XP và chuỗi ngày học Streak đã được cộng vào tài khoản của bạn!
          </p>

          <button
            onClick={handleBack}
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
            <div className="roadmap-runner-card" style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              {/* Controls bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="roadmap-runner-title" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    Thẻ {cardIndex + 1} / {displayVocabList.length || 1}
                  </span>

                  {/* Shuffle Button */}
                  <button
                    onClick={() => {
                      setIsShuffle(!isShuffle);
                      setCardIndex(0);
                      setIsFlipped(false);
                    }}
                    className={isShuffle ? '' : 'roadmap-shuffle-btn-inactive'}
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
                  {/* Swipeable 3D Flip Card - Đồng bộ phong cách Thẻ từ vựng VocabPage */}
                  <div
                    className={`roadmap-flashcard-box ${isFlipped ? 'is-flipped' : ''}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    style={{
                      minHeight: 280,
                      backgroundColor: isFlipped ? '#fcfbf9' : '#ffffff',
                      border: isFlipped ? '2px solid #c53d32' : '2px solid #e2e8f0',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '36px 24px',
                      cursor: isDragging ? 'grabbing' : 'pointer',
                      position: 'relative',
                      boxShadow: 'var(--shadow-md)',
                      textAlign: 'center',
                      marginBottom: 16,
                      userSelect: 'none',
                      touchAction: 'pan-y',
                      transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.25s ease-out'
                    }}
                  >
                    {/* Badge when dragging */}
                    {dragX > 20 && (
                      <span style={{ position: 'absolute', top: 16, left: 16, backgroundColor: '#16a34a', color: '#ffffff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, zIndex: 10, pointerEvents: 'none' }}>
                        <Check size={13} strokeWidth={3} /> ĐÃ HỌC
                      </span>
                    )}
                    {dragX < -20 && (
                      <span style={{ position: 'absolute', top: 16, right: 16, backgroundColor: '#dc2626', color: '#ffffff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, zIndex: 10, pointerEvents: 'none' }}>
                        ✕ CHƯA HỌC
                      </span>
                    )}

                    {/* Fuda Seal Tag & Sound Button */}
                    <span
                      className={isFlipped ? 'roadmap-flashcard-fuda-back' : 'roadmap-flashcard-fuda-front'}
                      style={{
                        position: 'absolute',
                        top: 14,
                        left: 16,
                        fontSize: 11,
                        fontWeight: 900,
                        color: isFlipped ? '#2563eb' : '#c53d32',
                        background: isFlipped ? 'rgba(248, 250, 255, 0.9)' : 'rgba(253, 242, 240, 0.9)',
                        border: isFlipped ? '1px solid #bfdbfe' : '1px solid #f3d5d2',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontFamily: 'serif'
                      }}
                    >
                      {isFlipped ? '意味 · Ý NGHĨA' : `語 · TỪ VỰNG (${cardIndex + 1}/${displayVocabList.length})`}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJapanese(currentVocab.term || currentVocab.reading);
                      }}
                      title="Phát âm"
                      className="roadmap-flashcard-sound-btn"
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 14,
                        background: '#faf8f5',
                        border: '1px solid #d6d3d1',
                        padding: '5px 12px',
                        borderRadius: 20,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#44403c',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Volume2 size={13} />
                      <span>Phát âm</span>
                    </button>

                    <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                      <RotateCw size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Chạm để lật (Phím Space)
                    </span>

                    {!isFlipped ? (
                      /* FRONT: JAPANESE */
                      <div style={{ width: '100%', maxWidth: 500, margin: 'auto' }}>
                        <div className="roadmap-flashcard-reading" style={{ fontSize: 16, color: '#78716c', marginBottom: 6, fontWeight: 700, letterSpacing: '0.5px' }}>
                          {currentVocab.reading || currentVocab.hiragana}
                        </div>
                        <div
                          className="roadmap-flashcard-term"
                          style={{
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
                            fontSize: 38,
                            fontWeight: 900,
                            color: '#1c1917',
                            marginBottom: 10,
                            letterSpacing: '1px'
                          }}
                        >
                          {currentVocab.term || currentVocab.kanji || currentVocab.reading}
                        </div>
                        {currentVocab.part_of_speech && (
                          <span className="roadmap-flashcard-pos" style={{ fontSize: 11, padding: '2px 10px', borderRadius: 4, backgroundColor: '#f5f5f4', color: '#57534e', fontWeight: 700, border: '1px solid #e7e5e4' }}>
                            {currentVocab.part_of_speech}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* BACK: PURE VIETNAMESE */
                      <div style={{ width: '100%', maxWidth: 500, margin: 'auto' }}>
                        <div className="roadmap-flashcard-meaning" style={{ fontSize: 26, fontWeight: 900, color: '#9c2a2a', marginBottom: 6 }}>
                          {currentVocab.meaning_vi || currentVocab.vietnameseMeaning}
                        </div>
                        {currentVocab.sinoVietnamese && (
                          <div className="roadmap-flashcard-sino" style={{ fontSize: 13, color: '#78716c', marginBottom: 12, fontWeight: 700 }}>
                            〔 {currentVocab.sinoVietnamese} 〕
                          </div>
                        )}
                        {currentVocab.exampleSentenceJp && (
                          <div
                            className="roadmap-flashcard-example-box"
                            style={{
                              background: 'rgba(250, 248, 245, 0.95)',
                              padding: '12px 16px',
                              borderRadius: 10,
                              border: '1px solid #ebe7df',
                              borderLeft: '3px solid #c53d32',
                              textAlign: 'left',
                              marginTop: 10,
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                              <div className="roadmap-flashcard-example-jp" style={{ fontSize: 13.5, color: '#1c2536', fontWeight: 700 }}>
                                {currentVocab.exampleSentenceJp}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakJapanese(currentVocab.exampleSentenceJp || '');
                                }}
                                style={{ background: 'transparent', border: 'none', padding: 0, color: '#78716c', cursor: 'pointer' }}
                              >
                                <Volume2 size={13} />
                              </button>
                            </div>
                            <div className="roadmap-flashcard-example-vi" style={{ fontSize: 12, color: '#57534e' }}>
                              {currentVocab.exampleSentenceVi || 'Câu ví dụ tiếng Nhật chuẩn.'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Các nút điều hướng mũi tên & Chỉ dẫn duy nhất */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 28,
                      marginTop: 20
                    }}>
                      <button
                        onClick={() => handleNextCard(false)}
                        title="Mũi tên trái: Chưa học (←)"
                        aria-label="Chưa học"
                        className="transition-all hover:scale-110 active:scale-95"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          border: '1.5px solid rgba(239, 68, 68, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.12)'
                        }}
                      >
                        <ChevronLeft size={24} strokeWidth={2.5} />
                      </button>

                      <button
                        onClick={() => handleNextCard(true)}
                        title="Mũi tên phải: Đã học (→)"
                        aria-label="Đã học"
                        className="transition-all hover:scale-110 active:scale-95"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(34, 197, 94, 0.08)',
                          color: '#16a34a',
                          border: '1.5px solid rgba(34, 197, 94, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.12)'
                        }}
                      >
                        <ChevronRight size={24} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Chú thích duy nhất */}
                    <div className="roadmap-runner-muted" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 14,
                      fontSize: 12.5,
                      color: '#64748b',
                      textAlign: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <span>Chạm vào thẻ để lật (hoặc phím Space)</span>
                      <span style={{ color: '#94a3b8' }}>·</span>
                      <span>Mũi tên trái (hoặc vuốt trái) là chưa học</span>
                      <span style={{ color: '#94a3b8' }}>·</span>
                      <span>Mũi tên phải (hoặc vuốt phải) là đã học</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="roadmap-runner-muted" style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  Đang đồng bộ danh sách từ vựng từ Firestore...
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 2: GATEKEEPER 100% (TRẮC NGHIỆM PHẢN XẠ THUẦN TIẾNG VIỆT)
              ======================================================== */}
          {questIndex === 2 && (
            <div className="roadmap-runner-card" style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 className="roadmap-runner-title" style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={18} style={{ color: '#047857' }} />
                    <span>Cổng Phản Xạ 100% (Vocab Gatekeeper)</span>
                  </h3>
                  <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                    Tiêu chuẩn Người gác cổng: Đạt 100% (10/10 câu đúng) để mở khóa mốc!
                  </div>
                </div>

                <div className="roadmap-runner-title" style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Câu {quizIndex + 1} / {gatekeeperQuestions.length || 1} • Đúng: <b style={{ color: '#16a34a' }}>{quizScore}</b>
                </div>
              </div>

              {!quizFinished ? (
                gatekeeperQuestions[quizIndex] ? (
                  <div>
                    {/* Word display card */}
                    <div className="roadmap-gatekeeper-wordbox" style={{ backgroundColor: '#f8fafc', padding: '24px 20px', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: 24 }}>
                      <div className="roadmap-gatekeeper-reading" style={{ fontSize: 13.5, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                        {gatekeeperQuestions[quizIndex].reading}
                      </div>
                      <div className="roadmap-gatekeeper-word" style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
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
                            className={`roadmap-gatekeeper-option ${quizAnswered && isCorrect ? 'is-correct' : ''} ${quizAnswered && isChosen && !isCorrect ? 'is-wrong' : ''}`}
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
                          className="roadmap-btn-next"
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
                  <div className="roadmap-runner-muted" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Đang nạp câu hỏi trắc nghiệm...</div>
                )
              ) : (
                /* Gatekeeper Finished */
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  {quizScore === gatekeeperQuestions.length ? (
                    <div>
                      <Crown size={56} style={{ color: '#eab308', margin: '0 auto 12px', display: 'block' }} />
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', marginBottom: 8 }}>
                        XUẤT SẮC! BẠN ĐẠT ĐIỂM TUYỆT ĐỐI 100%!
                      </h3>
                      <p className="roadmap-runner-muted" style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>
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
                      <Lock size={56} style={{ color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>
                        CHƯA ĐẠT 100% — CỔNG VẪN ĐANG KHÓA!
                      </h3>
                      <p className="roadmap-runner-muted" style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>
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
            <div className="roadmap-runner-card" style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 className="roadmap-runner-title" style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Puzzle size={18} style={{ color: '#8b5cf6' }} />
                    <span>Kéo Thả Ghép Câu & Bẫy Trợ Từ</span>
                  </h3>
                  <div className="roadmap-runner-muted" style={{ fontSize: 13, color: '#64748b' }}>
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
                  <div className="roadmap-scramble-target" style={{ backgroundColor: '#f0fdf4', padding: '16px 20px', borderRadius: 12, border: '1px solid #bbf7d0', marginBottom: 20 }}>
                    <div className="roadmap-scramble-target-title" style={{ fontSize: 12, color: '#166534', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                      Ý nghĩa tiếng Việt cần diễn đạt:
                    </div>
                    <div className="roadmap-scramble-target-text" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {currentScramble.translation}
                    </div>
                  </div>

                  {/* DROP ZONE / ANSWER TRAY */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDropToTray}
                    className="roadmap-scramble-tray"
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
                      <span className="roadmap-runner-muted" style={{ color: '#94a3b8', fontSize: 13.5 }}>
                        Kéo thẻ từ hoặc bấm vào các thẻ bên dưới để xếp vào đây...
                      </span>
                    ) : (
                      userTokens.map((tok, idx) => (
                        <span
                          key={idx}
                          onClick={() => handleRemoveToken(idx)}
                          className="roadmap-scramble-tray-token"
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
                    <div className={scramblePassed ? 'roadmap-scramble-feedback-pass' : 'roadmap-scramble-feedback-fail'} style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 8, backgroundColor: scramblePassed ? '#dcfce7' : '#fee2e2', color: scramblePassed ? '#166534' : '#991b1b', fontSize: 13.5, fontWeight: 700 }}>
                      {scramblePassed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Check size={16} strokeWidth={3} style={{ color: '#16a34a' }} />
                          <span>Rất chính xác! Câu tiếng Nhật hoàn chỉnh: <b>{currentScramble.original}</b></span>
                        </div>
                      ) : (
                        <div>✕ Chưa chính xác! Câu mẫu chuẩn là: <b>{currentScramble.original}</b></div>
                      )}
                    </div>
                  )}

                  {/* Scrambled tokens pool (Draggable) */}
                  <div className="roadmap-scramble-pool" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12 }}>
                    {currentScramble.tokens.map((tok, idx) => (
                      <div
                        key={idx}
                        draggable={!scrambleChecked}
                        onDragStart={e => handleDragStartToken(e, idx)}
                        onClick={() => handlePickToken(tok)}
                        className="roadmap-scramble-pool-token"
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
                        className="roadmap-btn-next"
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
                        className="roadmap-btn-next"
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
                <div className="roadmap-runner-muted" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  Đang tải câu mẫu ngữ pháp từ Firestore...
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 4: ĐỐI THOẠI TÌNH HUỐNG 2 BÊN VỚI AI SENSEI (ROLEPLAY)
              ======================================================== */}
          {questIndex === 4 && (
            <div className="roadmap-runner-card" style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 className="roadmap-runner-title" style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageCircle size={18} style={{ color: '#0284c7' }} />
                    <span>Đối Thoại Tình Huống 2 Bên & Gặp Gỡ AI Sensei</span>
                  </h3>
                  <div className="roadmap-runner-muted" style={{ fontSize: 13, color: '#64748b' }}>
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0284c7', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={15} style={{ color: '#0284c7' }} />
                    <span>{currentDialogue.title}</span>
                  </div>

                  {/* SIDE A: SENSEI SPEECH BUBBLE */}
                  <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'flex-start' }}>
                    <div
                      className="roadmap-sensei-avatar"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: '#e0f2fe',
                        border: '2px solid #bae6fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 900,
                        color: '#0284c7',
                        flexShrink: 0
                      }}
                    >
                      先生
                    </div>

                    <div style={{ flex: 1 }}>
                      <div className="roadmap-sensei-name" style={{ fontSize: 12.5, fontWeight: 800, color: '#0369a1', marginBottom: 4 }}>
                        {currentDialogue.partnerName} · <span className="roadmap-runner-muted" style={{ color: '#64748b', fontWeight: 600 }}>{currentDialogue.partnerRole}</span>
                      </div>

                      <div
                        className="roadmap-sensei-bubble"
                        style={{
                          backgroundColor: '#f0f9ff',
                          border: '1.5px solid #bae6fd',
                          borderRadius: '0 16px 16px 16px',
                          padding: '16px 20px',
                          position: 'relative'
                        }}
                      >
                        <div className="roadmap-sensei-speech" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.5 }}>
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
                            className="roadmap-runner-muted"
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
                          <div className="roadmap-sensei-vi" style={{ marginTop: 8, fontSize: 13, color: '#0369a1', fontStyle: 'italic', borderTop: '1px solid #e0f2fe', paddingTop: 6 }}>
                            {currentDialogue.partnerSpeechVi}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SIDE B: LEARNER RESPONSE AREA */}
                  <div className="roadmap-learner-box" style={{ backgroundColor: '#f8fafc', padding: '20px 22px', borderRadius: 16, border: '1.5px solid #e2e8f0', marginBottom: 20 }}>
                    <div className="roadmap-learner-title" style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Target size={14} style={{ color: '#166534' }} />
                      <span>Nhiệm vụ của bạn:</span>
                    </div>
                    <div className="roadmap-learner-prompt" style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.5, marginBottom: 12 }}>
                      {currentDialogue.learnerPrompt}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <textarea
                        value={learnerInput}
                        onChange={e => setLearnerInput(e.target.value)}
                        placeholder="Nhập câu tiếng Nhật đáp lại Sensei vào đây..."
                        rows={3}
                        className="roadmap-learner-textarea"
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
                        className="roadmap-runner-muted"
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Lightbulb size={13} style={{ color: '#ca8a04' }} />
                        <span>{showSample ? 'Ẩn câu mẫu ví dụ' : 'Xem câu mẫu ví dụ'}</span>
                      </button>

                      {showSample && (
                        <div className="roadmap-sample-answer" style={{ marginTop: 6, padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, color: '#0f172a' }}>
                          Mẫu: <b>{currentDialogue.sampleAnswer}</b>
                        </div>
                      )}
                    </div>

                    {/* AI Sensei Evaluation Feedback + Human-in-the-loop Appeal (Stage 3 P2) */}
                    {senseiResult && (
                      <div
                        style={{
                          padding: '14px 18px',
                          borderRadius: 12,
                          backgroundColor: dialoguePassed ? '#ecfdf5' : '#fffbeb',
                          border: dialoguePassed ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                          color: dialoguePassed ? '#14532d' : '#92400e',
                          fontSize: 13.5,
                          marginBottom: 16
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900 }}>
                            <Sparkles size={15} style={{ color: dialoguePassed ? '#059669' : '#d97706' }} />
                            <span>AI Sensei chấm: {senseiResult.evaluatedScore}/10 điểm</span>
                            <span
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 999,
                                backgroundColor: dialoguePassed ? '#d1fae5' : '#fef3c7',
                                color: dialoguePassed ? '#065f46' : '#92400e',
                                fontWeight: 800
                              }}
                            >
                              {dialoguePassed ? 'Đạt chuẩn' : 'Cần cải thiện'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, opacity: 0.75, fontFamily: 'monospace' }}>
                            {senseiResult.model} • {senseiResult.latencyMs}ms
                          </span>
                        </div>

                        <div style={{ fontWeight: 700, lineHeight: 1.5, marginBottom: 8 }}>
                          {senseiResult.pedagogicalFeedback}
                        </div>

                        {senseiResult.particleErrors.length > 0 && (
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              backgroundColor: 'rgba(254, 226, 226, 0.75)',
                              border: '1px solid #fca5a5',
                              color: '#991b1b',
                              fontSize: 12.5,
                              marginBottom: 8
                            }}
                          >
                            <strong>Phát hiện lỗi trợ từ / cấu trúc:</strong>
                            <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                              {senseiResult.particleErrors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {senseiResult.naturalExpressionSuggestion && (
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              backgroundColor: 'rgba(255, 255, 255, 0.85)',
                              border: '1px solid rgba(15, 23, 42, 0.1)',
                              color: '#0f172a',
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              marginBottom: 10
                            }}
                          >
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', display: 'block' }}>
                                Gợi ý diễn đạt tự nhiên bản xứ:
                              </span>
                              <strong>{senseiResult.naturalExpressionSuggestion}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => speakJapanese(senseiResult.naturalExpressionSuggestion)}
                              style={{
                                background: '#e0f2fe',
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 10px',
                                color: '#0369a1',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                flexShrink: 0
                              }}
                            >
                              <Volume2 size={13} /> Nghe
                            </button>
                          </div>
                        )}

                        {/* Human-in-the-loop Appeal Trigger */}
                        {appealSubmittedId ? (
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: 12.5,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Đã gửi khiếu nại phúc khảo (#{appealSubmittedId}) lên Admin. Nếu được phê duyệt, bạn sẽ được hoàn +25 AP!</span>
                          </div>
                        ) : !showAppealForm ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => setShowAppealForm(true)}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(180, 83, 9, 0.35)',
                                borderRadius: 8,
                                padding: '5px 10px',
                                color: '#b45309',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}
                            >
                              <ShieldAlert size={13} />
                              <span>Khiếu nại AI chấm sai (Gửi Admin phúc khảo)</span>
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 12,
                              borderRadius: 10,
                              backgroundColor: '#ffffff',
                              border: '1px solid #fcd34d',
                              color: '#0f172a'
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309', marginBottom: 6 }}>
                              Gửi phiếu phúc khảo điểm AI cho Giáo viên / Admin:
                            </div>
                            <textarea
                              value={appealReason}
                              onChange={e => setAppealReason(e.target.value)}
                              rows={2}
                              placeholder="Giải thích lý do bạn cho rằng câu của mình đúng ngữ cảnh hoặc tự nhiên..."
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                fontSize: 13,
                                boxSizing: 'border-box',
                                marginBottom: 8
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setShowAppealForm(false)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#475569',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                disabled={!appealReason.trim() || submittingAppeal}
                                onClick={handleSubmitAppeal}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  border: 'none',
                                  backgroundColor: appealReason.trim() ? '#d97706' : '#94a3b8',
                                  color: '#ffffff',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: appealReason.trim() ? 'pointer' : 'not-allowed'
                                }}
                              >
                                {submittingAppeal ? 'Đang gửi...' : 'Gửi khiếu nại phúc khảo'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        onClick={handleEvaluateDialogue}
                        disabled={!learnerInput.trim() || evaluatingSensei}
                        className="roadmap-btn-send"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '10px 22px',
                          backgroundColor: learnerInput.trim() && !evaluatingSensei ? '#0f172a' : '#94a3b8',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 13.5,
                          border: 'none',
                          cursor: learnerInput.trim() && !evaluatingSensei ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <Send size={14} /> {evaluatingSensei ? 'AI Sensei đang chấm...' : 'Gửi AI Sensei chấm điểm'}
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
