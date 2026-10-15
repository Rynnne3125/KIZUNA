import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Video,
  Headphones,
  Play,
  Clock,
  Search,
  Sparkles,
  ExternalLink,
  Volume2,
  Film,
  Layers,
  Check,
  ChevronRight,
  ListFilter,
  RotateCcw,
  AlertCircle,
  Radio,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { VideoLesson, ChoukaiAudioItem } from '../types/kizuna';

const LEVEL_FILTERS = [
  { id: 'ALL', label: 'Tất cả cấp độ' },
  { id: 'N5', label: 'N5 Nhập môn' },
  { id: 'N4', label: 'N4 Sơ cấp' },
  { id: 'N3', label: 'N3 Trung cấp' },
  { id: 'N2', label: 'N2 Trung thượng' },
  { id: 'N1', label: 'N1 Thượng cấp' }
];

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'Tất cả chủ đề' },
  { id: 'Podcast', label: 'Podcast & Shadowing' },
  { id: 'Luyện thi', label: 'Luyện đề JLPT' },
  { id: 'Kinh doanh', label: 'Tiếng Nhật Kinh Doanh' },
  { id: 'Tin tức', label: 'Tin tức & Thời sự' },
  { id: 'Phim', label: 'Phim & Đời sống' }
];

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'choukai'>('video');

  // Video State
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(true);
  const [videoLevelFilter, setVideoLevelFilter] = useState<string>('ALL');
  const [videoCategoryFilter, setVideoCategoryFilter] = useState<string>('ALL');
  const [videoSearchQuery, setVideoSearchQuery] = useState<string>('');

  // Choukai Audio State (Corodomo)
  const [choukaiList, setChoukaiList] = useState<ChoukaiAudioItem[]>([]);
  const [loadingChoukai, setLoadingChoukai] = useState<boolean>(false);
  const [choukaiLevelFilter, setChoukaiLevelFilter] = useState<string>('ALL');
  const [choukaiSearchQuery, setChoukaiSearchQuery] = useState<string>('');

  // Player ref for smooth scrolling
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // 1. Tải danh sách video từ Firestore (hoặc fallback dataset)
  useEffect(() => {
    async function loadVideos() {
      setLoadingVideos(true);
      try {
        const list = await kizunaService.getVideoLessons('ALL', 'ALL');
        setVideos(list);
        if (list.length > 0 && !activeVideo) {
          setActiveVideo(list[0]);
        }
      } catch (err) {
        console.error('Lỗi nạp video lessons:', err);
      } finally {
        setLoadingVideos(false);
      }
    }
    loadVideos();
  }, []);

  // 2. Tải danh sách Choukai Audio khi mở tab choukai
  useEffect(() => {
    if (activeTab === 'choukai' && choukaiList.length === 0) {
      setLoadingChoukai(true);
      kizunaService.getChoukaiAudioList('ALL').then(list => {
        setChoukaiList(list);
        setLoadingChoukai(false);
      }).catch(err => {
        console.error('Lỗi nạp Choukai audio:', err);
        setLoadingChoukai(false);
      });
    }
  }, [activeTab]);

  // Format thời lượng từ giây sang mm:ss hoặc hh:mm:ss
  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '10:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Lọc Video theo Level, Category & Search
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchLevel = videoLevelFilter === 'ALL' || v.jlptLevel?.toUpperCase() === videoLevelFilter.toUpperCase();
      const matchCategory = videoCategoryFilter === 'ALL' || v.category?.toLowerCase() === videoCategoryFilter.toLowerCase();
      const q = videoSearchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        v.title?.toLowerCase().includes(q) ||
        (v.titleEn && v.titleEn.toLowerCase().includes(q)) ||
        (v.channelName && v.channelName.toLowerCase().includes(q));
      return matchLevel && matchCategory && matchSearch;
    });
  }, [videos, videoLevelFilter, videoCategoryFilter, videoSearchQuery]);

  // Khi lọc danh sách video, nếu video đang phát không nằm trong kết quả thì chuyển sang video đầu tiên của kết quả
  useEffect(() => {
    if (filteredVideos.length > 0) {
      const isCurrentInFiltered = filteredVideos.some(v => v.id === activeVideo?.id);
      if (!isCurrentInFiltered) {
        setActiveVideo(filteredVideos[0]);
      }
    }
  }, [filteredVideos]);

  // Lọc Choukai Audio theo Level & Search
  const filteredChoukai = useMemo(() => {
    return choukaiList.filter(item => {
      const matchLevel = choukaiLevelFilter === 'ALL' || item.level?.toUpperCase() === choukaiLevelFilter.toUpperCase();
      const q = choukaiSearchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        item.label.toLowerCase().includes(q) ||
        (item.year && item.year.toString().includes(q));
      return matchLevel && matchSearch;
    });
  }, [choukaiList, choukaiLevelFilter, choukaiSearchQuery]);

  const handleSelectVideo = (video: VideoLesson) => {
    setActiveVideo(video);
    if (window.innerWidth < 1024 && playerContainerRef.current) {
      playerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <style>{`
        @keyframes kanjiSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
      `}</style>

      {/* 1. HERO HEADER PHONG CÁCH NHẬT BẢN */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
        border: '1px solid #e7dfd5',
        borderLeft: '4px solid #c53d32',
        borderRadius: 14,
        padding: '24px 28px',
        marginBottom: 20,
        boxShadow: '0 4px 16px -2px rgba(44, 30, 20, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                background: '#fdf2f0',
                color: '#c53d32',
                border: '1px solid #f3d5d2',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '1px',
                fontFamily: 'serif'
              }}>
                多言語 · メディアライブラリ
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#78716c' }}>
                THƯ VIỆN HỌC LIỆU ĐA PHƯƠNG TIỆN
              </span>
            </div>

            <h1 style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#1c2536',
              margin: '0 0 8px 0',
              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
            }}>
              Phòng Luyện Shadowing & Kho Bài Nghe Choukai Corodomo
            </h1>

            <p style={{ color: '#57534e', fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 780 }}>
              Hơn 1,000 video bản quyền luyện nói phản xạ (Shadowing) từ người bản xứ kèm 65 bộ ghi âm Choukai chính thức cào từ Corodomo, sẵn sàng cho việc luyện nghe chép chính tả và nâng cao phản xạ giao tiếp tự nhiên.
            </p>
          </div>

          {/* TAB SWITCH */}
          <div style={{
            display: 'inline-flex',
            background: '#ffffff',
            padding: 4,
            borderRadius: 10,
            border: '1px solid #ebe7df',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <button
              onClick={() => setActiveTab('video')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'video' ? '#c53d32' : 'transparent',
                color: activeTab === 'video' ? '#ffffff' : '#57534e',
                boxShadow: activeTab === 'video' ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <Video size={15} />
              <span>Video Shadowing ({videos.length || 1015})</span>
            </button>

            <button
              onClick={() => setActiveTab('choukai')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'choukai' ? '#c53d32' : 'transparent',
                color: activeTab === 'choukai' ? '#ffffff' : '#57534e',
                boxShadow: activeTab === 'choukai' ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <Headphones size={15} />
              <span>Đề Nghe Choukai (65 Đề)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: PHÒNG LUYỆN VIDEO SHADOWING & PLAYLIST TƯƠNG TÁC                */}
      {/* ===================================================================== */}
      {activeTab === 'video' && (
        <div>
          {/* THANH BỘ LỌC CẤP ĐỘ, CHỦ ĐỀ & TÌM KIẾM */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>
            {/* Hàng 1: Bộ lọc Cấp độ JLPT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c', minWidth: 60 }}>
                CẤP ĐỘ:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LEVEL_FILTERS.map(lvl => {
                  const isSelected = videoLevelFilter === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setVideoLevelFilter(lvl.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isSelected ? '1px solid #c53d32' : '1px solid #ebe7df',
                        background: isSelected ? '#fdf2f0' : '#faf8f5',
                        color: isSelected ? '#c53d32' : '#57534e'
                      }}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hàng 2: Bộ lọc Danh mục chủ đề */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c', minWidth: 60 }}>
                CHỦ ĐỀ:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORY_FILTERS.map(cat => {
                  const isSelected = videoCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setVideoCategoryFilter(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isSelected ? '1px solid #c53d32' : '1px solid #ebe7df',
                        background: isSelected ? '#c53d32' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#57534e'
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hàng 3: Ô tìm kiếm từ khóa thời gian thực */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 4, borderTop: '1px dashed #f0ece1' }}>
              <div style={{ fontSize: 12, color: '#78716c' }}>
                Tìm thấy <strong style={{ color: '#c53d32' }}>{filteredVideos.length}</strong> video shadowing phù hợp:
              </div>

              <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
                <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Tìm video theo tiêu đề, kênh phát..."
                  value={videoSearchQuery}
                  onChange={e => setVideoSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: 6,
                    border: '1px solid #d6d3d1',
                    fontSize: 12,
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>
          </div>

          {/* KHÔNG GIAN PHÁT VIDEO & PLAYLIST (THEATER & PLAYLIST SPLIT VIEW) */}
          {loadingVideos ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #ebe7df',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#78716c'
            }}>
              <div style={{
                display: 'inline-block',
                width: 32,
                height: 32,
                border: '3px solid #ebe7df',
                borderTopColor: '#c53d32',
                borderRadius: '50%',
                animation: 'kanjiSpin 0.8s linear infinite',
                marginBottom: 12
              }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1c2536' }}>
                Đang nạp kho video Shadowing từ hệ thống...
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #ebe7df',
              padding: '48px 20px',
              textAlign: 'center'
            }}>
              <AlertCircle size={32} color="#78716c" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1c2536' }}>
                Không tìm thấy video nào theo bộ lọc hiện tại
              </div>
              <p style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>
                Hãy thử chọn lại cấp độ hoặc làm mới từ khóa tìm kiếm.
              </p>
              <button
                onClick={() => { setVideoLevelFilter('ALL'); setVideoCategoryFilter('ALL'); setVideoSearchQuery(''); }}
                style={{
                  marginTop: 10,
                  padding: '7px 16px',
                  background: '#c53d32',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Đặt lại toàn bộ bộ lọc
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 380px',
              gap: 20,
              alignItems: 'start'
            }}>
              {/* CỘT TRÁI: KHUNG TRÌNH PHÁT VIDEO CHÍNH (THEATER PLAYER) */}
              <div ref={playerContainerRef}>
                {activeVideo ? (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    border: '1px solid #ebe7df',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                  }}>
                    {/* TRÌNH PHÁT YOUTUBE IFRAME CHUẨN 16:9 */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '56.25%', // Tỉ lệ 16:9
                      background: '#0a0f1d'
                    }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${activeVideo.youtubeVideoId}?autoplay=1&rel=0`}
                        title={activeVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none'
                        }}
                      />
                    </div>

                    {/* THÔNG TIN CHI TIẾT VIDEO ĐANG PHÁT */}
                    <div style={{ padding: '20px 22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{
                          background: '#fdf2f0',
                          color: '#c53d32',
                          border: '1px solid #f3d5d2',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 900
                        }}>
                          {activeVideo.jlptLevel || 'N3'}
                        </span>

                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          {activeVideo.category || 'Shadowing'}
                        </span>

                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#78716c' }}>
                          <Clock size={13} color="#78716c" />
                          <span>{formatDuration(activeVideo.durationSeconds)}</span>
                        </span>

                        {activeVideo.channelName && (
                          <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 700 }}>
                            • Kênh: {activeVideo.channelName}
                          </span>
                        )}
                      </div>

                      <h2 style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#1c2536',
                        margin: '0 0 8px 0',
                        lineHeight: 1.4,
                        fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                      }}>
                        {activeVideo.title}
                      </h2>

                      {activeVideo.titleEn && (
                        <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                          "{activeVideo.titleEn}"
                        </p>
                      )}

                      {/* THANH THAO TÁC VIDEO */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        paddingTop: 14,
                        borderTop: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#16a34a',
                              display: 'inline-block',
                              animation: 'pulseDot 1.5s infinite'
                            }} />
                            Đang phát trực tiếp
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <a
                            href={activeVideo.youtubeUrl || `https://www.youtube.com/watch?v=${activeVideo.youtubeVideoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '6px 14px',
                              background: '#faf8f5',
                              border: '1px solid #d6d3d1',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#57534e',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>Mở trên YouTube</span>
                          </a>
                        </div>
                      </div>

                      {/* HƯỚNG DẪN 4 BƯỚC LUYỆN SHADOWING */}
                      <div style={{
                        marginTop: 18,
                        background: '#faf8f5',
                        border: '1px solid #ebe7df',
                        borderLeft: '4px solid #c53d32',
                        borderRadius: 8,
                        padding: '14px 16px'
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#1c2536', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Sparkles size={14} color="#c53d32" />
                          <span>4 BƯỚC LUYỆN SHADOWING CHUẨN KIZUNA ĐẠT HIỆU QUẢ CAO:</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12, color: '#57534e', lineHeight: 1.5 }}>
                          <div>
                            <strong style={{ color: '#c53d32' }}>1. Nghe chay:</strong> Nghe 1 lượt để nắm ý chính và ngữ điệu toàn cảnh.
                          </div>
                          <div>
                            <strong style={{ color: '#c53d32' }}>2. Nghe + phụ đề:</strong> Nắm chắc mặt chữ và ngắt câu chính xác.
                          </div>
                          <div>
                            <strong style={{ color: '#c53d32' }}>3. Nhại thì thầm:</strong> Lặp lại từng câu ngay sau người nói 0.5s.
                          </div>
                          <div>
                            <strong style={{ color: '#c53d32' }}>4. Shadowing thật:</strong> Nói đuổi với âm lượng tự tin, chuẩn tốc độ.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* CỘT PHẢI: DANH SÁCH PHÁT (INTERACTIVE PLAYLIST) */}
              <div style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #ebe7df',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
              }}>
                {/* Header Playlist */}
                <div style={{
                  padding: '14px 16px',
                  background: '#faf8f5',
                  borderBottom: '1px solid #ebe7df',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={16} color="#c53d32" />
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1c2536' }}>
                      Danh Sách Phát
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#78716c',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '2px 8px',
                    borderRadius: 12
                  }}>
                    {filteredVideos.length} video
                  </span>
                </div>

                {/* Danh sách cuộn các video */}
                <div style={{
                  maxHeight: 640,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {filteredVideos.map((v, idx) => {
                    const isPlaying = activeVideo?.id === v.id;
                    const thumb = v.thumbnailUrl || `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`;

                    return (
                      <div
                        key={v.id || idx}
                        onClick={() => handleSelectVideo(v)}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: '12px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: isPlaying ? '#fdf2f0' : '#ffffff',
                          borderLeft: isPlaying ? '4px solid #c53d32' : '4px solid transparent'
                        }}
                        onMouseEnter={e => {
                          if (!isPlaying) e.currentTarget.style.background = '#faf8f5';
                        }}
                        onMouseLeave={e => {
                          if (!isPlaying) e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        {/* Thumbnail với thời lượng */}
                        <div style={{
                          position: 'relative',
                          width: 100,
                          height: 60,
                          borderRadius: 6,
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#0a0f1d'
                        }}>
                          <img
                            src={thumb}
                            alt={v.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                            onError={e => {
                              // Fallback thumbnail nếu YouTube hqdefault lỗi
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtubeVideoId}/0.jpg`;
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: 3,
                            right: 4,
                            background: 'rgba(0,0,0,0.75)',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 3
                          }}>
                            {formatDuration(v.durationSeconds)}
                          </span>

                          {isPlaying && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(197, 61, 50, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff'
                            }}>
                              <Volume2 size={18} />
                            </div>
                          )}
                        </div>

                        {/* Tiêu đề & Thông tin kênh */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: isPlaying ? 800 : 700,
                            color: isPlaying ? '#c53d32' : '#1c2536',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {v.title}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 900,
                              background: isPlaying ? '#fdf2f0' : '#f1f5f9',
                              color: isPlaying ? '#c53d32' : '#64748b',
                              border: isPlaying ? '1px solid #f3d5d2' : '1px solid #e2e8f0',
                              padding: '1px 5px',
                              borderRadius: 3
                            }}>
                              {v.jlptLevel || 'N3'}
                            </span>
                            <span style={{
                              fontSize: 11,
                              color: '#78716c',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis'
                            }}>
                              {v.channelName || 'Kizuna Studio'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ĐỀ NGHE CHOUKAI CHÍNH THỨC CÀO TỪ CORODOMO (65 ĐỀ THI AUDIO)    */}
      {/* ===================================================================== */}
      {activeTab === 'choukai' && (
        <div>
          {/* THANH LỌC BẬC JLPT & TÌM KIẾM ĐỀ THI */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>
                BẬC JLPT:
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['ALL', 'N3', 'N2', 'N1'].map(lvl => {
                  const isSelected = choukaiLevelFilter === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setChoukaiLevelFilter(lvl)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isSelected ? '1px solid #c53d32' : '1px solid #ebe7df',
                        background: isSelected ? '#c53d32' : '#faf8f5',
                        color: isSelected ? '#ffffff' : '#57534e'
                      }}
                    >
                      {lvl === 'ALL' ? 'Tất cả (65 Đề)' : lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
              <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Tìm theo năm (2024, 2023...), tên đề..."
                value={choukaiSearchQuery}
                onChange={e => setChoukaiSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: 6,
                  border: '1px solid #d6d3d1',
                  fontSize: 12,
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* DANH SÁCH BẢN GHI ÂM CHOUKAI CORODOMO */}
          {loadingChoukai ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #ebe7df',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#78716c'
            }}>
              <div style={{
                display: 'inline-block',
                width: 32,
                height: 32,
                border: '3px solid #ebe7df',
                borderTopColor: '#c53d32',
                borderRadius: '50%',
                animation: 'kanjiSpin 0.8s linear infinite',
                marginBottom: 12
              }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1c2536' }}>
                Đang nạp 65 bản ghi âm Choukai từ kho Corodomo...
              </div>
            </div>
          ) : filteredChoukai.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #ebe7df',
              padding: '48px 20px',
              textAlign: 'center'
            }}>
              <AlertCircle size={32} color="#78716c" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1c2536' }}>
                Không tìm thấy đề nghe nào phù hợp
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 16
            }}>
              {filteredChoukai.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #ebe7df',
                    borderLeft: '4px solid #0d9488',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Header thẻ đề thi */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        background: '#f0fdfa',
                        color: '#0d9488',
                        border: '1px solid #ccfbf1',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 900
                      }}>
                        {item.level}
                      </span>
                      {item.year && (
                        <span style={{
                          background: '#faf8f5',
                          color: '#78716c',
                          border: '1px solid #ebe7df',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          {item.year}{item.month ? ` · Tháng ${item.month}` : ''}
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: 11, color: '#78716c', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> ~{item.durationMinutes || 40} phút
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#1c2536',
                    margin: 0,
                    fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                  }}>
                    {item.label}
                  </h3>

                  <div style={{ fontSize: 12, color: '#57534e' }}>
                    Bản ghi âm chính thức nghe hiểu Choukai (5 Mondai) từ kỳ thi JLPT thật.
                  </div>

                  {/* TRÌNH PHÁT AUDIO HTML5 NATIVE */}
                  <div style={{
                    background: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <audio
                      src={item.audioUrl}
                      controls
                      preload="none"
                      style={{ width: '100%', height: 36, outline: 'none' }}
                    />
                  </div>

                  {/* Nút hành động mở phòng thi */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <a
                      href="/thi-thu"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#c53d32',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Vào làm bài thi có chấm điểm</span>
                      <ArrowRight size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
