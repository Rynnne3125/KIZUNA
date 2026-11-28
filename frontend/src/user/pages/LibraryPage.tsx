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
import { soundService } from '../services/soundService';
import { VideoLesson, ChoukaiAudioItem, QuestionSet } from '../types/kizuna';
import { isNativeApp } from '../utils/platform';

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

const VIDEO_THUMB_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180' fill='%231e293b'><rect width='320' height='180' fill='%231e293b'/><text x='50%' y='50%' fill='%2394a3b8' font-size='13' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>KIZUNA Video</text></svg>";

const extractYoutubeId = (video: VideoLesson | null | undefined): string => {
  if (!video) return '';
  const raw = (video.youtubeVideoId || (video as any).video_id || video.youtubeUrl || '').trim();
  if (!raw) return '';
  const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(raw)) return raw;
  return raw;
};

export const LibraryPage: React.FC = () => {
  // Dừng âm thanh khi rời khỏi thư viện
  useEffect(() => {
    return () => {
      soundService.stop();
    };
  }, []);
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
  const [choukaiMode, setChoukaiMode] = useState<'exam' | 'practice'>('exam');
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
  const handleStartChoukaiExam = async (examId: string, mode: 'exam' | 'practice' = 'exam') => {
    setLoadingExamId(examId);
    setExamErrorMsg(null);
    try {
      const full = await kizunaService.getChoukaiExamDetail(examId);
      if (full && full.questionSets && full.questionSets.length > 0) {
        setActiveExamDetail(full);
        setChoukaiMode(mode);
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

  const handleSelectVideo = (video: VideoLesson) => {
    setActiveVideo(video);
    setTimeout(() => {
      const playerEl = document.getElementById('kizuna-main-player');
      if (playerEl) {
        playerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="kizuna-library-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 12px 60px 12px', boxSizing: 'border-box' }}>
      <style>{`
        /* Responsive Media Queries cho Mobile / Android */
        @media (max-width: 900px) {
          .library-theater-grid {
            grid-template-columns: 1fr !important;
          }
          .library-playlist-list {
            max-height: 440px !important;
          }
          .library-header-card {
            padding: 16px 18px !important;
          }
          .library-header-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }
          .library-header-actions button {
            flex: 1 1 auto !important;
            justify-content: center !important;
          }
          .library-filter-panel {
            padding: 12px 14px !important;
          }
          .library-filter-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .library-search-box {
            width: 100% !important;
            max-width: 100% !important;
          }
          .library-related-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .library-related-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* 1. HERO HEADER PHONG CÁCH NHẬT BẢN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 rounded-3xl p-5 sm:p-6 mb-5 shadow-xs transition-colors">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white m-0">
              Thư Viện Video & Luyện Nghe
            </h1>
          </div>

          {/* CHUYỂN ĐỔI 2 PHÂN HỆ HỌC TẬP CHÍNH */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab('video'); setActiveExamDetail(null); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border-none cursor-pointer transition-all ${
                activeTab === 'video'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Film size={14} />
              <span>Kho Học Liệu Video ({allVideos.length || '1.015'})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('choukai')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border-none cursor-pointer transition-all ${
                activeTab === 'choukai'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 mb-5 shadow-xs transition-colors flex flex-col gap-3">
            {/* Hàng 1: Bộ lọc Bậc JLPT và Tìm kiếm */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
                  BẬC JLPT:
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {LEVEL_FILTERS.map(lvl => {
                    const isSelected = videoLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setVideoLevel(lvl.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm video, bài giảng, kênh..."
                  value={videoSearch}
                  onChange={e => setVideoSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Hàng 2: Bộ lọc Danh mục chủ đề */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
                  CHỦ ĐỀ:
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORY_FILTERS.map(cat => {
                    const isSelected = videoCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setVideoCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium sm:text-right shrink-0">
                Hiển thị <strong className="text-slate-900 dark:text-white font-bold">{filteredVideos.length}</strong> video bài giảng
              </span>
            </div>
          </div>

          {/* GIAO DIỆN THEATER: TRÌNH PHÁT TRÁI + PLAYLIST PHẢI */}
          {activeVideo ? (
            <div className="library-theater-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
              gap: 20,
              alignItems: 'start'
            }}>
              {/* CỘT TRÁI: VIDEO PLAYER & THÔNG TIN BÀI HỌC */}
              <div id="kizuna-main-player">
                {/* Visual Anchor: VÙNG PHÁT VIDEO ĐANG CHẠY */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50/80 dark:bg-rose-950/60 rounded-t-2xl border border-rose-200 dark:border-rose-900/60 border-b-0 transition-colors">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-xs">
                    <Play size={14} className="fill-rose-600 dark:fill-rose-400" />
                    <span>TRÌNH PHÁT BÀI GIẢNG ĐANG CHỌN</span>
                  </div>
                  {(() => {
                    const cleanVideoId = extractYoutubeId(activeVideo);
                    return (
                      <a
                        href={`https://www.youtube.com/watch?v=${cleanVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-700 dark:text-sky-400 no-underline inline-flex items-center gap-1 hover:underline cursor-pointer"
                        title="Mở video này trên ứng dụng hoặc trang YouTube"
                      >
                        <span>Mở YouTube</span> ↗
                      </a>
                    );
                  })()}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden shadow-xs transition-colors">
                  {/* Trình phát nhúng YouTube chuẩn (Hỗ trợ tốt trên cả Web và Android APK) */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%',
                    background: '#0a0f1d'
                  }}>
                    {(() => {
                      const cleanVideoId = extractYoutubeId(activeVideo);
                      return cleanVideoId ? (
                        <iframe
                          key={cleanVideoId}
                          id="kizuna-video-player"
                          src={`https://www.youtube-nocookie.com/embed/${cleanVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                          title={activeVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-300">
                          <Play size={36} className="text-slate-500 mb-2" />
                          <p className="text-xs">Không tìm thấy mã video bài giảng.</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Thông tin Video */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded px-2 py-0.5 text-[11px] font-extrabold">
                        {activeVideo.jlptLevel}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded px-2 py-0.5 text-[11px] font-bold">
                        {activeVideo.category}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {formatDuration(activeVideo.durationSeconds)}
                      </span>
                      {activeVideo.channelName && (
                        <span className="text-xs text-teal-600 dark:text-teal-400 font-bold">
                          • {activeVideo.channelName}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mb-2 leading-snug">
                      {activeVideo.title}
                    </h2>

                    <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Video bài giảng chính thức thuộc kho học liệu KIZUNA. Học tập trực tiếp ngay trong ứng dụng không bị chuyển hướng.
                    </div>
                  </div>
                </div>

                {/* VIDEO CÙNG CHỦ ĐỀ ĐƯỢC ĐỀ XUẤT TIẾP THEO TRONG KIZUNA */}
                <div className="mt-5">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1.5">
                    <Layers size={14} className="text-rose-600 dark:text-rose-400" />
                    <span>BÀI HỌC LIÊN QUAN TIẾP THEO TRONG KIZUNA:</span>
                  </div>
                  <div className="library-related-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {relatedVideos.map(v => (
                      <div
                        key={v.id}
                        onClick={() => handleSelectVideo(v)}
                        className={`rounded-xl p-2 cursor-pointer transition-all border ${
                          activeVideo.id === v.id
                            ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 6, overflow: 'hidden', background: '#0a0f1d' }}>
                          <img
                            src={v.thumbnailUrl || (v.youtubeVideoId ? `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg` : VIDEO_THUMB_FALLBACK)}
                            alt={v.title}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = VIDEO_THUMB_FALLBACK; }}
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
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-2 leading-snug">
                          {v.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {v.channelName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: PLAYLIST DANH SÁCH BÀI HỌC CÙNG BỘ LỌC */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-rose-600 dark:text-rose-400" />
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Danh Sách Phát ({filteredVideos.length} bài)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {videoLevel !== 'ALL' ? videoLevel : 'Tất cả'} · {videoCategory !== 'ALL' ? videoCategory : 'Đa chủ đề'}
                  </span>
                </div>

                {/* Danh sách video cuộn mượt mà */}
                <div className="library-playlist-list max-h-[680px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredVideos.map(v => {
                    const isCurrent = activeVideo.id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleSelectVideo(v)}
                        className={`flex gap-2.5 p-3 cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-l-4 border-l-rose-600'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div style={{ position: 'relative', width: 100, height: 58, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#0a0f1d' }}>
                          <img
                            src={v.thumbnailUrl || (v.youtubeVideoId ? `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg` : VIDEO_THUMB_FALLBACK)}
                            alt={v.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = VIDEO_THUMB_FALLBACK; }}
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
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              {v.jlptLevel}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {v.category}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 ml-auto">
                                • ĐANG XEM
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-bold line-clamp-2 leading-snug ${
                            isCurrent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {v.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
            <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-xs">
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
              <div className="sticky top-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 mb-5 transition-colors">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded px-2 py-0.5 text-[11px] font-extrabold">
                        {activeExamDetail.level}
                      </span>
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white m-0">
                        {activeExamDetail.label} · Luyện Nghe Choukai
                      </h2>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Đã chọn: <strong className="text-rose-600 dark:text-rose-400 font-bold">{Object.keys(userAnswers).length}</strong> câu hỏi
                      {choukaiMode === 'practice' && (
                        <span className="ml-2 text-teal-600 dark:text-teal-400 font-bold">· Chế độ Luyện tập (Xem đáp án ngay)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (choukaiMode !== 'exam') {
                            setChoukaiMode('exam');
                            setUserAnswers({});
                            setIsSubmitted(false);
                            setScoreResult(null);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border-none cursor-pointer transition-colors ${
                          choukaiMode === 'exam'
                            ? 'bg-slate-900 dark:bg-rose-600 text-white'
                            : 'bg-transparent text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Thi thật
                      </button>
                      <button
                        type="button"
                        onClick={() => setChoukaiMode('practice')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border-none cursor-pointer transition-colors ${
                          choukaiMode === 'practice'
                            ? 'bg-teal-600 text-white'
                            : 'bg-transparent text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Luyện tập
                      </button>
                    </div>

                    {!isSubmitted ? (
                      choukaiMode === 'exam' ? (
                        <button
                          type="button"
                          onClick={() => setShowSubmitModal(true)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border-none"
                        >
                          <CheckCircle2 size={14} /> Nộp bài chấm điểm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmSubmitChoukai}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border-none"
                        >
                          <CheckCircle2 size={14} /> Tổng kết & Lưu
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setUserAnswers({}); setIsSubmitted(false); setScoreResult(null); }}
                        className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border-none"
                      >
                        <RotateCcw size={14} /> Làm lại đề này
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveExamDetail(null)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Danh mục đề
                    </button>
                  </div>
                </div>

                {/* FILE ÂM THANH OFFICIAL CHOUKAI AUDIO (CHỈ HIỆN NẾU KHÔNG DÙNG AUDIO RIÊNG TỪNG MONDAI) */}
                {activeExamDetail.audioUrl && !(activeExamDetail.questionSets || []).some(qs => Boolean(qs.audioUrl)) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1.5 flex items-center gap-1">
                      <Headphones size={13} /> FILE GHI ÂM CHÍNH THỨC (JLPT CHOUKAI AUDIO):
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <audio src={activeExamDetail.audioUrl} controls className="w-full h-9 outline-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* BẢNG ĐIỂM TỔNG KẾT SAU KHI NỘP BÀI CHOUKAI */}
              {isSubmitted && scoreResult && (
                <div className={`p-5 sm:p-6 mb-5 text-center rounded-2xl border-l-4 transition-colors ${
                  scoreResult.isPassed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 border-l-emerald-600 dark:border-l-emerald-500'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 border-l-rose-600 dark:border-l-rose-500'
                }`}>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-2 ${
                    scoreResult.isPassed
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                  }`}>
                    {scoreResult.isPassed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{scoreResult.isPassed ? 'ĐẠT CHUẨN ĐỖ CHOUKAI (合格)' : 'CẦN LUYỆN TẬP THÊM (要復習)'}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {scoreResult.correct} <span className="text-lg sm:text-xl text-slate-500 dark:text-slate-400">/ {scoreResult.total} câu đúng</span>
                    <span className="text-xl text-rose-600 dark:text-rose-400 ml-2.5">({scoreResult.percentage}%)</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Toàn bộ kịch bản nghe thoại chi tiết đã được hiển thị bên dưới từng câu hỏi để bạn đối chiếu.
                  </div>
                </div>
              )}

              {/* 5 MONDAI CHOUKAI CÂU HỎI */}
              <div className={choukaiMode === 'exam' && !isSubmitted ? 'kizuna-hide-furigana' : ''}>
              {activeExamDetail.questionSets && activeExamDetail.questionSets.map((qs, qsIdx) => (
                <div
                  key={qs.id || qsIdx}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 mb-5 shadow-xs transition-colors"
                >
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 px-3.5 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white mb-4 border-l-4 border-l-teal-600 dark:border-l-teal-500">
                    Mondai {qsIdx + 1}: <span className="kizuna-passage-html" dangerouslySetInnerHTML={{ __html: qs.title }} />
                  </div>

                  {qs.audioUrl && (
                    <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 p-2.5 rounded-xl mb-4">
                      <div className="text-xs font-bold text-teal-700 dark:text-teal-300 mb-1.5 flex items-center gap-1.5">
                        <Headphones size={13} /> File nghe Mondai {qsIdx + 1}:
                      </div>
                      <audio src={qs.audioUrl} controls preload="none" className="w-full h-9 outline-none" />
                    </div>
                  )}

                  {qs.script && (isSubmitted || (choukaiMode === 'practice' && qs.questions.some(q => Boolean(userAnswers[q.id])))) && (
                    <details className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-4 text-xs">
                      <summary className="font-bold text-teal-700 dark:text-teal-400 cursor-pointer">
                        Xem kịch bản & dịch nghĩa Mondai {qsIdx + 1}
                      </summary>
                      <div className="mt-2 text-slate-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: qs.script }} />
                    </details>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {qs.questions.map((q, qIdx) => {
                      const userChoice = userAnswers[q.id];
                      const hasAnswered = !!userChoice;
                      const isGraded = isSubmitted || (choukaiMode === 'practice' && hasAnswered);
                      const isCorrect = isGraded && userChoice === q.correctAnswer;
                      const isWrong = isGraded && hasAnswered && userChoice !== q.correctAnswer;
                      const isUnanswered = isSubmitted && !hasAnswered;

                      let cardClass = "bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-4.5 transition-all";
                      if (isGraded) {
                        if (isCorrect) {
                          cardClass = "bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800/80 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 rounded-xl p-4 sm:p-4.5 transition-all";
                        } else {
                          cardClass = "bg-rose-50/50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800/80 border-l-4 border-l-rose-600 dark:border-l-rose-500 rounded-xl p-4 sm:p-4.5 transition-all";
                        }
                      }

                      return (
                        <div
                          key={q.id || qIdx}
                          className={cardClass}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              Câu {qIdx + 1}
                            </span>

                            {isGraded && (
                              <div className="flex items-center gap-2">
                                {isCorrect ? (
                                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Check size={12} /> Chính xác
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded flex items-center gap-1">
                                    <X size={12} /> {isUnanswered ? 'Chưa trả lời' : 'Chưa chính xác'} (Đáp án đúng: {q.correctAnswer})
                                  </span>
                                )}
                                {choukaiMode === 'practice' && hasAnswered && !isSubmitted && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUserAnswers(prev => {
                                        const next = { ...prev };
                                        delete next[q.id];
                                        return next;
                                      });
                                    }}
                                    className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded cursor-pointer"
                                  >
                                    Làm lại câu
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Nội dung câu hỏi (chứa ảnh nếu có, ví dụ hình vẽ Mondai 4) */}
                          {q.imageUrl && (
                            <div className="mb-3 text-center">
                              <img src={q.imageUrl} alt={`Câu ${qIdx + 1}`} className="max-w-full max-h-80 mx-auto rounded-lg border border-slate-200 dark:border-slate-700" />
                            </div>
                          )}
                          {q.question && q.question !== '番' && (
                            <div
                              className="kizuna-passage-html text-sm text-slate-800 dark:text-slate-100 mb-3 leading-relaxed font-serif"
                              dangerouslySetInnerHTML={{ __html: q.question.replace(/^番\s*/, '') }}
                            />
                          )}

                          {/* Đoạn văn/nội dung phụ nếu có */}
                          {q.content && (
                            <div
                              className="kizuna-passage-html text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60"
                              dangerouslySetInnerHTML={{ __html: q.content }}
                            />
                          )}

                          {/* CÁC PHƯƠNG ÁN LỰA CHỌN (1, 2, 3, 4) */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
                            {q.options && q.options.map((opt, optIdx) => {
                              const optId = typeof opt === 'object' && opt !== null ? String(opt.id) : (optIdx + 1).toString();
                              const optText = typeof opt === 'object' && opt !== null ? opt.value : String(opt);
                              const isSelected = userChoice === optId;
                              const isTargetCorrect = isGraded && q.correctAnswer === optId;

                              let btnClass = "text-left p-2.5 px-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center gap-2.5 ";
                              if (!isGraded) {
                                if (isSelected) {
                                  btnClass += "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold shadow-xs";
                                } else {
                                  btnClass += "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium cursor-pointer";
                                }
                              } else {
                                if (isTargetCorrect) {
                                  btnClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-bold";
                                } else if (isSelected && !isTargetCorrect) {
                                  btnClass += "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 font-bold";
                                } else {
                                  btnClass += "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 opacity-60";
                                }
                              }

                              return (
                                <button
                                  key={optId || optIdx}
                                  type="button"
                                  disabled={isGraded}
                                  onClick={() => {
                                    if (isGraded) return;
                                    setUserAnswers(prev => ({ ...prev, [q.id]: optId }));
                                  }}
                                  className={btnClass}
                                >
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                    isTargetCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : isSelected
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {optId}
                                  </span>
                                    <span style={{ flex: 1, lineHeight: 1.5 }}>
                                      {optText ? (
                                        <span className="kizuna-passage-html" dangerouslySetInnerHTML={{ __html: optText }} />
                                      ) : (
                                        <span className="text-slate-400 italic text-xs">
                                          Phương án ({optId})
                                        </span>
                                      )}
                                    </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* KỊCH BẢN NGHE & GIẢI THÍCH - MỞ KHÓA KHI NỘP BÀI HOẶC KHI CHỌN Ở CHẾ ĐỘ LUYỆN TẬP */}
                          {isGraded && (q.script || (q as any).audioScript || q.explanation) && (
                            <div className="bg-slate-50 dark:bg-slate-950/70 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3.5 sm:p-4 mt-2.5 space-y-2">
                              {(q.script || (q as any).audioScript) && (
                                <>
                                  <div className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                                    <FileText size={13} />
                                    <span>KỊCH BẢN HỘI THOẠI & DỊCH NGHĨA:</span>
                                  </div>
                                  <div
                                    className="kizuna-passage-html text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-serif"
                                    dangerouslySetInnerHTML={{ __html: q.script || (q as any).audioScript || '' }}
                                  />
                                </>
                              )}
                              {q.explanation && (
                                <div className={`kizuna-passage-html text-xs text-slate-700 dark:text-slate-300 leading-relaxed ${(q.script || (q as any).audioScript) ? 'pt-2 border-t border-slate-200 dark:border-slate-800' : ''}`}>
                                  <strong className="text-amber-700 dark:text-amber-400 mr-1">Giải thích:</strong>
                                  <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
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
            </div>
          ) : (
            /* DANH MỤC 65 BỘ ĐỀ THI CHOUKAI CHÍNH THỨC */
            <div>
              {/* Thanh lọc & tìm kiếm Đề thi */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 mb-5 shadow-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
                    BẬC JLPT:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {['ALL', 'N3', 'N2', 'N1'].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setChoukaiLevel(lvl)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          choukaiLevel === lvl
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {lvl === 'ALL' ? 'Tất cả' : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm năm thi, mã đề (vd: 2024, N3)..."
                    value={choukaiSearch}
                    onChange={e => setChoukaiSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              {/* Thông báo nếu có lỗi nạp đề thi */}
              {examErrorMsg && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 px-4 mb-4 flex justify-between items-center text-rose-800 dark:text-rose-300 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                    <span>{examErrorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExamErrorMsg(null)}
                    className="bg-transparent border-none cursor-pointer text-rose-800 dark:text-rose-300 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Danh sách đề thi nghe Choukai dạng Grid */}
              {loadingChoukai ? (
                <div className="text-center py-14 text-slate-500 dark:text-slate-400 text-xs">
                  Đang tải danh mục đề thi nghe Choukai...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {filteredChoukai.map(item => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xs transition-colors"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded px-2 py-0.5 text-[11px] font-extrabold">
                            {item.level}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Kỳ thi tháng {item.month}/{item.year}
                          </span>
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 leading-snug">
                          {item.label}
                        </h3>

                        <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-1 mb-4">
                          <div>• Cấu trúc: <strong className="text-slate-900 dark:text-white">5 Mondai</strong> câu hỏi chính quy</div>
                          <div>• Thời lượng nghe: ~{item.durationMinutes} phút</div>
                          <div>• Dữ liệu: File audio chính thức & kịch bản đối chiếu</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={loadingExamId === item.id}
                          onClick={() => handleStartChoukaiExam(item.id, 'exam')}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold border-none flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                            loadingExamId === item.id
                              ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed'
                              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                          }`}
                        >
                          {loadingExamId === item.id ? (
                            <>
                              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Đang tải...</span>
                            </>
                          ) : (
                            <>
                              <Headphones size={13} />
                              <span>Thi thật</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={loadingExamId === item.id}
                          onClick={() => handleStartChoukaiExam(item.id, 'practice')}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                            loadingExamId === item.id
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white border-teal-200 dark:border-teal-800'
                          }`}
                        >
                          <span>Luyện tập</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white m-0">
                  Xác nhận nộp bài Choukai?
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đã trả lời {Object.keys(userAnswers).length} câu hỏi
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
              Hệ thống sẽ tiến hành chấm điểm bài làm và hiển thị kịch bản nghe thoại chi tiết của từng câu hỏi để bạn đối chiếu.
            </p>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitChoukai}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold cursor-pointer border-none shadow-xs transition-colors"
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
