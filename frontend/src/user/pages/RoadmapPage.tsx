import React, { useEffect, useState } from 'react';
import { kizunaService } from '../services/kizunaService';
import { Stage, Milestone, JapanRegion } from '../types/kizuna';
import { JapanOverworldMap } from '../components/roadmap/JapanOverworldMap';
import { RegionDetailModal } from '../components/roadmap/RegionDetailModal';
import { Flame, Zap, Trophy, Compass, ArrowLeft, Sparkles, MapPin, Layers, ChevronRight, Award } from 'lucide-react';

const JAPAN_REGIONS_CONFIG: JapanRegion[] = [
  {
    id: 'region_n5',
    level: 'N5',
    nameVi: 'Cửa Ngõ Thần Đạo',
    nameJp: '第一界・九州＆沖縄の門',
    realGeo: 'Kyushu & Okinawa (Tây Nam)',
    badgeTitle: 'Khởi Đầu Sơ Cấp',
    description: 'Bắt đầu chuyến hành trình từ vùng biển phía Tây Nam ấm áp. Chinh phục bảng chữ cái, câu danh từ, động từ cơ bản và 25 bài hội thoại sơ cấp Minna no Nihongo.',
    themeColor: '#10b981',
    accentColor: '#6ee7b7',
    stagesCount: 5,
    milestonesCount: 30,
    totalXp: 3000,
    status: 'UNLOCKED',
    completedStagesCount: 1,
    iconSymbol: '⛩️',
    landmarkName: 'Cổng Torii Nổi Oki-no-Torii',
    landmarkDesc: 'Cánh cổng huyền thoại dẫn lối vào vùng đất Nhật ngữ sơ cấp.',
    mapPos: { x: 18, y: 77 }
  },
  {
    id: 'region_n4',
    level: 'N4',
    nameVi: 'Cố Đô Tri Thức',
    nameJp: '第二界・関西＆中国の城',
    realGeo: 'Kansai & Chugoku (Tây Honshu)',
    badgeTitle: 'Giao Tiếp Thực Tiễn',
    description: 'Tiến vào kinh thành cổ Kyoto và Osaka phồn hoa. Nắm vững thể Te, Nai, Ta, câu bị động, sai khiến và kính ngữ cơ bản trong 25 bài Minna no Nihongo tiếp theo.',
    themeColor: '#06b6d4',
    accentColor: '#67e8f9',
    stagesCount: 5,
    milestonesCount: 30,
    totalXp: 3200,
    status: 'UNLOCKED',
    completedStagesCount: 0,
    iconSymbol: '🏯',
    landmarkName: 'Chùa Vàng Kinkaku-ji & Lâu Đài Himeji',
    landmarkDesc: 'Nơi lưu giữ các mẫu câu giao tiếp đời sống và công sở cơ bản.',
    mapPos: { x: 38, y: 57 }
  },
  {
    id: 'region_n3',
    level: 'N3',
    nameVi: 'Đỉnh Phú Sĩ & Đô Thị',
    nameJp: '第三界・中部＆関東の頂',
    realGeo: 'Chubu & Kanto (Trung Tâm)',
    badgeTitle: 'Trung Cấp Đột Phá',
    description: 'Vượt qua ngọn núi Phú Sĩ tuyết trắng và tiến vào thủ đô Tokyo sôi động. Làm chủ 47 mốc ngữ pháp trung cấp, phân biệt sắc thái biểu cảm tinh vi.',
    themeColor: '#3b82f6',
    accentColor: '#93c5fd',
    stagesCount: 9,
    milestonesCount: 47,
    totalXp: 4800,
    status: 'UNLOCKED',
    completedStagesCount: 0,
    iconSymbol: '🗻',
    landmarkName: 'Ngọn Núi Phú Sĩ & Tháp Tokyo',
    landmarkDesc: 'Cột mốc chuyển mình quan trọng từ sơ cấp lên ngưỡng cửa trung cấp.',
    mapPos: { x: 58, y: 44 }
  },
  {
    id: 'region_n2',
    level: 'N2',
    nameVi: 'Rừng Núi & Lãnh Chúa',
    nameJp: '第四界・東北の森',
    realGeo: 'Tohoku (Đông Bắc Honshu)',
    badgeTitle: 'Cao Cấp Chuyên Nghiệp',
    description: 'Băng qua những cánh rừng thông và lâu đài Samurai cổ kính vùng Đông Bắc. Thuần thục tiếng Nhật thương mại, văn phong công sở và năng lực đọc hiểu chuyên sâu.',
    themeColor: '#8b5cf6',
    accentColor: '#c4b5fd',
    stagesCount: 9,
    milestonesCount: 45,
    totalXp: 5000,
    status: 'UNLOCKED',
    completedStagesCount: 0,
    iconSymbol: '🍁',
    landmarkName: 'Thành Cổ Aizu & Rừng Phong Mùa Thu',
    landmarkDesc: 'Vùng đất của văn phong trang trọng, học thuật và báo chí.',
    mapPos: { x: 74, y: 30 }
  },
  {
    id: 'region_n1',
    level: 'N1',
    nameVi: 'Đỉnh Băng Tuyết Tối Thượng',
    nameJp: '第五界・北海道の極',
    realGeo: 'Hokkaido (Cực Bắc)',
    badgeTitle: 'Bậc Thầy Tối Cao',
    description: 'Chạm tới cực bắc lạnh giá nơi ánh cực quang phương bắc soi rọi. Chinh phục đỉnh cao tuyệt đối của Nhật ngữ với các biểu thức cổ phong và năng lực cảm thán thâm sâu.',
    themeColor: '#f59e0b',
    accentColor: '#fde68a',
    stagesCount: 6,
    milestonesCount: 30,
    totalXp: 6000,
    status: 'UNLOCKED',
    completedStagesCount: 0,
    iconSymbol: '❄️',
    landmarkName: 'Đền Thần Cực Quang Băng Giá',
    landmarkDesc: 'Ngôi đền vinh danh những bậc thầy tiếng Nhật toàn diện nhất.',
    mapPos: { x: 86, y: 15 }
  }
];

export const RoadmapPage: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Map state
  const [currentView, setCurrentView] = useState<'OVERWORLD' | 'REGION_ZOOM'>('OVERWORLD');
  const [selectedRegion, setSelectedRegion] = useState<JapanRegion | null>(JAPAN_REGIONS_CONFIG[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // User gamification metrics (mock / fetched)
  const [userStats] = useState({
    streakDays: 5,
    activePoints: 340,
    totalXp: 1250,
    currentLevel: 'N5'
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

  const handleSelectRegion = (region: JapanRegion) => {
    setSelectedRegion(region);
    setIsModalOpen(true);
  };

  const handleEnterRegion = (region: JapanRegion) => {
    setSelectedRegion(region);
    setIsModalOpen(false);
    setCurrentView('REGION_ZOOM');
  };

  const handleBackToOverworld = () => {
    setCurrentView('OVERWORLD');
  };

  // Filter stages of selected region
  const regionStages = stages.filter(
    s => s.jlptLevel === selectedRegion?.level || (!s.jlptLevel && selectedRegion?.level === 'N5')
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* 1. TOP GAMIFICATION HUD BAR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: 20,
          padding: '14px 20px',
          marginBottom: 20,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}
          >
            🗾
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              KIZUNA JOURNEY ROADMAP
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
              Hành Trình Khám Phá Quần Đảo Nhật Bản
            </div>
          </div>
        </div>

        {/* Gamification Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 9999,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontWeight: 800,
              fontSize: 13
            }}
          >
            <Flame size={16} />
            <span>{userStats.streakDays} Ngày Streak</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 9999,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: 13
            }}
          >
            <Zap size={16} />
            <span>{userStats.activePoints} Điểm Năng Động</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 9999,
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#facc15',
              fontWeight: 800,
              fontSize: 13
            }}
          >
            <Trophy size={16} />
            <span>{userStats.totalXp} XP</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN VIEW CONTROLLER */}
      {currentView === 'OVERWORLD' ? (
        /* ================= OVERWORLD 3D JAPAN MAP VIEW ================= */
        <div>
          <JapanOverworldMap
            regions={JAPAN_REGIONS_CONFIG}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
            onEnterRegion={handleEnterRegion}
            userCurrentLevel={userStats.currentLevel}
          />

          {/* Quick instructions / tips footer */}
          <div
            style={{
              marginTop: 18,
              padding: '14px 20px',
              borderRadius: 16,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Compass size={20} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 13.5, color: '#334155', fontWeight: 600 }}>
                💡 <b>Mẹo khám phá:</b> Bản đồ được chia thành 5 vùng đất tương ứng từ <b>N5 (Cửa Ngõ Thần Đạo)</b> đến <b>N1 (Đỉnh Băng Tuyết)</b>. Nhấp vào bất kỳ vùng đất nào trên mô hình 3D để xem thông tin chi tiết và bắt đầu học!
              </span>
            </div>

            <button
              onClick={() => handleSelectRegion(selectedRegion || JAPAN_REGIONS_CONFIG[0])}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>Xem Vùng Đang Chọn</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* ================= REGION ZOOMED-IN VIEW (PHASE 1 PREVIEW) ================= */
        <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {/* Back button and breadcrumb navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <button
              onClick={handleBackToOverworld}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(-3px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(0)')}
            >
              <ArrowLeft size={16} />
              <span>← Quay Lại Bản Đồ Nhật Bản 3D</span>
            </button>

            {/* Level Selector in Zoomed View */}
            <div style={{ display: 'flex', gap: 6 }}>
              {JAPAN_REGIONS_CONFIG.map(r => {
                const isSelected = selectedRegion?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRegion(r)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 9999,
                      border: isSelected ? `2px solid ${r.themeColor}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? r.themeColor : '#ffffff',
                      color: isSelected ? '#ffffff' : '#475569',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {r.iconSymbol} {r.level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Region Banner Header */}
          {selectedRegion && (
            <div
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                padding: '28px 32px',
                color: '#ffffff',
                background: `linear-gradient(135deg, #0f172a 0%, ${selectedRegion.themeColor}33 50%, #0f172a 100%)`,
                border: `2px solid ${selectedRegion.themeColor}60`,
                boxShadow: `0 15px 35px -5px ${selectedRegion.themeColor}30`,
                marginBottom: 28
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    backgroundColor: selectedRegion.themeColor,
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 800
                  }}
                >
                  {selectedRegion.level} • {selectedRegion.badgeTitle}
                </span>
                <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={14} style={{ color: selectedRegion.themeColor }} />
                  {selectedRegion.realGeo}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
                  {selectedRegion.nameVi}
                </h1>
                <span style={{ fontSize: 15, fontWeight: 700, color: selectedRegion.accentColor }}>
                  {selectedRegion.nameJp}
                </span>
              </div>

              <p style={{ maxWidth: 720, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                {selectedRegion.description}
              </p>

              {/* Progress Summary Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Tiến độ vùng:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                    Chặng 1 / {selectedRegion.stagesCount} hoàn thành (20%)
                  </div>
                </div>
                <div style={{ flex: 1, maxWidth: 300 }}>
                  <div style={{ height: 8, borderRadius: 9999, backgroundColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div style={{ width: '20%', height: '100%', backgroundColor: selectedRegion.themeColor, borderRadius: 9999 }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stages List in this region (Transition screen preview) */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} style={{ color: selectedRegion?.themeColor }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Danh Sách {regionStages.length || selectedRegion?.stagesCount} Chặng Trong Vùng {selectedRegion?.level}
                </h2>
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Chuẩn bị sẵn sàng cho Giai đoạn tiếp theo (Vẽ Map Chặng & Mốc game)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {regionStages.map((st, idx) => {
                const stageMilestones = milestones.filter(m => m.stageId === st.id);
                return (
                  <div
                    key={st.id}
                    className="kizuna-card"
                    style={{
                      padding: 20,
                      borderRadius: 16,
                      border: idx === 0 ? `2px solid ${selectedRegion?.themeColor}` : '1px solid #e2e8f0',
                      boxShadow: idx === 0 ? `0 8px 20px -4px ${selectedRegion?.themeColor}30` : 'var(--shadow-sm)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#ffffff',
                          backgroundColor: selectedRegion?.themeColor || '#16a34a',
                          padding: '2px 10px',
                          borderRadius: 6
                        }}
                      >
                        Chặng {st.orderIndex || (idx + 1)}
                      </span>
                      {st.hanko && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: selectedRegion?.themeColor,
                            border: `1.5px solid ${selectedRegion?.themeColor}`,
                            borderRadius: 6,
                            padding: '1px 8px'
                          }}
                        >
                          {st.hanko}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                      {st.title.replace(/^\[N\d\]\s*/, '')}
                    </h3>

                    <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12, minHeight: 36 }}>
                      {st.description || 'Chinh phục các mốc kiến thức thực chiến.'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 10,
                        borderTop: '1px solid #f1f5f9',
                        fontSize: 12,
                        color: '#64748b'
                      }}
                    >
                      <span>📍 {stageMilestones.length || 5} Mốc học tập</span>
                      <span style={{ color: selectedRegion?.themeColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                        Khám phá <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. REGION DETAIL MODAL (LEVEL INSPECTION PORTAL) */}
      <RegionDetailModal
        region={selectedRegion}
        stages={regionStages}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEnterRegion={handleEnterRegion}
      />
    </div>
  );
};
