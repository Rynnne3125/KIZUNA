import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { Exam } from '../types/kizuna';

export const ExamPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('ALL');
  
  // Test-taking mode
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ total: number; correct: number } | null>(null);
  const [loadingExamDetail, setLoadingExamDetail] = useState(false);

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

  const handleStartExam = async (examId: string) => {
    setLoadingExamDetail(true);
    try {
      const fullExam = await kizunaService.getExamById(examId);
      if (fullExam) {
        setActiveExam(fullExam);
        setUserAnswers({});
        setIsSubmitted(false);
        setScoreResult(null);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitExam = () => {
    setActiveExam(null);
    setUserAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
  };

  // If in active exam mode, render the test-taking interface
  if (activeExam) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
        {/* Exam Header */}
        <div style={{
          position: 'sticky',
          top: 60,
          background: '#ffffff',
          zIndex: 90,
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-primary">{activeExam.level}</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {activeExam.label}
              </h2>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Thời lượng: {activeExam.durationMinutes} phút • Tổng số câu: {activeExam.actualQuestionCount || activeExam.totalQuestions}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isSubmitted ? (
              <button
                onClick={handleSubmitExam}
                className="btn btn-primary"
                style={{ background: '#10b981', borderColor: '#059669' }}
              >
                🏁 Nộp Bài Chấm Điểm
              </button>
            ) : (
              <span className="badge badge-success" style={{ fontSize: 14, padding: '8px 14px' }}>
                Điểm: {scoreResult?.correct} / {scoreResult?.total} câu đúng ({Math.round(((scoreResult?.correct || 0) / (scoreResult?.total || 1)) * 100)}%)
              </span>
            )}
            <button
              onClick={handleExitExam}
              className="btn btn-secondary"
            >
              ✕ Thoát phòng thi
            </button>
          </div>
        </div>

        {/* Audio Player if exam has listening track */}
        {activeExam.audioUrl && (
          <div className="kizuna-card" style={{ padding: 16, marginBottom: 24, background: '#f8fafc' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
              🎧 File Nghe Audio Chính Thức (JLPT Official Choukai Audio):
            </div>
            <audio src={activeExam.audioUrl} controls style={{ width: '100%', outline: 'none' }} />
          </div>
        )}

        {/* Questions by Question Sets */}
        {activeExam.questionSets && activeExam.questionSets.map((qs, setIdx) => (
          <div key={qs.id || setIdx} className="kizuna-card" style={{ padding: 24, marginBottom: 24 }}>
            {/* Mondai Title */}
            <div style={{
              background: '#f1f5f9',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: 16,
              borderLeft: '4px solid #dc2626'
            }}>
              Phần {qs.part === 1 ? 'Kiến Thức Ngôn Ngữ & Đọc Hiểu' : 'Nghe Hiểu (Choukai)'}: {qs.title}
            </div>

            {/* Reading Passage if any */}
            {qs.content && (
              <div style={{
                background: '#fafafa',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-sm)',
                padding: 16,
                marginBottom: 20,
                fontSize: 14,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap'
              }} dangerouslySetInnerHTML={{ __html: qs.content }} />
            )}

            {/* Questions in this set */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {qs.questions.map((q, qIdx) => {
                const selected = userAnswers[q.id];
                const isCorrect = isSubmitted && selected === q.correctAnswer;

                return (
                  <div
                    key={q.id || qIdx}
                    style={{
                      borderBottom: '1px dashed #e2e8f0',
                      paddingBottom: 20
                    }}
                  >
                    {/* Question Stem */}
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                      <span style={{ color: '#dc2626', marginRight: 6 }}>Câu {q.index || (qIdx + 1)}.</span>
                      <span dangerouslySetInnerHTML={{ __html: q.question }} />
                    </div>

                    {/* Choices (Options 1, 2, 3, 4) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      {q.options.map(opt => {
                        const isChosen = selected === opt.id;
                        const isRightAnswer = isSubmitted && q.correctAnswer === opt.id;

                        let optBg = '#ffffff';
                        let optBorder = 'var(--border-color)';
                        let optColor = '#0f172a';

                        if (isSubmitted) {
                          if (isRightAnswer) {
                            optBg = '#dcfce7';
                            optBorder = '#22c55e';
                            optColor = '#15803d';
                          } else if (isChosen && !isRightAnswer) {
                            optBg = '#fee2e2';
                            optBorder = '#ef4444';
                            optColor = '#991b1b';
                          }
                        } else if (isChosen) {
                          optBg = '#fee2e2';
                          optBorder = '#dc2626';
                          optColor = '#dc2626';
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            style={{
                              background: optBg,
                              border: `1.5px solid ${optBorder}`,
                              color: optColor,
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              textAlign: 'left',
                              fontSize: 14,
                              fontWeight: isChosen || isRightAnswer ? 700 : 500,
                              cursor: isSubmitted ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: isChosen ? '#dc2626' : '#f1f5f9',
                              color: isChosen ? '#fff' : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700
                            }}>
                              {opt.id}
                            </span>
                            <span>{opt.value}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Detailed Explanation upon submission */}
                    {isSubmitted && (
                      <div style={{
                        marginTop: 14,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-sm)',
                        padding: 12,
                        fontSize: 13
                      }}>
                        <div style={{ fontWeight: 700, color: isCorrect ? '#15803d' : '#dc2626', marginBottom: 4 }}>
                          {isCorrect ? '✅ Đáp án đúng!' : `❌ Đáp án chính xác là: (${q.correctAnswer})`}
                        </div>
                        {q.explanation && (
                          <div style={{ color: '#334155', marginBottom: 4 }}>
                            <strong>💡 Giải thích chi tiết:</strong>{' '}
                            <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                          </div>
                        )}
                        {q.script && (
                          <div style={{ color: '#64748b' }}>
                            <strong>📜 Dịch nghĩa / Kịch bản:</strong>{' '}
                            <span dangerouslySetInnerHTML={{ __html: q.script }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Catalog view
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: 6 }}>
            🎯 NGÂN HÀNG ĐỀ THI JLPT (85 BỘ ĐỀ N5 - N1)
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Luyện Thi Thực Chiến & Chấm Điểm Chi Tiết
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Đề thi chuẩn các năm (2011 ➔ 2024), có audio nghe chính thức, tính giờ thi và lời giải thích tiếng Việt.
          </p>
        </div>

        {/* Level Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className="btn btn-sm"
              style={{
                background: levelFilter === lvl ? '#dc2626' : '#ffffff',
                color: levelFilter === lvl ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: levelFilter === lvl ? '#dc2626' : 'var(--border-color)',
                fontWeight: 700
              }}
            >
              {lvl === 'ALL' ? 'Tất cả cấp độ' : lvl}
            </button>
          ))}
        </div>
      </div>

      {loading || loadingExamDetail ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          {loadingExamDetail ? 'Đang mở phòng thi và tải câu hỏi...' : 'Đang nạp danh mục đề thi...'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20
        }}>
          {exams.map(exam => (
            <div key={exam.id} className="kizuna-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="badge badge-primary">{exam.level}</span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  ⏱️ {exam.durationMinutes} phút
                </span>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                {exam.label}
              </h3>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, fontSize: 11 }}>
                <span className="badge badge-secondary">
                  📝 {exam.actualQuestionCount || exam.totalQuestions} câu hỏi
                </span>
                {exam.audioUrl && (
                  <span className="badge badge-success">
                    🎧 Có File Nghe Audio
                  </span>
                )}
                {exam.explanationCount && exam.explanationCount > 0 ? (
                  <span className="badge badge-warning">
                    💡 {exam.explanationCount} câu có giải thích
                  </span>
                ) : null}
              </div>

              <button
                onClick={() => handleStartExam(exam.id)}
                className="btn btn-primary"
                style={{ marginTop: 'auto', width: '100%' }}
              >
                Vào làm bài thi thử ➔
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
