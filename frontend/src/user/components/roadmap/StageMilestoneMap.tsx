import React, { useState } from 'react';
import { JapanRegion, Stage, Milestone } from '../../types/kizuna';
import { Trophy, Zap, CheckCircle2, Lock, Sparkles, MapPin, ChevronRight, Award, Compass, Flag } from 'lucide-react';

interface StageMilestoneMapProps {
  region: JapanRegion;
  stages: Stage[];
  allMilestones: Milestone[];
  selectedStageId: string | null;
  onSelectStage: (stage: Stage) => void;
  onSelectMilestone: (milestone: Milestone) => void;
}

export const StageMilestoneMap: React.FC<StageMilestoneMapProps> = ({
  region,
  stages,
  allMilestones,
  selectedStageId,
  onSelectStage,
  onSelectMilestone
}) => {
  // Current active stage
  const activeStage = stages.find(s => s.id === selectedStageId) || stages[0];

  // Milestones in active stage
  const stageMilestones = allMilestones.filter(m => m.stageId === activeStage?.id);

  // If no milestones found directly by stageId, fallback to first few milestones
  const displayMilestones = stageMilestones.length > 0
    ? stageMilestones.sort((a, b) => a.orderIndex - b.orderIndex)
    : [
        {
          id: `${activeStage?.id}_m1`,
          stageId: activeStage?.id || '',
          orderIndex: 1,
          title: 'Bài 1: Nền tảng cốt lõi',
          nejUnit: 'Bài 1',
          communicationContext: 'Làm quen và tự giới thiệu',
          xpReward: 100,
          activePointsReward: 80,
          status: 'COMPLETED' as const
        },
        {
          id: `${activeStage?.id}_m2`,
          stageId: activeStage?.id || '',
          orderIndex: 2,
          title: 'Bài 2: Từ vựng & Đồ vật',
          nejUnit: 'Bài 2',
          communicationContext: 'Hỏi đồ vật và vị trí',
          xpReward: 100,
          activePointsReward: 80,
          status: 'UNLOCKED' as const
        },
        {
          id: `${activeStage?.id}_m3`,
          stageId: activeStage?.id || '',
          orderIndex: 3,
          title: 'Bài 3: Không gian & Địa điểm',
          nejUnit: 'Bài 3',
          communicationContext: 'Hỏi đường và sinh hoạt',
          xpReward: 100,
          activePointsReward: 80,
          status: 'LOCKED' as const
        },
        {
          id: `${activeStage?.id}_m4`,
          stageId: activeStage?.id || '',
          orderIndex: 4,
          title: 'Bài 4: Thời gian & Lịch trình',
          nejUnit: 'Bài 4',
          communicationContext: 'Hẹn giờ và lịch trình',
          xpReward: 100,
          activePointsReward: 80,
          status: 'LOCKED' as const
        },
        {
          id: `${activeStage?.id}_boss`,
          stageId: activeStage?.id || '',
          orderIndex: 5,
          title: '🏯 Thử Thách Trùm: Checkpoint Chặng',
          nejUnit: 'Boss Checkpoint',
          communicationContext: 'Thử thách tổng hợp toàn diện các bài học',
          xpReward: 250,
          activePointsReward: 150,
          milestone_type: 'BOSS_CHALLENGE' as const,
          status: 'LOCKED' as const
        }
      ];

  // Alternating positions for the winding road (percentage X coordinate)
  const nodeAlignments = ['left', 'right', 'left', 'right', 'center'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Stage Selector Tabs Header */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollbarWidth: 'none'
        }}
      >
        {stages.map((st, idx) => {
          const isSelected = activeStage?.id === st.id;
          return (
            <button
              key={st.id}
              onClick={() => onSelectStage(st)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 14,
                border: isSelected ? `2px solid ${region.themeColor}` : '1.5px solid #e2e8f0',
                backgroundColor: isSelected ? '#0f172a' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: isSelected ? `0 6px 18px -3px ${region.themeColor}50` : 'var(--shadow-sm)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: isSelected ? region.themeColor : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {st.orderIndex || idx + 1}
              </span>
              <span>Chặng {st.orderIndex || idx + 1}</span>
              {st.hanko && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: isSelected ? region.accentColor : region.themeColor,
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : `${region.themeColor}15`,
                    padding: '1px 6px',
                    borderRadius: 4
                  }}
                >
                  {st.hanko}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Active Stage Info Card */}
      {activeStage && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: '20px 24px',
            border: `1.5px solid ${region.themeColor}40`,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: region.themeColor,
                  padding: '2px 8px',
                  borderRadius: 6
                }}
              >
                Chặng {activeStage.orderIndex} • {activeStage.range || 'Bài học'}
              </span>
              {activeStage.hanko && (
                <span style={{ fontSize: 13, fontWeight: 800, color: region.themeColor }}>
                  Con dấu: 【{activeStage.hanko}】
                </span>
              )}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              {activeStage.title.replace(/^\[N\d\]\s*/, '')}
            </h2>

            <div style={{ fontSize: 13, color: '#64748b' }}>
              {activeStage.description}
            </div>
          </div>

          {/* Checkpoint / Boss Preview in Header */}
          {activeStage.checkpoint && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '10px 14px',
                maxWidth: 320
              }}
            >
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                ⛩️ Mốc Đích Cuối Chặng
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {activeStage.checkpoint.cpTitle}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                {activeStage.checkpoint.cpDesc}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Winding Game Road Canvas (Map Chặng Uốn Lượn) */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#0f172a',
          backgroundImage: `
            radial-gradient(circle at 10% 20%, ${region.themeColor}15 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, ${region.accentColor}12 0%, transparent 40%)
          `,
          borderRadius: 24,
          padding: '40px 24px',
          border: '1.5px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Path Canvas Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none'
          }}
        />

        {/* Milestone Nodes Along Winding Road */}
        <div style={{ position: 'relative', zIndex: 5, maxWidth: 650, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
          {displayMilestones.map((ms, idx) => {
            const isCompleted = ms.status === 'COMPLETED' || idx === 0;
            const isUnlocked = ms.status === 'UNLOCKED' || idx === 1;
            const isLocked = !isCompleted && !isUnlocked;
            const isBoss = ms.milestone_type === 'BOSS_CHALLENGE' || idx === displayMilestones.length - 1;
            const align = nodeAlignments[idx % nodeAlignments.length];

            return (
              <div
                key={ms.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
                  width: '100%',
                  position: 'relative'
                }}
              >
                {/* Milestone Node Container */}
                <div
                  onClick={() => onSelectMilestone({ ...ms, status: isCompleted ? 'COMPLETED' : isUnlocked ? 'UNLOCKED' : 'LOCKED' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexDirection: align === 'right' ? 'row-reverse' : 'row',
                    cursor: 'pointer',
                    maxWidth: '440px',
                    transition: 'transform 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {/* Circular Node Icon (The Checkpoint Stone) */}
                  <div style={{ position: 'relative' }}>
                    {/* Character Pin on Unlocked/Current Node */}
                    {isUnlocked && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -18,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: 9.5,
                          fontWeight: 800,
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          animation: 'bouncePin 1.5s infinite'
                        }}
                      >
                        ⚡ ĐANG HỌC
                      </div>
                    )}

                    <div
                      style={{
                        width: isBoss ? 72 : 62,
                        height: isBoss ? 72 : 62,
                        borderRadius: '50%',
                        backgroundColor: isCompleted
                          ? '#10b981'
                          : isUnlocked
                          ? region.themeColor
                          : '#1e293b',
                        border: isBoss
                          ? '3px solid #f59e0b'
                          : isUnlocked
                          ? '3px solid #ffffff'
                          : isCompleted
                          ? '3px solid #86efac'
                          : '2px solid #475569',
                        boxShadow: isUnlocked
                          ? `0 0 24px ${region.themeColor}, 0 0 40px ${region.themeColor}80`
                          : isCompleted
                          ? '0 0 16px rgba(16, 185, 129, 0.5)'
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: isBoss ? 28 : 22,
                        animation: isUnlocked ? 'pulseNode 2s infinite' : 'none'
                      }}
                    >
                      {isBoss ? (
                        '🏯'
                      ) : isCompleted ? (
                        <CheckCircle2 size={30} />
                      ) : isUnlocked ? (
                        <Sparkles size={28} />
                      ) : (
                        <Lock size={22} style={{ color: '#94a3b8' }} />
                      )}
                    </div>
                  </div>

                  {/* Milestone Card Next to Node */}
                  <div
                    style={{
                      backgroundColor: isUnlocked ? '#1e293b' : 'rgba(30, 41, 59, 0.75)',
                      border: isUnlocked
                        ? `1.5px solid ${region.themeColor}`
                        : isCompleted
                        ? '1px solid #10b981'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 16,
                      padding: '12px 16px',
                      color: '#ffffff',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                      flex: 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: isCompleted ? '#86efac' : isUnlocked ? region.accentColor : '#94a3b8'
                        }}
                      >
                        {isBoss ? '👑 MỐC TRÙM' : `MỐC ${ms.orderIndex || idx + 1} • ${ms.nejUnit || 'Bài học'}`}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#facc15' }}>
                          +{ms.xpReward || 100} XP
                        </span>
                      </div>
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 4px 0', color: '#f8fafc' }}>
                      {ms.title}
                    </h4>

                    <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.4 }}>
                      {ms.communicationContext || 'Thực hành mục tiêu giao tiếp cốt lõi'}
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: isUnlocked ? '#38bdf8' : '#64748b', fontWeight: 700 }}>
                        {isCompleted ? '✓ Đã hoàn thành' : isUnlocked ? '⚡ Bấm để vào học' : '🔒 Đang khóa'}
                      </span>
                      <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulseNode {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }
        @keyframes bouncePin {
          0%, 100% {
            transform: translate(-50%, 0);
          }
          50% {
            transform: translate(-50%, -4px);
          }
        }
      `}</style>
    </div>
  );
};
