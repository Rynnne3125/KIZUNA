import React, { useEffect, useState } from 'react';
import { User } from '../types/auth';
import { UserNavTab } from '../components/UserNavbar';
import { progressService } from '../services/progressService';
import { rankingService } from '../services/rankingService';
import { kizunaService } from '../services/kizunaService';
import { UserProgressData } from '../types/progress';
import { RankTier, UserLeaderboardItem } from '../types/ranking';
import { 
  Flame, Star, Award, BookOpen, ArrowRight, Trophy, Sparkles, 
  CheckCircle2, Compass, Layers, Library, GraduationCap, 
  TrendingUp, Play, ChevronRight, User as UserIcon
} from 'lucide-react';

interface HomePageProps {
  user: User | null;
  onNavigate: (tab: UserNavTab) => void;
  onOpenAuth?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigate, onOpenAuth }) => {
  // Tiến độ học tập thực tế từ Firestore
  const [userProgress, setUserProgress] = useState<UserProgressData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Dữ liệu bảng xếp hạng và mốc rank từ Firestore
  const [rankTiers, setRankTiers] = useState<RankTier[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserLeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Số liệu tổng thể tài nguyên ứng dụng
  const [catalogStats, setCatalogStats] = useState({
    vocabCount: 13096,
    grammarCount: 605,
    kanjiCount: 2216,
    examsCount: 85
  });

  // Tải tiến độ học tập thực tế của user từ Firestore
  useEffect(() => {
    async function loadProgress() {
      if (!user?.id) {
        setUserProgress(null);
        setLoadingProgress(false);
        return;
      }
      setLoadingProgress(true);
      try {
        const prog = await progressService.getUserProgress(user.id);
        setUserProgress(prog);
      } catch (e) {
        console.warn('Lỗi tải tiến độ:', e);
      } finally {
        setLoadingProgress(false);
      }
    }
    loadProgress();
  }, [user?.id]);

  // Tải bảng xếp hạng và mốc rank từ Firestore
  useEffect(() => {
    async function loadRanking() {
      setLoadingLeaderboard(true);
      try {
        const tiers = await rankingService.getRankTiers();
        setRankTiers(tiers);
        const lb = await rankingService.getLearnerLeaderboard(tiers);
        setLeaderboard(lb);
      } catch (e) {
        console.warn('Lỗi tải bảng xếp hạng:', e);
      } finally {
        setLoadingLeaderboard(false);
      }
    }
    loadRanking();
  }, []);

  // Tải số liệu tài nguyên ứng dụng
  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await kizunaService.getAppCatalogStats();
        setCatalogStats(stats);
      } catch (e) {
        console.warn('Lỗi tải catalog stats:', e);
      }
    }
    loadStats();
  }, []);

  // Tính bậc rank hiện tại và mốc thăng hạng tiếp theo của user
  const userActivePoints = user?.activePoints ?? 0;
  const currentRank = rankingService.calculateRank(userActivePoints, rankTiers);
  const nextRankInfo = rankingService.getNextRankTier(userActivePoints, rankTiers);

  // Vị trí của user trên bảng xếp hạng (chỉ tính role user)
  const userRankIndex = leaderboard.findIndex(
    item => item.id === user?.id || (user?.email && item.email.toLowerCase() === user.email.toLowerCase())
  );
  const userPosition = userRankIndex >= 0 ? userRankIndex + 1 : null;

  // Kiểm tra user đã thực sự có tiến trình học tập trên Firestore chưa
  const hasStarted = Boolean(
    userProgress && (
      userProgress.vocabLearned > 0 ||
      userProgress.kanjiLearned > 0 ||
      userProgress.grammarLearned > 0 ||
      userProgress.examsCompleted > 0 ||
      userProgress.currentMilestoneId
    )
  );

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      
      {/* =========================================================================
          1. BANNER CHÀO MỪNG - ĐỊNH HƯỚNG GIAO TIẾP & MÔI TRƯỜNG LÀM VIỆC CHUẨN NHẬT
          ========================================================================= */}
      <div 
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 55%, #065f46 100%)',
        }}
      >
        <div className="space-y-2.5 max-w-xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{user ? `Xin chào, ${user.fullName || user.username}!` : 'Chào mừng bạn đến với KIZUNA!'}</span>
            </span>
            <span className="bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-xs">
              <span>{currentRank.badge}</span>
              <span>Bậc: {currentRank.name}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Học Tiếng Nhật Thực Chiến & Chuẩn Tác Phong Làm Việc
          </h1>

          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
            Đồng hành cùng bạn từ con số 0 đến tự tin giao tiếp, phỏng vấn và làm việc chuẩn môi trường doanh nghiệp Nhật Bản.
          </p>
        </div>

        {!user ? (
          <button
            onClick={onOpenAuth}
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-white text-emerald-800 font-bold text-sm shadow-md hover:bg-emerald-50 active:scale-98 transition-all cursor-pointer whitespace-nowrap relative z-10"
          >
            Đăng nhập để lưu tiến độ 🚀
          </button>
        ) : (
          <div className="flex items-center gap-3 w-full md:w-auto justify-start relative z-10 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-[100px] bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-2xl text-center border border-white/20">
              <div className="text-xl sm:text-2xl font-black text-amber-300">🔥 {user.currentStreak || 0}</div>
              <div className="text-[11px] text-emerald-100 font-medium">Chuỗi Streak</div>
            </div>
            <div className="flex-1 min-w-[100px] bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-2xl text-center border border-white/20">
              <div className="text-xl sm:text-2xl font-black text-emerald-200">⭐ {user.activePoints || 0}</div>
              <div className="text-[11px] text-emerald-100 font-medium">Điểm Năng Động</div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. TIẾN ĐỘ HỌC TẬP THỰC TẾ CỦA USER (TỪ FIRESTORE - CHƯA HỌC THÌ HIỂN THỊ KHỞI ĐỘNG)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md shadow-emerald-950/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
              🎯 TIẾN ĐỘ HỌC TẬP THỰC TẾ
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {hasStarted 
                ? `Bạn đang học: ${userProgress?.currentMilestoneTitle || 'Mốc rèn luyện'}`
                : 'Bạn chưa bắt đầu bài học nào'
              }
            </h2>
            <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {hasStarted
                ? `${userProgress?.currentStageTitle || 'Chặng 1: Bảng Chữ Cái & Giao Tiếp Cơ Bản'} • ${userProgress?.currentMilestoneContext || 'Rèn luyện phản xạ'}`
                : 'Hãy bắt đầu từ Chặng 1 để làm quen bảng chữ cái, phát âm chuẩn và tích lũy những Điểm Năng Động đầu tiên!'
              }
            </div>
          </div>

          <button
            onClick={() => onNavigate('roadmap')}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto flex items-center justify-center gap-2"
          >
            <span>{hasStarted ? 'Tiếp tục bài học ngay' : 'Bắt đầu bài học đầu tiên'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Thanh tiến độ thực tế */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="text-slate-800">
              {hasStarted ? (userProgress?.currentStageTitle || 'Tiến độ hiện tại') : 'Khởi động hành trình (Chặng 1)'}
            </span>
            <span className="text-emerald-700">
              {hasStarted ? `${userProgress?.stageCompletionPercentage || 0}% hoàn thành` : '0% (Sẵn sàng bắt đầu)'}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${hasStarted ? Math.min(100, userProgress?.stageCompletionPercentage || 0) : 0}%` }}
            />
          </div>
        </div>

        {/* Thống kê tích lũy thực tế: Từ vựng, Kanji, Ngữ pháp, Luyện đề */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Từ vựng */}
          <div
            onClick={() => onNavigate('vocab')}
            className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl">📖</span>
              <span className="text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {userProgress?.vocabLearned || 0} từ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Từ vựng đã thuộc</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {userProgress?.vocabLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.vocabCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Kanji */}
          <div
            onClick={() => onNavigate('kanji')}
            className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl">🈸</span>
              <span className="text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {userProgress?.kanjiLearned || 0} chữ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Chữ Hán Kanji</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {userProgress?.kanjiLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.kanjiCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Ngữ pháp */}
          <div
            onClick={() => onNavigate('grammar')}
            className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl">📝</span>
              <span className="text-[10px] sm:text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                {userProgress?.grammarLearned || 0} mẫu
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Ngữ pháp thực dụng</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {userProgress?.grammarLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.grammarCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Bộ đề bổ trợ */}
          <div
            onClick={() => onNavigate('exam')}
            className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xl">🎯</span>
              <span className="text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {userProgress?.examsCompleted || 0} đề
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Đề luyện thi (Bổ trợ)</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {userProgress?.examsCompleted || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.examsCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. GIỚI THIỆU SƠ LƯỢC KHO TÀNG TRI THỨC KIZUNA (CÁC ĐIỂM HAY HO & CLICK CHUYỂN KHU VỰC)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
              ✨ KHÁM PHÁ KHO TÀNG TRI THỨC KIZUNA
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Hệ Thống Rèn Luyện Toàn Diện Cho Người Mới Bắt Đầu
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Bấm vào từng khu vực để bắt đầu học và nâng cao phản xạ tiếng Nhật tự nhiên chuẩn người bản xứ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Từ vựng */}
          <div 
            onClick={() => onNavigate('vocab')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-emerald-50 group-hover:scale-110 transition-transform">📖</span>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  {catalogStats.vocabCount.toLocaleString()}+ Từ
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Từ Vựng Giao Tiếp Thực Chiến</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tích hợp âm Hán Việt, phiên âm Hiragana, phát âm chuẩn Tokyo cùng ví dụ hội thoại trong đời sống và văn phòng tại Nhật.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span>Học qua Flashcard tương tác</span> ➔
            </div>
          </div>

          {/* Card 2: Ngữ pháp */}
          <div 
            onClick={() => onNavigate('grammar')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-teal-50 group-hover:scale-110 transition-transform">📝</span>
                <span className="text-[11px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                  {catalogStats.grammarCount.toLocaleString()}+ Mẫu
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Ngữ Pháp Ứng Dụng Chuẩn Mực</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Giải thích cặn kẽ sắc thái biểu đạt, kính ngữ Keigo, khiêm nhường ngữ và văn phong email, báo cáo công việc chuẩn người Nhật.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-teal-700 flex items-center gap-1">
              <span>Nắm vững cấu trúc câu</span> ➔
            </div>
          </div>

          {/* Card 3: Kanji */}
          <div 
            onClick={() => onNavigate('kanji')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-indigo-50 group-hover:scale-110 transition-transform">🈸</span>
                <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                  {catalogStats.kanjiCount.toLocaleString()}+ Chữ
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Chữ Hán Kanji Tư Duy Hình Ảnh</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Phương pháp nhớ chữ qua câu chuyện bộ thủ tượng hình, dễ dàng nhận diện từ ghép trong văn bản, hợp đồng và bảng biểu.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-indigo-700 flex items-center gap-1">
              <span>Khám phá mẹo nhớ chữ Hán</span> ➔
            </div>
          </div>

          {/* Card 4: Lộ trình */}
          <div 
            onClick={() => onNavigate('roadmap')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-amber-50 group-hover:scale-110 transition-transform">🗺️</span>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  4 Chặng • 28 Mốc
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Lộ Trình Từng Bước Từ Số 0</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đi từ bảng chữ cái, phát âm, hội thoại mua sắm đến kỹ năng phỏng vấn xin việc và nguyên tắc báo cáo Ho-Ren-So.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <span>Xem chi tiết các mốc học</span> ➔
            </div>
          </div>

          {/* Card 5: Thư viện văn hóa */}
          <div 
            onClick={() => onNavigate('library')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-purple-50 group-hover:scale-110 transition-transform">📚</span>
                <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                  Văn Hóa & Tác Phong
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Cẩm Nang Doanh Nghiệp Nhật Bản</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cẩm nang ứng xử văn hóa, nghi thức cúi chào Ojigi, tác phong làm việc giúp bạn tự tin hòa nhập môi trường công ty Nhật.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-purple-700 flex items-center gap-1">
              <span>Đọc cẩm nang doanh nghiệp</span> ➔
            </div>
          </div>

          {/* Card 6: Luyện thi JLPT (Chức năng phụ) */}
          <div 
            onClick={() => onNavigate('exam')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-xl bg-rose-50 group-hover:scale-110 transition-transform">🎯</span>
                <span className="text-[11px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                  {catalogStats.examsCount}+ Đề Thi Thử
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-rose-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Phòng Luyện Thi JLPT (Bổ Trợ)</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ngân hàng đề thi thử các cấp độ N5 - N1 kèm chấm điểm tự động và lời giải chi tiết, phục vụ khi bạn cần thi lấy chứng chỉ.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-rose-700 flex items-center gap-1">
              <span>Vào phòng thi thử tự do</span> ➔
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. BẢNG XẾP HẠNG HỌC VIÊN TÍCH CỰC (LEADERBOARD TỪ FIRESTORE - CHỈ ROLE USER)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>BẢNG XẾP HẠNG HỌC VIÊN TÍCH CỰC</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Vinh Danh Học Viên Theo Điểm Năng Động (Active Points)
            </h2>
            <p className="text-xs text-slate-500">
              Xếp hạng dựa trên nỗ lực học tập thực tế trên hệ thống. Chỉ người dùng học viên mới tham gia bảng xếp hạng.
            </p>
          </div>

          {user && (
            <div className="bg-emerald-50/80 border border-emerald-200/80 px-4 py-2 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <div className="text-[11px] text-slate-500 font-semibold">Thứ hạng của bạn</div>
                <div className="text-sm font-black text-emerald-800">
                  {userPosition ? `#${userPosition} / ${leaderboard.length} học viên` : 'Chưa xếp hạng'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {userPosition ? `#${userPosition}` : '—'}
              </div>
            </div>
          )}
        </div>

        {/* Thanh trạng thái thăng hạng của user */}
        {user && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-xl bg-white shadow-2xs border border-emerald-100">
                {currentRank.badge}
              </span>
              <div>
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span>Bậc hiện tại: {currentRank.name}</span>
                  <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-xs">
                    ⭐ {userActivePoints} pts
                  </span>
                </div>
                <div className="text-slate-600 mt-0.5">
                  {currentRank.description}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              {nextRankInfo.nextTier ? (
                <div className="bg-white/90 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
                  <div className="text-[11px] text-amber-900 font-bold">
                    Cần thêm <span className="text-amber-600 font-extrabold">{nextRankInfo.pointsNeeded.toLocaleString()}</span> pts
                  </div>
                  <div className="text-[10px] text-slate-500">
                    để thăng hạng {nextRankInfo.nextTier.badge} {nextRankInfo.nextTier.name}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-100/80 text-emerald-900 font-bold px-3 py-1.5 rounded-xl text-center">
                  👑 Bậc tối cao
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOP 3 PODIUM VINH DANH */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 pb-2 max-w-2xl mx-auto items-end">
            {/* Top 2 - Silver */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center">
              <div className="text-2xl mb-1">🥈</div>
              <img
                src={leaderboard[1].avatarUrl}
                alt={leaderboard[1].fullName}
                className="w-12 h-12 rounded-2xl object-cover bg-white border-2 border-slate-300 shadow-xs mb-1.5"
              />
              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate w-full">{leaderboard[1].fullName}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-center">
                <span>{leaderboard[1].rankTier.badge}</span>
                <span className="truncate">{leaderboard[1].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                ⭐ {leaderboard[1].activePoints}
              </div>
            </div>

            {/* Top 1 - Gold */}
            <div className="bg-gradient-to-b from-amber-50 to-yellow-50/50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 text-center flex flex-col items-center shadow-md shadow-amber-500/10 -translate-y-2">
              <div className="text-3xl mb-1 animate-bounce">👑</div>
              <img
                src={leaderboard[0].avatarUrl}
                alt={leaderboard[0].fullName}
                className="w-16 h-16 rounded-2xl object-cover bg-white border-2 border-amber-400 shadow-sm mb-1.5"
              />
              <div className="font-extrabold text-sm sm:text-base text-slate-900 truncate w-full">{leaderboard[0].fullName}</div>
              <div className="text-xs text-amber-800 font-bold flex items-center gap-1 justify-center">
                <span>{leaderboard[0].rankTier.badge}</span>
                <span className="truncate">{leaderboard[0].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs sm:text-sm font-black text-amber-950 bg-amber-300 px-3 py-0.5 rounded-full shadow-xs">
                ⭐ {leaderboard[0].activePoints} pts
              </div>
            </div>

            {/* Top 3 - Bronze */}
            <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center">
              <div className="text-2xl mb-1">🥉</div>
              <img
                src={leaderboard[2].avatarUrl}
                alt={leaderboard[2].fullName}
                className="w-12 h-12 rounded-2xl object-cover bg-white border-2 border-amber-300 shadow-xs mb-1.5"
              />
              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate w-full">{leaderboard[2].fullName}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-center">
                <span>{leaderboard[2].rankTier.badge}</span>
                <span className="truncate">{leaderboard[2].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs font-black text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                ⭐ {leaderboard[2].activePoints}
              </div>
            </div>
          </div>
        )}

        {/* DANH SÁCH HỌC VIÊN XẾP HẠNG */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
          {loadingLeaderboard ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Đang tải bảng xếp hạng từ Firestore...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Chưa có học viên nào tham gia bảng xếp hạng.
            </div>
          ) : (
            leaderboard.slice(0, 10).map((item) => {
              const isCurrentUser = user && (item.id === user.id || item.email.toLowerCase() === user.email.toLowerCase());
              return (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-3 sm:p-4 transition-colors ${
                    isCurrentUser 
                      ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' 
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-7 text-center font-black text-sm">
                      {item.position === 1 ? '🥇' : item.position === 2 ? '🥈' : item.position === 3 ? '🥉' : `#${item.position}`}
                    </div>
                    <img 
                      src={item.avatarUrl} 
                      alt={item.fullName} 
                      className="w-10 h-10 rounded-xl object-cover bg-emerald-50 border border-emerald-200 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                        <span>{item.fullName}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.2 rounded-full">
                          <span>{item.rankTier.badge}</span>
                          <span>{item.rankTier.name}</span>
                        </span>
                        <span>• 🔥 {item.currentStreak} ngày</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-emerald-700 text-sm sm:text-base">
                      ⭐ {item.activePoints.toLocaleString()} <span className="text-xs font-normal text-slate-400">pts</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {item.totalXp.toLocaleString()} XP
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
