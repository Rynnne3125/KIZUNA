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
  ChevronLeft,
  Sliders,
  Languages,
  MessageSquare,
  VolumeX,
  CheckCheck
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { VideoLesson, ChoukaiAudioItem, QuestionSet } from '../types/kizuna';
import { TranscriptLine, getTranscriptForVideo } from '../data/shadowingTranscripts';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
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
  // Chế độ: 'listen' (Xem & Nghe có phụ đề đồng bộ) | 'practice' (Luyện tập Shadowing từng câu chuyên sâu)
  const [shadowingMode, setShadowingMode] = useState<'listen' | 'practice'>('listen');
  const [activeShadowingVideo, setActiveShadowingVideo] = useState<VideoLesson | null>(null);
  const [shadowingLevel, setShadowingLevel] = useState<string>('ALL');
  const [shadowingSearch, setShadowingSearch] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);
  const [isLoopingLine, setIsLoopingLine] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Tùy chọn hiển thị phụ đề chạy cùng video
  const [subtitleDisplayMode, setSubtitleDisplayMode] = useState<'both' | 'ja_only' | 'off'>('both');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'transcript' | 'playlist'>('transcript');

  // Trạng thái Player & Chặn đề xuất ngoài YouTube
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);

  // Trạng thái Luyện tập Shadowing Từng Câu (Practice Mode)
  const [practiceIndex, setPracticeIndex] = useState<number>(0);
  const [practicedSentences, setPracticedSentences] = useState<Record<string, { score: number; url?: string }>>({});

  // Ghi âm thử giọng & Nhận diện tiếng Nhật (AI Web Speech ja-JP)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognitionSupported, setRecognitionSupported] = useState<boolean>(true);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [speechResult, setSpeechResult] = useState<{
    spokenText: string;
    score: number;
    grade: 'excellent' | 'good' | 'need_practice';
    feedback: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

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

  // 3. Khởi tạo YouTube IFrame API và gắn player
  useEffect(() => {
    let isMounted = true;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      const el = document.getElementById('kizuna-shadowing-player');
      if (!el) return;

      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch (e) {}

      try {
        playerRef.current = new window.YT.Player('kizuna-shadowing-player', {
          events: {
            onReady: (e: any) => {
              if (isMounted) setIsPlayerReady(true);
            },
            onStateChange: (e: any) => {
              if (!isMounted) return;
              if (e.data === 0) {
                // ENDED: Bật overlay kết thúc chặn sạch đề xuất từ YouTube
                setIsVideoEnded(true);
                setIsPlaying(false);
              } else if (e.data === 1) {
                // PLAYING
                setIsPlaying(true);
                setIsVideoEnded(false);
              } else if (e.data === 2) {
                // PAUSED
                setIsPlaying(false);
              }
            }
          }
        });
      } catch (err) {
        console.warn('YT player attach err:', err);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = setupPlayer;
    } else {
      setTimeout(setupPlayer, 250);
    }

    return () => {
      isMounted = false;
    };
  }, [activeShadowingVideo?.youtubeVideoId]);

  // 4. Lọc danh sách Video cho Tab 1 (Podcast & Shadowing)
  const shadowingVideos = useMemo(() => {
    return allVideos.filter(v => {
      const isPodcast = v.category === 'Podcast' || v.title.toLowerCase().includes('shadowing') || (shadowingLevel === 'N5' && v.title.toLowerCase().includes('luyện nghe'));
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

  // Câu thoại đang phát hiện tại
  const activeSentence = useMemo(() => {
    if (!currentTranscript.length) return null;
    return currentTranscript.find(l => currentTime >= l.start && currentTime < l.end) || currentTranscript[practiceIndex] || currentTranscript[0];
  }, [currentTranscript, currentTime, practiceIndex]);

  // 7. Đồng bộ vị trí lời thoại đang phát theo thời gian video thực tế
  useEffect(() => {
    if (activeTab !== 'shadowing' || !activeShadowingVideo) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
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
        } catch (e) {}
      }
    }, 200);

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

  // Phát đúng một câu đơn lẻ rồi tự động dừng lại khi hết câu
  const handlePlaySentenceAudio = (startSec: number, endSec: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(startSec, true);
      playerRef.current.playVideo();

      const checkStop = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const cur = playerRef.current.getCurrentTime();
            if (cur >= endSec || cur < startSec - 0.5) {
              playerRef.current.pauseVideo();
              clearInterval(checkStop);
            }
          } catch (e) {
            clearInterval(checkStop);
          }
        } else {
          clearInterval(checkStop);
        }
      }, 120);
    }
  };

  // Điều chỉnh tốc độ phát YouTube
  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(speed);
    }
  };

  // ĐÁNH GIÁ ĐỘ CHUẨN XÁC CỦA PHÁT ÂM TIẾNG NHẬT (LEVENSHTEIN VÀ KHỚP KÝ TỰ BẢN NGỮ)
  const evaluateJapanesePronunciation = (spoken: string, target: string): {
    score: number;
    grade: 'excellent' | 'good' | 'need_practice';
    feedback: string;
  } => {
    const clean = (s: string) => s.replace(/[\s、。！？,.!?「」『』（）()…—~～]/g, '').trim();
    const s = clean(spoken);
    const t = clean(target);

    if (!s) {
      return {
        score: 0,
        grade: 'need_practice',
        feedback: 'Chưa phát hiện được giọng nói. Bạn hãy kiểm tra micro, nói to và rõ ràng hơn nhé!'
      };
    }

    // Tính khoảng cách Levenshtein giữa chuỗi tiếng Nhật máy nghe được và câu mẫu
    const m = s.length;
    const n = t.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s[i - 1] === t[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }

    const dist = dp[m][n];
    const maxL = Math.max(m, n);
    const rawScore = Math.max(0, Math.round(((maxL - dist) / maxL) * 100));

    let grade: 'excellent' | 'good' | 'need_practice' = 'need_practice';
    let feedback = '';

    if (rawScore >= 80) {
      grade = 'excellent';
      feedback = 'Phát âm xuất sắc! Khẩu hình, âm vần và ngữ điệu rất chuẩn xác như người bản xứ.';
    } else if (rawScore >= 55) {
      grade = 'good';
      feedback = 'Khá tốt! Bạn đã phát âm đúng phần lớn câu. Hãy chú ý ngắt nhịp và nhấn âm rõ hơn một chút.';
    } else {
      grade = 'need_practice';
      feedback = 'Cần luyện thêm. Hãy bấm "Nghe câu mẫu" để bắt chước ngữ điệu diễn giả và thử lại nhé!';
    }

    return { score: rawScore, grade, feedback };
  };

  // Bắt đầu thu âm và kích hoạt AI nhận diện giọng nói tiếng Nhật (Web Speech API ja-JP)
  const handleStartPracticeRecording = async (targetSentence: string) => {
    setSpeechResult(null);
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];

    // 1. Thu âm bằng MediaRecorder để lưu file nghe lại
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone stream error:', err);
      alert('Không thể mở micro. Vui lòng cấp quyền micro cho trình duyệt!');
      return;
    }

    // 2. Kích hoạt Web Speech API nhận diện giọng nói tiếng Nhật trực tiếp
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'ja-JP';
        rec.continuous = false;
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onresult = (e: any) => {
          const spoken = e.results[0][0].transcript;
          const evalRes = evaluateJapanesePronunciation(spoken, targetSentence);
          setSpeechResult({
            spokenText: spoken,
            score: evalRes.score,
            grade: evalRes.grade,
            feedback: evalRes.feedback
          });

          // Lưu tiến trình câu này
          const lineId = currentTranscript[practiceIndex]?.id || `p_${practiceIndex}`;
          setPracticedSentences(prev => ({
            ...prev,
            [lineId]: { score: evalRes.score }
          }));
        };

        rec.onerror = (e: any) => {
          console.warn('SpeechRec error:', e.error);
          if (e.error === 'no-speech') {
            setSpeechResult({
              spokenText: '(Không phát hiện giọng nói)',
              score: 0,
              grade: 'need_practice',
              feedback: 'Không nghe thấy giọng nói. Vui lòng nói to và rõ ràng hơn vào micro.'
            });
          }
        };

        rec.onend = () => {
          setIsRecognizing(false);
        };

        recognitionRef.current = rec;
        rec.start();
        setIsRecognizing(true);
      } catch (e) {
        console.warn('SpeechRec start error:', e);
        setRecognitionSupported(false);
      }
    } else {
      setRecognitionSupported(false);
    }
  };

  // Dừng thu âm và hoàn tất chấm điểm
  const handleStopPracticeRecording = (targetSentence: string) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecognizing(false);
  };

  // Chuyển sang câu luyện tiếp theo
  const handleNextPracticeSentence = () => {
    if (practiceIndex < currentTranscript.length - 1) {
      const nextIdx = practiceIndex + 1;
      setPracticeIndex(nextIdx);
      setSpeechResult(null);
      setRecordedAudioUrl(null);
      const nextLine = currentTranscript[nextIdx];
      if (nextLine) handleSeekToLine(nextLine);
    }
  };

  // Quay lại câu luyện trước đó
  const handlePrevPracticeSentence = () => {
    if (practiceIndex > 0) {
      const prevIdx = practiceIndex - 1;
      setPracticeIndex(prevIdx);
      setSpeechResult(null);
      setRecordedAudioUrl(null);
      const prevLine = currentTranscript[prevIdx];
      if (prevLine) handleSeekToLine(prevLine);
    }
  };

  // Chuyển sang video Shadowing tiếp theo trong danh sách KIZUNA
  const handleNextShadowingVideo = () => {
    const curIdx = shadowingVideos.findIndex(v => v.id === activeShadowingVideo?.id);
    if (curIdx >= 0 && curIdx < shadowingVideos.length - 1) {
      const nextVid = shadowingVideos[curIdx + 1];
      setActiveShadowingVideo(nextVid);
      setIsVideoEnded(false);
      setPracticeIndex(0);
      setSpeechResult(null);
      setRecordedAudioUrl(null);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Phát lại video Shadowing từ đầu
  const handleReplayVideo = () => {
    setIsVideoEnded(false);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
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
          {/* Thanh chuyển chế độ & Lọc Shadowing */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Chuyển đổi giữa 2 chế độ: Xem có Phụ Đề Đồng Bộ và Luyện Shadowing Từng Câu (AI Test) */}
            <div style={{
              display: 'inline-flex',
              background: '#f8fafc',
              padding: 3,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              gap: 4
            }}>
              <button
                onClick={() => setShadowingMode('listen')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: shadowingMode === 'listen' ? '1px solid #c53d32' : 'none',
                  background: shadowingMode === 'listen' ? '#c53d32' : 'transparent',
                  color: shadowingMode === 'listen' ? '#ffffff' : '#64748b',
                  boxShadow: shadowingMode === 'listen' ? '0 2px 4px rgba(197, 61, 50, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Film size={13} />
                <span>Xem & Nghe Có Phụ Đề Đồng Bộ</span>
              </button>

              <button
                onClick={() => setShadowingMode('practice')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: shadowingMode === 'practice' ? '1px solid #c53d32' : 'none',
                  background: shadowingMode === 'practice' ? '#c53d32' : 'transparent',
                  color: shadowingMode === 'practice' ? '#ffffff' : '#64748b',
                  boxShadow: shadowingMode === 'practice' ? '0 2px 4px rgba(197, 61, 50, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Mic size={13} />
                <span>Phòng Luyện Shadowing Từng Câu</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: shadowingMode === 'practice' ? '#ffffff' : '#fef2f2',
                  color: shadowingMode === 'practice' ? '#c53d32' : '#dc2626'
                }}>
                  AI Test
                </span>
              </button>
            </div>

            {/* Bậc JLPT và tìm kiếm */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {LEVEL_FILTERS.map(lvl => {
                  const isSelected = shadowingLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setShadowingLevel(lvl.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
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

              <div style={{ position: 'relative', width: 220, maxWidth: '100%' }}>
                <Search size={13} color="#78716c" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Tìm bài Podcast, Shadowing..."
                  value={shadowingSearch}
                  onChange={e => setShadowingSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: 6,
                    border: '1px solid #d6d3d1',
                    fontSize: 11,
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>
          </div>

          {activeShadowingVideo ? (
            <div>
              {/* ============================================================= */}
              {/* CHẾ ĐỘ 1: XEM & NGHE CÓ PHỤ ĐỀ ĐỒNG BỘ CHẠY CÙNG VIDEO         */}
              {/* ============================================================= */}
              {shadowingMode === 'listen' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)',
                  gap: 20,
                  alignItems: 'start'
                }}>
                  {/* CỘT TRÁI: VIDEO PLAYER VỚI PHỤ ĐỀ CHẠY CÙNG & CHẶN ĐỀ XUẤT NGOÀI */}
                  <div>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #ebe7df',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                    }}>
                      {/* KHUNG VIDEO PLAYER: CHẶN ĐỀ XUẤT YOUTUBE NGOÀI */}
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
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                        />

                        {/* OVERLAY CHẶN HOÀN TOÀN ĐỀ XUẤT KHI VIDEO KẾT THÚC */}
                        {isVideoEnded && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(15, 23, 42, 0.95)',
                            zIndex: 30,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 24,
                            textAlign: 'center',
                            color: '#ffffff'
                          }}>
                            <CheckCircle2 size={44} color="#10b981" style={{ marginBottom: 12 }} />
                            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px 0' }}>
                              Đã Hoàn Thành Lượt Nghe Video!
                            </h3>
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px 0', maxWidth: 440, lineHeight: 1.5 }}>
                              Bạn đã hoàn tất bài nghe. Hãy chuyển sang phòng luyện tập Shadowing từng câu để kiểm tra ngữ âm và chấm điểm phát âm với AI bản ngữ!
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                              <button
                                onClick={() => { setIsVideoEnded(false); setShadowingMode('practice'); }}
                                style={{
                                  background: '#c53d32',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 18px',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <Mic size={14} /> Vào luyện Shadowing từng câu (AI Test)
                              </button>

                              <button
                                onClick={handleReplayVideo}
                                style={{
                                  background: '#334155',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 16px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <RotateCcw size={14} /> Phát lại từ đầu
                              </button>

                              <button
                                onClick={handleNextShadowingVideo}
                                style={{
                                  background: '#0d9488',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 16px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <ArrowRight size={14} /> Bài tiếp theo trong KIZUNA
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* THANH PHỤ ĐỀ CHẠY ĐỒNG BỘ CÙNG VIDEO (REAL-TIME SUBTITLE DOCK) */}
                      {subtitleDisplayMode !== 'off' && activeSentence && (
                        <div style={{
                          background: '#0f172a',
                          borderTop: '2px solid #334155',
                          padding: '14px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                background: '#c53d32',
                                color: '#ffffff',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 900
                              }}>
                                PHỤ ĐỀ ĐỒNG BỘ
                              </span>
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Volume2 size={12} color="#38bdf8" />
                                <span>{formatDuration(activeSentence.start)} - {formatDuration(activeSentence.end)}</span>
                                {activeSentence.speaker && <span>· {activeSentence.speaker}</span>}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                const idx = currentTranscript.findIndex(l => l.id === activeSentence.id);
                                if (idx >= 0) setPracticeIndex(idx);
                                setShadowingMode('practice');
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#38bdf8',
                                borderRadius: 6,
                                padding: '3px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Mic size={12} />
                              <span>Luyện câu này</span>
                            </button>
                          </div>

                          {/* Dòng tiếng Nhật (kèm Furigana) */}
                          <div style={{
                            color: '#ffffff',
                            fontSize: 16,
                            fontWeight: 700,
                            lineHeight: 1.6,
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                          }}>
                            {activeSentence.furigana ? (
                              <div>
                                <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 500, letterSpacing: '0.5px' }}>
                                  {activeSentence.furigana}
                                </div>
                                <div>{activeSentence.jp}</div>
                              </div>
                            ) : (
                              activeSentence.jp
                            )}
                          </div>

                          {/* Dòng bản dịch nghĩa tiếng Việt */}
                          {subtitleDisplayMode === 'both' && (
                            <div style={{
                              color: '#fde047',
                              fontSize: 13,
                              lineHeight: 1.4,
                              fontWeight: 500
                            }}>
                              {activeSentence.vi}
                            </div>
                          )}
                        </div>
                      )}

                      {/* BẢNG ĐIỀU KHIỂN & CÔNG CỤ SHADOWING DƯỚI VIDEO */}
                      <div style={{ padding: '16px 20px' }}>
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

                        {/* CÔNG CỤ ĐIỀU CHỈNH TRÌNH PHÁT */}
                        <div style={{
                          background: '#faf8f5',
                          border: '1px solid #ebe7df',
                          borderRadius: 10,
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {/* Nút bật/tắt lặp câu */}
                            <button
                              onClick={() => setIsLoopingLine(!isLoopingLine)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                background: isLoopingLine ? '#c53d32' : '#ffffff',
                                color: isLoopingLine ? '#ffffff' : '#57534e',
                                border: isLoopingLine ? '1px solid #c53d32' : '1px solid #d6d3d1'
                              }}
                            >
                              <RefreshCw size={12} />
                              <span>Lặp câu đang phát: {isLoopingLine ? 'BẬT' : 'TẮT'}</span>
                            </button>

                            {/* Tốc độ phát */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>Tốc độ:</span>
                              {[0.75, 1.0, 1.25].map(spd => (
                                <button
                                  key={spd}
                                  onClick={() => handleChangeSpeed(spd)}
                                  style={{
                                    padding: '3px 8px',
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

                            {/* Tùy chọn hiển thị phụ đề */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#78716c' }}>Phụ đề:</span>
                              <button
                                onClick={() => {
                                  if (subtitleDisplayMode === 'both') setSubtitleDisplayMode('ja_only');
                                  else if (subtitleDisplayMode === 'ja_only') setSubtitleDisplayMode('off');
                                  else setSubtitleDisplayMode('both');
                                }}
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: '#ffffff',
                                  border: '1px solid #d6d3d1',
                                  color: '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Languages size={12} />
                                <span>
                                  {subtitleDisplayMode === 'both' ? 'Nhật + Việt' : subtitleDisplayMode === 'ja_only' ? 'Chỉ Tiếng Nhật' : 'Tắt Phụ Đề'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Nút chuyển chế độ Luyện Shadowing Từng Câu */}
                          <button
                            onClick={() => setShadowingMode('practice')}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: 'pointer',
                              background: '#c53d32',
                              color: '#ffffff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Mic size={13} />
                            <span>Chuyển Sang Luyện Shadowing Từng Câu</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* VIDEO ĐỀ XUẤT TIẾP THEO TRONG KIZUNA (CHỐNG CHUYỂN SANG YOUTUBE NGOÀI) */}
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1c2536', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Layers size={14} color="#c53d32" />
                        <span>VIDEO CÙNG CHỦ ĐỀ ĐƯỢC ĐỀ XUẤT TIẾP THEO TRONG KIZUNA:</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                        {shadowingVideos.slice(0, 4).map(v => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setActiveShadowingVideo(v);
                              setIsVideoEnded(false);
                              setPracticeIndex(0);
                              window.scrollTo({ top: 180, behavior: 'smooth' });
                            }}
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

                  {/* CỘT PHẢI: SIDEBAR 2 TAB (LỜI THOẠI ĐỒNG BỘ HOẶC KHO PODCAST & SHADOWING) */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    border: '1px solid #ebe7df',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                  }}>
                    {/* Header 2 Tab của Sidebar */}
                    <div style={{
                      padding: '8px 12px',
                      background: '#faf8f5',
                      borderBottom: '1px solid #ebe7df',
                      display: 'flex',
                      gap: 6
                    }}>
                      <button
                        onClick={() => setActiveSidebarTab('transcript')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: activeSidebarTab === 'transcript' ? '1px solid #c53d32' : '1px solid transparent',
                          background: activeSidebarTab === 'transcript' ? '#ffffff' : 'transparent',
                          color: activeSidebarTab === 'transcript' ? '#c53d32' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <BookOpen size={13} />
                        <span>Lời Thoại ({currentTranscript.length})</span>
                      </button>

                      <button
                        onClick={() => setActiveSidebarTab('playlist')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: activeSidebarTab === 'playlist' ? '1px solid #c53d32' : '1px solid transparent',
                          background: activeSidebarTab === 'playlist' ? '#ffffff' : 'transparent',
                          color: activeSidebarTab === 'playlist' ? '#c53d32' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Layers size={13} />
                        <span>Kho Podcast ({shadowingVideos.length})</span>
                      </button>
                    </div>

                    {/* NỘI DUNG TAB 1: LỜI THOẠI ĐỒNG BỘ */}
                    {activeSidebarTab === 'transcript' && (
                      <div
                        ref={transcriptListRef}
                        style={{
                          maxHeight: 650,
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

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setPracticeIndex(idx);
                                      setShadowingMode('practice');
                                    }}
                                    style={{
                                      background: '#f1f5f9',
                                      border: 'none',
                                      borderRadius: 4,
                                      padding: '2px 6px',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: '#0d9488',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Luyện câu này
                                  </button>
                                </div>
                              </div>

                              {/* Tiếng Nhật */}
                              <div style={{
                                fontSize: 14,
                                fontWeight: isActive ? 800 : 600,
                                color: isActive ? '#1c2536' : '#334155',
                                lineHeight: 1.6,
                                fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                              }}>
                                {line.jp}
                              </div>

                              {/* Bản dịch tiếng Việt */}
                              <div style={{
                                fontSize: 12,
                                color: isActive ? '#991b1b' : '#64748b',
                                marginTop: 4,
                                lineHeight: 1.5
                              }}>
                                {line.vi}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* NỘI DUNG TAB 2: DANH SÁCH TOÀN BỘ KHO PODCAST & SHADOWING KIZUNA */}
                    {activeSidebarTab === 'playlist' && (
                      <div style={{ maxHeight: 650, overflowY: 'auto' }}>
                        {shadowingVideos.map(v => {
                          const isCurrent = activeShadowingVideo.id === v.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => {
                                setActiveShadowingVideo(v);
                                setIsVideoEnded(false);
                                setPracticeIndex(0);
                                setSpeechResult(null);
                                setRecordedAudioUrl(null);
                              }}
                              style={{
                                display: 'flex',
                                gap: 10,
                                padding: '10px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                background: isCurrent ? '#fdf2f0' : '#ffffff',
                                borderLeft: isCurrent ? '4px solid #c53d32' : '4px solid transparent',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ position: 'relative', width: 96, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#0a0f1d' }}>
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
                                  {isCurrent && (
                                    <span style={{ fontSize: 9, fontWeight: 900, color: '#c53d32' }}>
                                      • ĐANG HỌC
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
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* CHẾ ĐỘ 2: PHÒNG LUYỆN SHADOWING TỪNG CÂU CHUYÊN SÂU (AI TEST) */}
              {/* ============================================================= */}
              {shadowingMode === 'practice' && (
                <div>
                  {/* THANH ĐIỀU HƯỚNG PHÒNG LUYỆN TẬP */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #ebe7df',
                    padding: '14px 20px',
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => setShadowingMode('listen')}
                        style={{
                          background: '#faf8f5',
                          border: '1px solid #d6d3d1',
                          color: '#57534e',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <ChevronLeft size={14} />
                        <span>Quay lại Xem Video</span>
                      </button>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#c53d32' }}>
                          PHÒNG LUYỆN SHADOWING CHUYÊN SÂU
                        </div>
                        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1c2536', margin: 0 }}>
                          {activeShadowingVideo.title}
                        </h2>
                      </div>
                    </div>

                    {/* Tiến độ và nút chuyển câu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#1c2536' }}>
                          Câu {practiceIndex + 1} / {currentTranscript.length}
                        </div>
                        <div style={{ fontSize: 11, color: '#78716c' }}>
                          Đã luyện: {Object.keys(practicedSentences).length}/{currentTranscript.length} câu
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={handlePrevPracticeSentence}
                          disabled={practiceIndex === 0}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: practiceIndex === 0 ? 'not-allowed' : 'pointer',
                            background: '#faf8f5',
                            border: '1px solid #d6d3d1',
                            color: practiceIndex === 0 ? '#cbd5e1' : '#475569'
                          }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={handleNextPracticeSentence}
                          disabled={practiceIndex === currentTranscript.length - 1}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: practiceIndex === currentTranscript.length - 1 ? 'not-allowed' : 'pointer',
                            background: '#c53d32',
                            border: 'none',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span>Câu sau</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* THẺ SPOTLIGHT CÂU ĐANG LUYỆN */}
                  {currentTranscript[practiceIndex] && (
                    <div style={{
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1.5px solid #ebe7df',
                      padding: '24px 28px',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                      marginBottom: 20
                    }}>
                      {/* Thẻ người nói và mốc thời gian */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            background: '#fdf2f0',
                            color: '#c53d32',
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 900
                          }}>
                            {currentTranscript[practiceIndex].speaker || 'Diễn giả'}
                          </span>
                          <span style={{ fontSize: 12, color: '#78716c' }}>
                            Mốc thời gian: {formatDuration(currentTranscript[practiceIndex].start)} - {formatDuration(currentTranscript[practiceIndex].end)}
                          </span>
                        </div>

                        {practicedSentences[currentTranscript[practiceIndex].id] && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 800
                          }}>
                            <Check size={12} />
                            <span>Điểm đã đạt: {practicedSentences[currentTranscript[practiceIndex].id].score}%</span>
                          </span>
                        )}
                      </div>

                      {/* VĂN BẢN TIẾNG NHẬT NGUYÊN BẢN (CỠ LỚN + FURIGANA) */}
                      <div style={{
                        background: '#faf8f5',
                        borderRadius: 12,
                        padding: '20px 24px',
                        border: '1px solid #ebe7df',
                        marginBottom: 16
                      }}>
                        {currentTranscript[practiceIndex].furigana && (
                          <div style={{
                            fontSize: 13,
                            color: '#0d9488',
                            fontWeight: 600,
                            marginBottom: 4,
                            letterSpacing: '0.5px'
                          }}>
                            {currentTranscript[practiceIndex].furigana}
                          </div>
                        )}
                        <div style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: '#1c2536',
                          lineHeight: 1.7,
                          fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                        }}>
                          {currentTranscript[practiceIndex].jp}
                        </div>
                      </div>

                      {/* BẢN DỊCH TIẾNG VIỆT CHUẨN */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: 10,
                        padding: '14px 18px',
                        border: '1px dashed #d6d3d1',
                        marginBottom: 24,
                        fontSize: 14,
                        color: '#334155',
                        lineHeight: 1.6
                      }}>
                        <strong style={{ color: '#c53d32', marginRight: 6 }}>Bản dịch tiếng Việt:</strong>
                        {currentTranscript[practiceIndex].vi}
                      </div>

                      {/* BỘ 3 BƯỚC LUYỆN TẬP THỰC HÀNH SHADOWING */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 16,
                        marginBottom: 20
                      }}>
                        {/* BƯỚC 1: NGHE NGƯỜI BẢN XỨ */}
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#0284c7', marginBottom: 4, letterSpacing: '0.5px' }}>
                              BƯỚC 1: LẮNG NGHE MẪU
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                              Nghe ngữ điệu và nhịp ngắt người bản xứ
                            </div>
                            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                              Bấm để nghe riêng câu này từ video bản ngữ và chú ý cách phát âm từng từ.
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handlePlaySentenceAudio(currentTranscript[practiceIndex].start, currentTranscript[practiceIndex].end)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <Volume2 size={15} />
                              <span>Phát câu mẫu</span>
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              {[0.75, 1.0].map(spd => (
                                <button
                                  key={spd}
                                  onClick={() => handleChangeSpeed(spd)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: playbackSpeed === spd ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                    background: playbackSpeed === spd ? '#e0f2fe' : '#ffffff',
                                    color: playbackSpeed === spd ? '#0284c7' : '#475569'
                                  }}
                                >
                                  {spd}x
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* BƯỚC 2: THU ÂM VÀ CHẤM ĐIỂM BẰNG AI SPEECH RECOGNITION */}
                        <div style={{
                          background: isRecording ? '#fef2f2' : '#f8fafc',
                          border: isRecording ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#c53d32', marginBottom: 4, letterSpacing: '0.5px' }}>
                              BƯỚC 2: THU ÂM & CHẤM ĐIỂM AI (JA-JP)
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                              Phát âm đuổi theo câu mẫu vào micro
                            </div>
                            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                              Hệ thống AI nhận diện giọng nói tiếng Nhật và tính điểm chuẩn xác của từng từ.
                            </p>
                          </div>

                          <div>
                            {!isRecording ? (
                              <button
                                onClick={() => handleStartPracticeRecording(currentTranscript[practiceIndex].jp)}
                                style={{
                                  padding: '8px 18px',
                                  borderRadius: 8,
                                  background: '#c53d32',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <Mic size={15} />
                                <span>Bắt đầu thu âm & chấm điểm</span>
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                  onClick={() => handleStopPracticeRecording(currentTranscript[practiceIndex].jp)}
                                  style={{
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 0 10px rgba(220, 38, 38, 0.4)'
                                  }}
                                >
                                  <MicOff size={15} />
                                  <span>Dừng thu & xem điểm</span>
                                </button>
                                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
                                  Đang lắng nghe tiếng Nhật...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BƯỚC 3: KẾT QUẢ ĐÁNH GIÁ ĐỘ CHUẨN XÁC CỦA PHÁT ÂM */}
                      {speechResult && (
                        <div style={{
                          background: speechResult.grade === 'excellent' ? '#f0fdf4' : speechResult.grade === 'good' ? '#eff6ff' : '#fffbeb',
                          border: speechResult.grade === 'excellent' ? '1.5px solid #86efac' : speechResult.grade === 'good' ? '1.5px solid #bfdbfe' : '1.5px solid #fde68a',
                          borderLeft: speechResult.grade === 'excellent' ? '5px solid #16a34a' : speechResult.grade === 'good' ? '5px solid #2563eb' : '5px solid #d97706',
                          borderRadius: 12,
                          padding: '18px 22px',
                          marginBottom: 16
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Award size={20} color={speechResult.grade === 'excellent' ? '#16a34a' : speechResult.grade === 'good' ? '#2563eb' : '#d97706'} />
                              <span style={{ fontSize: 14, fontWeight: 900, color: '#1c2536' }}>
                                KẾT QUẢ ĐÁNH GIÁ PHÁT ÂM THỰC TẾ:
                              </span>
                            </div>

                            <span style={{
                              fontSize: 16,
                              fontWeight: 900,
                              color: speechResult.grade === 'excellent' ? '#15803d' : speechResult.grade === 'good' ? '#1d4ed8' : '#b45309'
                            }}>
                              Độ chuẩn xác: {speechResult.score}%
                            </span>
                          </div>

                          {/* Đối chiếu câu máy nhận diện được */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 700, color: '#64748b', marginRight: 6 }}>Máy AI nhận diện từ bạn:</span>
                              <strong style={{ color: '#1e293b', fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                "{speechResult.spokenText}"
                              </strong>
                            </div>

                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                              <strong>Nhận xét:</strong> {speechResult.feedback}
                            </div>
                          </div>

                          {/* Nghe lại giọng của chính mình */}
                          {recordedAudioUrl && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                                Nghe lại giọng của bạn:
                              </span>
                              <audio src={recordedAudioUrl} controls style={{ height: 32, width: 220 }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nếu chưa có kết quả nhưng đã thu âm xong file nghe lại */}
                      {!speechResult && recordedAudioUrl && (
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: 10,
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          marginBottom: 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                            Bản ghi âm giọng đọc của bạn:
                          </span>
                          <audio src={recordedAudioUrl} controls style={{ height: 32, width: 220 }} />
                        </div>
                      )}

                      {/* NÚT ĐIỀU HƯỚNG CUỐI CÂU */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => {
                            setSpeechResult(null);
                            setRecordedAudioUrl(null);
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            background: '#ffffff',
                            color: '#57534e',
                            border: '1px solid #d6d3d1',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Luyện lại câu này
                        </button>

                        <button
                          onClick={handleNextPracticeSentence}
                          disabled={practiceIndex === currentTranscript.length - 1}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 6,
                            background: '#c53d32',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: practiceIndex === currentTranscript.length - 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span>Luyện câu kế tiếp</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BẢNG TỔNG QUAN TẤT CẢ CÁC CÂU THOẠI TRONG BÀI */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #ebe7df',
                    padding: '18px 20px'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1c2536', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BookOpen size={14} color="#c53d32" />
                      <span>DANH SÁCH CÁC CÂU TRONG BÀI ({currentTranscript.length} câu):</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                      {currentTranscript.map((line, idx) => {
                        const isCurrent = practiceIndex === idx;
                        const record = practicedSentences[line.id];

                        return (
                          <div
                            key={line.id || idx}
                            onClick={() => {
                              setPracticeIndex(idx);
                              setSpeechResult(null);
                              setRecordedAudioUrl(null);
                              handleSeekToLine(line);
                            }}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              border: isCurrent ? '2px solid #c53d32' : '1px solid #e2e8f0',
                              background: isCurrent ? '#fdf2f0' : record ? '#f0fdf4' : '#ffffff',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: isCurrent ? '#c53d32' : '#64748b' }}>
                                Câu {idx + 1}
                              </span>
                              {record && (
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 10 }}>
                                  {record.score}%
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                              {line.jp}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                              {line.vi}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
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
