import React, { useState, useRef, useEffect } from 'react';
import { JapanRegion } from '../../types/kizuna';
import { Sparkles, Trophy, MapPin, Compass, Play, ChevronRight, CheckCircle2, Lock } from 'lucide-react';

interface JapanOverworldMapProps {
  regions: JapanRegion[];
  selectedRegion: JapanRegion | null;
  onSelectRegion: (region: JapanRegion) => void;
  onEnterRegion: (region: JapanRegion) => void;
  userCurrentLevel?: string;
}

export const JapanOverworldMap: React.FC<JapanOverworldMapProps> = ({
  regions,
  selectedRegion,
  onSelectRegion,
  onEnterRegion,
  userCurrentLevel = 'N5'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  // 3D Parallax Mouse Tilt Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate subtle tilt angle (max 8 degrees)
    const tiltX = ((y - centerY) / centerY) * -6;
    const tiltY = ((x - centerX) / centerX) * 6;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHoveredRegionId(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '620px',
        height: '75vh',
        maxHeight: '800px',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, #0d1b2a 0%, #08111c 65%, #030712 100%)',
        border: '1.5px solid rgba(56, 189, 248, 0.2)',
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), inset 0 0 100px rgba(2, 6, 23, 0.8)',
        perspective: '1200px',
        userSelect: 'none'
      }}
    >
      {/* 1. Ambient Background Effects: Sea waves & Sakura petals */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(56, 189, 248, 0.08) 0%, transparent 35%),
            radial-gradient(circle at 85% 75%, rgba(244, 63, 94, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.07) 0%, transparent 45%)
          `,
          pointerEvents: 'none'
        }}
      />

      {/* Subtle Japanese Wave Grid */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.12,
          pointerEvents: 'none'
        }}
      >
        <defs>
          <pattern id="seaGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1.5" fill="#38bdf8" />
            <path
              d="M 10 30 Q 30 15 50 30"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.8"
              opacity="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#seaGrid)" />
      </svg>

      {/* Floating Sakura Petals (CSS Generated) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${(i * 19) % 100}%`,
              left: `${(i * 29) % 100}%`,
              width: `${10 + (i % 6)}px`,
              height: `${7 + (i % 4)}px`,
              backgroundColor: '#fbcfe8',
              borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
              opacity: 0.4 + (i % 4) * 0.12,
              filter: 'blur(0.4px)',
              animation: `floatSakura ${12 + (i % 8)}s linear infinite`,
              animationDelay: `${i * 0.9}s`,
              transform: `rotate(${i * 35}deg)`
            }}
          />
        ))}
      </div>

      {/* Floating Clouds Layer */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          left: '10%',
          width: '260px',
          height: '60px',
          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(16px)',
          animation: 'driftCloud 45s ease-in-out infinite alternate',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '22%',
          right: '15%',
          width: '320px',
          height: '70px',
          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.08) 0%, transparent 75%)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          animation: 'driftCloud 55s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none'
        }}
      />

      {/* 2. Overworld 3D Tilting Stage */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
        }}
      >
        {/* Luminous Connecting Sea Route (Bezier Sea Trail N5 -> N4 -> N3 -> N2 -> N1) */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
          viewBox="0 0 1000 650"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="routeGlow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* S-shaped Grand Sea Lane connecting the 5 archipelago regions */}
          <path
            d="M 180 500 C 260 480, 320 400, 380 370 C 440 340, 520 320, 580 290 C 640 260, 710 220, 750 190 C 790 160, 820 130, 850 95"
            fill="none"
            stroke="url(#routeGlow)"
            strokeWidth="3.5"
            strokeDasharray="8 8"
            filter="url(#glowFilter)"
            style={{ animation: 'seaFlow 20s linear infinite' }}
          />
        </svg>

        {/* 3. The 5 Archipelago 3D Floating Landmasses */}
        {regions.map((reg) => {
          const isHovered = hoveredRegionId === reg.id;
          const isSelected = selectedRegion?.id === reg.id;
          const isCurrentTarget = reg.level === userCurrentLevel;

          return (
            <div
              key={reg.id}
              onClick={() => onSelectRegion(reg)}
              onMouseEnter={() => setHoveredRegionId(reg.id)}
              onMouseLeave={() => setHoveredRegionId(null)}
              style={{
                position: 'absolute',
                left: `${reg.mapPos.x}%`,
                top: `${reg.mapPos.y}%`,
                transform: `translate(-50%, -50%) translateZ(${isHovered || isSelected ? 35 : 10}px) scale(${isHovered || isSelected ? 1.08 : 1})`,
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                cursor: 'pointer',
                zIndex: isHovered || isSelected ? 30 : 10
              }}
            >
              {/* Floating Island Shadow */}
              <div
                style={{
                  position: 'absolute',
                  width: '160px',
                  height: '45px',
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.7) 0%, transparent 70%)',
                  bottom: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  filter: 'blur(6px)',
                  transition: 'all 0.3s'
                }}
              />

              {/* 3D Isometric Island Body */}
              <div
                style={{
                  position: 'relative',
                  width: '180px',
                  padding: '16px 14px',
                  borderRadius: '20px',
                  backgroundColor: '#111827',
                  background: `linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))`,
                  border: `2px solid ${isSelected ? '#ffffff' : isHovered ? reg.themeColor : `${reg.themeColor}70`}`,
                  boxShadow: `0 14px 28px rgba(0, 0, 0, 0.6), 0 0 ${isHovered || isSelected ? 30 : 15}px ${reg.themeColor}${isHovered || isSelected ? '80' : '40'}`,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                {/* Current Target Player Beacon Indicator */}
                {isCurrentTarget && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      animation: 'pulseGlow 2s infinite'
                    }}
                  >
                    <span>🔥 BẠN ĐANG Ở ĐÂY</span>
                  </div>
                )}

                {/* 3D Landmark Symbol */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    backgroundColor: `${reg.themeColor}22`,
                    border: `1.5px solid ${reg.themeColor}60`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    marginBottom: '8px',
                    boxShadow: `0 4px 12px ${reg.themeColor}30`,
                    transition: 'transform 0.3s'
                  }}
                >
                  {reg.iconSymbol}
                </div>

                {/* Level Chip */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#ffffff',
                    backgroundColor: reg.themeColor,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    marginBottom: '4px',
                    letterSpacing: '0.04em'
                  }}
                >
                  {reg.level}
                </span>

                {/* Region Title */}
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                  {reg.nameVi}
                </div>

                {/* Japanese Name */}
                <div style={{ fontSize: '11px', color: reg.accentColor, fontWeight: 600, marginBottom: '6px' }}>
                  {reg.nameJp}
                </div>

                {/* Stats badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '6px',
                    width: '100%'
                  }}
                >
                  <span>{reg.stagesCount} Chặng</span>
                  <span>•</span>
                  <span>{reg.milestonesCount} Mốc</span>
                </div>

                {/* Quick Action Hint */}
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '10.5px',
                    color: isHovered || isSelected ? '#ffffff' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontWeight: 700
                  }}
                >
                  <span>Khám phá</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Top-Left Game Overworld Legend & Controls */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 40,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          padding: '12px 16px',
          color: '#f8fafc',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Compass size={18} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em' }}>
            BẢN ĐỒ QUẦN ĐẢO NHẬT BẢN 3D
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
          Hành trình 5 Vùng đất: Khởi đầu N5 ➔ Đỉnh cao N1
        </div>
        <div style={{ fontSize: '10.5px', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={11} />
          <span>Rê chuột để nghiêng 3D • Nhấp vùng đất để xem chi tiết</span>
        </div>
      </div>

      {/* 5. Bottom Quick Level Switcher Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          padding: '6px',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 15px 30px rgba(0, 0, 0, 0.6)'
        }}
      >
        {regions.map(r => {
          const isActive = selectedRegion?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRegion(r)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: isActive ? r.themeColor : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 0 12px ${r.themeColor}80` : 'none'
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <span>{r.iconSymbol}</span>
              <span>{r.level}</span>
            </button>
          );
        })}
      </div>

      {/* Keyframe Styles for animations */}
      <style>{`
        @keyframes seaFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -400; }
        }
        @keyframes floatSakura {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          85% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(650px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes driftCloud {
          0% { transform: translateX(0px); }
          100% { transform: translateX(60px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};
