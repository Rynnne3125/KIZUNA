import React, { useState } from 'react';
import { 
  PersonalizedRoadmap, 
  RoadmapTask 
} from '../../types/roadmapTypes';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Compass, 
  BookOpen, 
  Brain, 
  Award, 
  Calendar, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Check, 
  Flame, 
  RotateCcw,
  Zap,
  Briefcase,
  GraduationCap
} from 'lucide-react';

interface RoadmapTimelineViewProps {
  roadmap: PersonalizedRoadmap;
  onToggleTask: (weekNumber: number, taskId: string) => Promise<void>;
  onRegenerate: () => void;
  onSwitchToMap: () => void;
}

export const RoadmapTimelineView: React.FC<RoadmapTimelineViewProps> = ({
  roadmap,
  onToggleTask,
  onRegenerate,
  onSwitchToMap
}) => {
  // Trạng thái mở/đóng từng tuần (Mặc định mở tuần đầu tiên)
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false
  });

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'VOCAB':
        return { label: 'Từ Vựng', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'KANJI':
        return { label: 'Hán Tự', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'GRAMMAR':
        return { label: 'Ngữ Pháp', bg: 'bg-amber-50 text-amber-900 border-amber-200' };
      case 'SCENARIO':
        return { label: 'Tình Huống Thực Tế', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'SRS_REVIEW':
        return { label: 'Ôn Ngắt Quãng SRS', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'EXAM_CHECKPOINT':
        return { label: 'Bài Thi Mở Chặng', bg: 'bg-blue-50 text-blue-800 border-blue-200 font-bold' };
      default:
        return { label: 'Bài Học', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* =========================================================================
          1. HEADER TỔNG QUAN LỘ TRÌNH AI CÁ NHÂN HÓA
          ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        
        {/* Họa tiết nền */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <Brain className="w-3.5 h-3.5 text-emerald-400" />
                <span>LỘ TRÌNH ĐƯỢC THIẾT KẾ BỞI AI SENSEI</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-xs">
                <Target className="w-3.5 h-3.5" />
                <span>Mục tiêu: {roadmap.targetLevel}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {roadmap.goalTitle}
            </h1>

            <p className="text-emerald-100/80 text-xs sm:text-sm leading-relaxed">
              Điểm xuất phát: <strong className="text-emerald-300">{roadmap.startingRegionName}</strong>. 
              Kế hoạch được tối ưu hóa cho tốc độ <strong className="text-amber-300">{roadmap.weeklyPaceHours} giờ/tuần</strong>, dự kiến hoàn thành sau <strong className="text-amber-300">{roadmap.estimatedTotalWeeks} tuần</strong>.
            </p>
          </div>

          {/* Cụm tiến độ & nút chuyển đổi */}
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 text-center min-w-[160px]">
              <div className="text-3xl font-black text-emerald-300">
                {roadmap.completionRate}%
              </div>
              <div className="text-[11px] text-emerald-100 font-semibold mt-0.5">
                Đã xong {roadmap.completedTasksCount}/{roadmap.totalTasksCount} nhiệm vụ
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onSwitchToMap}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-300" />
                <span>Xem Bản Đồ 3D</span>
              </button>
              
              <button
                onClick={onRegenerate}
                title="Làm lại bài kiểm tra để tạo lại lộ trình"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
                <span>Làm lại Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ học tập (Progress Bar) */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10">
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${roadmap.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BANNER LỜI KHUYÊN CHIẾN LƯỢC TỪ AI SENSEI
          ========================================================================= */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
            <Sparkles className="w-5 h-5 fill-amber-200 text-amber-200" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm sm:text-base font-extrabold text-amber-950 flex items-center gap-2">
              <span>Chiến Lược Học Tập Từ KIZUNA Sensei</span>
            </h3>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed italic">
              "{roadmap.aiSenseiSummary}"
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              {roadmap.strategicAdvice.map((adv, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-amber-950 px-3 py-1 rounded-xl border border-amber-200 font-medium"
                >
                  <Check className="w-3 h-3 text-amber-600 stroke-[3]" />
                  <span>{adv}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. DANH SÁCH CÁC TUẦN HỌC (WEEK-BY-WEEK TIMELINE)
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-extrabold text-slate-900">
              Chi Tiết Kế Hoạch Từng Tuần
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tích chọn nhiệm vụ khi bạn đã hoàn thành
          </span>
        </div>

        {roadmap.weeklyPlans.map((week) => {
          const isExpanded = expandedWeeks[week.weekNumber] ?? false;
          const completedCount = week.tasks.filter(t => t.isCompleted).length;
          const isWeekDone = completedCount === week.tasks.length && week.tasks.length > 0;
          const isCurrent = week.status === 'CURRENT' && !isWeekDone;

          return (
            <div 
              key={week.weekNumber}
              className={`rounded-3xl border-2 transition-all overflow-hidden ${
                isCurrent 
                  ? 'border-emerald-500 bg-white shadow-md shadow-emerald-950/5' 
                  : isWeekDone 
                    ? 'border-emerald-100 bg-slate-50/60 opacity-90' 
                    : 'border-slate-200 bg-white'
              }`}
            >
              {/* Header của tuần */}
              <div 
                onClick={() => toggleWeek(week.weekNumber)}
                className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                    isWeekDone 
                      ? 'bg-emerald-600 text-white' 
                      : isCurrent 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isWeekDone ? <Check className="w-5 h-5 stroke-[3]" /> : `T${week.weekNumber}`}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold ${
                        isWeekDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isWeekDone ? 'Hoàn thành' : isCurrent ? 'Tuần hiện tại' : 'Chưa bắt đầu'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {week.regionName} • {week.stageTitle}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                      {week.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-extrabold text-slate-700">
                      {completedCount} / {week.tasks.length} nhiệm vụ
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      ~{week.estimatedHours}h học tập
                    </div>
                  </div>

                  <button className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nội dung danh sách Task trong tuần */}
              {isExpanded && (
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-3 bg-white">
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    Trọng tâm tuần: <strong className="text-slate-700">{week.focusArea}</strong>
                  </div>

                  {week.tasks.map((task) => {
                    const badge = getTaskTypeBadge(task.type);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onToggleTask(week.weekNumber, task.id)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                          task.isCompleted 
                            ? 'bg-emerald-50/40 border-emerald-200' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-300 shadow-2xs'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-lg border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                          task.isCompleted 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'border-slate-300 bg-white hover:border-emerald-500'
                        }`}>
                          {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Chi tiết task */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{task.recommendedMinutes} phút</span>
                            </span>
                          </div>

                          <h4 className={`text-sm sm:text-base font-bold leading-snug ${
                            task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}>
                            {task.title}
                          </h4>

                          <p className={`text-xs mt-0.5 leading-relaxed ${
                            task.isCompleted ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {task.description}
                          </p>
                        </div>

                        {/* Chỉ tiêu số lượng */}
                        <div className="shrink-0 text-right text-xs font-extrabold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 hidden sm:block">
                          {task.targetCount} {task.targetUnit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

