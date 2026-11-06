import React from 'react';
import { JapanRegion, Stage } from '../../types/kizuna';
import { X, Sparkles, MapPin, ChevronRight } from 'lucide-react';

interface RegionDetailModalProps {
  region: JapanRegion | null;
  stages: Stage[];
  isOpen: boolean;
  onClose: () => void;
  onEnterRegion: (region: JapanRegion) => void;
}

export const RegionDetailModal: React.FC<RegionDetailModalProps> = ({
  region,
  stages,
  isOpen,
  onClose,
  onEnterRegion
}) => {
  if (!isOpen || !region) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: '24px',
          border: `2px solid ${region.themeColor}`,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px ${region.themeColor}40`,
          padding: '24px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <X size={18} />
        </button>

        {/* Region Badge & Level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              backgroundColor: region.themeColor,
              color: '#ffffff',
              boxShadow: `0 0 12px ${region.themeColor}80`
            }}
          >
            {region.level} • {region.badgeTitle}
          </span>

          <span
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <MapPin size={13} style={{ color: region.themeColor }} />
            {region.realGeo}
          </span>
        </div>

        {/* Region Title */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            {region.nameVi}
          </h2>
          <div style={{ fontSize: '13px', color: region.accentColor, fontWeight: 600, marginTop: '2px' }}>
            {region.nameJp}
          </div>
        </div>

        {/* Landmark highlight card */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div
            style={{
              fontSize: '28px',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: `${region.themeColor}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${region.themeColor}40`
            }}
          >
            {region.iconSymbol}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Địa danh biểu tượng
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              {region.landmarkName}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              {region.landmarkDesc}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
          {region.description}
        </p>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>🗺️ Số Chặng</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{region.stagesCount} Chặng</div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>📍 Số Mốc</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{region.milestonesCount} Mốc</div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>⭐ Thưởng XP</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>+{region.totalXp} XP</div>
          </div>
        </div>

        {/* Stage List Preview */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Các chặng trong vùng đất này:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
            {stages.map((st, idx) => (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: `${region.themeColor}30`,
                      color: region.accentColor,
                      fontSize: '12px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                      {st.title.replace(/^\[N\d\]\s*/, '')}
                    </div>
                    {st.range && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Phạm vi: {st.range}
                      </div>
                    )}
                  </div>
                </div>
                {st.hanko && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: region.themeColor,
                      padding: '2px 8px',
                      border: `1px solid ${region.themeColor}50`,
                      borderRadius: '4px'
                    }}
                  >
                    {st.hanko}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onEnterRegion(region)}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '14px',
            border: 'none',
            background: `linear-gradient(135deg, ${region.themeColor}, ${region.accentColor})`,
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: `0 8px 20px -4px ${region.themeColor}80`,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 12px 24px -4px ${region.themeColor}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 8px 20px -4px ${region.themeColor}80`;
          }}
        >
          <Sparkles size={18} />
          <span>VÀO KHÁM PHÁ VÙNG ĐẤT NÀY</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
