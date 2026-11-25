import React, { useEffect, useState, useMemo } from 'react';
import { kizunaService } from '../services/kizunaService';
import { authService } from '../services/authService';
import { progressService, UserRoadmapProgress } from '../services/progressService';
import { soundService } from '../services/soundService';
import { Stage, Milestone } from '../types/kizuna';
import { User } from '../types/auth';
import { RoadmapMilestoneDetail } from '../components/roadmap/RoadmapMilestoneDetail';
import { 
  Flame, 
  Zap, 
  Trophy, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  Check,
  Crown,
  Target,
  Sparkles,
  BookOpen
} from 'lucide-react';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

const LEVEL_CONFIG: Record<JlptLevelKey, { kanji: string; vi: string; desc: string; range: string; color: string }> = {
  N5: {
    kanji: '入門',
    vi: 'Nhập môn',
    desc: 'Bảng chữ cái, câu danh từ, động từ & 25 bài sơ cấp Minna',
    range: 'Bài 1 – 25 Minna no Nihongo · 5 Chặng · 30 Mốc',
    color: '#10b981'
  },
  N4: {
    kanji: '初級',
    vi: 'Sơ cấp',
    desc: 'Thể Te, Nai, Ta, bị động, sai khiến & kính ngữ cơ bản',
    range: 'Bài 26 – 50 Minna no Nihongo · 5 Chặng · 30 Mốc',
    color: '#06b6d4'
  },
  N3: {
    kanji: '中級',
    vi: 'Trung cấp',
    desc: 'Mẫu câu xã hội, liên kết thời gian, phán đoán & đời sống',
    range: '47 Mốc ngữ pháp giao tiếp chuyên sâu · 9 Chặng',
    color: '#3b82f6'
  },
  N2: {
    kanji: '中上級',
    vi: 'Trung thượng cấp',
    desc: 'Văn phong văn phòng, thương mại, nghị luận & xã luận',
    range: '45 Mốc nâng cao & đọc hiểu chuyên sâu · 9 Chặng',
    color: '#8b5cf6'
  },
  N1: {
    kanji: '上級',
    vi: 'Thượng cấp',
    desc: 'Biểu thức cực hạn, văn kiện học thuật & cổ phong',
    range: '30 Mốc tối thượng · 6 Chặng',
    color: '#f59e0b'
  }
};

const cleanStageTitle = (title?: string) => {
  if (!title) return '';
  return title
    .replace(/^\[N\d\]\s*/i, '')
    .replace(/^Chặng\s*\d+\s*[—–-]\s*/i, '')
    .trim();
};

const cleanMilestoneTitle = (title?: string) => {
  if (!title) return '';
  return title
    .replace(/^\[N\d\]\s*/i, '')
    .replace(/^Bài\s*\d+\s*[:—–-]\s*/i, '')
    .trim();
};

export const RoadmapPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [userProgress, setUserProgress] = useState<UserRoadmapProgress | null>(null);

  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation hierarchy: Level -> Stage -> Milestone/Lesson
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>(() => {
    const userLevel = currentUser?.level as JlptLevelKey;
    if (userLevel && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(userLevel)) {
      return userLevel;
    }
    return 'N5';
  });
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [viewMode, setViewMode] = useState<'STAGES' | 'MILESTONES' | 'LESSON'>('STAGES');

  // Gentle locked notification toast
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Load real user and Firestore data
  useEffect(() => {
    async function loadData() {
      // Clear out stale dummy cache (<= 4 stages)
      try {
        const cachedRaw = sessionStorage.getItem('kizuna_stages_cache') || localStorage.getItem('offline_kizuna_stages_cache');
        if (cachedRaw && cachedRaw.includes('stage_01') && !cachedRaw.includes('stage_n5_1')) {
          sessionStorage.removeItem('kizuna_stages_cache');
          localStorage.removeItem('offline_kizuna_stages_cache');
          sessionStorage.removeItem('kizuna_milestones_cache_all');
          localStorage.removeItem('offline_kizuna_milestones_cache_all');
        }
      } catch {}

      try {
        const u = authService.getCurrentUser();
        if (u) {
          setCurrentUser(u);
          const prog = await progressService.getUserRoadmapProgress(u.id);
          setUserProgress(prog);
        }

        const [s, m] = await Promise.all([
          kizunaService.getStages(),
          kizunaService.getMilestones()
        ]);
        setStages(s);
        setMilestones(m);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Listen to user updates (when completing quests or reading)
  useEffect(() => {
    const handleUserUpdate = () => {
      const fresh = authService.getCurrentUser();
      if (fresh) {
        setCurrentUser({ ...fresh });
        progressService.getUserRoadmapProgress(fresh.id).then(prog => {
          setUserProgress(prog);
        });
      }
    };
    window.addEventListener('kizuna_user_updated', handleUserUpdate);
    return () => window.removeEventListener('kizuna_user_updated', handleUserUpdate);
  }, []);

  // Filter stages of selected level
  const levelStages = useMemo(() => {
    return stages
      .filter(s => {
        const lvl = (s.jlptLevel || (s as any).jlpt_level || 'N5').toUpperCase();
        return lvl === selectedLevel.toUpperCase();
      })
      .sort((a, b) => ((a.orderIndex ?? (a as any).order_index ?? 0) - (b.orderIndex ?? (b as any).order_index ?? 0)));
  }, [stages, selectedLevel]);

  // Filter milestones of selected stage (only active milestones)
  const stageMilestones = useMemo(() => {
    return milestones
      .filter(m => {
        const sid = m.stageId || (m as any).stage_id;
        const isActive = m.isActive !== false && (m as any).active !== false;
        return sid === selectedStage?.id && isActive;
      })
      .sort((a, b) => ((a.orderIndex ?? (a as any).order_index ?? 0) - (b.orderIndex ?? (b as any).order_index ?? 0)));
  }, [milestones, selectedStage?.id]);

  // Check if a stage is completed based on its active milestones
  const isStageCompleted = (st?: Stage) => {
    if (!st) return false;
    const mils = milestones.filter(m => {
      const sid = m.stageId || (m as any).stage_id;
      const isActive = m.isActive !== false && (m as any).active !== false;
      return sid === st.id && isActive;
    });
    if (mils.length === 0) return false;
    return mils.every(m => userProgress?.completedMilestones?.includes(m.id));
  };

  // Tự động ngắt toàn bộ âm thanh khi người dùng rời khỏi trang lộ trình
  useEffect(() => {
    return () => {
      soundService.stop();
    };
  }, []);

  const handleSelectLevel = (lvl: JlptLevelKey) => {
    soundService.stop();
    setSelectedLevel(lvl);
    setSelectedStage(null);
    setSelectedMilestone(null);
    setViewMode('STAGES');
  };

  const handleSelectStage = (st: Stage, isUnlocked: boolean) => {
    if (!isUnlocked) {
      setLockedNotice(`Chặng này đang khóa. Bạn cần hoàn thành tất cả các mốc của Chặng trước để mở khóa!`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    soundService.stop();
    setSelectedStage(st);
    setSelectedMilestone(null);
    setViewMode('MILESTONES');
    try {
      window.history.pushState({ tab: 'roadmap', viewMode: 'MILESTONES', stageId: st.id }, '', '/roadmap');
    } catch {}
  };

  const handleSelectMilestone = (ms: Milestone, isUnlocked: boolean) => {
    if (!isUnlocked) {
      setLockedNotice(`Mốc "${ms.title}" đang khóa. Bạn cần hoàn thành mốc học tập trước đó để mở khóa!`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    soundService.stop();
    setSelectedMilestone(ms);
    setViewMode('LESSON');
    try {
      window.history.pushState({ tab: 'roadmap', viewMode: 'LESSON', milestoneId: ms.id }, '', '/roadmap');
    } catch {}
  };

  const handleBackToStages = () => {
    soundService.stop();
    setSelectedStage(null);
    setSelectedMilestone(null);
    setViewMode('STAGES');
  };

  const handleBackToMilestones = () => {
    soundService.stop();
    setSelectedMilestone(null);
    setViewMode('MILESTONES');
  };

  // Support browser / Android back within Roadmap
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (viewMode === 'LESSON') {
        setSelectedMilestone(null);
        setViewMode('MILESTONES');
      } else if (viewMode === 'MILESTONES') {
        setSelectedStage(null);
        setSelectedMilestone(null);
        setViewMode('STAGES');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewMode]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 transition-colors">
      {/* Toast Notification for Locked Milestone */}
      {lockedNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border border-slate-700 animate-fadeIn">
          <AlertCircle size={18} className="text-amber-400 shrink-0" />
          <span>{lockedNotice}</span>
        </div>
      )}

      {/* 1. HEADER CHÍNH */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-slate-800 shadow-md transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Lộ Trình Học
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              <Flame size={14} />
              <span>{currentUser?.currentStreak || 0} ngày streak</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 text-sky-700 dark:text-sky-300">
              <Zap size={14} />
              <span>{currentUser?.activePoints || 0} pts</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300">
              <Trophy size={14} />
              <span>{currentUser?.totalXp || 0} XP</span>
            </div>
          </div>
        </div>

        {/* Thanh chuyển cấp độ N (Fuda tabs) */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 gap-1.5 overflow-x-auto scrollbar-none">
          {(['N5', 'N4', 'N3', 'N2', 'N1'] as JlptLevelKey[]).map(lvl => {
            const isActive = selectedLevel === lvl;
            const meta = LEVEL_CONFIG[lvl];
            return (
              <button
                key={lvl}
                onClick={() => handleSelectLevel(lvl)}
                className={`flex-1 min-w-[76px] py-2 px-3 rounded-xl border-none font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <span className="font-extrabold">{lvl}</span>
                <span className={`text-[11px] ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                  {meta.kanji}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BREADCRUMBS TRAIL (Responsive một dòng, cuộn ngang mượt mà trên Mobile) */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 px-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
        <span
          onClick={handleBackToStages}
          className={`cursor-pointer transition-colors shrink-0 ${viewMode === 'STAGES' ? 'font-extrabold text-slate-900 dark:text-white' : 'hover:underline text-slate-600 dark:text-slate-400'}`}
        >
          {selectedLevel} · {LEVEL_CONFIG[selectedLevel].desc}
        </span>

        {selectedStage && (
          <>
            <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span
              onClick={handleBackToMilestones}
              className={`cursor-pointer transition-colors shrink-0 max-w-[240px] truncate ${viewMode === 'MILESTONES' ? 'font-extrabold text-slate-900 dark:text-white' : 'hover:underline text-slate-600 dark:text-slate-400'}`}
              title={`Chặng ${selectedStage.orderIndex || 1}: ${cleanStageTitle(selectedStage.title)}`}
            >
              Chặng {selectedStage.orderIndex || 1}: {cleanStageTitle(selectedStage.title)}
            </span>
          </>
        )}

        {selectedMilestone && viewMode === 'LESSON' && (
          <>
            <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span 
              className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 max-w-[280px] truncate"
              title={selectedMilestone.nejUnit ? `${selectedMilestone.nejUnit} — ${cleanMilestoneTitle(selectedMilestone.title)}` : selectedMilestone.title}
            >
              Mốc: {selectedMilestone.nejUnit ? `${selectedMilestone.nejUnit} — ${cleanMilestoneTitle(selectedMilestone.title)}` : selectedMilestone.title}
            </span>
          </>
        )}
      </div>

      {/* 3. NỘI DUNG CHÍNH (THEO VIEW MODE) */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <Sparkles size={32} className="text-emerald-600 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">Đang tải lộ trình học tiếng Nhật từ Firestore...</p>
        </div>
      ) : viewMode === 'STAGES' ? (
        /* ================= TẦNG 2: DANH SÁCH CHẶNG (STAGES) ================= */
        <div className="space-y-4">
          {/* Header Banner cho Cấp độ N hiện tại */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex justify-between items-center flex-wrap gap-3 transition-colors">
            <div>
              <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                CẤP ĐỘ {selectedLevel} · {LEVEL_CONFIG[selectedLevel].kanji}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {LEVEL_CONFIG[selectedLevel].range}
              </h2>
            </div>

            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Tổng số: {levelStages.length} Chặng
            </div>
          </div>

          {/* Stages Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {levelStages.map((st, idx) => {
              const stageMils = milestones.filter(m => {
                const sid = m.stageId || (m as any).stage_id;
                const isActive = m.isActive !== false && (m as any).active !== false;
                return sid === st.id && isActive;
              });
              const milestoneCount = stageMils.length || st.total_milestones || 5;
              const completedCount = stageMils.filter(m => userProgress?.completedMilestones?.includes(m.id)).length;
              const percent = stageMils.length > 0 ? Math.round((completedCount / stageMils.length) * 100) : 0;
              const isComp = completedCount === stageMils.length && stageMils.length > 0;
              const isStageUnlocked = isComp || completedCount > 0 || idx === 0 || isStageCompleted(levelStages[idx - 1]);

              return (
                <div
                  key={st.id}
                  onClick={() => handleSelectStage(st, isStageUnlocked)}
                  className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between border transition-all ${
                    !isStageUnlocked
                      ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-65 cursor-not-allowed'
                      : isComp
                      ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700/60 shadow-xs hover:-translate-y-1 hover:shadow-md cursor-pointer'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:-translate-y-1 hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer'
                  }`}
                >
                  <div>
                    {/* Top Tag & Status */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Chặng {st.orderIndex || idx + 1} • {st.range || 'Bài học'}
                      </span>

                      {isComp ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check size={12} strokeWidth={3} /> Hoàn thành
                        </span>
                      ) : !isStageUnlocked ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                          <Lock size={11} /> Khóa
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {percent > 0 ? `${percent}%` : 'Mở'}
                        </span>
                      )}
                    </div>

                    {/* Stage Title Clean (Không lặp lại Chặng X: Chặng X) */}
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2 line-clamp-2">
                      {cleanStageTitle(st.title)}
                    </h3>

                    {/* Stage Description */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">
                      {st.description || 'Chinh phục kiến thức và kỹ năng giao tiếp trong chặng.'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>Tiến độ</span>
                      <span>{completedCount}/{milestoneCount} Mốc</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isComp ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'MILESTONES' ? (
        /* ================= TẦNG 3: DANH SÁCH MỐC (MILESTONES) CỦA CHẶNG ================= */
        <div className="space-y-4">
          {/* Back Button and Stage Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handleBackToStages}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Quay lại danh sách Chặng</span>
            </button>

            {selectedStage && (
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                {selectedStage.range || `Chặng ${selectedStage.orderIndex}`} · {stageMilestones.length} Mốc học
              </span>
            )}
          </div>

          {selectedStage && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm transition-colors">
              <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                CHẶNG {selectedStage.orderIndex || 1}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                {cleanStageTitle(selectedStage.title)}
              </h2>
              {selectedStage.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed m-0">
                  {selectedStage.description}
                </p>
              )}
            </div>
          )}

          {/* Milestones List */}
          <div className="space-y-3">
            {stageMilestones.map((ms, idx) => {
              const isCompleted = userProgress?.completedMilestones?.includes(ms.id) || false;
              const stageIdx = selectedStage ? levelStages.findIndex(s => s.id === selectedStage.id) : 0;
              const isFirstOfStage1 = stageIdx <= 0 && idx === 0;
              const prevCompleted = idx > 0 ? (userProgress?.completedMilestones?.includes(stageMilestones[idx - 1].id) || false) : false;
              const prevStageComp = stageIdx > 0 ? isStageCompleted(levelStages[stageIdx - 1]) : false;
              const hasQuestProgress = (userProgress?.completedQuests?.[ms.id]?.length || 0) > 0;
              const isUnlocked = isCompleted || hasQuestProgress || isFirstOfStage1 || (idx === 0 ? prevStageComp : prevCompleted);
              const isBoss = ms.milestone_type === 'BOSS_CHALLENGE' || idx === stageMilestones.length - 1;

              return (
                <div
                  key={ms.id}
                  onClick={() => handleSelectMilestone(ms, isUnlocked)}
                  className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap border transition-all ${
                    !isUnlocked
                      ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-65 cursor-not-allowed'
                      : isBoss
                      ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-600/50 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer'
                      : isCompleted
                      ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-700/50 shadow-xs cursor-pointer'
                      : 'bg-white dark:bg-slate-900 border-emerald-400/80 dark:border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/20 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                    {/* Circle icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${
                        isBoss
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                          : isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : !isUnlocked
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                          : 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      }`}
                    >
                      {isBoss ? (
                        <Crown size={18} />
                      ) : isCompleted ? (
                        <Check size={16} strokeWidth={3} />
                      ) : !isUnlocked ? (
                        <Lock size={15} />
                      ) : (
                        ms.kanjiMark || idx + 1
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[11px] font-extrabold uppercase flex items-center gap-1 ${
                          isBoss ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {isBoss ? (
                            <>
                              <Crown size={12} />
                              <span>MỐC CHỐT CHẶNG (BOSS)</span>
                            </>
                          ) : (
                            `${ms.nejUnit || `Bài ${ms.orderIndex || idx + 1}`}`
                          )}
                        </span>

                        {isCompleted && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Check size={11} strokeWidth={3} /> Đã hoàn thành
                          </span>
                        )}

                        {isUnlocked && !isCompleted && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            Đang học
                          </span>
                        )}

                        {!isUnlocked && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Lock size={10} /> Đang khóa
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mb-1">
                        {ms.nejUnit ? cleanMilestoneTitle(ms.title) : ms.title}
                      </h3>

                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Target size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span><b>Mục tiêu:</b> {ms.canDoGoal || ms.communicationContext || 'Thực hành mục tiêu hội thoại cốt lõi'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side rewards and button */}
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="font-extrabold text-amber-600 dark:text-amber-400">
                        +{ms.xpReward || 100} XP
                      </div>
                      <div className="font-bold text-sky-600 dark:text-sky-400 text-[11px]">
                        +{ms.activePointsReward || 80} pts
                      </div>
                    </div>

                    <div
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs ${
                        isUnlocked
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <span>Vào học</span>
                          <ChevronRight size={14} />
                        </>
                      ) : (
                        <>
                          <Lock size={12} />
                          <span>Khóa</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= TẦNG 4: BÀI HỌC CHI TIẾT & BÀI TẬP ================= */
        selectedMilestone && (
          <RoadmapMilestoneDetail
            milestone={selectedMilestone}
            stage={selectedStage}
            level={selectedLevel}
            userId={currentUser?.id}
            userProgress={userProgress}
            onBack={handleBackToMilestones}
            onProgressUpdate={updated => {
              setUserProgress(updated);
              const fresh = authService.getCurrentUser();
              if (fresh) setCurrentUser(fresh);
            }}
          />
        )
      )}
    </div>
  );
};
