import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, Lightbulb } from 'lucide-react';

interface AiSenseiModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const AiSenseiModal: React.FC<AiSenseiModalProps> = ({ isOpen, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAsk = (userQuery?: string) => {
    const textToAsk = userQuery || query;
    if (!textToAsk.trim()) return;

    setLoading(true);
    // Simulating AI Sensei with structured Generative AI reasoning
    setTimeout(() => {
      setResponse(`Konnichiwa! AI Sensei xin giải thích chi tiết về: "${textToAsk}"
      
1. 💡 **Phân tích ngữ cảnh & Ý nghĩa:**
Trong tiếng Nhật giao tiếp hàng ngày, yếu tố này thường được sử dụng trong các tình huống trang trọng (Keigo) hoặc thân mật tùy vào trợ từ đi kèm.

2. 🇯🇵 **Ví dụ hội thoại song ngữ:**
- A: 今日はとてもいい天気ですね。(Hôm nay trời đẹp thật nhỉ.)
- B: ええ、散歩に行きましょう。(Vâng, chúng ta cùng đi dạo nhé.)

3. ⚠️ **Lưu ý tránh nhầm lẫn của người Việt:**
Đừng dịch word-by-word từng từ tiếng Việt sang tiếng Nhật; hãy ghi nhớ theo cả cụm collocation để phát âm tự nhiên như người bản xứ.`);
      setLoading(false);
    }, 1000);
  };

  const quickPrompts = [
    'Phân biệt cách dùng âm On và Kun trong thực tế',
    'Đặt 3 câu ví dụ giao tiếp trình độ JLPT N5',
    'Chữa lỗi ngữ pháp và giải thích tại sao sai',
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fdf2f8', color: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Sensei (Gia Sư Trợ Lý AI)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giải thích ngữ pháp, ngữ cảnh và sửa câu tiếng Nhật thông minh</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {quickPrompts.map((p, idx) => (
            <button key={idx} onClick={() => { setQuery(p); handleAsk(p); }} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '20px' }}>
              <Lightbulb size={12} />
              <span>{p}</span>
            </button>
          ))}
        </div>

        {/* Chat / Response Box */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '220px', background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
              <Bot size={20} className="animate-spin" />
              <span>AI Sensei đang phân tích và chuẩn bị câu trả lời...</span>
            </div>
          ) : response ? (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.92rem' }}>
              {response}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              <Bot size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>Hãy nhập bất kỳ câu hỏi ngữ pháp, Hán tự hoặc đoạn văn tiếng Nhật nào để AI Sensei hỗ trợ giải đáp.</p>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ví dụ: Phân biệt từ 先生 và 教師..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '0.95rem', outline: 'none' }}
          />
          <button onClick={() => handleAsk()} className="btn btn-primary">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
