import React, { useState } from 'react';
import { Kanji } from '../types';
import { RotateCw, CheckCircle2, Award, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

interface FlashcardReviewProps {
  kanji: Kanji;
  onBack: () => void;
  onCompleted: () => void;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({ kanji, onBack, onCompleted }) => {
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleRateQuality = async (quality: number) => {
    try {
      setSubmitting(true);
      await api.submitProgress(kanji.character, 'KANJI', quality);
      setResultMessage(
        quality >= 3 
          ? `Tuyệt vời! Bạn nhớ rất tốt (+${quality === 5 ? 20 : 10} XP)` 
          : 'Đừng nản lòng! Thuật toán SRS đã xếp từ này vào lịch học sớm nhất.'
      );
      setTimeout(() => {
        onCompleted();
      }, 1500);
    } catch (err: any) {
      console.warn("Offline or unauthenticated submit:", err);
      // Fallback feedback for guest/local testing
      setResultMessage(`Đã ghi nhận chất lượng ${quality}/5 (Mô phỏng SuperMemo SM-2)`);
      setTimeout(() => {
        onCompleted();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
      <button onClick={onBack} className="btn btn-outline" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={16} />
        <span>Quay lại danh sách</span>
      </button>

      {/* Flashcard container */}
      <div 
        onClick={() => setFlipped(!flipped)}
        className="card"
        style={{
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '2px dashed var(--primary)',
          background: flipped ? '#fff1f2' : 'white',
          transition: 'all 0.3s ease',
          padding: '40px',
        }}
      >
        <span className="badge badge-jlpt" style={{ marginBottom: '16px' }}>{kanji.jlptLevel || 'JLPT N5'}</span>

        {!flipped ? (
          <div>
            <div style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }} className="kanji-font">
              {kanji.character}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <RotateCw size={14} /> Chạm hoặc click để lật mặt sau
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
              {kanji.meanings.join(', ')}
            </div>
            <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
              <strong>Âm On:</strong> {kanji.onyomi.join(', ') || '—'}
            </div>
            <div style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
              <strong>Âm Kun:</strong> {kanji.kunyomi.join(', ') || '—'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Số nét bút: {kanji.strokeCount} nét | Bộ thủ: {kanji.radicals?.join(', ') || '—'}
            </div>
          </div>
        )}
      </div>

      {resultMessage && (
        <div style={{ marginTop: '20px', padding: '14px', background: '#ecfdf5', color: '#047857', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <CheckCircle2 size={20} />
          <span>{resultMessage}</span>
        </div>
      )}

      {/* SM-2 Quality Rating Buttons */}
      {flipped && !resultMessage && (
        <div style={{ marginTop: '30px' }}>
          <p style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>
            Đánh giá mức độ ghi nhớ theo thuật toán SuperMemo SM-2:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <button 
              disabled={submitting} 
              onClick={() => handleRateQuality(1)} 
              className="btn btn-outline" 
              style={{ borderColor: '#fca5a5', color: '#dc2626' }}
            >
              1 - Quên hẳn
            </button>
            <button 
              disabled={submitting} 
              onClick={() => handleRateQuality(3)} 
              className="btn btn-outline" 
              style={{ borderColor: '#fde047', color: '#ca8a04' }}
            >
              3 - Nhớ khó khăn
            </button>
            <button 
              disabled={submitting} 
              onClick={() => handleRateQuality(4)} 
              className="btn btn-outline" 
              style={{ borderColor: '#86efac', color: '#16a34a' }}
            >
              4 - Nhớ tốt
            </button>
            <button 
              disabled={submitting} 
              onClick={() => handleRateQuality(5)} 
              className="btn btn-primary"
            >
              <Award size={16} />
              5 - Hoàn hảo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
