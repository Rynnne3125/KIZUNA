import React from 'react';
import { Kanji } from '../types';
import { BookOpen, Sparkles } from 'lucide-react';

interface KanjiCardProps {
  kanji: Kanji;
  onAskAi: (character: string) => void;
  onStudy: (kanji: Kanji) => void;
}

export const KanjiCard: React.FC<KanjiCardProps> = ({ kanji, onAskAi, onStudy }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="badge badge-jlpt">{kanji.jlptLevel || 'N5'}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{kanji.strokeCount} nét</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--text-main)', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)' }} className="kanji-font">
          {kanji.character}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
            {kanji.meanings.join(', ')}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>On:</strong> {kanji.onyomi.join(', ') || '—'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>Kun:</strong> {kanji.kunyomi.join(', ') || '—'}
          </div>
        </div>
      </div>

      {kanji.examples && kanji.examples.length > 0 && (
        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Ví dụ ghép từ:</div>
          {kanji.examples.slice(0, 2).map((ex, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span className="kanji-font" style={{ fontWeight: 600 }}>{ex.word} ({ex.reading})</span>
              <span style={{ color: 'var(--text-muted)' }}>{ex.meaning}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button onClick={() => onStudy(kanji)} className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}>
          <BookOpen size={16} />
          <span>Ôn tập SRS</span>
        </button>
        <button onClick={() => onAskAi(kanji.character)} className="btn btn-outline" style={{ padding: '8px 12px', color: '#be185d' }} title="Nhờ AI Sensei phân tích">
          <Sparkles size={16} />
        </button>
      </div>
    </div>
  );
};
