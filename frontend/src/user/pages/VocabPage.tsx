import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { VocabularyItem } from '../types/kizuna';

export const VocabPage: React.FC = () => {
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadVocab() {
      try {
        const list = await kizunaService.getVocabulary();
        setVocabList(list);
      } finally {
        setLoading(false);
      }
    }
    loadVocab();
  }, []);

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = vocabList.filter(item => {
    const matchSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vietnameseMeaning.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: 6 }}>
            📖 KHO TỪ VỰNG KIZUNA (13,096 TỪ N5 - N1)
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            Học Từ Vựng Qua Thẻ Flashcard Tương Tác
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Click vào bất kỳ thẻ nào để lật xem cách đọc Hiragana, âm Hán Việt và câu ví dụ ngữ cảnh thực tế.
          </p>
        </div>

        <div style={{ minWidth: 260 }}>
          <input
            type="text"
            placeholder="🔍 Tìm từ vựng, Hiragana, nghĩa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: 14,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang nạp từ vựng...</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20
        }}>
          {filtered.map(item => {
            const isFlipped = !!flippedCards[item.id];
            return (
              <div
                key={item.id}
                className={`flashcard ${isFlipped ? 'flipped' : ''}`}
                onClick={() => toggleFlip(item.id)}
              >
                <div className="flashcard-inner">
                  <div className="flashcard-front">
                    <span className="badge badge-secondary" style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
                      Từ vựng
                    </span>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                      {item.term}
                    </div>
                    <div style={{ fontSize: 16, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
                      {item.reading}
                    </div>
                    {item.sinoVietnamese && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '1px' }}>
                        [{item.sinoVietnamese}]
                      </div>
                    )}
                    <div style={{ marginTop: 'auto', fontSize: 11, color: '#94a3b8' }}>
                      (Bấm để lật xem nghĩa & ví dụ)
                    </div>
                  </div>

                  <div className="flashcard-back">
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', marginBottom: 12 }}>
                      {item.vietnameseMeaning}
                    </div>
                    {item.exampleSentenceJp && (
                      <div style={{
                        background: '#ffffff',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        textAlign: 'left',
                        width: '100%',
                        border: '1px solid #fbcfe8'
                      }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                          {item.exampleSentenceJp}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          {item.exampleSentenceVi}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 'auto', fontSize: 11, color: '#94a3b8' }}>
                      (Bấm để lật lại)
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
