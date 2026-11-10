import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { Stage, Milestone } from '../types/kizuna';
import { RoadmapMilestoneDetail } from '../components/roadmap/RoadmapMilestoneDetail';
import { 
  Flame, 
  Zap, 
  Trophy, 
  BookOpen, 
  Layers, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Compass, 
  Award,
  ChevronDown
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
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation hierarchy: Level -> Stage -> Milestone/Lesson
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>('N5');
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [viewMode, setViewMode] = useState<'STAGES' | 'MILESTONES' | 'LESSON'>('STAGES');

  // Gamification metrics
  const [userStats] = useState({
    streakDays: 5,
    activePoints: 340,
    totalXp: 1250
  });

  useEffect(() => {
    async function loadData() {
      try {
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

  // Filter stages of selected level
  const levelStages = stages
    .filter(s => s.jlptLevel === selectedLevel || (!s.jlptLevel && selectedLevel === 'N5'))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // Filter milestones of selected stage
  const stageMilestones = milestones
    .filter(m => m.stageId === selectedStage?.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

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

  const handleSelectMilestone = (ms: Milestone) => {
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
                  lineHeight: 1,
                  background: '#fffcfb'
                }}
              >
                絆
              </span>
              <h1 style={{ fontSize: 23, fontWeight: 900, color: '#1c2536', margin: 0, letterSpacing: '-0.3px' }}>
                道筋 <span style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>· Lộ Trình Học Chuẩn NEJ & Minna</span>
              </h1>
            </div>
            <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
              Hành trình chinh phục mục tiêu giao tiếp Can-do: <strong>Chặng ➔ Mốc ➔ 4 Bài học Quests</strong>
            </p>
          </div>

          {/* Gamification Chips */}
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
            >
              <Flame size={14} />
              <span>{userStats.streakDays} ngày</span>
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
            >
              <Zap size={14} />
              <span>{userStats.activePoints} pts</span>
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
            >
              <Trophy size={14} />
              <span>{userStats.totalXp} XP</span>
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
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f172a' : '#78716c',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 900 }}>{lvl}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: isActive ? meta.color : '#a8a29e',
                      fontFamily: 'serif'
                    }}
                  >
                    {meta.kanji}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: isActive ? '#334155' : '#a8a29e', whiteSpace: 'nowrap' }}>
                  {meta.vi}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BREADCRUMBS NAVIGATION */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#64748b',
          marginBottom: 20,
          flexWrap: 'wrap'
        }}
      >
        <button
          onClick={handleBackToStages}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: viewMode === 'STAGES' ? '#0f172a' : '#2563eb',
            fontWeight: viewMode === 'STAGES' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>Lộ Trình {selectedLevel}</span>
        </button>

        {selectedStage && (
          <>
            <ChevronRight size={14} style={{ color: '#94a3b8' }} />
            <button
              onClick={handleBackToMilestones}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: viewMode === 'MILESTONES' ? '#0f172a' : '#2563eb',
                fontWeight: viewMode === 'MILESTONES' ? 800 : 600,
                cursor: 'pointer'
              }}
            >
              Chặng {selectedStage.orderIndex} {selectedStage.hanko ? `【${selectedStage.hanko}】` : ''}
            </button>
          </>
        )}

        {selectedMilestone && (
          <>
            <ChevronRight size={14} style={{ color: '#94a3b8' }} />
            <span style={{ color: '#0f172a', fontWeight: 800 }}>
              {selectedMilestone.nejUnit || `Mốc ${selectedMilestone.orderIndex}`}
            </span>
          </>
        )}
      </div>

      {/* 3. MAIN BODY ACCORDING TO VIEW MODE */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          Đang tải lộ trình học tập...
        </div>
      ) : viewMode === 'STAGES' ? (
        /* ================= TẦNG 2: DANH SÁCH CHẶNG (STAGES) ================= */
        <div>
          {/* Level Summary Banner */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: '18px 22px',
              border: '1.5px solid #e2e8f0',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: LEVEL_CONFIG[selectedLevel].color, textTransform: 'uppercase', marginBottom: 2 }}>
                Mục tiêu cấp độ {selectedLevel} ({LEVEL_CONFIG[selectedLevel].kanji})
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                {LEVEL_CONFIG[selectedLevel].desc}
              </h2>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                {LEVEL_CONFIG[selectedLevel].range}
              </div>
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

              return (
                <div
                  key={st.id}
                  onClick={() => handleSelectStage(st)}
                  className="kizuna-card"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    border: '1.5px solid #e2e8f0',
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
                    e.currentTarget.style.borderColor = '#e2e8f0';
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
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a'
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
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={15} />
              <span>Quay lại danh sách Chặng</span>
            </button>

            <span
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                backgroundColor: LEVEL_CONFIG[selectedLevel].color,
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 800
              }}
            >
              {selectedLevel} • Chặng {selectedStage?.orderIndex}
            </span>
          </div>

          {/* Stage Detail Card Banner */}
          {selectedStage && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                border: '1.5px solid #e2e8f0',
                padding: '20px 24px',
                marginBottom: 20,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: LEVEL_CONFIG[selectedLevel].color }}>
                  Chặng {selectedStage.orderIndex} • {selectedStage.range}
                </span>
                {selectedStage.hanko && (
                  <span style={{ fontSize: 13, fontWeight: 900, color: LEVEL_CONFIG[selectedLevel].color }}>
                    【{selectedStage.hanko}】
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
                {selectedStage.title.replace(/^\[N\d\]\s*/, '')}
              </h2>

              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                {selectedStage.description}
              </p>
            </div>
          )}

          {/* Milestones List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stageMilestones.map((ms, idx) => {
              const isCompleted = ms.status === 'COMPLETED' || idx === 0;
              const isUnlocked = ms.status === 'UNLOCKED' || idx === 1;
              const isBoss = ms.milestone_type === 'BOSS_CHALLENGE' || idx === stageMilestones.length - 1;

              return (
                <div
                  key={ms.id}
                  onClick={() => handleSelectMilestone(ms)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: isBoss
                      ? '2px solid #f59e0b'
                      : isUnlocked
                      ? '1.5px solid #16a34a'
                      : '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
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
                          : '#64748b',
                        fontWeight: 900,
                        fontSize: isBoss ? 18 : 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isBoss ? '1.5px solid #fde68a' : isCompleted ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                        flexShrink: 0
                      }}
                    >
                      {isBoss ? '🏯' : isCompleted ? '✓' : ms.kanjiMark || idx + 1}
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
                      </div>

                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
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
                      <span>Vào học</span>
                      <ChevronRight size={14} />
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
            onBack={handleBackToMilestones}
            onStartQuest={(ms, questIdx) => {
              alert(`Bắt đầu Bài ${questIdx}: ${ms.title}. Đang chuyển đến phòng luyện tập KIZUNA!`);
            }}
          />
        )
      )}
    </div>
  );
};
