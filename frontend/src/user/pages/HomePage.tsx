import React, { useEffect, useState } from 'react';
import { User } from '../types/auth';
import { UserNavTab } from '../components/UserNavbar';
import { progressService } from '../services/progressService';
import { rankingService } from '../services/rankingService';
import { kizunaService } from '../services/kizunaService';
import { UserProgressData } from '../types/progress';
import { RankTier, UserLeaderboardItem } from '../types/ranking';
import { 
  Flame, Award, BookOpen, ArrowRight, Trophy, Sparkles, 
  Target, Compass, Library, ChevronRight, Crown, 
  Medal, Languages, FileText, Zap, CheckCircle2
} from 'lucide-react';

interface HomePageProps {
  user: User | null;
  onNavigate: (tab: UserNavTab) => void;
  onOpenAuth?: () => void;
}

// Bảng ánh xạ danh xưng và ấn triện chữ Hán phong cách Nhật Bản cho từng bậc Rank
const RANK_KANJI_MAP: Record<string, { kanji: string; titleJp: string; accentColor: string; bgTone: string }> = {
  tier_tan_binh: { kanji: '初', titleJp: '入門・初心', accentColor: '#059669', bgTone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  tier_tap_su: { kanji: '修', titleJp: '修練・基礎', accentColor: '#0d9488', bgTone: 'bg-teal-50 text-teal-800 border-teal-200' },
  tier_giao_tiep: { kanji: '通', titleJp: '会話・実践', accentColor: '#0284c7', bgTone: 'bg-sky-50 text-sky-800 border-sky-200' },
  tier_cong_so: { kanji: '職', titleJp: '職場・実務', accentColor: '#d97706', bgTone: 'bg-amber-50 text-amber-900 border-amber-200' },
  tier_chuyen_nghiep: { kanji: '達', titleJp: '達人・熟達', accentColor: '#6366f1', bgTone: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  tier_ban_xu: { kanji: '極', titleJp: '極致・師範', accentColor: '#7c3aed', bgTone: 'bg-purple-50 text-purple-900 border-purple-200' },
};

function getRankMeta(tierId?: string) {
  if (tierId && RANK_KANJI_MAP[tierId]) {
    return RANK_KANJI_MAP[tierId];
  }
  return { kanji: '初', titleJp: '入門・初心', accentColor: '#059669', bgTone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
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
  const currentRankMeta = getRankMeta(currentRank.id);
  const nextRankInfo = rankingService.getNextRankTier(userActivePoints, rankTiers);
  const nextRankMeta = nextRankInfo.nextTier ? getRankMeta(nextRankInfo.nextTier.id) : null;

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
          1. BANNER CHÀO MỪNG - WA-MODERN (HOA VĂN SEIGAIHA, TRIỆN HANKO, PHONG CÁCH NHẬT)
          ========================================================================= */}
      <div 
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden bg-seigaiha-dark"
        style={{
          background: 'linear-gradient(135deg, #052e25 0%, #064e3b 45%, #0f5140 100%)',
        }}
      >
        {/* Họa tiết mờ thư pháp kanji 絆 làm watermark góc phải */}
        <div 
          className="absolute right-4 -bottom-6 text-white/[0.04] font-jp-serif text-[180px] sm:text-[220px] font-black select-none pointer-events-none leading-none z-0"
          aria-hidden="true"
        >
          絆
        </div>

        <div className="space-y-3 max-w-xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Triện đỏ Hanko Nhật Bản */}
            <span className="hanko-seal px-2.5 py-0.5 text-xs tracking-wider bg-rose-950/40 border-rose-400/90 text-rose-300">
              絆 KIZUNA
            </span>

            {/* Lời chào học viên */}
            <span className="bg-white/15 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{user ? `Xin chào, ${user.fullName || user.username}` : 'Chào mừng bạn đến với KIZUNA'}</span>
            </span>

            {/* Bậc Rank chuẩn phong cách Nhật */}
            <span className="bg-amber-400/95 text-amber-950 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
              <span className="w-4 h-4 rounded-full bg-amber-950 text-amber-300 font-jp-serif font-black text-[10px] flex items-center justify-center">
                {currentRankMeta.kanji}
              </span>
              <span>Bậc: {currentRank.name}</span>
            </span>
          </div>

          <div>
            <div className="text-[11px] font-bold text-emerald-200/80 uppercase tracking-widest font-jp-sans flex items-center gap-1.5 mb-1">
              <span>実践日本語とビジネスマナー</span>
              <span className="text-emerald-400/50">•</span>
              <span>日進月歩</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Học Tiếng Nhật Thực Chiến & Chuẩn Tác Phong Doanh Nghiệp
            </h1>
          </div>

          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
            Đồng hành cùng bạn từ con số 0 đến tự tin giao tiếp, phỏng vấn và làm việc chuẩn môi trường doanh nghiệp Nhật Bản.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 text-emerald-100 text-[11px] border border-white/10">
            <span className="font-jp-serif text-amber-300 font-bold">「千里の道も一歩から」</span>
            <span className="opacity-80">Hành trình vạn dặm khởi đầu từ một bước chân</span>
          </div>
        </div>

        {!user ? (
          <button
            onClick={onOpenAuth}
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-white text-emerald-900 font-bold text-sm shadow-md hover:bg-emerald-50 active:scale-98 transition-all cursor-pointer whitespace-nowrap relative z-10 flex items-center justify-center gap-2 group"
          >
            <span>Đăng nhập để lưu tiến độ</span>
            <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <div className="flex items-center gap-3 w-full md:w-auto justify-start relative z-10 flex-wrap sm:flex-nowrap">
            {/* Thẻ Chuỗi chuyên cần (Streak) - Bỏ emoji thô, dùng Lucide Flame sang trọng */}
            <div className="flex-1 min-w-[110px] bg-white/15 backdrop-blur-xs px-4 py-3 rounded-2xl text-center border border-white/20 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xl sm:text-2xl font-black text-amber-300">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span>{user.currentStreak || 0}</span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium mt-0.5">Chuỗi chuyên cần</div>
            </div>

            {/* Thẻ Điểm Năng Động (Active Points) - Dùng Lucide Zap tinh tế */}
            <div className="flex-1 min-w-[110px] bg-white/15 backdrop-blur-xs px-4 py-3 rounded-2xl text-center border border-white/20 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xl sm:text-2xl font-black text-emerald-200">
                <Zap className="w-5 h-5 text-emerald-300 fill-emerald-300" />
                <span>{user.activePoints || 0}</span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium mt-0.5">Điểm Năng Động</div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. TIẾN ĐỘ HỌC TẬP THỰC TẾ (HỆ THỐNG HUY HIỆU CHỮ HÁN MON & THẺ CHUẨN NHẬT)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md shadow-emerald-950/5 relative overflow-hidden bg-seigaiha-light">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="hanko-seal px-2 py-0.2 text-[11px]">
                進
              </span>
              <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-0.5 rounded-full text-xs font-bold font-jp-sans">
                学習の進捗 • TIẾN ĐỘ HỌC TẬP THỰC TẾ
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              {hasStarted 
                ? `Bạn đang học: ${userProgress?.currentMilestoneTitle || 'Mốc rèn luyện'}`
                : 'Khởi đầu hành trình học tập'
              }
            </h2>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">
              {hasStarted
                ? `${userProgress?.currentStageTitle || 'Chặng 1: Bảng Chữ Cái & Giao Tiếp Cơ Bản'} • ${userProgress?.currentMilestoneContext || 'Rèn luyện phản xạ'}`
                : 'Bắt đầu từ Chặng 1 để rèn luyện bảng chữ cái, phát âm chuẩn Tokyo và tích lũy những Điểm Năng Động đầu tiên.'
              }
            </div>
          </div>

          <button
            onClick={() => onNavigate('roadmap')}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto flex items-center justify-center gap-2 group"
          >
            <span>{hasStarted ? 'Tiếp tục bài học' : 'Bắt đầu bài học đầu tiên'}</span>
            <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Thanh tiến độ thực tế */}
        <div className="mb-6 relative z-10">
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{hasStarted ? (userProgress?.currentStageTitle || 'Tiến độ hiện tại') : 'Khởi động hành trình (Chặng 1)'}</span>
            </span>
            <span className="text-emerald-700 font-extrabold font-mono">
              {hasStarted ? `${userProgress?.stageCompletionPercentage || 0}% hoàn thành` : '0% (Sẵn sàng bắt đầu)'}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${hasStarted ? Math.min(100, userProgress?.stageCompletionPercentage || 0) : 0}%` }}
            />
          </div>
        </div>

        {/* 4 Thẻ thống kê tích lũy thực tế: BỎ TOÀN BỘ EMOJI XẤU (📖, 🈸, 📝, 🎯)
            Thay bằng Huy hiệu chữ Hán Mon (語, 漢, 文, 試) kết hợp Icon Lucide sang trọng */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          
          {/* 1. Từ vựng (語 - Kotoba) */}
          <div
            onClick={() => onNavigate('vocab')}
            className="bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-400 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                語
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.vocabLearned || 0} từ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Từ vựng đã thuộc</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {userProgress?.vocabLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.vocabCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 2. Chữ Hán Kanji (漢 - Kanji) - Đã bỏ hoàn toàn emoji 🈸 xấu */}
          <div
            onClick={() => onNavigate('kanji')}
            className="bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-800 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                漢
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.kanjiLearned || 0} chữ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chữ Hán Kanji</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {userProgress?.kanjiLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.kanjiCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 3. Ngữ pháp (文 - Bunpou) */}
          <div
            onClick={() => onNavigate('grammar')}
            className="bg-white hover:bg-teal-50/40 border border-slate-200 hover:border-teal-400 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                文
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.grammarLearned || 0} mẫu
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Ngữ pháp thực dụng</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {userProgress?.grammarLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.grammarCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 4. Bộ đề bổ trợ (試 - Shiken) */}
          <div
            onClick={() => onNavigate('exam')}
            className="bg-white hover:bg-amber-50/40 border border-slate-200 hover:border-amber-400 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                試
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.examsCompleted || 0} đề
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>Đề luyện thi (Bổ trợ)</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {userProgress?.examsCompleted || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.examsCount.toLocaleString()}</span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          3. KHÁM PHÁ KHO TÀNG TRI THỨC KIZUNA (6 THẺ HỌC PHONG CÁCH KARUTA NHẬT BẢN)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="hanko-seal px-2 py-0.2 text-[11px]">
              知
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-0.5 rounded-full text-xs font-bold font-jp-sans">
              知識の森 • KHÁM PHÁ KHO TÀNG TRI THỨC KIZUNA
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Hệ Thống Rèn Luyện Toàn Diện Cho Người Học Tiếng Nhật
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Bấm vào từng khu vực để bắt đầu học và nâng cao phản xạ tiếng Nhật tự nhiên chuẩn người bản xứ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          
          {/* Card 1: Từ vựng (語彙 - Kotoba) */}
          <div 
            onClick={() => onNavigate('vocab')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-emerald-50/20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-jp-serif font-black text-lg group-hover:scale-110 transition-transform">
                  語
                </div>
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-jp-sans">
                  語彙 • {catalogStats.vocabCount.toLocaleString()}+ Từ
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors text-base mb-1.5 flex items-center justify-between">
                <span>Từ Vựng Giao Tiếp Thực Chiến</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tích hợp âm Hán Việt, phiên âm Hiragana, phát âm chuẩn Tokyo cùng ngữ cảnh hội thoại sinh động trong đời sống và văn phòng tại Nhật.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 group-hover:text-emerald-800">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Học qua Flashcard tương tác</span>
            </div>
          </div>

          {/* Card 2: Ngữ pháp (文法 - Bunpou) */}
          <div 
            onClick={() => onNavigate('grammar')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-teal-50/20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-jp-serif font-black text-lg group-hover:scale-110 transition-transform">
                  文
                </div>
                <span className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-jp-sans">
                  文法 • {catalogStats.grammarCount.toLocaleString()}+ Mẫu
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
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-teal-700 flex items-center gap-1.5 group-hover:text-teal-800">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Nắm vững cấu trúc câu</span>
            </div>
          </div>

          {/* Card 3: Kanji (漢字 - Chữ Hán) - BỎ EMOJI 🈸 */}
          <div 
            onClick={() => onNavigate('kanji')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-indigo-50/20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-800 font-jp-serif font-black text-lg group-hover:scale-110 transition-transform">
                  漢
                </div>
                <span className="text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full font-jp-sans">
                  漢字 • {catalogStats.kanjiCount.toLocaleString()}+ Chữ
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
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-indigo-700 flex items-center gap-1.5 group-hover:text-indigo-800">
              <Languages className="w-3.5 h-3.5 text-indigo-600" />
              <span>Khám phá bí quyết nhớ chữ Hán</span>
            </div>
          </div>

          {/* Card 4: Lộ trình (道標 - Michishirube) - BỎ EMOJI 🗺️ */}
          <div 
            onClick={() => onNavigate('roadmap')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-amber-50/20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 font-jp-serif font-black text-lg group-hover:scale-110 transition-transform">
                  道
                </div>
                <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full font-jp-sans">
                  道標 • 4 Chặng 28 Mốc
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
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-amber-700 flex items-center gap-1.5 group-hover:text-amber-800">
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Xem chi tiết các mốc học</span>
            </div>
          </div>

          {/* Card 5: Thư viện văn hóa (礼法 - Reihou) - BỎ EMOJI 📚 */}
          <div 
            onClick={() => onNavigate('library')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-purple-50/20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-900 font-jp-serif font-black text-lg group-hover:scale-110 transition-transform">
                  礼
                </div>
                <span className="text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-full font-jp-sans">
                  礼法 • Tác phong Nhật
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
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-purple-700 flex items-center gap-1.5 group-hover:text-purple-800">
              <Library className="w-3.5 h-3.5 text-purple-600" />
              <span>Đọc cẩm nang doanh nghiệp</span>
            </div>
          </div>

          {/* Card 6: Luyện thi JLPT (試験 - Shiken) - BỎ EMOJI 🎯 */}
          <div 
            onClick={() => onNavigate('exam')}
            className="group p-5 rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-950/5 transition-all duration-300 cursor-pointer bg-gradient-to-b from-white to-rose-50/20 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-900 font-jp-serif font-black text-lg group-hover:scale-110 transition-transform">
                  試
                </div>
                <span className="text-[11px] font-bold bg-rose-50 text-rose-900 border border-rose-200 px-2.5 py-0.5 rounded-full font-jp-sans">
                  試験 • {catalogStats.examsCount}+ Đề thi
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
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-rose-700 flex items-center gap-1.5 group-hover:text-rose-800">
              <Target className="w-3.5 h-3.5 text-rose-600" />
              <span>Vào phòng thi thử tự do</span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          4. BẢNG XẾP HẠNG HỌC VIÊN TÍCH CỰC (順位表 - PODIUM NHẬT BẢN 壱 弐 参)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-md shadow-emerald-950/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="hanko-seal px-2 py-0.2 text-[11px]">
                誉
              </span>
              <span className="bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-0.5 rounded-full text-xs font-bold font-jp-sans flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>順位表 • BẢNG XẾP HẠNG HỌC VIÊN TÍCH CỰC</span>
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
                <div className="text-sm font-black text-emerald-800 font-jp-sans">
                  {userPosition ? `#${userPosition} / ${leaderboard.length} học viên` : 'Chưa xếp hạng'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-sm font-jp-serif">
                {userPosition ? `${userPosition}位` : '—'}
              </div>
            </div>
          )}
        </div>

        {/* Thanh trạng thái thăng hạng của user */}
        {user && (
          <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-emerald-200 flex items-center justify-center text-emerald-900 font-jp-serif font-black text-lg">
                {currentRankMeta.kanji}
              </span>
              <div>
                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span>Bậc hiện tại: {currentRank.name}</span>
                  <span className="text-emerald-800 font-bold bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 text-xs flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>{userActivePoints.toLocaleString()} pts</span>
                  </span>
                </div>
                <div className="text-slate-600 mt-0.5">
                  {currentRank.description}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              {nextRankInfo.nextTier ? (
                <div className="bg-white/95 border border-amber-200 px-3.5 py-1.5 rounded-xl text-center shadow-2xs">
                  <div className="text-[11px] text-amber-950 font-bold">
                    Cần thêm <span className="text-amber-700 font-extrabold">{nextRankInfo.pointsNeeded.toLocaleString()}</span> pts
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-center gap-1 font-jp-sans">
                    <span>để thăng hạng:</span>
                    <span className="font-bold text-slate-800">{nextRankInfo.nextTier.name}</span>
                    {nextRankMeta && (
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                        {nextRankMeta.kanji}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-100/90 text-emerald-950 font-bold px-3.5 py-1.5 rounded-xl text-center border border-emerald-200">
                  <span className="font-jp-serif font-extrabold mr-1">極</span> Bậc tối cao
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOP 3 PODIUM VINH DANH PHONG CÁCH NHẬT BẢN:
            - Loại bỏ emoji vương miện lắc lư animate-bounce 👑
            - Loại bỏ emoji huy chương 🥈 🥉
            - Sử dụng ấn triện Hán tự truyền thống 壱 (Top 1), 弐 (Top 2), 参 (Top 3) */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 pb-2 max-w-2xl mx-auto items-end">
            
            {/* Top 2 - Á Quân (弐 - Dai-ni) */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200/80 border border-slate-300 text-slate-700 font-jp-serif font-black text-sm flex items-center justify-center mb-1.5 shadow-2xs">
                弐
              </div>
              <img
                src={leaderboard[1].avatarUrl}
                alt={leaderboard[1].fullName}
                className="w-12 h-12 rounded-2xl object-cover bg-white border-2 border-slate-300 shadow-xs mb-1.5"
              />
              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate w-full">{leaderboard[1].fullName}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-center mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-800 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                  {getRankMeta(leaderboard[1].rankTier.id).kanji}
                </span>
                <span className="truncate">{leaderboard[1].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs font-black text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{leaderboard[1].activePoints.toLocaleString()}</span>
              </div>
            </div>

            {/* Top 1 - Quán Quân (壱 - Dai-ichi) - Dát vàng Yamabuki Nhật Bản, BỎ BOUNCE */}
            <div className="bg-gradient-to-b from-amber-50/90 to-yellow-50/40 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 text-center flex flex-col items-center shadow-md shadow-amber-500/10 -translate-y-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-950 font-jp-serif font-black text-base flex items-center justify-center mb-1.5 shadow-xs border border-amber-400">
                壱
              </div>
              <div className="relative mb-1.5">
                <img
                  src={leaderboard[0].avatarUrl}
                  alt={leaderboard[0].fullName}
                  className="w-16 h-16 rounded-2xl object-cover bg-white border-2 border-amber-400 shadow-sm"
                />
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                  <Crown className="w-3.5 h-3.5 fill-amber-950" />
                </div>
              </div>
              <div className="font-extrabold text-sm sm:text-base text-slate-900 truncate w-full">{leaderboard[0].fullName}</div>
              <div className="text-xs text-amber-800 font-bold flex items-center gap-1 justify-center mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-200 text-amber-900 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                  {getRankMeta(leaderboard[0].rankTier.id).kanji}
                </span>
                <span className="truncate">{leaderboard[0].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs sm:text-sm font-black text-amber-950 bg-amber-300/90 px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-amber-400/60">
                <Zap className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
                <span>{leaderboard[0].activePoints.toLocaleString()} pts</span>
              </div>
            </div>

            {/* Top 3 - Quý Quân (参 - Dai-san) */}
            <div className="bg-amber-50/30 border border-amber-200/70 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-jp-serif font-black text-sm flex items-center justify-center mb-1.5 shadow-2xs">
                参
              </div>
              <img
                src={leaderboard[2].avatarUrl}
                alt={leaderboard[2].fullName}
                className="w-12 h-12 rounded-2xl object-cover bg-white border-2 border-amber-300/80 shadow-xs mb-1.5"
              />
              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate w-full">{leaderboard[2].fullName}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-center mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                  {getRankMeta(leaderboard[2].rankTier.id).kanji}
                </span>
                <span className="truncate">{leaderboard[2].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{leaderboard[2].activePoints.toLocaleString()}</span>
              </div>
            </div>

          </div>
        )}

        {/* DANH SÁCH HỌC VIÊN XẾP HẠNG (THAY THẾ EMOJI BẰNG THẺ THỨ HẠNG NHẬT BẢN) */}
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
              const rankMeta = getRankMeta(item.rankTier.id);

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
                    {/* Thẻ thứ hạng chuẩn phong cách Nhật (1位, 2位, 3位...) */}
                    <div className="w-9 text-center font-jp-serif font-black text-sm shrink-0">
                      {item.position === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 text-xs font-bold shadow-2xs">
                          壱
                        </span>
                      ) : item.position === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 text-xs font-bold shadow-2xs">
                          弐
                        </span>
                      ) : item.position === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 text-xs font-bold shadow-2xs">
                          参
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">
                          {item.position}位
                        </span>
                      )}
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
                          <span className="text-[10px] bg-emerald-700 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.2 rounded-full">
                          <span className="font-jp-serif font-bold text-[10px]">{rankMeta.kanji}</span>
                          <span>{item.rankTier.name}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{item.currentStreak} ngày</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-emerald-800 text-sm sm:text-base flex items-center justify-end gap-1 font-mono">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{item.activePoints.toLocaleString()}</span>
                      <span className="text-xs font-normal text-slate-400">pts</span>
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
