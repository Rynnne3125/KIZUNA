import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { KanjiItem } from '../types/kizuna';

export const KanjiPage: React.FC = () => {
  const [kanjiList, setKanjiList] = useState<KanjiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);

  useEffect(() => {
    async function loadKanji() {
      try {
        const list = await kizunaService.getKanji();
        setKanjiList(list);
        if (list.length > 0) setSelectedKanji(list[0]);
      } finally {
        setLoading(false);
      }
    }
    loadKanji();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-primary" style={{ marginBottom: 6 }}>
          🈸 TỰ ĐIỂN CHỮ HÁN KIZUNA (2,216 CHỮ HÁN N5 - N1)
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
          Tra Cứu & Ghi Nhớ Chữ Hán Theo Mẹo Nhớ Trực Quan
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Học chữ Hán qua hình ảnh tượng hình, số nét, âm Hán Việt, âm On/Kun và từ ghép thực tế.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang nạp chữ Hán...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Kanji Grid */}
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 12
            }}>
              {kanjiList.map(item => {
                const isSelected = selectedKanji?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedKanji(item)}
                    className="kizuna-card"
                    style={{
                      padding: '14px 8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #16a34a' : '1px solid var(--border-color)',
                      background: isSelected ? '#ecfdf5' : '#ffffff'
                    }}
                  >
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
                      {item.kanji}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                      {item.sinoVietnamese}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kanji Detail Preview */}
          {selectedKanji && (
            <div className="kizuna-card" style={{ padding: 28, height: 'fit-content', position: 'sticky', top: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{
                  width: 90,
                  height: 90,
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 54,
                  fontWeight: 900,
                  color: '#16a34a'
                }}>
                  {selectedKanji.kanji}
                </div>
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    {selectedKanji.sinoVietnamese}
                  </h2>
                  <div style={{ fontSize: 16, color: '#059669', fontWeight: 600 }}>
                    {selectedKanji.vietnameseMeaning}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Số nét vẽ: <strong>{selectedKanji.strokeCount} nét</strong>
                  </div>
                </div>
              </div>

              {/* Readings */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 20,
                background: '#f8fafc',
                padding: 14,
                borderRadius: 'var(--radius-sm)'
              }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ÂM ON (Katakana):</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                    {selectedKanji.onyomi || '—'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ÂM KUN (Hiragana):</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#4f46e5', marginTop: 2 }}>
                    {selectedKanji.kunyomi || '—'}
                  </div>
                </div>
              </div>

              {/* Mnemonic Story */}
              {selectedKanji.mnemonicStory && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    🧠 Mẹo nhớ chữ Hán:
                  </div>
                  <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                    {selectedKanji.mnemonicStory}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
