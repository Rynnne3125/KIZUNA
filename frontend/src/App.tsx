import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { KanjiCard } from './components/KanjiCard';
import { FlashcardReview } from './components/FlashcardReview';
import { AiSenseiModal } from './components/AiSenseiModal';
import { Kanji, ProgressSummary } from './types';
import { api } from './services/api';
import { initAuthListener, loginWithGoogle, logoutUser } from './services/firebase';
import { User } from 'firebase/auth';
import { BookOpen, Layers, CheckCircle2, Server, BrainCircuit } from 'lucide-react';

const FALLBACK_KANJI: Kanji[] = [
  {
    id: '日',
    character: '日',
    meanings: ['Mặt trời', 'Ngày', 'Nhật Bản'],
    onyomi: ['ニチ', 'ジツ'],
    kunyomi: ['ひ', '-び', '-か'],
    strokeCount: 4,
    jlptLevel: 'N5',
    radicals: ['日'],
    examples: [
      { word: '日本', reading: 'にほん', meaning: 'Nhật Bản' },
      { word: '日曜日', reading: 'にちようび', meaning: 'Chủ nhật' }
    ]
  },
  {
    id: '本',
    character: '本',
    meanings: ['Sách', 'Gốc', 'Nguồn cội'],
    onyomi: ['ホン'],
    kunyomi: ['もと'],
    strokeCount: 5,
    jlptLevel: 'N5',
    radicals: ['木'],
    examples: [
      { word: '本', reading: 'ほん', meaning: 'Quyển sách' },
      { word: '本人', reading: 'ほんにん', meaning: 'Bản thân người đó' }
    ]
  },
  {
    id: '人',
    character: '人',
    meanings: ['Người', 'Nhân'],
    onyomi: ['ジン', 'ニン'],
    kunyomi: ['ひと'],
    strokeCount: 2,
    jlptLevel: 'N5',
    radicals: ['人'],
    examples: [
      { word: '日本人', reading: 'にほんじん', meaning: 'Người Nhật' },
      { word: '三人', reading: 'さんにん', meaning: '3 người' }
    ]
  },
  {
    id: '学',
    character: '学',
    meanings: ['Học', 'Trường học'],
    onyomi: ['ガク'],
    kunyomi: ['まな.ぶ'],
    strokeCount: 8,
    jlptLevel: 'N5',
    radicals: ['子'],
    examples: [
      { word: '学生', reading: 'がくせい', meaning: 'Học sinh, sinh viên' },
      { word: '大学', reading: 'だいがく', meaning: 'Đại học' }
    ]
  }
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [kanjiList, setKanjiList] = useState<Kanji[]>(FALLBACK_KANJI);
  const [selectedJlpt, setSelectedJlpt] = useState<string>('N5');
  const [studyingKanji, setStudyingKanji] = useState<Kanji | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [backendOnline, setBackendOnline] = useState(false);
  const [summary, setSummary] = useState<ProgressSummary>({
    totalStudied: 12,
    dueForReviewToday: 4,
    masteredCount: 6,
    learningCount: 6,
    dailyStreak: 3,
    totalXp: 180
  });

  useEffect(() => {
    // Auth state listener
    const unsubscribe = initAuthListener((u) => setUser(u));

    // Check backend health
    api.checkHealth()
      .then((res) => {
        if (res.success) {
          setBackendOnline(true);
        }
      })
      .catch(() => setBackendOnline(false));

    // Fetch Kanji from Backend
    api.getKanjiList(selectedJlpt)
      .then((data) => {
        if (data && data.length > 0) {
          setKanjiList(data);
        }
      })
      .catch(() => {
        // Keeps fallback data
      });

    return () => unsubscribe();
  }, [selectedJlpt]);

  const handleAskAi = (char: string) => {
    setAiQuery(`Phân tích cách dùng Hán tự "${char}" và đặt 2 câu ví dụ giao tiếp thực tế`);
    setAiModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
        onOpenAiSensei={() => { setAiQuery(''); setAiModalOpen(true); }}
        streak={summary.dailyStreak}
        xp={summary.totalXp}
      />

      <main className="container" style={{ flex: 1, padding: '32px 20px' }}>
        {/* Backend & Environment Banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: backendOnline ? '#f0fdf4' : '#fef2f2', border: `1px solid ${backendOnline ? '#bbf7d0' : '#fecaca'}`, padding: '12px 18px', borderRadius: '14px', marginBottom: '28px', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: backendOnline ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
            <Server size={18} />
            <span>Backend Spring Boot 3.4.2 & Firestore: {backendOnline ? 'Đang hoạt động (Port 8080)' : 'Chưa kết nối (Đang dùng dữ liệu Local)'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <BrainCircuit size={16} />
            <span>CS2028: AI Product Development</span>
          </div>
        </div>

        {/* View Mode: Studying Flashcard or Main Dashboard */}
        {studyingKanji ? (
          <FlashcardReview
            kanji={studyingKanji}
            onBack={() => setStudyingKanji(null)}
            onCompleted={() => {
              setStudyingKanji(null);
              setSummary(prev => ({ ...prev, totalXp: prev.totalXp + 15, totalStudied: prev.totalStudied + 1 }));
            }}
          />
        ) : (
          <div>
            {/* Hero / Statistics Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{summary.totalStudied}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Từ vựng & Kanji đã học</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{summary.dueForReviewToday}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cần ôn tập hôm nay (SRS)</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{summary.masteredCount}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã ghi nhớ thành thạo</div>
                </div>
              </div>
            </div>

            {/* Level Selector Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Hán Tự (Kanji) Cần Học</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lựa chọn cấp độ JLPT để luyện tập theo phương pháp Spaced Repetition</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedJlpt(lvl)}
                    className="btn"
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      background: selectedJlpt === lvl ? 'white' : 'transparent',
                      color: selectedJlpt === lvl ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: selectedJlpt === lvl ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Kanji Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {kanjiList.map((k) => (
                <KanjiCard
                  key={k.id}
                  kanji={k}
                  onAskAi={handleAskAi}
                  onStudy={(item) => setStudyingKanji(item)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* AI Sensei Modal */}
      <AiSenseiModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        initialQuery={aiQuery}
      />

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div className="container">
          <p>© 2026 KIZUNA (絆) - Dự án Chuyên đề 4: AI Product Development: End to End. VKU - Đại học Đà Nẵng.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
