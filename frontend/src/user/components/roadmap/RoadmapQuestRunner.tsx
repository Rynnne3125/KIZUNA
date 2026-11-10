import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw
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
  // QUEST 1: SRS FLASHCARDS
  // -------------------------------------------------------------
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  const currentVocab = vocabList[cardIndex] || null;

  const handleNextCard = (mastered: boolean) => {
    if (mastered) {
      setMasteredCards(prev => new Set(prev).add(cardIndex));
    }
    setIsFlipped(false);
    if (cardIndex < vocabList.length - 1) {
      setCardIndex(prev => prev + 1);
    }
  };

  // -------------------------------------------------------------
  // QUEST 2: GATEKEEPER 100% QUIZ
  // -------------------------------------------------------------
  const gatekeeperQuestions = useMemo(() => {
    if (vocabList.length < 4) return [];
    // Generate up to 10 questions from real vocab list
    const pool = [...vocabList].sort(() => Math.random() - 0.5);
    const selected = pool.slice(0, Math.min(10, pool.length));

    return selected.map(item => {
      const wrongOptions = pool
        .filter(w => w.id !== item.id && (w.meaning_vi || w.vietnameseMeaning))
        .map(w => w.meaning_vi || w.vietnameseMeaning)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const correctAnswer = item.meaning_vi || item.vietnameseMeaning || 'Nghĩa từ vựng';
      const allOptions = [...wrongOptions, correctAnswer].sort(() => Math.random() - 0.5);

      return {
        word: item.term || item.kanji || item.reading,
        reading: item.reading || item.hiragana || '',
        correctAnswer,
        options: allOptions
      };
    });
  }, [vocabList]);

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
  // QUEST 3: GRAMMAR SCRAMBLE DRILL
  // -------------------------------------------------------------
  const scrambleSentences = useMemo(() => {
    const list: Array<{ original: string; translation: string; tokens: string[] }> = [];

    // From grammar_items examples
    grammarList.forEach(g => {
      if (Array.isArray(g.examples)) {
        g.examples.forEach((ex: any) => {
          if (ex.sentence && ex.translation && ex.sentence.length >= 4 && ex.sentence.length <= 25) {
            // Split sentence into 3 to 6 logical parts/tokens
            const clean = ex.sentence.replace(/。$/, '');
            const rawTokens = clean.match(/[\u4e00-\u9faf]+|[ぁ-ん]+|[ァ-ヴー]+|[A-Za-z0-9]+|[^\s]/g) || [clean];
            if (rawTokens.length >= 3 && rawTokens.length <= 7) {
              list.push({
                original: ex.sentence,
                translation: ex.translation,
                tokens: rawTokens.sort(() => Math.random() - 0.5)
              });
            }
          }
        });
      }
    });

    // Fallback patterns from questData if no examples in grammarList
    if (list.length === 0 && questData?.patterns) {
      questData.patterns.forEach((p: any) => {
        list.push({
          original: `${p.structure || p.title}。`,
          translation: p.meaning || p.title,
          tokens: (p.structure || p.title).split('').sort(() => Math.random() - 0.5)
        });
      });
    }

    return list.slice(0, 4);
  }, [grammarList, questData]);

  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [userTokens, setUserTokens] = useState<string[]>([]);
  const [scrambleChecked, setScrambleChecked] = useState(false);
  const [scramblePassed, setScramblePassed] = useState(false);
  const [scrambleCompletedCount, setScrambleCompletedCount] = useState(0);

  const currentScramble = scrambleSentences[scrambleIndex];

  const handlePickToken = (tok: string, idx: number) => {
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
  // QUEST 4: SENSEI AI CHALLENGE
  // -------------------------------------------------------------
  const prompts = useMemo(() => {
    return Array.isArray(questData?.prompts) && questData.prompts.length > 0
      ? questData.prompts
      : [
          {
            q: `Hãy vận dụng các cấu trúc ngữ pháp và từ vựng trong mốc ${milestone.title} để viết câu hoàn chỉnh chia sẻ cùng Sensei.`,
            hint: 'Sử dụng các mẫu câu đã học trong bài.',
            need: ['です', 'ます'],
            ex: 'わたしは がくせいです。にほんごを べんきょうしています。'
          }
        ];
  }, [questData, milestone.title]);

  const [promptIndex, setPromptIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [senseiFeedback, setSenseiFeedback] = useState<string | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [passedPrompts, setPassedPrompts] = useState<Set<number>>(new Set());

  const currentPrompt = prompts[promptIndex];

  const handleEvaluateSensei = () => {
    if (!userResponse.trim()) return;

    const trimmed = userResponse.trim();
    const needs = currentPrompt.need || [];
    const missing = needs.filter((n: string) => !trimmed.includes(n));

    if (trimmed.length < 5) {
      setSenseiFeedback('⚠️ Câu văn hơi ngắn. Hãy viết câu hoàn chỉnh có chủ ngữ và vị ngữ lịch sự (〜です／〜ます) nhé!');
      return;
    }

    if (missing.length > 0) {
      setSenseiFeedback(`⚠️ Câu của bạn tốt nhưng nên bổ sung thêm thành phần trọng tâm [${missing.join(', ')}] để đạt chuẩn giao tiếp nhé!`);
      return;
    }

    // Success evaluation
    setSenseiFeedback('🎉 すばらしい！(Tuyệt vời!). Bạn đã diễn đạt tự nhiên, chuẩn ngữ pháp và đúng trọng tâm ngữ cảnh giao tiếp của bài học!');
    setPassedPrompts(prev => new Set(prev).add(promptIndex));
  };

  // Final submit handler for any quest
  const handleCompleteCurrentQuest = async () => {
    setSubmitting(true);
    const xp = questData?.xpReward || (questIndex === 1 ? 30 : questIndex === 2 ? 35 : questIndex === 3 ? 40 : 50);
    const ap = questData?.activePointsReward || (questIndex === 1 ? 15 : questIndex === 2 ? 20 : questIndex === 3 ? 25 : 30);
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
        <p style={{ color: '#64748b', fontWeight: 600 }}>Đang chuẩn bị dữ liệu bài học từ Firestore...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
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
            {questIndex === 1 && '🎴 SRS Flashcards'}
            {questIndex === 2 && '🛡️ Người gác cổng (100%)'}
            {questIndex === 3 && '🧩 Ngữ pháp ghép câu & Bẫy'}
            {questIndex === 4 && '🌸 Thử thách AI Sensei'}
          </span>
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
            CHÚC MỪNG BẠN ĐÃ HOÀN THÀNH NHIỆM VỤ {questIndex}!
          </h2>
          <p style={{ color: '#475569', fontSize: 14, maxWidth: 500, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            Kết quả học tập đã được lưu trực tiếp vào Firestore. Điểm năng động, kinh nghiệm XP và chuỗi ngày học Streak đã được cộng vào hồ sơ cá nhân của bạn!
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ backgroundColor: '#ecfdf5', padding: '10px 20px', borderRadius: 10, border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: 12, color: '#047857', fontWeight: 700 }}>XP nhận được</div>
              <div style={{ fontSize: 20, color: '#065f46', fontWeight: 900 }}>+{questData?.xpReward || 30} XP</div>
            </div>
            <div style={{ backgroundColor: '#fffbeb', padding: '10px 20px', borderRadius: 10, border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Điểm Năng Động</div>
              <div style={{ fontSize: 20, color: '#92400e', fontWeight: 900 }}>+{questData?.activePointsReward || 15} pts</div>
            </div>
          </div>

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
            Tiếp tục lộ trình học tập
          </button>
        </div>
      ) : (
        <>
          {/* ========================================================
              QUEST 1: SRS FLASHCARD INTERACTIVE RUNNER
              ======================================================== */}
          {questIndex === 1 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Thẻ học Flashcards SRS: {milestone.title}
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Thẻ {cardIndex + 1} / {vocabList.length || 1} • Đã ghi nhớ: <b style={{ color: '#16a34a' }}>{masteredCards.size}</b>
                  </div>
                </div>

                <button
                  onClick={handleCompleteCurrentQuest}
                  disabled={submitting || masteredCards.size === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 18px',
                    borderRadius: 8,
                    backgroundColor: masteredCards.size > 0 ? '#10b981' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: masteredCards.size > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Hoàn thành Quest 1</span>
                </button>
              </div>

              {currentVocab ? (
                <div>
                  {/* The interactive Flashcard */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    style={{
                      minHeight: 260,
                      backgroundColor: isFlipped ? '#f8fafc' : '#ffffff',
                      border: isFlipped ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 32,
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: 'var(--shadow-md)',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      marginBottom: 24
                    }}
                  >
                    <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                      <RotateCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Nhấn vào thẻ để lật
                    </span>

                    {!isFlipped ? (
                      /* FRONT */
                      <div>
                        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>
                          {currentVocab.reading || currentVocab.hiragana}
                        </div>
                        <div style={{ fontSize: 44, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
                          {currentVocab.term || currentVocab.kanji || currentVocab.reading}
                        </div>
                        {currentVocab.part_of_speech && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                            {currentVocab.part_of_speech}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* BACK */
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginBottom: 8 }}>
                          {currentVocab.meaning_vi || currentVocab.vietnameseMeaning}
                        </div>
                        {currentVocab.sinoVietnamese && (
                          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: 700 }}>
                            Âm Hán Việt: [<b>{currentVocab.sinoVietnamese}</b>]
                          </div>
                        )}
                        {currentVocab.exampleSentenceJp && (
                          <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 12, textAlign: 'left', maxWidth: 450 }}>
                            <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, marginBottom: 4 }}>
                              {currentVocab.exampleSentenceJp}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#64748b' }}>
                              {currentVocab.exampleSentenceVi}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flashcard actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <button
                      onClick={() => speakJapanese(currentVocab.term || currentVocab.reading)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 10,
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Volume2 size={18} /> Phát âm
                    </button>

                    <button
                      onClick={() => handleNextCard(false)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 10,
                        backgroundColor: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        color: '#b45309',
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: 'pointer'
                      }}
                    >
                      Cần ôn lại
                    </button>

                    <button
                      onClick={() => handleNextCard(true)}
                      style={{
                        padding: '12px 28px',
                        borderRadius: 10,
                        backgroundColor: '#ecfdf5',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Đã nhớ từ này
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  Đang đồng bộ danh sách từ vựng của mốc từ Firestore...
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 2: GATEKEEPER 100% RUNNER
              ======================================================== */}
          {questIndex === 2 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    🛡️ Cổng Phản Xạ 100% (Vocab Gatekeeper)
                  </h3>
                  <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                    Quy tắc Người gác cổng: Bắt buộc đạt 100% độ chính xác để qua cổng!
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Câu {quizIndex + 1} / {gatekeeperQuestions.length || 1} • Điểm: {quizScore}
                </div>
              </div>

              {!quizFinished ? (
                gatekeeperQuestions[quizIndex] ? (
                  <div>
                    {/* Question Card */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '24px 20px', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: 24 }}>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                        {gatekeeperQuestions[quizIndex].reading}
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                        {gatekeeperQuestions[quizIndex].word}
                      </div>
                      <button
                        onClick={() => speakJapanese(gatekeeperQuestions[quizIndex].word)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}
                      >
                        <Volume2 size={16} /> Nghe phát âm
                      </button>
                    </div>

                    {/* Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
                      {gatekeeperQuestions[quizIndex].options.map((opt, i) => {
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
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Đang sinh bộ câu hỏi trắc nghiệm...</div>
                )
              ) : (
                /* Quiz Finished Screen */
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  {quizScore === gatekeeperQuestions.length ? (
                    <div>
                      <div style={{ fontSize: 56, marginBottom: 12 }}>👑</div>
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', marginBottom: 8 }}>
                        XUẤT SẮC! BẠN ĐẠT ĐIỂM TUYỆT ĐỐI 100%!
                      </h3>
                      <p style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>
                        Bạn đã trả lời đúng {quizScore}/{gatekeeperQuestions.length} câu. Cổng Người gác cổng đã chính thức mở ra!
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
                        {submitting ? 'Đang lưu kết quả...' : 'Lưu kết quả & Hoàn thành Quest 2 ➔'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>
                        CHƯA ĐẠT 100% — CỔNG VẪN ĐANG KHÓA!
                      </h3>
                      <p style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>
                        Bạn đạt {quizScore}/{gatekeeperQuestions.length} câu đúng. Thử thách Người gác cổng yêu cầu 100% để đảm bảo phản xạ tiếng Nhật chuẩn mực.
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
              QUEST 3: GRAMMAR DRILL & SCRAMBLE RUNNER
              ======================================================== */}
          {questIndex === 3 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    🧩 Ngữ Pháp Ghép Câu & Nhận Diện Bẫy Trợ Từ
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Ghép các thẻ từ xáo trộn thành câu tiếng Nhật hoàn chỉnh ({scrambleIndex + 1}/{scrambleSentences.length || 1})
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
                      Ý nghĩa tiếng Việt:
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {currentScramble.translation}
                    </div>
                  </div>

                  {/* Answer tray */}
                  <div
                    style={{
                      minHeight: 60,
                      backgroundColor: '#f8fafc',
                      border: scrambleChecked ? (scramblePassed ? '2px solid #16a34a' : '2px solid #ef4444') : '2px dashed #cbd5e1',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 20
                    }}
                  >
                    {userTokens.length === 0 ? (
                      <span style={{ color: '#94a3b8', fontSize: 13.5 }}>Bấm vào các thẻ từ bên dưới để xếp câu...</span>
                    ) : (
                      userTokens.map((tok, idx) => (
                        <span
                          key={idx}
                          onClick={() => handleRemoveToken(idx)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#ffffff',
                            border: '1.5px solid #0f172a',
                            borderRadius: 8,
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#0f172a',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          {tok}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Feedback */}
                  {scrambleChecked && (
                    <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 8, backgroundColor: scramblePassed ? '#dcfce7' : '#fee2e2', color: scramblePassed ? '#166534' : '#991b1b', fontSize: 13.5, fontWeight: 700 }}>
                      {scramblePassed ? (
                        <div>✓ Chính xác! Câu hoàn chỉnh: <b>{currentScramble.original}</b></div>
                      ) : (
                        <div>✕ Chưa chính xác! Câu mẫu đúng là: <b>{currentScramble.original}</b></div>
                      )}
                    </div>
                  )}

                  {/* Available tokens pool */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                    {currentScramble.tokens.map((tok, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePickToken(tok, idx)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#1e293b',
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {tok}
                      </button>
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
                        Kiểm tra câu
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
                  Đang tải dữ liệu câu mẫu ngữ pháp từ Firestore...
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              QUEST 4: SENSEI AI RUNNER
              ======================================================== */}
          {questIndex === 4 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    🌸 Thử Thách Giao Tiếp & Gặp Gỡ AI Sensei
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Tình huống thực tế {promptIndex + 1} / {prompts.length}
                  </div>
                </div>

                <button
                  onClick={handleCompleteCurrentQuest}
                  disabled={submitting || passedPrompts.size === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 18px',
                    borderRadius: 8,
                    backgroundColor: passedPrompts.size > 0 ? '#10b981' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: passedPrompts.size > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Hoàn thành Quest 4</span>
                </button>
              </div>

              {currentPrompt && (
                <div>
                  {/* Scenario */}
                  <div style={{ backgroundColor: '#f0f9ff', padding: '18px 20px', borderRadius: 12, border: '1px solid #bae6fd', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                      Tình huống giao tiếp từ Sensei:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.5, marginBottom: 8 }}>
                      {currentPrompt.q}
                    </div>
                    {currentPrompt.hint && (
                      <div style={{ fontSize: 13, color: '#0369a1' }}>
                        💡 <b>Gợi ý mẫu câu:</b> {currentPrompt.hint}
                      </div>
                    )}
                  </div>

                  {/* Japanese Input */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      Câu trả lời tiếng Nhật của bạn:
                    </label>
                    <textarea
                      value={userResponse}
                      onChange={e => setUserResponse(e.target.value)}
                      placeholder="Nhập câu tiếng Nhật của bạn vào đây (ví dụ: わたしは 田中です。ベトナムじんです。)..."
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

                  {/* Feedback from Sensei */}
                  {senseiFeedback && (
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: 10,
                        backgroundColor: senseiFeedback.includes('🎉') ? '#ecfdf5' : '#fffbeb',
                        border: senseiFeedback.includes('🎉') ? '1px solid #86efac' : '1px solid #fde68a',
                        color: senseiFeedback.includes('🎉') ? '#166534' : '#b45309',
                        fontSize: 13.5,
                        fontWeight: 700,
                        lineHeight: 1.5,
                        marginBottom: 20
                      }}
                    >
                      {senseiFeedback}
                    </div>
                  )}

                  {/* Actions & Sample sentence toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      {currentPrompt.ex && (
                        <button
                          onClick={() => setShowExample(!showExample)}
                          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {showExample ? 'Ẩn câu mẫu' : 'Xem câu mẫu tham khảo'}
                        </button>
                      )}
                      {showExample && currentPrompt.ex && (
                        <div style={{ marginTop: 6, fontSize: 13, color: '#334155', fontStyle: 'italic' }}>
                          Mẫu: "{currentPrompt.ex}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={handleEvaluateSensei}
                        disabled={!userResponse.trim()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 22px',
                          backgroundColor: userResponse.trim() ? '#0f172a' : '#94a3b8',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 13.5,
                          border: 'none',
                          cursor: userResponse.trim() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <Send size={15} /> Gửi bài cho Sensei
                      </button>

                      {prompts.length > 1 && (
                        <button
                          onClick={() => {
                            setPromptIndex((promptIndex + 1) % prompts.length);
                            setUserResponse('');
                            setSenseiFeedback(null);
                            setShowExample(false);
                          }}
                          style={{
                            padding: '10px 18px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 13.5,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          Tình huống khác ➔
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
