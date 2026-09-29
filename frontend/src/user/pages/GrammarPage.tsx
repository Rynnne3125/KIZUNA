import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { GrammarItem } from '../types/kizuna';

export const GrammarPage: React.FC = () => {
  const [grammarList, setGrammarList] = useState<GrammarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GrammarItem | null>(null);

  useEffect(() => {
    async function loadGrammar() {
      try {
        const list = await kizunaService.getGrammar();
        setGrammarList(list);
        if (list.length > 0) setSelectedItem(list[0]);
      } finally {
        setLoading(false);
      }
    }
    loadGrammar();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-primary" style={{ marginBottom: 6 }}>
          📝 THƯ VIỆN NGỮ PHÁP (605 MẪU CÂU N5 - N1)
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
          Ngữ Pháp Tiếng Nhật Thực Chiến & Sắc Thái Tự Nhiên
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Tổng hợp cấu trúc, phân tích lý do người Nhật dùng mẫu câu này và các ví dụ hội thoại chuẩn mực.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang nạp ngữ pháp...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grammarList.map(item => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="kizuna-card"
                  style={{
                    padding: 16,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #dc2626' : '1px solid var(--border-color)',
                    background: isSelected ? '#fef2f2' : '#ffffff'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>
                    {item.pattern}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {item.titleVi}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedItem && (
            <div className="kizuna-card" style={{ padding: 28, height: 'fit-content', position: 'sticky', top: 120 }}>
              <span className="badge badge-primary" style={{ marginBottom: 12 }}>
                Chi tiết cấu trúc
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>
                {selectedItem.pattern}
              </h2>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                {selectedItem.titleVi}
              </div>

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
                  📖 Ý nghĩa & Giải thích:
                </h4>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                  {selectedItem.explanation}
                </p>
              </div>

              {selectedItem.nuanceReason && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                  marginBottom: 20
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    💡 Sắc thái tự nhiên & Lý do người Nhật dùng:
                  </div>
                  <div style={{ fontSize: 13, color: '#78350f' }}>
                    {selectedItem.nuanceReason}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
                  ⭐ Câu ví dụ chuẩn:
                </h4>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  padding: 16
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                    {selectedItem.masterExampleJp}
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    {selectedItem.masterExampleVi}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
