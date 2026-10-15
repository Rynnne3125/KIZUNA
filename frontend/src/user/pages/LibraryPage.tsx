import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Video,
  Headphones,
  Play,
  Pause,
  Clock,
  Search,
  Sparkles,
  Volume2,
  Film,
  Layers,
  Check,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Award,
  CheckCircle2,
  X,
  ChevronLeft,
  ListFilter,
  FileText
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { authService } from '../services/authService';
import { progressService } from '../services/progressService';
import { VideoLesson, ChoukaiAudioItem, QuestionSet } from '../types/kizuna';

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
  { id: 'Podcast', label: 'Podcast' },
  { id: 'Luyện thi', label: 'Luyện thi' },
  { id: 'Kinh doanh', label: 'Kinh doanh' },
  { id: 'Phim', label: 'Văn hóa & Phim' },
  { id: 'Tin tức', label: 'Tin tức' }
];

export const LibraryPage: React.FC = () => {
  // 2 Phân hệ học tập thực tế & chuẩn xác:
  // 1. 'video': Kho học liệu video tiếng Nhật tổng hợp (1.015 video chính thức từ CSDL)
  // 2. 'choukai': Luyện đề thi nghe Choukai (65 bộ đề thi chính thức kèm âm thanh gốc & kịch bản)
  const [activeTab, setActiveTab] = useState<'video' | 'choukai'>('video');

  // =========================================================================
  // STATE CHO TAB 1: KHO HỌC LIỆU VIDEO (1.015 VIDEO)
  // =========================================================================
  const [allVideos, setAllVideos] = useState<VideoLesson[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(true);
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [videoLevel, setVideoLevel] = useState<string>('ALL');
  const [videoCategory, setVideoCategory] = useState<string>('ALL');
  const [videoSearch, setVideoSearch] = useState<string>('');

  // =========================================================================
  // STATE CHO TAB 2: PHÒNG THI CHOUKAI (65 BỘ ĐỀ CHÍNH THỨC)
  // =========================================================================
  const [choukaiCatalog, setChoukaiCatalog] = useState<ChoukaiAudioItem[]>([]);
  const [loadingChoukai, setLoadingChoukai] = useState<boolean>(false);
  const [choukaiLevel, setChoukaiLevel] = useState<string>('ALL');
  const [choukaiSearch, setChoukaiSearch] = useState<string>('');

  // Làm bài thi Choukai chi tiết
  const [activeExamDetail, setActiveExamDetail] = useState<ChoukaiAudioItem | null>(null);
  const [loadingExamId, setLoadingExamId] = useState<string | null>(null);
  const [examErrorMsg, setExamErrorMsg] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<{ total: number; correct: number; percentage: number; isPassed: boolean } | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // 1. Tải danh sách video từ CSDL
  useEffect(() => {
    async function initVideos() {
      setLoadingVideos(true);
      try {
        const list = await kizunaService.getVideoLessons('ALL', 'ALL');
        setAllVideos(list);
        if (list.length > 0) {
          setActiveVideo(list[0]);
        }
      } catch (err) {
        console.error('Lỗi nạp danh sách video:', err);
      } finally {
        setLoadingVideos(false);
      }
    }
    initVideos();
  }, []);

  // 2. Tải danh mục Choukai Corodomo khi vào tab Choukai
  useEffect(() => {
    if (activeTab === 'choukai' && choukaiCatalog.length === 0) {
      setLoadingChoukai(true);
      kizunaService.getChoukaiAudioList('ALL').then(list => {
        setChoukaiCatalog(list);
        setLoadingChoukai(false);
      }).catch(err => {
        console.error('Lỗi nạp Choukai catalog:', err);
        setLoadingChoukai(false);
      });
    }
  }, [activeTab]);

  // Lọc danh sách Video theo Cấp độ, Thể loại và Từ khóa tìm kiếm
  const filteredVideos = useMemo(() => {
    return allVideos.filter(v => {
      const matchLevel = videoLevel === 'ALL' || v.jlptLevel?.toUpperCase() === videoLevel.toUpperCase();
      const matchCategory = videoCategory === 'ALL' || v.category?.toLowerCase() === videoCategory.toLowerCase();
      const q = videoSearch.toLowerCase().trim();
      const matchSearch = !q || v.title.toLowerCase().includes(q) || (v.channelName && v.channelName.toLowerCase().includes(q));
      return matchLevel && matchCategory && matchSearch;
    });
  }, [allVideos, videoLevel, videoCategory, videoSearch]);

  // Video đề xuất liên quan cùng chủ đề / cấp độ trong KIZUNA
  const relatedVideos = useMemo(() => {
    if (!activeVideo) return [];
    return allVideos
      .filter(v => v.id !== activeVideo.id && (v.category === activeVideo.category || v.jlptLevel === activeVideo.jlptLevel))
      .slice(0, 4);
  }, [allVideos, activeVideo]);

  // Lọc danh sách Đề thi Choukai (Chỉ chọn đề có trọn vẹn bộ câu hỏi nghe)
  const filteredChoukai = useMemo(() => {
    return choukaiCatalog.filter(item => {
      const hasQuestions = item.listeningSetsCount !== 0;
      const matchLevel = choukaiLevel === 'ALL' || item.level?.toUpperCase() === choukaiLevel.toUpperCase();
      const q = choukaiSearch.toLowerCase().trim();
      const matchSearch = !q || item.label.toLowerCase().includes(q) || (item.year && item.year.toString().includes(q));
      return hasQuestions && matchLevel && matchSearch;
    });
  }, [choukaiCatalog, choukaiLevel, choukaiSearch]);

  // Format thời lượng hiển thị (giây -> mm:ss)
  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '10:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Bắt đầu làm bài thi Choukai (Tải đề chi tiết 5 Mondai kèm kịch bản)
  const handleStartChoukaiExam = async (examId: string) => {
    setLoadingExamId(examId);
    setExamErrorMsg(null);
    try {
      const full = await kizunaService.getChoukaiExamDetail(examId);
      if (full && full.questionSets && full.questionSets.length > 0) {
        setActiveExamDetail(full);
        setUserAnswers({});
        setIsSubmitted(false);
        setScoreResult(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setExamErrorMsg('Đề thi này hiện chưa hoàn thiện câu hỏi trắc nghiệm hoặc không thể nạp. Vui lòng chọn đề khác!');
      }
    } catch (err) {
      console.error('Lỗi nạp bài thi Choukai:', err);
      setExamErrorMsg('Đã có lỗi xảy ra khi nạp đề thi. Vui lòng thử lại!');
    } finally {
      setLoadingExamId(null);
    }
  };

  // Nộp bài thi Choukai, tính điểm & lưu tiến trình người dùng
  const handleConfirmSubmitChoukai = () => {
    if (!activeExamDetail || !activeExamDetail.questionSets) return;
    setShowSubmitModal(false);

    let total = 0;
    let correct = 0;

    for (const qs of activeExamDetail.questionSets) {
      for (const q of qs.questions) {
        total++;
        if (userAnswers[q.id] === q.correctAnswer) {
          correct++;
        }
      }
    }

    const percentage = Math.round((correct / (total || 1)) * 100);
    const isPassed = percentage >= 50;

    setScoreResult({ total, correct, percentage, isPassed });
    setIsSubmitted(true);

    // Lưu kết quả thi vào Firestore & LocalStorage để theo dõi tiến trình
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id) {
      progressService.saveExamResult({
        userId: currentUser.id,
        examId: activeExamDetail.id,
        examLabel: `${activeExamDetail.label} (Choukai)`,
        level: activeExamDetail.level,
        score: correct,
        total,
        percentage,
        isPassed,
        timeSpentSeconds: 0,
        answeredCount: Object.keys(userAnswers).length,
        totalQuestions: total,
        completedAt: new Date().toISOString(),
        userAnswers
      }).catch(err => console.warn('Lỗi ghi nhận tiến trình thi Choukai:', err));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
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
                HỌC LIỆU ĐA PHƯƠNG TIỆN KIZUNA
              </span>
            </div>

            <h1 style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#1c2536',
              margin: '0 0 8px 0',
              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
            }}>
              Kho Học Liệu Video & Luyện Đề Nghe Choukai
            </h1>

            <p style={{ color: '#57534e', fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 780 }}>
              Học liệu tiếng Nhật bản ngữ chuẩn xác: Kho 1.015 video bài giảng đa chủ đề phân loại N5-N1 và ngân hàng 65 đề thi nghe Choukai chính thức có chấm điểm kèm kịch bản đối chiếu.
            </p>
          </div>

          {/* CHUYỂN ĐỔI 2 PHÂN HỆ HỌC TẬP CHÍNH */}
          <div style={{
            display: 'inline-flex',
            background: '#ffffff',
            padding: 4,
            borderRadius: 10,
            border: '1px solid #ebe7df',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            gap: 4
          }}>
            <button
              onClick={() => { setActiveTab('video'); setActiveExamDetail(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'video' ? '#c53d32' : 'transparent',
                color: activeTab === 'video' ? '#ffffff' : '#57534e',
                boxShadow: activeTab === 'video' ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <Film size={14} />
              <span>Kho Học Liệu Video ({allVideos.length || '1.015'})</span>
            </button>

            <button
              onClick={() => setActiveTab('choukai')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'choukai' ? '#c53d32' : 'transparent',
                color: activeTab === 'choukai' ? '#ffffff' : '#57534e',
                boxShadow: activeTab === 'choukai' ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <Headphones size={14} />
              <span>Luyện Đề Nghe Choukai (65 Đề)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PHÂN HỆ 1: KHO HỌC LIỆU VIDEO TIẾNG NHẬT TỔNG HỢP                     */}
      {/* ===================================================================== */}
      {activeTab === 'video' && (
        <div>
          {/* Thanh lọc & tìm kiếm Kho Học Liệu Video */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {/* Hàng 1: Bộ lọc Bậc JLPT và Tìm kiếm */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>
                  BẬC JLPT:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEVEL_FILTERS.map(lvl => {
                    const isSelected = videoLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        onClick={() => setVideoLevel(lvl.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #c53d32' : '1px solid #ebe7df',
                          background: isSelected ? '#fdf2f0' : '#faf8f5',
                          color: isSelected ? '#c53d32' : '#57534e',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ô tìm kiếm */}
              <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
                <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Tìm video, bài giảng, kênh..."
                  value={videoSearch}
                  onChange={e => setVideoSearch(e.target.value)}
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

            {/* Hàng 2: Bộ lọc Danh mục chủ đề */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px dashed #f1f5f9' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>
                CHỦ ĐỀ:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORY_FILTERS.map(cat => {
                  const isSelected = videoCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setVideoCategory(cat.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isSelected ? '1px solid #c53d32' : '1px solid #ebe7df',
                        background: isSelected ? '#c53d32' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#57534e',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: '#78716c', marginLeft: 'auto' }}>
                Hiển thị <strong>{filteredVideos.length}</strong> video bài giảng
              </span>
            </div>
          </div>

          {/* GIAO DIỆN THEATER: TRÌNH PHÁT TRÁI + PLAYLIST PHẢI */}
          {activeVideo ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)',
              gap: 20,
              alignItems: 'start'
            }}>
              {/* CỘT TRÁI: VIDEO PLAYER & THÔNG TIN BÀI HỌC */}
              <div>
                <div style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #ebe7df',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}>
                  {/* Trình phát nhúng YouTube chuẩn (có sandbox chặn chuyển trang ra ngoài) */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%',
                    background: '#0a0f1d'
                  }}>
                    <iframe
                      id="kizuna-video-player"
                      src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title={activeVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-picture"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>

                  {/* Thông tin Video */}
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{
                        background: '#fdf2f0',
                        color: '#c53d32',
                        border: '1px solid #f3d5d2',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 900
                      }}>
                        {activeVideo.jlptLevel}
                      </span>
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {activeVideo.category}
                      </span>
                      <span style={{ fontSize: 12, color: '#78716c', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {formatDuration(activeVideo.durationSeconds)}
                      </span>
                      {activeVideo.channelName && (
                        <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 700 }}>
                          • {activeVideo.channelName}
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {activeVideo.title}
                    </h2>

                    <div style={{ fontSize: 12, color: '#78716c', lineHeight: 1.5 }}>
                      Video bài giảng chính thức thuộc kho học liệu KIZUNA. Học tập trực tiếp ngay trong ứng dụng không bị chuyển hướng.
                    </div>
                  </div>
                </div>

                {/* VIDEO CÙNG CHỦ ĐỀ ĐƯỢC ĐỀ XUẤT TIẾP THEO TRONG KIZUNA */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1c2536', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color="#c53d32" />
                    <span>BÀI HỌC LIÊN QUAN TIẾP THEO TRONG KIZUNA:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {relatedVideos.map(v => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setActiveVideo(v);
                          window.scrollTo({ top: 160, behavior: 'smooth' });
                        }}
                        style={{
                          background: '#ffffff',
                          borderRadius: 8,
                          border: activeVideo.id === v.id ? '2px solid #c53d32' : '1px solid #ebe7df',
                          padding: 8,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 6, overflow: 'hidden', background: '#0a0f1d' }}>
                          <img
                            src={v.thumbnailUrl || `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                            alt={v.title}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            background: 'rgba(0,0,0,0.75)',
                            color: '#ffffff',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 3
                          }}>
                            {formatDuration(v.durationSeconds)}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1c2536', marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                          {v.channelName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: PLAYLIST DANH SÁCH BÀI HỌC CÙNG BỘ LỌC */}
              <div style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #ebe7df',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  padding: '14px 16px',
                  background: '#faf8f5',
                  borderBottom: '1px solid #ebe7df',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={16} color="#c53d32" />
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1c2536' }}>
                      Danh Sách Phát ({filteredVideos.length} bài)
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#78716c' }}>
                    {videoLevel !== 'ALL' ? videoLevel : 'Tất cả'} · {videoCategory !== 'ALL' ? videoCategory : 'Đa chủ đề'}
                  </span>
                </div>

                {/* Danh sách video cuộn mượt mà */}
                <div style={{ maxHeight: 680, overflowY: 'auto' }}>
                  {filteredVideos.map(v => {
                    const isCurrent = activeVideo.id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setActiveVideo(v);
                          window.scrollTo({ top: 160, behavior: 'smooth' });
                        }}
                        style={{
                          display: 'flex',
                          gap: 10,
                          padding: '12px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isCurrent ? '#fdf2f0' : '#ffffff',
                          borderLeft: isCurrent ? '4px solid #c53d32' : '4px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ position: 'relative', width: 100, height: 58, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#0a0f1d' }}>
                          <img
                            src={v.thumbnailUrl || `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                            alt={v.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            background: 'rgba(0,0,0,0.8)',
                            color: '#ffffff',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 2
                          }}>
                            {formatDuration(v.durationSeconds)}
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 900,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 4px',
                              borderRadius: 3
                            }}>
                              {v.jlptLevel}
                            </span>
                            <span style={{ fontSize: 9, color: '#78716c' }}>
                              {v.category}
                            </span>
                            {isCurrent && (
                              <span style={{ fontSize: 9, fontWeight: 900, color: '#c53d32', marginLeft: 'auto' }}>
                                • ĐANG XEM
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: isCurrent ? '#c53d32' : '#1c2536',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.3
                          }}>
                            {v.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#78716c', marginTop: 3 }}>
                            {v.channelName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#78716c' }}>
              Không tìm thấy video nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PHÂN HỆ 2: LUYỆN ĐỀ THI NGHE CHOUKAI (CÓ BÀI THI, CHẤM ĐIỂM & KỊCH BẢN) */}
      {/* ===================================================================== */}
      {activeTab === 'choukai' && (
        <div>
          {/* NẾU ĐANG TRONG PHÒNG LÀM BÀI THI CHOUKAI CHI TIẾT */}
          {activeExamDetail ? (
            <div>
              {/* THANH ĐIỀU HƯỚNG GHIM PHÒNG THI CHOUKAI */}
              <div style={{
                position: 'sticky',
                top: 60,
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(8px)',
                zIndex: 90,
                padding: '14px 20px',
                borderRadius: 12,
                boxShadow: '0 4px 14px rgba(44, 30, 20, 0.05)',
                border: '1px solid #ebe7df',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#fdf2f0', color: '#c53d32', border: '1px solid #f3d5d2', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>
                        {activeExamDetail.level}
                      </span>
                      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1c2536', margin: 0, fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                        {activeExamDetail.label} · Luyện Nghe Choukai
                      </h2>
                    </div>
                    <div style={{ fontSize: 12, color: '#78716c', marginTop: 4 }}>
                      Đã chọn: <strong style={{ color: '#c53d32' }}>{Object.keys(userAnswers).length}</strong> câu hỏi
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isSubmitted ? (
                      <button
                        onClick={() => setShowSubmitModal(true)}
                        style={{
                          padding: '8px 18px',
                          background: '#c53d32',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <CheckCircle2 size={15} /> Nộp bài chấm điểm
                      </button>
                    ) : (
                      <button
                        onClick={() => { setUserAnswers({}); setIsSubmitted(false); setScoreResult(null); }}
                        style={{
                          padding: '8px 16px',
                          background: '#1c2536',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <RotateCcw size={15} /> Làm lại đề này
                      </button>
                    )}

                    <button
                      onClick={() => setActiveExamDetail(null)}
                      style={{
                        padding: '8px 14px',
                        background: '#faf8f5',
                        color: '#57534e',
                        border: '1px solid #d6d3d1',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <ChevronLeft size={15} /> Danh mục đề
                    </button>
                  </div>
                </div>

                {/* FILE ÂM THANH OFFICIAL CHOUKAI AUDIO */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Headphones size={13} /> FILE GHI ÂM CHÍNH THỨC (CORODOMO JLPT CHOUKAI AUDIO):
                  </div>
                  <audio src={activeExamDetail.audioUrl} controls style={{ width: '100%', height: 36, outline: 'none' }} />
                </div>
              </div>

              {/* BẢNG ĐIỂM TỔNG KẾT SAU KHI NỘP BÀI CHOUKAI */}
              {isSubmitted && scoreResult && (
                <div style={{
                  background: scoreResult.isPassed ? '#f0fdf4' : '#fef2f2',
                  border: scoreResult.isPassed ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                  borderLeft: scoreResult.isPassed ? '5px solid #16a34a' : '5px solid #dc2626',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 20,
                  textAlign: 'center'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 8,
                    background: scoreResult.isPassed ? '#dcfce7' : '#fee2e2',
                    color: scoreResult.isPassed ? '#15803d' : '#b91c1c'
                  }}>
                    {scoreResult.isPassed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{scoreResult.isPassed ? 'ĐẠT CHUẨN ĐỖ CHOUKAI (合格)' : 'CẦN LUYỆN TẬP THÊM (要復習)'}</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#1c2536' }}>
                    {scoreResult.correct} <span style={{ fontSize: 20, color: '#78716c' }}>/ {scoreResult.total} câu đúng</span>
                    <span style={{ fontSize: 22, color: '#c53d32', marginLeft: 10 }}>({scoreResult.percentage}%)</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#57534e', marginTop: 4 }}>
                    Toàn bộ kịch bản nghe thoại chi tiết đã được hiển thị bên dưới từng câu hỏi để bạn đối chiếu.
                  </div>
                </div>
              )}

              {/* 5 MONDAI CHOUKAI CÂU HỎI */}
              {activeExamDetail.questionSets && activeExamDetail.questionSets.map((qs, qsIdx) => (
                <div
                  key={qs.id || qsIdx}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #ebe7df',
                    padding: '20px 24px',
                    marginBottom: 20
                  }}
                >
                  <div style={{
                    background: '#faf8f5',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#1c2536',
                    marginBottom: 16,
                    borderLeft: '4px solid #0d9488'
                  }}>
                    Mondai {qsIdx + 1}: {qs.title}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {qs.questions.map((q, qIdx) => {
                      const userChoice = userAnswers[q.id];
                      const isCorrect = isSubmitted && userChoice === q.correctAnswer;
                      const isWrong = isSubmitted && !!userChoice && userChoice !== q.correctAnswer;
                      const isUnanswered = isSubmitted && !userChoice;

                      let cardBg = '#ffffff';
                      let cardBorder = '1px solid #ebe7df';
                      let cardBorderLeft = '1px solid #ebe7df';

                      if (isSubmitted) {
                        if (isCorrect) {
                          cardBg = '#fbfdfb';
                          cardBorder = '1.5px solid #86efac';
                          cardBorderLeft = '5px solid #16a34a';
                        } else {
                          cardBg = '#fffafa';
                          cardBorder = '1.5px solid #fca5a5';
                          cardBorderLeft = '5px solid #dc2626';
                        }
                      }

                      return (
                        <div
                          key={q.id || qIdx}
                          style={{
                            background: cardBg,
                            border: cardBorder,
                            borderLeft: cardBorderLeft,
                            borderRadius: 10,
                            padding: '16px 18px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#1c2536' }}>
                              Câu {qIdx + 1}
                            </span>

                            {isSubmitted && (
                              <div>
                                {isCorrect ? (
                                  <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Check size={12} /> Chính xác
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <X size={12} /> {isUnanswered ? 'Chưa trả lời' : 'Chưa chính xác'} (Đáp án đúng: {q.correctAnswer})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Nội dung câu hỏi (chứa ảnh nếu có, ví dụ hình vẽ Mondai 4) */}
                          {q.question && q.question !== '番' && (
                            <div
                              style={{
                                fontSize: 14,
                                color: '#1e293b',
                                marginBottom: 12,
                                lineHeight: 1.6,
                                fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                              }}
                              dangerouslySetInnerHTML={{ __html: q.question.replace(/^番\s*/, '') }}
                            />
                          )}

                          {/* Đoạn văn/nội dung phụ nếu có */}
                          {q.content && (
                            <div
                              style={{
                                fontSize: 13,
                                color: '#475569',
                                marginBottom: 12,
                                lineHeight: 1.6,
                                background: '#f8fafc',
                                padding: '10px 14px',
                                borderRadius: 6
                              }}
                              dangerouslySetInnerHTML={{ __html: q.content }}
                            />
                          )}

                          {/* CÁC PHƯƠNG ÁN LỰA CHỌN (1, 2, 3, 4) */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
                            {q.options && q.options.map((opt, optIdx) => {
                              const optId = typeof opt === 'object' && opt !== null ? String(opt.id) : (optIdx + 1).toString();
                              const optText = typeof opt === 'object' && opt !== null ? opt.value : String(opt);
                              const isSelected = userChoice === optId;
                              const isTargetCorrect = isSubmitted && q.correctAnswer === optId;

                              let optBorder = '1px solid #ebe7df';
                              let optBg = '#ffffff';
                              let optColor = '#334155';

                              if (!isSubmitted) {
                                if (isSelected) {
                                  optBorder = '1.5px solid #c53d32';
                                  optBg = '#fdf2f0';
                                  optColor = '#c53d32';
                                }
                              } else {
                                if (isTargetCorrect) {
                                  optBorder = '2px solid #16a34a';
                                  optBg = '#f0fdf4';
                                  optColor = '#15803d';
                                } else if (isSelected && !isTargetCorrect) {
                                  optBorder = '2px solid #dc2626';
                                  optBg = '#fef2f2';
                                  optColor = '#b91c1c';
                                }
                              }

                              return (
                                <button
                                  key={optId || optIdx}
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => {
                                    if (isSubmitted) return;
                                    setUserAnswers(prev => ({ ...prev, [q.id]: optId }));
                                  }}
                                  style={{
                                    textAlign: 'left',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: optBorder,
                                    background: optBg,
                                    color: optColor,
                                    fontSize: 13,
                                    fontWeight: isSelected || isTargetCorrect ? 700 : 500,
                                    cursor: isSubmitted ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: isSelected ? '#c53d32' : isTargetCorrect ? '#16a34a' : '#f1f5f9',
                                    color: isSelected || isTargetCorrect ? '#ffffff' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    {optId}
                                  </span>
                                  <span style={{ flex: 1, lineHeight: 1.5 }}>
                                    {optText ? (
                                      <span dangerouslySetInnerHTML={{ __html: optText }} />
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                                        Phương án ({optId})
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* KỊCH BẢN NGHE (AUDIO SCRIPT) - MỞ KHÓA KHI NỘP BÀI */}
                          {isSubmitted && (q.script || (q as any).audioScript) && (
                            <div style={{
                              background: '#f8fafc',
                              border: '1px dashed #cbd5e1',
                              borderRadius: 8,
                              padding: '14px 16px',
                              marginTop: 10
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#0d9488', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={13} />
                                <span>KỊCH BẢN HỘI THOẠI (AUDIO SCRIPT):</span>
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: '#1e293b',
                                  lineHeight: 1.7,
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                                }}
                                dangerouslySetInnerHTML={{ __html: q.script || (q as any).audioScript || '' }}
                              />
                              {q.explanation && (
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                                  <strong>Giải thích:</strong> <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DANH MỤC 65 BỘ ĐỀ THI CHOUKAI CHÍNH THỨC */
            <div>
              {/* Thanh lọc & tìm kiếm Đề thi */}
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #ebe7df',
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>
                    BẬC JLPT:
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['ALL', 'N3', 'N2', 'N1'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setChoukaiLevel(lvl)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: choukaiLevel === lvl ? '1px solid #c53d32' : '1px solid #ebe7df',
                          background: choukaiLevel === lvl ? '#c53d32' : '#faf8f5',
                          color: choukaiLevel === lvl ? '#ffffff' : '#57534e'
                        }}
                      >
                        {lvl === 'ALL' ? 'Tất cả' : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
                  <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Tìm năm thi, mã đề (vd: 2024, N3)..."
                    value={choukaiSearch}
                    onChange={e => setChoukaiSearch(e.target.value)}
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

              {/* Thông báo nếu có lỗi nạp đề thi */}
              {examErrorMsg && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#991b1b',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} color="#dc2626" />
                    <span>{examErrorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExamErrorMsg(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Danh sách 65 đề thi dạng Grid */}
              {loadingChoukai ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#78716c' }}>
                  Đang tải danh mục 65 đề thi nghe Choukai...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {filteredChoukai.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: 12,
                        border: '1px solid #ebe7df',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{
                            background: '#fdf2f0',
                            color: '#c53d32',
                            border: '1px solid #f3d5d2',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 900
                          }}>
                            {item.level}
                          </span>
                          <span style={{ fontSize: 11, color: '#78716c' }}>
                            Kỳ thi tháng {item.month}/{item.year}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1c2536', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                          {item.label}
                        </h3>

                        <div style={{ fontSize: 12, color: '#57534e', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                          <div>• Cấu trúc: <strong>5 Mondai</strong> câu hỏi chính quy</div>
                          <div>• Thời lượng nghe: ~{item.durationMinutes} phút</div>
                          <div>• Dữ liệu: File audio chính thức & kịch bản đối chiếu</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loadingExamId === item.id}
                        onClick={() => handleStartChoukaiExam(item.id)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: loadingExamId === item.id ? '#94a3b8' : '#c53d32',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: loadingExamId === item.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: '0 2px 6px rgba(197, 61, 50, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {loadingExamId === item.id ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang vào phòng thi...</span>
                          </>
                        ) : (
                          <>
                            <Headphones size={14} />
                            <span>Vào thi thử Choukai</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL XÁC NHẬN NỘP BÀI THI CHOUKAI (THAY THẾ WINDOW.CONFIRM / LOCALHOST SAYS) */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            maxWidth: 440,
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
            border: '1px solid #ebe7df',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1c2536', margin: 0 }}>
                  Xác nhận nộp bài Choukai?
                </h3>
                <div style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>
                  Đã trả lời {Object.keys(userAnswers).length} câu hỏi
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.5, margin: 0 }}>
              Hệ thống sẽ tiến hành chấm điểm bài làm và hiển thị kịch bản nghe thoại chi tiết của từng câu hỏi để bạn đối chiếu.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{ padding: '8px 16px', background: '#ffffff', color: '#57534e', border: '1px solid #d6d3d1', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitChoukai}
                style={{ padding: '8px 20px', background: '#c53d32', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
