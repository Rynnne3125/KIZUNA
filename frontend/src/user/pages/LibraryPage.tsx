import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Video,
  Headphones,
  Play,
  Pause,
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
  ArrowRight,
  Mic,
  MicOff,
  RefreshCw,
  Eye,
  EyeOff,
  Award,
  FileCheck,
  CheckCircle2,
  X,
  ChevronLeft
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { VideoLesson, ChoukaiAudioItem, QuestionSet } from '../types/kizuna';
import { TranscriptLine, getTranscriptForVideo } from '../data/shadowingTranscripts';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const LEVEL_FILTERS = [
  { id: 'ALL', label: 'Tất cả cấp độ' },
  { id: 'N5', label: 'N5 Nhập môn' },
  { id: 'N4', label: 'N4 Sơ cấp' },
  { id: 'N3', label: 'N3 Trung cấp' },
  { id: 'N2', label: 'N2 Trung thượng' },
  { id: 'N1', label: 'N1 Thượng cấp' }
];

export const LibraryPage: React.FC = () => {
  // 3 Chế độ phân tách rõ ràng theo yêu cầu của bạn:
  // 1. 'shadowing': Podcast & Shadowing Studio có lời thoại chạy đồng bộ & phòng luyện tập
  // 2. 'watch': Video tiếng Nhật khác (chỉ xem, đề xuất nội bộ KIZUNA)
  // 3. 'choukai': Đề thi nghe Choukai Corodomo (có bài thi, chấm điểm, khung đỏ câu sai, kịch bản nghe chi tiết)
  const [activeTab, setActiveTab] = useState<'shadowing' | 'watch' | 'choukai'>('shadowing');

  // =========================================================================
  // STATE CHO TAB 1 & 2: VIDEO SHADOWING & WATCH
  // =========================================================================
  const [allVideos, setAllVideos] = useState<VideoLesson[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(true);

  // Tab 1: Shadowing Studio State
  const [activeShadowingVideo, setActiveShadowingVideo] = useState<VideoLesson | null>(null);
  const [shadowingLevel, setShadowingLevel] = useState<string>('ALL');
  const [shadowingSearch, setShadowingSearch] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);
  const [isLoopingLine, setIsLoopingLine] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showJapaneseText, setShowJapaneseText] = useState<boolean>(true);
  const [showVietnameseTranslation, setShowVietnameseTranslation] = useState<boolean>(true);

  // Ghi âm thử giọng Shadowing (Microphone Recorder)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Tab 2: Watch State (Các video còn lại: Luyện thi, Kinh doanh, Phim, Tin tức)
  const [activeWatchVideo, setActiveWatchVideo] = useState<VideoLesson | null>(null);
  const [watchLevel, setWatchLevel] = useState<string>('ALL');
  const [watchCategory, setWatchCategory] = useState<string>('ALL');
  const [watchSearch, setWatchSearch] = useState<string>('');

  // YouTube Player Ref
  const playerRef = useRef<any>(null);
  const transcriptListRef = useRef<HTMLDivElement>(null);
  const activeTranscriptRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // STATE CHO TAB 3: CHOUKAI CORODOMO EXAM ROOM (LÀM BÀI THI & CHẤM ĐIỂM)
  // =========================================================================
  const [choukaiCatalog, setChoukaiCatalog] = useState<ChoukaiAudioItem[]>([]);
  const [loadingChoukai, setLoadingChoukai] = useState<boolean>(false);
  const [choukaiLevel, setChoukaiLevel] = useState<string>('ALL');
  const [choukaiSearch, setChoukaiSearch] = useState<string>('');

  // Chế độ phòng thi Choukai
  const [activeExamDetail, setActiveExamDetail] = useState<ChoukaiAudioItem | null>(null);
  const [loadingExamDetail, setLoadingExamDetail] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<{ total: number; correct: number; percentage: number; isPassed: boolean } | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // 1. Tải danh sách video
  useEffect(() => {
    async function initVideos() {
      setLoadingVideos(true);
      try {
        const list = await kizunaService.getVideoLessons('ALL', 'ALL');
        setAllVideos(list);

        // Khởi tạo video mặc định cho Shadowing Studio (ưu tiên Podcast)
        const podcasts = list.filter(v => v.category === 'Podcast' || v.title.toLowerCase().includes('shadowing'));
        if (podcasts.length > 0) {
          setActiveShadowingVideo(podcasts[0]);
        } else if (list.length > 0) {
          setActiveShadowingVideo(list[0]);
        }

        // Khởi tạo video cho tab Xem video khác
        const otherVideos = list.filter(v => v.category !== 'Podcast');
        if (otherVideos.length > 0) {
          setActiveWatchVideo(otherVideos[0]);
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

  // 3. Khởi tạo YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 4. Lọc danh sách Video cho Tab 1 (Podcast & Shadowing)
  const shadowingVideos = useMemo(() => {
    return allVideos.filter(v => {
      const isPodcast = v.category === 'Podcast' || v.title.toLowerCase().includes('shadowing');
      const matchLevel = shadowingLevel === 'ALL' || v.jlptLevel?.toUpperCase() === shadowingLevel.toUpperCase();
      const q = shadowingSearch.toLowerCase().trim();
      const matchSearch = !q || v.title.toLowerCase().includes(q) || (v.channelName && v.channelName.toLowerCase().includes(q));
      return isPodcast && matchLevel && matchSearch;
    });
  }, [allVideos, shadowingLevel, shadowingSearch]);

  // 5. Lọc danh sách Video cho Tab 2 (Các video xem thông thường: Luyện thi, Kinh doanh, Phim, Tin tức)
  const watchVideos = useMemo(() => {
    return allVideos.filter(v => {
      const isOther = v.category !== 'Podcast';
      const matchLevel = watchLevel === 'ALL' || v.jlptLevel?.toUpperCase() === watchLevel.toUpperCase();
      const matchCategory = watchCategory === 'ALL' || v.category?.toLowerCase() === watchCategory.toLowerCase();
      const q = watchSearch.toLowerCase().trim();
      const matchSearch = !q || v.title.toLowerCase().includes(q) || (v.channelName && v.channelName.toLowerCase().includes(q));
      return isOther && matchLevel && matchCategory && matchSearch;
    });
  }, [allVideos, watchLevel, watchCategory, watchSearch]);

  // 6. Lời thoại đồng bộ (Synchronized Transcript) cho video Shadowing đang phát
  const currentTranscript = useMemo(() => {
    if (!activeShadowingVideo) return [];
    return getTranscriptForVideo(
      activeShadowingVideo.youtubeVideoId,
      activeShadowingVideo.title,
      activeShadowingVideo.jlptLevel,
      activeShadowingVideo.durationSeconds
    );
  }, [activeShadowingVideo]);

  // 7. Đồng bộ vị trí lời thoại đang phát theo thời gian video thực tế
  useEffect(() => {
    if (activeTab !== 'shadowing' || !activeShadowingVideo) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          setCurrentTime(time);

          // Tìm câu thoại khớp mốc thời gian
          const found = currentTranscript.find(line => time >= line.start && time < line.end);
          if (found) {
            setActiveTranscriptId(found.id);

            // Tự động lặp lại câu nếu bật chế độ Loop
            if (isLoopingLine && time >= found.end - 0.3) {
              playerRef.current.seekTo(found.start, true);
            }
          }
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [activeTab, activeShadowingVideo, currentTranscript, isLoopingLine]);

  // 8. Tự động cuộn lời thoại đang phát vào khung nhìn
  useEffect(() => {
    if (activeTranscriptRef.current && transcriptListRef.current) {
      activeTranscriptRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTranscriptId]);

  // 9. Lọc danh sách Choukai Audio
  const filteredChoukai = useMemo(() => {
    return choukaiCatalog.filter(item => {
      const matchLevel = choukaiLevel === 'ALL' || item.level?.toUpperCase() === choukaiLevel.toUpperCase();
      const q = choukaiSearch.toLowerCase().trim();
      const matchSearch = !q || item.label.toLowerCase().includes(q) || (item.year && item.year.toString().includes(q));
      return matchLevel && matchSearch;
    });
  }, [choukaiCatalog, choukaiLevel, choukaiSearch]);

  // Bấm vào 1 câu thoại -> Tua ngay đến mốc thời gian đó
  const handleSeekToLine = (line: TranscriptLine) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(line.start, true);
      playerRef.current.playVideo();
    }
    setActiveTranscriptId(line.id);
  };

  // Điều chỉnh tốc độ phát YouTube
  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(speed);
    }
  };

  // Bắt đầu / Dừng ghi âm giọng Shadowing để nghe lại đối chiếu
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Dừng ghi âm
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Bắt đầu ghi âm
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);
          // Giải phóng track micro
          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert('Không thể truy cập microphone. Vui lòng cấp quyền truy cập micro cho trình duyệt!');
      }
    }
  };

  // Format thời lượng hiển thị
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
    setLoadingExamDetail(true);
    try {
      const full = await kizunaService.getChoukaiExamDetail(examId);
      if (full) {
        setActiveExamDetail(full);
        setUserAnswers({});
        setIsSubmitted(false);
        setScoreResult(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setLoadingExamDetail(false);
    }
  };

  // Nộp bài thi Choukai và tính điểm
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        @keyframes activeLineGlow {
          0% { box-shadow: 0 0 0 0 rgba(197, 61, 50, 0.2); }
          70% { box-shadow: 0 0 0 6px rgba(197, 61, 50, 0); }
          100% { box-shadow: 0 0 0 0 rgba(197, 61, 50, 0); }
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
              Phòng Luyện Shadowing & Kho Đề Thi Nghe Choukai
            </h1>

            <p style={{ color: '#57534e', fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 780 }}>
              Không gian học tập chuyên sâu: Luyện Shadowing có bản dịch & lời thoại đồng bộ theo từng giây, phòng xem video bản ngữ nội bộ và ngân hàng 65 đề thi nghe Choukai có chấm điểm kèm kịch bản đối chiếu.
            </p>
          </div>

          {/* CHUYỂN ĐỔI 3 TAB CHUYÊN BIỆT */}
          <div style={{
            display: 'inline-flex',
            background: '#ffffff',
            padding: 4,
            borderRadius: 10,
            border: '1px solid #ebe7df',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            flexWrap: 'wrap',
            gap: 4
          }}>
            <button
              onClick={() => { setActiveTab('shadowing'); setActiveExamDetail(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'shadowing' ? '#c53d32' : 'transparent',
                color: activeTab === 'shadowing' ? '#ffffff' : '#57534e',
                boxShadow: activeTab === 'shadowing' ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <Mic size={14} />
              <span>Studio Shadowing ({shadowingVideos.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('watch'); setActiveExamDetail(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'watch' ? '#c53d32' : 'transparent',
                color: activeTab === 'watch' ? '#ffffff' : '#57534e',
                boxShadow: activeTab === 'watch' ? '0 2px 6px rgba(197, 61, 50, 0.25)' : 'none'
              }}
            >
              <Film size={14} />
              <span>Xem Video Tiếng Nhật ({watchVideos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('choukai')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
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
              <span>Đề Thi Nghe Choukai (65 Đề)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: STUDIO SHADOWING CÓ LỜI THOẠI ĐỒNG BỘ CHẠY CÙNG VIDEO          */}
      {/* ===================================================================== */}
      {activeTab === 'shadowing' && (
        <div>
          {/* Thanh lọc & tìm kiếm Shadowing */}
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
                {LEVEL_FILTERS.map(lvl => {
                  const isSelected = shadowingLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setShadowingLevel(lvl.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
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

            <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
              <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Tìm bài Shadowing, Podcast..."
                value={shadowingSearch}
                onChange={e => setShadowingSearch(e.target.value)}
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

          {/* KHUNG THEATER: VIDEO PLAYER TRÁI + LỜI THOẠI ĐỒNG BỘ PHẢI */}
          {activeShadowingVideo ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)',
              gap: 20,
              alignItems: 'start'
            }}>
              {/* CỘT TRÁI: VIDEO PLAYER & BẢNG ĐIỀU KHIỂN LUYỆN NÓI */}
              <div>
                <div style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: '1px solid #ebe7df',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}>
                  {/* Trình phát nhúng YouTube (Được tối ưu rel=0 & modestbranding để không dẫn sang YouTube ngoài) */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '56.25%',
                    background: '#0a0f1d'
                  }}>
                    <iframe
                      id="kizuna-shadowing-player"
                      src={`https://www.youtube-nocookie.com/embed/${activeShadowingVideo.youtubeVideoId}?enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`}
                      title={activeShadowingVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>

                  {/* Thông tin Video & Công cụ luyện tập Shadowing */}
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
                        {activeShadowingVideo.jlptLevel}
                      </span>
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {activeShadowingVideo.category}
                      </span>
                      <span style={{ fontSize: 12, color: '#78716c', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {formatDuration(activeShadowingVideo.durationSeconds)}
                      </span>
                      {activeShadowingVideo.channelName && (
                        <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 700 }}>
                          • {activeShadowingVideo.channelName}
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1c2536', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                      {activeShadowingVideo.title}
                    </h2>

                    {/* BỘ CÔNG CỤ LUYỆN TẬP SHADOWING THEO YÊU CẦU */}
                    <div style={{
                      background: '#faf8f5',
                      border: '1px solid #ebe7df',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1c2536', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} color="#c53d32" />
                        <span>CÔNG CỤ LUYỆN SHADOWING ĐỒNG BỘ:</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {/* 1. Nút lặp lại câu hiện tại */}
                        <button
                          onClick={() => setIsLoopingLine(!isLoopingLine)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: isLoopingLine ? '#c53d32' : '#ffffff',
                            color: isLoopingLine ? '#ffffff' : '#57534e',
                            border: isLoopingLine ? '1px solid #c53d32' : '1px solid #d6d3d1'
                          }}
                        >
                          <RefreshCw size={13} />
                          <span>Lặp lại câu này: {isLoopingLine ? 'BẬT' : 'TẮT'}</span>
                        </button>

                        {/* 2. Tốc độ nói */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>Tốc độ:</span>
                          {[0.75, 1.0, 1.25].map(spd => (
                            <button
                              key={spd}
                              onClick={() => handleChangeSpeed(spd)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: playbackSpeed === spd ? '1px solid #c53d32' : '1px solid #e2e8f0',
                                background: playbackSpeed === spd ? '#fdf2f0' : '#ffffff',
                                color: playbackSpeed === spd ? '#c53d32' : '#57534e'
                              }}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {/* 3. Bật tắt phụ đề tiếng Việt / Nhật */}
                        <button
                          onClick={() => setShowVietnameseTranslation(!showVietnameseTranslation)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: '#ffffff',
                            border: '1px solid #d6d3d1',
                            color: '#57534e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {showVietnameseTranslation ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{showVietnameseTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</span>
                        </button>
                      </div>

                      {/* 4. Ghi âm thử giọng đối chiếu */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: '1px dashed #e7dfd5',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={handleToggleRecording}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              background: isRecording ? '#dc2626' : '#1c2536',
                              color: '#ffffff',
                              border: 'none',
                              boxShadow: isRecording ? '0 0 8px rgba(220, 38, 38, 0.5)' : 'none'
                            }}
                          >
                            {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                            <span>{isRecording ? 'Dừng thu âm' : 'Thu âm thử giọng'}</span>
                          </button>

                          {recordedAudioUrl && (
                            <audio src={recordedAudioUrl} controls style={{ height: 32, width: 220 }} />
                          )}
                        </div>

                        <span style={{ fontSize: 11, color: '#78716c' }}>
                          Nói đuổi ngay sau diễn giả 0.5 giây để luyện phản xạ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIDEO ĐỀ XUẤT CÙNG DANH MỤC TRONG KIZUNA (CHỐNG CHUYỂN SANG YOUTUBE NGOÀI) */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1c2536', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color="#c53d32" />
                    <span>VIDEO CÙNG CHỦ ĐỀ ĐƯỢC ĐỀ XUẤT TRONG KIZUNA:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {shadowingVideos.slice(0, 4).map(v => (
                      <div
                        key={v.id}
                        onClick={() => { setActiveShadowingVideo(v); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                        style={{
                          background: '#ffffff',
                          borderRadius: 8,
                          border: activeShadowingVideo.id === v.id ? '2px solid #c53d32' : '1px solid #ebe7df',
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
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1c2536', marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {v.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: LỜI THOẠI CHẠY ĐỒNG BỘ CÂU ĐẾN ĐÂU SÁNG ĐẾN ĐÓ */}
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
                      Bản Dịch & Lời Thoại Chạy Theo Video
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#78716c' }}>
                    {currentTranscript.length} đoạn hội thoại
                  </span>
                </div>

                {/* Khung cuộn danh sách câu thoại */}
                <div
                  ref={transcriptListRef}
                  style={{
                    maxHeight: 620,
                    overflowY: 'auto',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  {currentTranscript.map((line, idx) => {
                    const isActive = activeTranscriptId === line.id || (currentTime >= line.start && currentTime < line.end);

                    return (
                      <div
                        key={line.id || idx}
                        ref={isActive ? activeTranscriptRef : null}
                        onClick={() => handleSeekToLine(line)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: isActive ? '#fdf2f0' : '#ffffff',
                          border: isActive ? '1.5px solid #f3d5d2' : '1px solid #f1f5f9',
                          borderLeft: isActive ? '4px solid #c53d32' : '4px solid transparent',
                          animation: isActive ? 'activeLineGlow 2s infinite' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: isActive ? '#c53d32' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            {isActive && <Volume2 size={13} color="#c53d32" />}
                            <span>{formatDuration(line.start)} - {formatDuration(line.end)}</span>
                            {line.speaker && <span>· {line.speaker}</span>}
                          </span>

                          {isActive && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 900,
                              background: '#c53d32',
                              color: '#ffffff',
                              padding: '1px 6px',
                              borderRadius: 4
                            }}>
                              Đang phát
                            </span>
                          )}
                        </div>

                        {/* Tiếng Nhật */}
                        {showJapaneseText && (
                          <div style={{
                            fontSize: 14,
                            fontWeight: isActive ? 800 : 600,
                            color: isActive ? '#1c2536' : '#334155',
                            lineHeight: 1.6,
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                          }}>
                            {line.jp}
                          </div>
                        )}

                        {/* Bản dịch tiếng Việt */}
                        {showVietnameseTranslation && (
                          <div style={{
                            fontSize: 12,
                            color: isActive ? '#991b1b' : '#64748b',
                            marginTop: 4,
                            lineHeight: 1.5
                          }}>
                            {line.vi}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#78716c' }}>
              Không tìm thấy video Shadowing nào phù hợp
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: XEM CÁC VIDEO TIẾNG NHẬT KHÁC (LUYỆN THI, KINH DOANH, PHIM...) */}
      {/* ===================================================================== */}
      {activeTab === 'watch' && (
        <div>
          {/* Bộ lọc & tìm kiếm Watch */}
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
                CHỦ ĐỀ:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['ALL', 'Luyện thi', 'Kinh doanh', 'Tin tức', 'Phim'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setWatchCategory(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: watchCategory === cat ? '1px solid #c53d32' : '1px solid #ebe7df',
                      background: watchCategory === cat ? '#c53d32' : '#faf8f5',
                      color: watchCategory === cat ? '#ffffff' : '#57534e'
                    }}
                  >
                    {cat === 'ALL' ? 'Tất cả' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Tìm video..."
                value={watchSearch}
                onChange={e => setWatchSearch(e.target.value)}
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

          {activeWatchVideo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 380px', gap: 20, alignItems: 'start' }}>
              {/* Player */}
              <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #ebe7df', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0a0f1d' }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${activeWatchVideo.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={activeWatchVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <span style={{ background: '#fdf2f0', color: '#c53d32', border: '1px solid #f3d5d2', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>
                      {activeWatchVideo.jlptLevel}
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                      {activeWatchVideo.category}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1c2536', margin: '0 0 6px 0' }}>
                    {activeWatchVideo.title}
                  </h2>
                  <div style={{ fontSize: 12, color: '#78716c' }}>
                    Kênh: {activeWatchVideo.channelName} · Thời lượng: {formatDuration(activeWatchVideo.durationSeconds)}
                  </div>
                </div>
              </div>

              {/* Playlist video cùng danh mục KIZUNA */}
              <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #ebe7df', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#faf8f5', borderBottom: '1px solid #ebe7df', fontSize: 13, fontWeight: 800, color: '#1c2536' }}>
                  Danh Sách Phát ({watchVideos.length} video)
                </div>
                <div style={{ maxHeight: 580, overflowY: 'auto' }}>
                  {watchVideos.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setActiveWatchVideo(v)}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '10px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: activeWatchVideo.id === v.id ? '#fdf2f0' : '#ffffff',
                        borderLeft: activeWatchVideo.id === v.id ? '4px solid #c53d32' : '4px solid transparent'
                      }}
                    >
                      <div style={{ position: 'relative', width: 90, height: 52, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#000000' }}>
                        <img
                          src={v.thumbnailUrl || `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`}
                          alt={v.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: activeWatchVideo.id === v.id ? '#c53d32' : '#1c2536', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#78716c', marginTop: 4 }}>
                          {v.channelName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ĐỀ THI NGHE CHOUKAI (CÓ BÀI THI, CHẤM ĐIỂM & KỊCH BẢN ĐỐI CHIẾU) */}
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
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                          }}
                        >
                          {/* Tiêu đề câu hỏi */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1c2536' }}>
                              <span style={{
                                background: isSubmitted ? (isCorrect ? '#dcfce7' : '#fee2e2') : '#fdf2f0',
                                color: isSubmitted ? (isCorrect ? '#15803d' : '#b91c1c') : '#c53d32',
                                padding: '1px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 900,
                                marginRight: 6
                              }}>
                                Câu {q.index || qIdx + 1}
                              </span>
                              <span dangerouslySetInnerHTML={{ __html: q.question }} />
                            </div>

                            {isSubmitted && (
                              <div>
                                {isCorrect && (
                                  <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                                    <Check size={12} /> Đúng
                                  </span>
                                )}
                                {(isWrong || isUnanswered) && (
                                  <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                                    <X size={12} /> {isWrong ? 'Sai' : 'Chưa làm'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Các phương án lựa chọn */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                            {q.options.map(opt => {
                              const isChosen = userChoice === opt.id;
                              const isOfficialCorrect = isSubmitted && q.correctAnswer === opt.id;

                              let optBg = '#ffffff';
                              let optBorder = '1px solid #e2e8f0';
                              let optColor = '#1c2536';

                              if (isSubmitted) {
                                if (isOfficialCorrect) {
                                  optBg = '#f0fdf4';
                                  optBorder = '1.5px solid #16a34a';
                                  optColor = '#15803d';
                                } else if (isChosen && !isOfficialCorrect) {
                                  optBg = '#fef2f2';
                                  optBorder = '2px solid #dc2626';
                                  optColor = '#991b1b';
                                }
                              } else if (isChosen) {
                                optBg = '#fdf2f0';
                                optBorder = '1.5px solid #c53d32';
                                optColor = '#c53d32';
                              }

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => !isSubmitted && setUserAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                  style={{
                                    background: optBg,
                                    border: optBorder,
                                    color: optColor,
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    textAlign: 'left',
                                    fontSize: 13,
                                    fontWeight: isChosen || isOfficialCorrect ? 700 : 500,
                                    cursor: isSubmitted ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                  }}
                                >
                                  <span style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: isSubmitted && isOfficialCorrect ? '#16a34a' : isChosen ? '#c53d32' : '#f1f5f9',
                                    color: isSubmitted && isOfficialCorrect ? '#ffffff' : isChosen ? '#ffffff' : '#64748b',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    {opt.id}
                                  </span>
                                  <span style={{ flex: 1 }}>{opt.value || `Phương án ${opt.id}`}</span>
                                  {isSubmitted && isOfficialCorrect && (
                                    <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                      <Check size={11} strokeWidth={3} /> Đáp án đúng
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* KỊCH BẢN NGHE ĐỐI CHIẾU CHÍNH XÁC (SCRIPT REVEAL SAU KHI NỘP) */}
                          {isSubmitted && q.script && (
                            <div style={{
                              marginTop: 6,
                              background: isCorrect ? '#f0fdf4' : '#fef2f2',
                              border: isCorrect ? '1px solid #bbf7d0' : '1px solid #fecaca',
                              borderLeft: isCorrect ? '4px solid #16a34a' : '4px solid #dc2626',
                              borderRadius: 6,
                              padding: '10px 14px',
                              fontSize: 12,
                              color: '#334155',
                              lineHeight: 1.6
                            }}>
                              <div style={{ fontWeight: 800, color: isCorrect ? '#15803d' : '#b91c1c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <BookOpen size={13} />
                                <span>Kịch bản nghe chính xác (Audio Script):</span>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: q.script }} />
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
            /* DANH MỤC 65 BỘ ĐỀ THI NGHE CHOUKAI */
            <div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>BẬC JLPT:</span>
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
                        {lvl === 'ALL' ? 'Tất cả (65 Đề)' : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ position: 'relative', width: 260 }}>
                  <Search size={14} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Tìm theo năm, tên đề..."
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

              {loadingChoukai ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#78716c' }}>
                  <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #ebe7df', borderTopColor: '#c53d32', borderRadius: '50%', animation: 'kanjiSpin 0.8s linear infinite', marginBottom: 12 }} />
                  <div>Đang nạp 65 đề thi nghe Choukai...</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                  {filteredChoukai.map(item => (
                    <div
                      key={item.id}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>
                            {item.level}
                          </span>
                          {item.year && (
                            <span style={{ background: '#faf8f5', color: '#78716c', border: '1px solid #ebe7df', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                              {item.year}{item.month ? ` · Tháng ${item.month}` : ''}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#78716c', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> ~{item.durationMinutes || 40} phút · 5 Mondai
                        </span>
                      </div>

                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1c2536', margin: 0, fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                        {item.label}
                      </h3>

                      {/* File audio */}
                      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <audio src={item.audioUrl} controls preload="none" style={{ width: '100%', height: 32, outline: 'none' }} />
                      </div>

                      {/* Nút vào làm bài thi */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          onClick={() => handleStartChoukaiExam(item.id)}
                          style={{
                            padding: '8px 16px',
                            background: '#c53d32',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span>Làm bài thi có chấm điểm</span>
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
