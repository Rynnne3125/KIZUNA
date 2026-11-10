import React, { useEffect, useState, useMemo } from 'react';
import { kizunaService } from '../services/kizunaService';
import { authService } from '../services/authService';
import { progressService, UserRoadmapProgress } from '../services/progressService';
import { Stage, Milestone } from '../types/kizuna';
import { User } from '../types/auth';
import { RoadmapMilestoneDetail } from '../components/roadmap/RoadmapMilestoneDetail';
import { 
  Flame, 
  Zap, 
  Trophy, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  AlertCircle
} from 'lucide-react';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

const LEVEL_CONFIG: Record<JlptLevelKey, { kanji: string; vi: string; desc: string; range: string; color: string }> = {
  N5: {
    kanji: '入門',
    vi: 'Nhập môn',
    desc: 'Bảng chữ cái, câu danh từ, động từ & 25 bài sơ cấp Minna',
    range: 'Bài 1 – 25 Minna no Nihongo · 5 Chặng · 30 Mốc',
    color: '#10b981'
  },
  N4: {
    kanji: '初級',
    vi: 'Sơ cấp',
    desc: 'Thể Te, Nai, Ta, bị động, sai khiến & kính ngữ cơ bản',
    range: 'Bài 26 – 50 Minna no Nihongo · 5 Chặng · 30 Mốc',
    color: '#06b6d4'
  },
  N3: {
    kanji: '中級',
    vi: 'Trung cấp',
    desc: 'Mẫu câu xã hội, liên kết thời gian, phán đoán & đời sống',
    range: '47 Mốc ngữ pháp giao tiếp chuyên sâu · 9 Chặng',
    color: '#3b82f6'
  },
  N2: {
    kanji: '中上級',
    vi: 'Trung thượng cấp',
    desc: 'Văn phong văn phòng, thương mại, nghị luận & xã luận',
    range: '45 Mốc nâng cao & đọc hiểu chuyên sâu · 9 Chặng',
    color: '#8b5cf6'
  },
  N1: {
    kanji: '上級',
    vi: 'Thượng cấp',
    desc: 'Biểu thức cực hạn, văn kiện học thuật & cổ phong',
    range: '30 Mốc tối thượng · 6 Chặng',
    color: '#f59e0b'
  }
};

// Component Animation Hoa anh đào rơi động chuẩn phong cách Nhật Bản
const SakuraFallingBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0
      }}
    >
      {[
        { left: '4%', delay: '0s', duration: '7.5s', size: 14, rotate: 20 },
        { left: '24%', delay: '2s', duration: '8.2s', size: 17, rotate: -30 },
        { left: '45%', delay: '4s', duration: '6.8s', size: 13, rotate: 40 },
        { left: '68%', delay: '1s', duration: '9.0s', size: 16, rotate: 10 },
        { left: '88%', delay: '3.5s', duration: '7.2s', size: 15, rotate: -20 }
      ].map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size * 1.3,
            animation: `sakuraFall ${p.duration} linear infinite`,
            animationDelay: p.delay,
            opacity: 0.65,
            display: 'block'
          }}
        >
          <svg viewBox="0 0 30 40" width="100%" height="100%" style={{ transform: `rotate(${p.rotate}deg)` }}>
            <path
              d="M 15 2 C 22 10, 30 22, 24 32 C 18 40, 8 38, 4 30 C 0 20, 8 10, 15 2 Z"
              fill="#fda4af"
              opacity="0.8"
            />
          </svg>
        </span>
      ))}
    </div>
  );
};

export const RoadmapPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [userProgress, setUserProgress] = useState<UserRoadmapProgress | null>(null);

  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation hierarchy: Level -> Stage -> Milestone/Lesson
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>('N5');
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [viewMode, setViewMode] = useState<'STAGES' | 'MILESTONES' | 'LESSON'>('STAGES');

  // Gentle locked notification toast
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Load real user and Firestore data
  useEffect(() => {
    async function loadData() {
      try {
        const u = authService.getCurrentUser();
        if (u) {
          setCurrentUser(u);
          const prog = await progressService.getUserRoadmapProgress(u.id);
          setUserProgress(prog);
        }

        const [s, m] = await Promise.all([
          kizunaService.getStages(),
          kizunaService.getMilestones()
        ]);
        setStages(s);
        setMilestones(m);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Listen to user updates (when completing quests or reading)
  useEffect(() => {
    const handleUserUpdate = () => {
      const fresh = authService.getCurrentUser();
      if (fresh) {
        setCurrentUser({ ...fresh });
        progressService.getUserRoadmapProgress(fresh.id).then(prog => {
          setUserProgress(prog);
        });
      }
    };
    window.addEventListener('kizuna_user_updated', handleUserUpdate);
    return () => window.removeEventListener('kizuna_user_updated', handleUserUpdate);
  }, []);

  // Filter stages of selected level
  const levelStages = useMemo(() => {
    return stages
      .filter(s => s.jlptLevel === selectedLevel || (!s.jlptLevel && selectedLevel === 'N5'))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [stages, selectedLevel]);

  // Filter milestones of selected stage
  const stageMilestones = useMemo(() => {
    return milestones
      .filter(m => m.stageId === selectedStage?.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [milestones, selectedStage?.id]);

  // Check if a stage is completed based on its milestones
  const isStageCompleted = (st?: Stage) => {
    if (!st) return false;
    const mils = milestones.filter(m => m.stageId === st.id);
    if (mils.length === 0) return false;
    return mils.every(m => userProgress?.completedMilestones?.includes(m.id));
  };

  const handleSelectLevel = (lvl: JlptLevelKey) => {
    setSelectedLevel(lvl);
    setSelectedStage(null);
    setSelectedMilestone(null);
    setViewMode('STAGES');
  };

  const handleSelectStage = (st: Stage) => {
    setSelectedStage(st);
    setSelectedMilestone(null);
    setViewMode('MILESTONES');
  };

  const handleSelectMilestone = (ms: Milestone, isUnlocked: boolean) => {
    if (!isUnlocked) {
      setLockedNotice(`🔒 Mốc "${ms.title}" đang khóa. Bạn cần hoàn thành mốc học tập trước đó để mở khóa!`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    setSelectedMilestone(ms);
    setViewMode('LESSON');
  };

  const handleBackToStages = () => {
    setSelectedStage(null);
    setSelectedMilestone(null);
    setViewMode('STAGES');
  };

  const handleBackToMilestones = () => {
    setSelectedMilestone(null);
    setViewMode('MILESTONES');
  };

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        paddingBottom: 64,
        position: 'relative',
        fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <SakuraFallingBackground />

      <style>{`
        @keyframes sakuraFall {
          0% {
            top: -8%;
            transform: translateX(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          50% {
            transform: translateX(20px) rotate(180deg);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            top: 108%;
            transform: translateX(-15px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Toast Notification for Locked Milestone */}
      {lockedNotice && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 700,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <AlertCircle size={18} style={{ color: '#f59e0b' }} />
          <span>{lockedNotice}</span>
        </div>
      )}

      {/* 1. HEADER MANG PHONG CÁCH NHẬT BẢN HIỆN ĐẠI (和の美学) */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: '1px solid #ebe7df'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {/* Dấu triện Hanko đỏ (印鑑) KIZUNA */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  border: '1.5px solid #c53d32',
                  borderRadius: 4,
                  color: '#c53d32',
                  fontSize: 13,
                  fontWeight: 900,
                  fontFamily: 'serif',
                  backgroundColor: '#fffaf9'
                }}
              >
                絆
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#c53d32', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                HỌC PHẦN CHUẨN HOÁ · 日本語ロードマップ
              </span>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1c1917', margin: 0 }}>
              Lộ Trình Học Tiếng Nhật
            </h1>
          </div>

          {/* Gamification Stats: 100% REAL FROM USER PROFILE & FIRESTORE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 9999,
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                fontSize: 12,
                fontWeight: 800
              }}
              title="Chuỗi ngày học liên tục"
            >
              <Flame size={14} />
              <span>{currentUser?.currentStreak || 0} ngày streak</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 9999,
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0284c7',
                fontSize: 12,
                fontWeight: 800
              }}
              title="Điểm năng động rèn luyện"
            >
              <Zap size={14} />
              <span>{currentUser?.activePoints || 0} pts</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 9999,
                backgroundColor: '#fefce8',
                border: '1px solid #fef08a',
                color: '#ca8a04',
                fontSize: 12,
                fontWeight: 800
              }}
              title="Kinh nghiệm tích lũy"
            >
              <Trophy size={14} />
              <span>{currentUser?.totalXp || 0} XP</span>
            </div>
          </div>
        </div>

        {/* Thanh chuyển cấp độ N phong cách Thẻ bài Nhật Bản (札 - Fuda) */}
        <div
          style={{
            display: 'flex',
            background: '#f4f2ee',
            padding: 4,
            borderRadius: 12,
            border: '1px solid #e5e0d8',
            gap: 4,
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {(['N5', 'N4', 'N3', 'N2', 'N1'] as JlptLevelKey[]).map(lvl => {
            const isActive = selectedLevel === lvl;
            const meta = LEVEL_CONFIG[lvl];
            return (
              <button
                key={lvl}
                onClick={() => handleSelectLevel(lvl)}
                style={{
                  flex: 1,
                  minWidth: 100,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: isActive ? meta.color : '#57534e'
                  }}
                >
                  {lvl}
                </span>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isActive ? '#1c1917' : '#78716c'
                  }}
                >
                  {meta.kanji} ({meta.vi})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BREADCRUMBS TRAIL (Dấu vết di chuyển qua các tầng) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#78716c',
          marginBottom: 20,
          flexWrap: 'wrap'
        }}
      >
        <span
          onClick={handleBackToStages}
          style={{
            cursor: viewMode !== 'STAGES' ? 'pointer' : 'default',
            fontWeight: viewMode === 'STAGES' ? 800 : 600,
            color: viewMode === 'STAGES' ? '#1c1917' : '#78716c',
            textDecoration: viewMode !== 'STAGES' ? 'underline' : 'none'
          }}
        >
          {selectedLevel} · {LEVEL_CONFIG[selectedLevel].desc}
        </span>

        {selectedStage && (
          <>
            <ChevronRight size={14} style={{ color: '#a8a29e' }} />
            <span
              onClick={handleBackToMilestones}
              style={{
                cursor: viewMode === 'LESSON' ? 'pointer' : 'default',
                fontWeight: viewMode === 'MILESTONES' ? 800 : 600,
                color: viewMode === 'MILESTONES' ? '#1c1917' : '#78716c',
                textDecoration: viewMode === 'LESSON' ? 'underline' : 'none'
              }}
            >
              Chặng {selectedStage.orderIndex || 1}: {selectedStage.title.replace(/^\[N\d\]\s*/, '')}
            </span>
          </>
        )}

        {selectedMilestone && viewMode === 'LESSON' && (
          <>
            <ChevronRight size={14} style={{ color: '#a8a29e' }} />
            <span style={{ fontWeight: 800, color: '#16a34a' }}>
              Mốc: {selectedMilestone.title}
            </span>
          </>
        )}
      </div>

      {/* 3. NỘI DUNG CHÍNH (THEO VIEW MODE) */}
      {loading ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌸</div>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải lộ trình học tiếng Nhật từ Firestore...</p>
        </div>
      ) : viewMode === 'STAGES' ? (
        /* ================= TẦNG 2: DANH SÁCH CHẶNG (STAGES) ================= */
        <div>
          {/* Header Banner cho Cấp độ N hiện tại */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              border: '1.5px solid #e2e8f0',
              padding: '20px 24px',
              marginBottom: 20,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: LEVEL_CONFIG[selectedLevel].color, textTransform: 'uppercase', marginBottom: 2 }}>
                CẤP ĐỘ {selectedLevel} · {LEVEL_CONFIG[selectedLevel].kanji}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                {LEVEL_CONFIG[selectedLevel].range}
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                {LEVEL_CONFIG[selectedLevel].desc}
              </p>
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#0f172a',
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              Tổng số: {levelStages.length} Chặng
            </div>
          </div>

          {/* Stages Grid Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {levelStages.map((st, idx) => {
              const stageMils = milestones.filter(m => m.stageId === st.id);
              const milestoneCount = stageMils.length || st.total_milestones || 5;
              const completedCount = stageMils.filter(m => userProgress?.completedMilestones?.includes(m.id)).length;
              const percent = stageMils.length > 0 ? Math.round((completedCount / stageMils.length) * 100) : 0;
              const isComp = completedCount === stageMils.length && stageMils.length > 0;

              return (
                <div
                  key={st.id}
                  onClick={() => handleSelectStage(st)}
                  className="kizuna-card"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    border: isComp ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                    padding: '20px 22px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = LEVEL_CONFIG[selectedLevel].color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isComp ? '#86efac' : '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div>
                    {/* Top Tag & Hanko Seal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 6,
                          backgroundColor: isComp ? '#dcfce7' : '#f1f5f9',
                          color: isComp ? '#15803d' : '#0f172a'
                        }}
                      >
                        Chặng {st.orderIndex || idx + 1} • {st.range || 'Bài học'}
                      </span>

                      {st.hanko && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: `1.5px solid ${LEVEL_CONFIG[selectedLevel].color}`,
                            color: LEVEL_CONFIG[selectedLevel].color,
                            fontSize: 13,
                            fontWeight: 900,
                            fontFamily: 'serif',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          {st.hanko}
                        </span>
                      )}
                    </div>

                    {/* Stage Title */}
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {st.title.replace(/^\[N\d\]\s*/, '')}
                    </h3>

                    {/* Stage Description */}
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px 0', minHeight: 40 }}>
                      {st.description || 'Chinh phục kiến thức và kỹ năng giao tiếp trong chặng.'}
                    </p>
                  </div>

                  {/* Stage Progress Bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                      <span>Tiến độ</span>
                      <span>{completedCount}/{milestoneCount} mốc ({percent}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percent}%`,
                          height: '100%',
                          backgroundColor: isComp ? '#16a34a' : LEVEL_CONFIG[selectedLevel].color,
                          borderRadius: 9999,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Stage Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 12,
                      fontSize: 12.5
                    }}
                  >
                    <span style={{ color: '#475569', fontWeight: 600 }}>
                      📍 {milestoneCount} Mốc học tập
                    </span>

                    <span style={{ color: LEVEL_CONFIG[selectedLevel].color, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>Xem mốc học</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'MILESTONES' ? (
        /* ================= TẦNG 3: DANH SÁCH MỐC (MILESTONES) CỦA CHẶNG ================= */
        <div>
          {/* Back Button and Stage Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <button
              onClick={handleBackToStages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Quay lại danh sách Chặng</span>
            </button>

            {selectedStage && (
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a', backgroundColor: '#ecfdf5', padding: '4px 12px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                {selectedStage.range || `Chặng ${selectedStage.orderIndex}`} · {stageMilestones.length} Mốc học
              </span>
            )}
          </div>

          {selectedStage && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: LEVEL_CONFIG[selectedLevel].color, textTransform: 'uppercase', marginBottom: 2 }}>
                CHẶNG {selectedStage.orderIndex || 1}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
                {selectedStage.title.replace(/^\[N\d\]\s*/, '')}
              </h2>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                {selectedStage.description}
              </p>
            </div>
          )}

          {/* Milestones List: 100% REAL DYNAMIC STATUS FROM FIRESTORE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stageMilestones.map((ms, idx) => {
              const isCompleted = userProgress?.completedMilestones?.includes(ms.id) || false;

              // Unlock logic based on real progress
              const isFirstOfStage1 = (selectedLevel === 'N5' && selectedStage?.orderIndex === 1 && idx === 0);
              const prevCompleted = idx > 0 ? (userProgress?.completedMilestones?.includes(stageMilestones[idx - 1].id) || false) : false;
              const prevStageComp = (selectedStage && selectedStage.orderIndex > 1)
                ? isStageCompleted(levelStages.find(s => s.orderIndex === selectedStage.orderIndex - 1))
                : false;
              const isUnlocked = isCompleted || isFirstOfStage1 || (idx === 0 ? prevStageComp : prevCompleted);

              const isBoss = ms.milestone_type === 'BOSS_CHALLENGE' || idx === stageMilestones.length - 1;

              return (
                <div
                  key={ms.id}
                  onClick={() => handleSelectMilestone(ms, isUnlocked)}
                  style={{
                    backgroundColor: isUnlocked ? '#ffffff' : '#f8fafc',
                    border: isBoss
                      ? '2px solid #f59e0b'
                      : isCompleted
                      ? '1.5px solid #86efac'
                      : isUnlocked
                      ? '1.5px solid #16a34a'
                      : '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isUnlocked ? 1 : 0.75,
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                  onMouseEnter={e => {
                    if (isUnlocked) {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (isUnlocked) {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 450px' }}>
                    {/* Milestone Order Circle */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: isBoss
                          ? '#fef3c7'
                          : isCompleted
                          ? '#dcfce7'
                          : isUnlocked
                          ? '#ecfdf5'
                          : '#f1f5f9',
                        color: isBoss
                          ? '#d97706'
                          : isCompleted
                          ? '#16a34a'
                          : isUnlocked
                          ? '#15803d'
                          : '#94a3b8',
                        fontWeight: 900,
                        fontSize: isBoss ? 18 : 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isBoss ? '1.5px solid #fde68a' : isCompleted ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                        flexShrink: 0
                      }}
                    >
                      {isBoss ? '🏯' : isCompleted ? '✓' : !isUnlocked ? <Lock size={15} /> : ms.kanjiMark || idx + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isBoss ? '#d97706' : '#64748b',
                            textTransform: 'uppercase'
                          }}
                        >
                          {isBoss ? '👑 MỐC CHỐT CHẶNG (BOSS)' : `${ms.nejUnit || `Bài ${ms.orderIndex || idx + 1}`}`}
                        </span>

                        {isCompleted && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                            Đã hoàn thành
                          </span>
                        )}

                        {isUnlocked && !isCompleted && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '1px 6px', borderRadius: 4 }}>
                            Đang học
                          </span>
                        )}

                        {!isUnlocked && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                            Đang khóa
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: 15, fontWeight: 800, color: isUnlocked ? '#0f172a' : '#64748b', margin: '0 0 4px 0' }}>
                        {ms.title}
                      </h3>

                      <div style={{ fontSize: 12.5, color: '#475569' }}>
                        🎯 <b>Mục tiêu:</b> {ms.canDoGoal || ms.communicationContext || 'Thực hành mục tiêu hội thoại cốt lõi'}
                      </div>
                    </div>
                  </div>

                  {/* Right side rewards and button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706' }}>
                        +{ms.xpReward || 100} XP
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
                        +{ms.activePointsReward || 80} pts
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        backgroundColor: isUnlocked ? '#16a34a' : '#f1f5f9',
                        color: isUnlocked ? '#ffffff' : '#64748b',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isUnlocked ? (
                        <>
                          <span>Vào học</span>
                          <ChevronRight size={14} />
                        </>
                      ) : (
                        <>
                          <Lock size={12} />
                          <span>Khóa</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= TẦNG 4: BÀI HỌC CHI TIẾT & BÀI TẬP ================= */
        selectedMilestone && (
          <RoadmapMilestoneDetail
            milestone={selectedMilestone}
            stage={selectedStage}
            level={selectedLevel}
            userId={currentUser?.id}
            userProgress={userProgress}
            onBack={handleBackToMilestones}
            onProgressUpdate={updated => {
              setUserProgress(updated);
              const fresh = authService.getCurrentUser();
              if (fresh) setCurrentUser(fresh);
            }}
          />
        )
      )}
    </div>
  );
};
