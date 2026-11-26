import React, { useEffect, useState, useMemo } from 'react';
import { User } from '../types/auth';
import { UserNavTab } from '../components/UserNavbar';
import { progressService, UserRoadmapProgress } from '../services/progressService';
import { rankingService } from '../services/rankingService';
import { kizunaService } from '../services/kizunaService';
import {
  dailyQuestService,
  DailyQuestBundle,
  DailyQuestItem,
  DAILY_BONUS_POINTS,
  DAILY_BONUS_XP,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_COST,
  getCurrentIsoWeekKey,
  getDaysRemainingInWeek
} from '../services/dailyQuestService';
import { UserProgressData } from '../types/progress';
import { RankTier, UserLeaderboardItem, LeaderboardMode } from '../types/ranking';
import { STAGES_CATALOG, MILESTONES_CATALOG } from '../data/roadmapCatalog';
import { 
  Flame, Award, BookOpen, ArrowRight, Trophy, Sparkles, 
  Target, Crown, Languages, FileText, Zap, CheckCircle2,
  Shield, Gift, X, Check, AlertCircle, RotateCcw
} from 'lucide-react';

interface HomePageProps {
  user: User | null;
  onNavigate: (tab: UserNavTab) => void;
  onOpenAuth?: () => void;
  onOpenPlacement?: () => void;
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
  const [roadmapProgress, setRoadmapProgress] = useState<UserRoadmapProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Tải tiến độ lộ trình chi tiết
  useEffect(() => {
    if (!user?.id) return;
    progressService.getUserRoadmapProgress(user.id).then(r => setRoadmapProgress(r));
  }, [user?.id]);

  // Dữ liệu bảng xếp hạng và mốc rank từ Firestore
  const [rankTiers, setRankTiers] = useState<RankTier[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserLeaderboardItem[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>('weekly');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Dữ liệu Nhiệm Vụ Ngày (AI Daily Quest) & Khiên Bảo Vệ Streak
  const [dailyQuestBundle, setDailyQuestBundle] = useState<DailyQuestBundle | null>(null);
  const [loadingDailyQuests, setLoadingDailyQuests] = useState(false);
  const [activeDailyQuest, setActiveDailyQuest] = useState<DailyQuestItem | null>(null);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [questAnswerChecked, setQuestAnswerChecked] = useState(false);
  const [questRewardNotice, setQuestRewardNotice] = useState<string | null>(null);
  const [shieldNotice, setShieldNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [buyingShield, setBuyingShield] = useState(false);

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
  const loadLeaderboardData = async (mode: LeaderboardMode = leaderboardMode) => {
    setLoadingLeaderboard(true);
    try {
      const tiers = rankTiers.length > 0 ? rankTiers : await rankingService.getRankTiers();
      if (rankTiers.length === 0) setRankTiers(tiers);
      const lb = await rankingService.getLearnerLeaderboard(tiers, mode);
      setLeaderboard(lb);
    } catch (e) {
      console.warn('Lỗi tải bảng xếp hạng:', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData(leaderboardMode);
  }, [leaderboardMode]);

  // Nạp hoặc sinh 3 Nhiệm Vụ Ngày bằng AI Gemini từ user_progress
  useEffect(() => {
    if (!user?.id || loadingProgress) return;
    let cancelled = false;
    setLoadingDailyQuests(true);
    dailyQuestService
      .getOrGenerateDailyQuests(
        user,
        userProgress,
        currentRoadmapTarget.stageTitleClean,
        currentRoadmapTarget.milestoneTitleClean,
        roadmapProgress?.completedMilestones?.length || 0
      )
      .then(bundle => {
        if (!cancelled) setDailyQuestBundle(bundle);
      })
      .finally(() => {
        if (!cancelled) setLoadingDailyQuests(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.level, loadingProgress]);

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

  // Tính bậc rank hiện tại và mốc thăng hạng tiếp theo của user (dựa trên XP tích lũy để không bị rớt hạng khi tiêu activePoints)
  const userActivePoints = user?.activePoints ?? 0;
  const userTotalXp = user?.totalXp ?? 0;
  const currentWeekKey = getCurrentIsoWeekKey(new Date());
  const daysRemainingInWeek = getDaysRemainingInWeek(new Date());
  const userWeeklyPoints = user?.weeklyPointsWeek === currentWeekKey ? (user?.weeklyActivePoints ?? 0) : 0;
  const rankScoreBaseline = userTotalXp > 0 ? Math.max(userActivePoints, Math.floor(userTotalXp / 2)) : userActivePoints;
  const currentRank = rankingService.calculateRank(rankScoreBaseline, rankTiers);
  const currentRankMeta = getRankMeta(currentRank.id);
  const nextRankInfo = rankingService.getNextRankTier(rankScoreBaseline, rankTiers);
  const nextRankMeta = nextRankInfo.nextTier ? getRankMeta(nextRankInfo.nextTier.id) : null;

  const handleOpenDailyQuest = (quest: DailyQuestItem) => {
    setActiveDailyQuest(quest);
    setSelectedOptionIdx(null);
    setQuestAnswerChecked(false);
    setQuestRewardNotice(null);
  };

  const handleSubmitDailyQuestAnswer = async () => {
    if (!activeDailyQuest || selectedOptionIdx === null || !dailyQuestBundle || !user?.id) return;
    setQuestAnswerChecked(true);
    if (selectedOptionIdx === activeDailyQuest.correctIndex && !activeDailyQuest.completed) {
      const res = await dailyQuestService.completeDailyQuest(user.id, dailyQuestBundle, activeDailyQuest.id);
      setDailyQuestBundle(res.updatedBundle);
      const updatedItem = res.updatedBundle.quests.find(q => q.id === activeDailyQuest.id) || {
        ...activeDailyQuest,
        completed: true
      };
      setActiveDailyQuest(updatedItem);
      setQuestRewardNotice(
        res.bonusJustAwarded
          ? `🎉 Hoàn thành cả 3/3 nhiệm vụ ngày! Nhận +${res.pointsAwarded} Điểm năng động & +${res.xpAwarded} XP (đã gồm Rương thưởng)!`
          : `Chính xác! Bạn nhận được +${res.pointsAwarded} Điểm năng động & +${res.xpAwarded} XP.`
      );
      loadLeaderboardData(leaderboardMode);
    }
  };

  const handleBuyStreakFreeze = async () => {
    if (!user?.id || buyingShield) return;
    setBuyingShield(true);
    setShieldNotice(null);
    try {
      const res = await dailyQuestService.buyStreakFreeze(user.id);
      setShieldNotice({ ok: res.ok, text: res.message });
      setTimeout(() => setShieldNotice(null), 5000);
    } finally {
      setBuyingShield(false);
    }
  };

  // Vị trí của user trên bảng xếp hạng (chỉ tính role user)
  const userRankIndex = leaderboard.findIndex(
    item => item.id === user?.id || (user?.email && item.email.toLowerCase() === user.email.toLowerCase())
  );
  const userPosition = userRankIndex >= 0 ? userRankIndex + 1 : null;

  // Tính toán chính xác vị trí bài học trên Lộ Trình (Cấp độ N mấy, Chặng mấy, Bài mấy)
  const currentRoadmapTarget = useMemo(() => {
    const completed = roadmapProgress?.completedMilestones || [];
    const userLvl = (user?.level && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(user.level)) ? user.level : 'N5';

    const levelStages = STAGES_CATALOG
      .filter(s => (s.jlptLevel || (s as any).jlpt_level || 'N5').toUpperCase() === userLvl.toUpperCase())
      .sort((a, b) => ((a.orderIndex ?? (a as any).order_index ?? 0) - (b.orderIndex ?? (b as any).order_index ?? 0)));
    const levelStageIds = levelStages.map(s => s.id);
    const levelMilestones = MILESTONES_CATALOG
      .filter(m => levelStageIds.includes(m.stageId || (m as any).stage_id))
      .sort((a, b) => ((a.orderIndex ?? (a as any).order_index ?? 0) - (b.orderIndex ?? (b as any).order_index ?? 0)));

    const nextMilestone = levelMilestones.find(m => !completed.includes(m.id)) || levelMilestones[0];
    const currentStage = levelStages.find(s => s.id === (nextMilestone?.stageId || (nextMilestone as any)?.stage_id)) || levelStages[0];

    const stageMilestones = levelMilestones.filter(m => (m.stageId || (m as any).stage_id) === currentStage?.id);
    const completedInStage = stageMilestones.filter(m => completed.includes(m.id)).length;
    const stagePercent = stageMilestones.length > 0 ? Math.round((completedInStage / stageMilestones.length) * 100) : 0;

    const completedInLevel = levelMilestones.filter(m => completed.includes(m.id)).length;
    const levelPercent = levelMilestones.length > 0 ? Math.round((completedInLevel / levelMilestones.length) * 100) : 0;

    const cleanTitle = (currentStage?.title || '')
      .replace(/^\[N\d\]\s*/i, '')
      .replace(/^Chặng\s*\d+\s*[—–-]\s*/i, '')
      .trim();

    const cleanMilestoneTitle = (nextMilestone?.title || '')
      .replace(/^\[N\d\]\s*/i, '')
      .replace(/^Bài\s*\d+\s*[:—–-]\s*/i, '')
      .trim();

    return {
      level: userLvl,
      stage: currentStage,
      stageTitleClean: cleanTitle,
      milestone: nextMilestone,
      milestoneTitleClean: cleanMilestoneTitle,
      completedInStage,
      totalInStage: stageMilestones.length || 5,
      stagePercent,
      completedInLevel,
      totalInLevel: levelMilestones.length || 30,
      levelPercent,
      hasStarted: completed.length > 0
    };
  }, [roadmapProgress, user?.level]);

  // Kiểm tra user đã thực sự có tiến trình học tập trên Firestore chưa
  const hasStarted = Boolean(
    userProgress && (
      userProgress.vocabLearned > 0 ||
      userProgress.kanjiLearned > 0 ||
      userProgress.grammarLearned > 0 ||
      userProgress.examsCompleted > 0 ||
      userProgress.currentMilestoneId ||
      currentRoadmapTarget.hasStarted
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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Học Tiếng Nhật KIZUNA
            </h1>
            <p className="text-emerald-200 text-xs sm:text-sm mt-1 font-medium">
              Giao tiếp thực chiến & Luyện thi JLPT
            </p>
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
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-start relative z-10 flex-wrap sm:flex-nowrap">
            {/* Thẻ Chuỗi chuyên cần (Streak + Khiên bảo vệ) */}
            <div className="flex-1 min-w-[105px] bg-white/15 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl text-center border border-white/20 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xl sm:text-2xl font-black text-amber-300">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span>{user.currentStreak || 0}</span>
                {(user.streakFreezes || 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-sky-500/30 border border-sky-300/40 text-sky-100 px-1.5 py-0.5 rounded-full">
                    <Shield className="w-3 h-3 text-sky-200" />
                    {user.streakFreezes}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-emerald-100 font-medium mt-0.5">Chuỗi chuyên cần</div>
            </div>

            {/* Thẻ Ví Điểm Năng Động (Active Points) */}
            <div className="flex-1 min-w-[105px] bg-white/15 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl text-center border border-white/20 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xl sm:text-2xl font-black text-emerald-200">
                <Zap className="w-5 h-5 text-emerald-300 fill-emerald-300" />
                <span>{user.activePoints || 0}</span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium mt-0.5">Điểm Năng Động</div>
            </div>

            {/* Thẻ Kinh Nghiệm Tích Lũy (XP) */}
            <div className="flex-1 min-w-[105px] bg-white/15 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl text-center border border-white/20 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-xl sm:text-2xl font-black text-indigo-200">
                <Award className="w-5 h-5 text-indigo-300" />
                <span>{(user.totalXp || 0).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium mt-0.5">Kinh Nghiệm XP</div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          1.5. NHIỆM VỤ NGÀY CÙNG AI SENSEI & KHIÊN BẢO VỆ STREAK
          ========================================================================= */}
      {user && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-slate-800 shadow-md shadow-emerald-950/5 space-y-5 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="hanko-seal px-2 py-0.2 text-[11px]">挑</span>
                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>NHIỆM VỤ NGÀY • AI SENSEI</span>
                </span>
                {dailyQuestBundle && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {dailyQuestBundle.level} • {dailyQuestBundle.weakFocus}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Thử Thách Hằng Ngày Theo Tiến Độ
              </h2>
            </div>

            {/* Rương Thưởng 3/3 + Tiến độ */}
            {dailyQuestBundle && (
              <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 self-start md:self-auto ${
                dailyQuestBundle.bonusClaimed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
              }`}>
                <Gift className={`w-5 h-5 shrink-0 ${dailyQuestBundle.bonusClaimed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Hoàn thành {dailyQuestBundle.quests.filter(q => q.completed).length}/3 nhiệm vụ
                  </div>
                  <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    {dailyQuestBundle.bonusClaimed
                      ? 'Đã nhận Rương thưởng ngày!'
                      : `Xong 3/3: +${DAILY_BONUS_POINTS} pts & +${DAILY_BONUS_XP} XP`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {loadingDailyQuests ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200 dark:border-slate-800" />
              ))}
            </div>
          ) : dailyQuestBundle ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {dailyQuestBundle.quests.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-all ${
                    q.completed
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                      : 'bg-slate-50/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {q.categoryLabel}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                        {q.difficultyLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                      {q.title}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                        <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />+{q.pointsReward} pts
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5">
                        <Award className="w-3.5 h-3.5" />+{q.xpReward} XP
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDailyQuest(q)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        q.completed
                          ? 'bg-emerald-600/15 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                      }`}
                    >
                      {q.completed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã hoàn thành • Xem lại</span>
                        </>
                      ) : (
                        <>
                          <span>Thử thách ngay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Thanh đổi Điểm Năng Động lấy Khiên Bảo Vệ Streak */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-sky-50 via-emerald-50/60 to-amber-50/50 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80 border border-sky-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Khiên Bảo Vệ Streak</span>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Đang có: {user.streakFreezes || 0}/{MAX_STREAK_FREEZES} khiên
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Tự động tiêu 1 khiên để giữ nguyên chuỗi ngày học nếu bạn lỡ nghỉ 1 ngày. Đổi bằng Điểm năng động (không trừ XP).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyStreakFreeze}
              disabled={buyingShield || (user.streakFreezes || 0) >= MAX_STREAK_FREEZES || (user.activePoints || 0) < STREAK_FREEZE_COST}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>
                {(user.streakFreezes || 0) >= MAX_STREAK_FREEZES
                  ? 'Đã tối đa (2/2)'
                  : `Đổi 1 Khiên (${STREAK_FREEZE_COST} pts)`}
              </span>
            </button>
          </div>

          {shieldNotice && (
            <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              shieldNotice.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}>
              {shieldNotice.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{shieldNotice.text}</span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          2. TIẾN ĐỘ HỌC TẬP THỰC TẾ (LỘ TRÌNH MINH BẠCH THEO CẤP ĐỘ, CHẶNG & BÀI HỌC)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-slate-800 shadow-md shadow-emerald-950/5 relative overflow-hidden bg-seigaiha-light transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                JLPT {currentRoadmapTarget.level}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Chặng {currentRoadmapTarget.stage?.orderIndex || 1} • {currentRoadmapTarget.stage?.range || 'Bài học'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {currentRoadmapTarget.stageTitleClean || 'Lộ trình tiếng Nhật thực chiến'}
            </h2>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1 flex items-center gap-1.5">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">Đang học:</span>
              <span>
                {currentRoadmapTarget.milestone?.nejUnit
                  ? `${currentRoadmapTarget.milestone.nejUnit} — ${currentRoadmapTarget.milestoneTitleClean || currentRoadmapTarget.milestone.title}`
                  : (currentRoadmapTarget.milestoneTitleClean || currentRoadmapTarget.milestone?.title || 'Bắt đầu học')}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('roadmap')}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto flex items-center justify-center gap-2 group"
          >
            <span>{currentRoadmapTarget.hasStarted ? 'Tiếp tục học' : 'Bắt đầu học ngay'}</span>
            <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Thanh tiến độ Chặng rõ ràng minh bạch */}
        <div className="mb-6 relative z-10 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs font-bold mb-2 flex-wrap gap-1">
            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tiến độ Chặng {currentRoadmapTarget.stage?.orderIndex || 1}: {currentRoadmapTarget.completedInStage}/{currentRoadmapTarget.totalInStage} bài ({currentRoadmapTarget.stagePercent}%)</span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold font-mono text-[11px]">
              {currentRoadmapTarget.completedInLevel}/{currentRoadmapTarget.totalInLevel} mốc {currentRoadmapTarget.level} ({currentRoadmapTarget.levelPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${currentRoadmapTarget.stagePercent}%` }}
            />
          </div>
        </div>

        {/* 4 Thẻ thống kê tích lũy thực tế */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          
          {/* 1. Từ vựng (語 - Kotoba) */}
          <div
            onClick={() => onNavigate('vocab')}
            className="bg-white dark:bg-slate-800/90 hover:bg-emerald-50/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                語
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.vocabLearned || 0} từ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Từ vựng đã thuộc</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {userProgress?.vocabLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.vocabCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 2. Chữ Hán Kanji (漢 - Kanji) */}
          <div
            onClick={() => onNavigate('kanji')}
            className="bg-white dark:bg-slate-800/90 hover:bg-indigo-50/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-800 dark:text-indigo-300 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                漢
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.kanjiLearned || 0} chữ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Chữ Hán Kanji</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {userProgress?.kanjiLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.kanjiCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 3. Ngữ pháp (文 - Bunpou) */}
          <div
            onClick={() => onNavigate('grammar')}
            className="bg-white dark:bg-slate-800/90 hover:bg-teal-50/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                文
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.grammarLearned || 0} mẫu
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Ngữ pháp thực dụng</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {userProgress?.grammarLearned || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.grammarCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 4. Bộ đề bổ trợ (試 - Shiken) */}
          <div
            onClick={() => onNavigate('exam')}
            className="bg-white dark:bg-slate-800/90 hover:bg-amber-50/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl p-4 cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-900 dark:text-amber-300 font-jp-serif font-black text-base group-hover:scale-105 transition-transform">
                試
              </div>
              <span className="text-[10px] sm:text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-jp-sans">
                {userProgress?.examsCompleted || 0} đề
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Đề luyện thi (Bổ trợ)</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {userProgress?.examsCompleted || 0}{' '}
              <span className="text-[11px] font-medium text-slate-400">/ {catalogStats.examsCount.toLocaleString()}</span>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          3. BẢNG XẾP HẠNG HỌC VIÊN TÍCH CỰC (順位表 - PODIUM NHẬT BẢN 壱 弐 参)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-slate-800 shadow-md shadow-emerald-950/5 space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="hanko-seal px-2 py-0.2 text-[11px]">
                誉
              </span>
              <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 px-3 py-0.5 rounded-full text-xs font-bold font-jp-sans flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>
                  {leaderboardMode === 'weekly'
                    ? `BXH TUẦN ${currentWeekKey} • CÒN ${daysRemainingInWeek} NGÀY`
                    : '順位表 • BẢNG XẾP HẠNG TÍCH LŨY (XP)'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Bảng Xếp Hạng
              </h2>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setLeaderboardMode('weekly')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    leaderboardMode === 'weekly'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700'
                  }`}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardMode('all_time')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    leaderboardMode === 'all_time'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                  }`}
                >
                  Tích lũy XP
                </button>
              </div>
            </div>
          </div>

          {user && (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 px-4 py-2 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  {leaderboardMode === 'weekly' ? `Tuần này: ${userWeeklyPoints} pts` : 'Thứ hạng tích lũy'}
                </div>
                <div className="text-sm font-black text-emerald-800 dark:text-emerald-300 font-jp-sans">
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
          <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-2xs border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-900 dark:text-emerald-300 font-jp-serif font-black text-lg">
                {currentRankMeta.kanji}
              </span>
              <div>
                <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>Bậc hiện tại: {currentRank.name}</span>
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>{userActivePoints.toLocaleString()} pts</span>
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                  {currentRank.description}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              {nextRankInfo.nextTier ? (
                <div className="bg-white/95 dark:bg-slate-900/95 border border-amber-200 dark:border-amber-800/60 px-3.5 py-1.5 rounded-xl text-center shadow-2xs">
                  <div className="text-[11px] text-amber-950 dark:text-amber-300 font-bold">
                    Cần thêm <span className="text-amber-700 dark:text-amber-400 font-extrabold">{nextRankInfo.pointsNeeded.toLocaleString()}</span> pts
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1 font-jp-sans">
                    <span>để thăng hạng:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{nextRankInfo.nextTier.name}</span>
                    {nextRankMeta && (
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                        {nextRankMeta.kanji}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-bold px-3.5 py-1.5 rounded-xl text-center border border-emerald-200 dark:border-emerald-800">
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
            <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-jp-serif font-black text-sm flex items-center justify-center mb-1.5 shadow-2xs">
                弐
              </div>
              <img
                src={leaderboard[1].avatarUrl}
                alt={leaderboard[1].fullName}
                className="w-12 h-12 rounded-2xl object-cover bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-xs mb-1.5"
              />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate w-full">{leaderboard[1].fullName}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-center mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                  {getRankMeta(leaderboard[1].rankTier.id).kanji}
                </span>
                <span className="truncate">{leaderboard[1].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>
                  {leaderboardMode === 'weekly'
                    ? `${leaderboard[1].weeklyActivePoints.toLocaleString()} pts`
                    : `${leaderboard[1].totalXp.toLocaleString()} XP`}
                </span>
              </div>
            </div>

            {/* Top 1 - Quán Quân (壱 - Dai-ichi) - Dát vàng Yamabuki Nhật Bản, BỎ BOUNCE */}
            <div className="bg-gradient-to-b from-amber-50/90 to-yellow-50/40 dark:from-amber-950/40 dark:to-yellow-950/20 border-2 border-amber-300 dark:border-amber-600/60 rounded-3xl p-4 sm:p-5 text-center flex flex-col items-center shadow-md shadow-amber-500/10 -translate-y-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-950 font-jp-serif font-black text-base flex items-center justify-center mb-1.5 shadow-xs border border-amber-400">
                壱
              </div>
              <div className="relative mb-1.5">
                <img
                  src={leaderboard[0].avatarUrl}
                  alt={leaderboard[0].fullName}
                  className="w-16 h-16 rounded-2xl object-cover bg-white dark:bg-slate-800 border-2 border-amber-400 shadow-sm"
                />
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                  <Crown className="w-3.5 h-3.5 fill-amber-950" />
                </div>
              </div>
              <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate w-full">{leaderboard[0].fullName}</div>
              <div className="text-xs text-amber-800 dark:text-amber-400 font-bold flex items-center gap-1 justify-center mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                  {getRankMeta(leaderboard[0].rankTier.id).kanji}
                </span>
                <span className="truncate">{leaderboard[0].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs sm:text-sm font-black text-amber-950 bg-amber-300/90 px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-amber-400/60">
                <Zap className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
                <span>
                  {leaderboardMode === 'weekly'
                    ? `${leaderboard[0].weeklyActivePoints.toLocaleString()} pts`
                    : `${leaderboard[0].totalXp.toLocaleString()} XP`}
                </span>
              </div>
            </div>

            {/* Top 3 - Quý Quân (参 - Dai-san) */}
            <div className="bg-amber-50/30 dark:bg-slate-900/40 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-jp-serif font-black text-sm flex items-center justify-center mb-1.5 shadow-2xs">
                参
              </div>
              <img
                src={leaderboard[2].avatarUrl}
                alt={leaderboard[2].fullName}
                className="w-12 h-12 rounded-2xl object-cover bg-white dark:bg-slate-800 border-2 border-amber-300/80 dark:border-amber-800 shadow-xs mb-1.5"
              />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate w-full">{leaderboard[2].fullName}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-center mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[9px] font-jp-serif font-bold inline-flex items-center justify-center">
                  {getRankMeta(leaderboard[2].rankTier.id).kanji}
                </span>
                <span className="truncate">{leaderboard[2].rankTier.name}</span>
              </div>
              <div className="mt-2 text-xs font-black text-amber-900 dark:text-amber-400 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>
                  {leaderboardMode === 'weekly'
                    ? `${leaderboard[2].weeklyActivePoints.toLocaleString()} pts`
                    : `${leaderboard[2].totalXp.toLocaleString()} XP`}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* DANH SÁCH HỌC VIÊN XẾP HẠNG (THAY THẾ EMOJI BẰNG THẺ THỨ HẠNG NHẬT BẢN) */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90">
          {loadingLeaderboard ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
              Đang tải bảng xếp hạng từ Firestore...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
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
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600' 
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'
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
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs font-bold shadow-2xs">
                          弐
                        </span>
                      ) : item.position === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-bold shadow-2xs">
                          参
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">
                          {item.position}位
                        </span>
                      )}
                    </div>

                    <img 
                      src={item.avatarUrl} 
                      alt={item.fullName} 
                      className="w-10 h-10 rounded-xl object-cover bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 shrink-0" 
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate flex items-center gap-2">
                        <span>{item.fullName}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-emerald-700 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 px-2 py-0.2 rounded-full">
                          <span className="font-jp-serif font-bold text-[10px]">{rankMeta.kanji}</span>
                          <span>{item.rankTier.name}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{item.currentStreak} ngày</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-emerald-800 dark:text-emerald-400 text-sm sm:text-base flex items-center justify-end gap-1 font-mono">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>
                        {leaderboardMode === 'weekly'
                          ? item.weeklyActivePoints.toLocaleString()
                          : item.totalXp.toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-slate-400">
                        {leaderboardMode === 'weekly' ? 'pts tuần' : 'XP'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {leaderboardMode === 'weekly'
                        ? `${item.totalXp.toLocaleString()} XP tổng`
                        : `${item.activePoints.toLocaleString()} pts khả dụng`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          4. MODAL LÀM NHIỆM VỤ NGÀY (DAILY QUEST CHALLENGE RUNNER)
          ========================================================================= */}
      {activeDailyQuest && (
        <div className="fixed inset-0 z-[110] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {activeDailyQuest.categoryLabel}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    +{activeDailyQuest.pointsReward} pts • +{activeDailyQuest.xpReward} XP
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {activeDailyQuest.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveDailyQuest(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeDailyQuest.passage && (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800/80 border border-amber-200/70 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-jp-serif">
                {activeDailyQuest.passage}
              </div>
            )}

            <div
              className="text-base font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: activeDailyQuest.question }}
            />

            <div className="space-y-2.5">
              {activeDailyQuest.options.map((opt, idx) => {
                const isSelected = selectedOptionIdx === idx;
                const isCorrectOpt = idx === activeDailyQuest.correctIndex;
                const showResult = questAnswerChecked || activeDailyQuest.completed;

                let btnClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-emerald-400';
                if (showResult) {
                  if (isCorrectOpt) {
                    btnClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold';
                  } else if (isSelected && !isCorrectOpt) {
                    btnClass = 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-700 dark:text-rose-300 font-bold';
                  }
                } else if (isSelected) {
                  btnClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={activeDailyQuest.completed || (questAnswerChecked && selectedOptionIdx === activeDailyQuest.correctIndex)}
                    onClick={() => {
                      setSelectedOptionIdx(idx);
                      if (questAnswerChecked && selectedOptionIdx !== activeDailyQuest.correctIndex) {
                        setQuestAnswerChecked(false);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm flex items-center gap-3 transition-all cursor-pointer ${btnClass}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {showResult && isCorrectOpt && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {showResult && isSelected && !isCorrectOpt && <X className="w-4 h-4 text-rose-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {(questAnswerChecked || activeDailyQuest.completed) && (
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                activeDailyQuest.completed || selectedOptionIdx === activeDailyQuest.correctIndex
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="font-extrabold flex items-center gap-1.5">
                  {activeDailyQuest.completed || selectedOptionIdx === activeDailyQuest.correctIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{questRewardNotice || 'Bạn đã hoàn thành nhiệm vụ này!'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Chưa chính xác — hãy đọc giải thích và thử lại nhé!</span>
                    </>
                  )}
                </div>
                <p>{activeDailyQuest.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {questAnswerChecked && selectedOptionIdx !== activeDailyQuest.correctIndex && !activeDailyQuest.completed && (
                <button
                  type="button"
                  onClick={() => {
                    setQuestAnswerChecked(false);
                    setSelectedOptionIdx(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Chọn lại</span>
                </button>
              )}

              {!activeDailyQuest.completed && (!questAnswerChecked || selectedOptionIdx !== activeDailyQuest.correctIndex) ? (
                <button
                  type="button"
                  disabled={selectedOptionIdx === null}
                  onClick={handleSubmitDailyQuestAnswer}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer shadow-xs"
                >
                  Kiểm tra đáp án
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveDailyQuest(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
