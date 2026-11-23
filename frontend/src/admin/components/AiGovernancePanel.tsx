import React, { useState, useMemo } from 'react';
import {
  AiPlacementMonitorData,
  AiEvaluationAudit,
  AiRuntimeConfig,
  Milestone
} from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/admin/components/ui/table';
import { DonutChart, BarList, AreaChart } from '@tremor/react';
import {
  Bot,
  Activity,
  Gauge,
  ShieldAlert,
  Sliders,
  CheckCircle,
  XCircle,
  Sparkles,
  RefreshCw,
  Clock,
  Cpu,
  AlertTriangle,
  Send,
  Save,
  CheckCircle2
} from 'lucide-react';

interface AiGovernancePanelProps {
  monitor: AiPlacementMonitorData | null;
  audits: AiEvaluationAudit[];
  aiConfig: AiRuntimeConfig | null;
  milestones: Milestone[];
  onRefresh: () => Promise<void>;
  onAuditResolved: (resolved: AiEvaluationAudit) => void;
  onConfigUpdated: (updated: AiRuntimeConfig) => void;
}

const MODEL_PRESETS = [
  { value: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Nhanh & Tiết kiệm - Mặc định)' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Cân bằng chất lượng & tốc độ)' },
  { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (Độ trễ cực thấp)' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Ổn định)' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Legacy)' }
];

export const AiGovernancePanel: React.FC<AiGovernancePanelProps> = ({
  monitor,
  audits,
  aiConfig,
  milestones,
  onRefresh,
  onAuditResolved,
  onConfigUpdated
}) => {
  const [subTab, setSubTab] = useState<'monitor' | 'audits' | 'config'>('monitor');
  const [refreshing, setRefreshing] = useState(false);

  // Audits state
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [bonusByAudit, setBonusByAudit] = useState<Record<string, number>>({});
  const [noteByAudit, setNoteByAudit] = useState<Record<string, string>>({});
  const [auditBanner, setAuditBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Sandbox state
  const [sandboxMilestoneId, setSandboxMilestoneId] = useState<string>(milestones[0]?.id || '');
  const [sandboxInput, setSandboxInput] = useState('初めまして。私はアンです。ベトナム人です。');
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);

  // Dynamic AI Config state
  const [cfgModel, setCfgModel] = useState(aiConfig?.model || monitor?.model || 'gemini-3.5-flash-lite');
  const [cfgDailyLimit, setCfgDailyLimit] = useState(aiConfig?.dailyLimit ?? monitor?.dailyLimit ?? 100);
  const [cfgTimeout, setCfgTimeout] = useState(aiConfig?.timeoutSeconds ?? monitor?.timeoutSeconds ?? 5);
  const [cfgSenseiEnabled, setCfgSenseiEnabled] = useState(aiConfig?.senseiEnabled ?? monitor?.senseiEnabled ?? true);
  const [cfgPrompt, setCfgPrompt] = useState(
    aiConfig?.senseiSystemPrompt ||
      monitor?.config?.senseiSystemPrompt ||
      'Bạn là AI Sensei tiếng Nhật của hệ thống KIZUNA. Chấm câu viết tiếng Nhật của học viên dựa trên Whitelist từ vựng và ngữ pháp của cột mốc, phát hiện lỗi trợ từ, trả về điểm thang 10 và gợi ý diễn đạt tự nhiên.'
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  React.useEffect(() => {
    const src = aiConfig || monitor?.config;
    if (src) {
      setCfgModel(src.model || 'gemini-3.5-flash-lite');
      setCfgDailyLimit(src.dailyLimit ?? 100);
      setCfgTimeout(src.timeoutSeconds ?? 5);
      setCfgSenseiEnabled(src.senseiEnabled ?? true);
      if (src.senseiSystemPrompt) setCfgPrompt(src.senseiSystemPrompt);
    }
  }, [aiConfig, monitor?.config]);

  const pendingAuditsCount = useMemo(
    () => audits.filter(a => (a.status || 'PENDING').toUpperCase() === 'PENDING').length,
    [audits]
  );

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const st = (a.status || 'PENDING').toUpperCase();
      if (auditFilter === 'PENDING') return st === 'PENDING';
      if (auditFilter === 'RESOLVED') return st !== 'PENDING';
      return true;
    });
  }, [audits, auditFilter]);

  const confidenceChartData = useMemo(() => {
    const dist = monitor?.confidenceDistribution || { HIGH: 0, MODERATE: 0, LOW: 0 };
    return [
      { name: 'Tin cậy Cao (HIGH)', value: dist.HIGH || 0 },
      { name: 'Trung bình (MODERATE)', value: dist.MODERATE || 0 },
      { name: 'Thấp / Cơ bản (LOW)', value: dist.LOW || 0 }
    ];
  }, [monitor?.confidenceDistribution]);

  const totalConfidenceSamples =
    (monitor?.confidenceDistribution?.HIGH || 0) +
    (monitor?.confidenceDistribution?.MODERATE || 0) +
    (monitor?.confidenceDistribution?.LOW || 0);

  const levelBarData = useMemo(() => {
    const dist = monitor?.levelDistribution || { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    return ['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => ({
      name: `Cấp độ ${lvl}`,
      value: dist[lvl] || 0
    }));
  }, [monitor?.levelDistribution]);

  const stageBarData = useMemo(() => {
    const dist = monitor?.stageDistribution || {};
    return Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [monitor?.stageDistribution]);

  const latencySeriesData = useMemo(() => {
    const events = (monitor?.recentEvents || [])
      .filter(e => e.latencyMs > 0)
      .slice(0, 15)
      .reverse();

    if (events.length === 0) return [];
    return events.map((e, idx) => ({
      session: `#${idx + 1} (${e.type === 'SENSEI' ? 'Sensei' : 'Placement'})`,
      'Độ trễ (ms)': e.latencyMs
    }));
  }, [monitor?.recentEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleResolveAudit = async (audit: AiEvaluationAudit, decision: 'APPROVE' | 'REJECT') => {
    setResolvingId(audit.id);
    setAuditBanner(null);
    const bonus = bonusByAudit[audit.id] ?? 25;
    const note = noteByAudit[audit.id] ?? '';
    try {
      const resolved = await adminService.resolveAiAudit(audit, decision, bonus, note);
      if (resolved) {
        onAuditResolved(resolved);
        setAuditBanner({
          type: 'success',
          msg:
            decision === 'APPROVE'
              ? `Đã phê duyệt khiếu nại của @${audit.username || 'học viên'} và hoàn +${bonus} AP.`
              : `Đã từ chối khiếu nại của @${audit.username || 'học viên'} và giữ nguyên kết quả AI.`
        });
      } else {
        setAuditBanner({ type: 'error', msg: 'Không thể xử lý khiếu nại. Vui lòng thử lại.' });
      }
    } catch {
      setAuditBanner({ type: 'error', msg: 'Lỗi kết nối khi xử lý khiếu nại.' });
    } finally {
      setResolvingId(null);
    }
  };

  const handleRunSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxInput.trim()) return;
    setSandboxRunning(true);
    try {
      const res = await adminService.runAiSandbox({
        milestoneId: sandboxMilestoneId || undefined,
        systemPrompt: cfgPrompt,
        studentInput: sandboxInput.trim()
      });
      setSandboxResult(res);
    } finally {
      setSandboxRunning(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigMsg(null);
    if (!/^gemini-[a-z0-9.-]+$/.test(cfgModel.trim())) {
      setConfigMsg({ type: 'error', msg: 'Tên model phải tuân theo định dạng gemini-* (ví dụ: gemini-3.5-flash-lite).' });
      return;
    }
    setSavingConfig(true);
    try {
      const updated = await adminService.updateAiConfig({
        model: cfgModel.trim(),
        dailyLimit: Math.max(0, Number(cfgDailyLimit)),
        timeoutSeconds: Math.max(2, Math.min(30, Number(cfgTimeout))),
        senseiEnabled: cfgSenseiEnabled,
        senseiSystemPrompt: cfgPrompt.trim()
      });
      onConfigUpdated(updated);
      setConfigMsg({ type: 'success', msg: `Đã lưu cấu hình AI mới (${updated.model}, hạn mức ${updated.dailyLimit} lượt/ngày).` });
      await onRefresh();
    } catch {
      setConfigMsg({ type: 'error', msg: 'Không thể cập nhật cấu hình AI.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const callsToday = monitor?.callsToday ?? 0;
  const dailyLimit = monitor?.dailyLimit ?? cfgDailyLimit ?? 100;
  const quotaPct = dailyLimit > 0 ? Math.min(100, Math.round((callsToday / dailyLimit) * 100)) : 100;
  const quotaDanger = quotaPct >= 85;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER + SUB-TAB NAVIGATION */}
      <div className="rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Bot className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Trung Tâm Giám Sát & Kiểm Duyệt AI
              </h2>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-mono text-xs">
                {monitor?.model || cfgModel}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Đồng bộ 100% với tính năng AI Placement thực tế, kiểm soát hạn mức ngân sách Gemini, kiểm duyệt khiếu nại Human-in-the-loop và cấu hình tham số động.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setSubTab('monitor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  subTab === 'monitor'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" /> Giám sát AI Xếp Lớp
              </button>
              <button
                type="button"
                onClick={() => setSubTab('audits')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  subTab === 'audits'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Khiếu nại AI
                {pendingAuditsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                    {pendingAuditsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSubTab('config')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  subTab === 'config'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Cấu hình AI
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          SUB-TAB 1: AI PLACEMENT MONITOR (P0)
      ==================================================================== */}
      {subTab === 'monitor' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* DAILY QUOTA & BUDGET MONITOR WIDGET */}
          <div className="col-span-12 lg:col-span-6 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Hạn Mức & Ngân Sách Gemini Hôm Nay
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ngày UTC: {monitor?.budgetDate || new Date().toISOString().slice(0, 10)} • Timeout {monitor?.timeoutSeconds ?? 5}s • Đồng thời {monitor?.inFlightActive ?? 0}/{monitor?.inFlightMax ?? 2}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    quotaDanger
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  }
                >
                  {quotaPct}% đã dùng
                </Badge>
              </div>

              <div className="flex items-baseline justify-between mt-4 mb-2">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {callsToday}
                  <span className="text-lg font-bold text-slate-400"> / {dailyLimit} lượt</span>
                </div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Còn lại: {Math.max(0, dailyLimit - callsToday)} lượt
                </div>
              </div>

              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${Math.max(2, quotaPct)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    quotaDanger
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] font-semibold text-slate-400">Lỗi chạm trần 429</div>
                <div className={`text-lg font-black ${(monitor?.rateLimitErrors429Count || 0) > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                  {monitor?.rateLimitErrors429Count ?? 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] font-semibold text-slate-400">Tỷ lệ thành công</div>
                <div className="text-lg font-black text-emerald-600">
                  {monitor?.successRatePercent ?? 100}%
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] font-semibold text-slate-400">Fallback cục bộ</div>
                <div className="text-lg font-black text-amber-600">
                  {monitor?.fallbackOrErrorCount ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* AVERAGE LATENCY & PLACEMENT SUMMARY KPI */}
          <div className="col-span-12 lg:col-span-6 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Độ Trễ Phản Hồi Gemini (`latencyMs`)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đo từ lúc gọi API xếp lớp đến khi trả về cột mốc đề xuất (giới hạn 5.000 ms)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 my-3">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Trung bình</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {monitor?.averageLatencyMs ?? 0} <span className="text-xs font-semibold text-slate-400">ms</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Đã xếp lớp</div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">
                  {monitor?.totalPlacedUsers ?? 0} <span className="text-xs font-semibold text-slate-400">HV</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Có AI hỗ trợ</div>
                <div className="text-2xl font-black text-amber-600 mt-0.5">
                  {monitor?.aiAssistedPlacements ?? 0} <span className="text-xs font-semibold text-slate-400">phiên</span>
                </div>
              </div>
            </div>

            <div className="h-[145px] w-full mt-2">
              {latencySeriesData.length > 0 ? (
                <AreaChart
                  data={latencySeriesData}
                  index="session"
                  categories={['Độ trễ (ms)']}
                  colors={['indigo']}
                  valueFormatter={v => `${v} ms`}
                  showLegend={false}
                  showGridLines={false}
                  showAnimation={false}
                  className="h-full w-full"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 p-4 text-center">
                  <Activity className="w-5 h-5 mb-1.5 text-slate-300" />
                  Chưa có mẫu độ trễ live. Khi học viên làm bài test AI Placement, biểu đồ latency sẽ tự động cập nhật.
                </div>
              )}
            </div>
          </div>

          {/* CONFIDENCE DISTRIBUTION (HIGH / MODERATE / LOW) */}
          <div className="col-span-12 lg:col-span-5 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Phân Bố Độ Tin Cậy AI (`confidence`)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Đánh giá mức độ chắc chắn của Gemini khi gợi ý cột mốc xuất phát cho học viên
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <DonutChart
                data={confidenceChartData}
                category="value"
                index="name"
                colors={['emerald', 'amber', 'rose']}
                showAnimation={false}
                className="w-40 h-40 shrink-0"
              />
              <div className="flex-1 w-full space-y-3">
                {[
                  {
                    key: 'HIGH' as const,
                    label: 'HIGH (Độ tin cậy cao)',
                    color: 'bg-emerald-500',
                    text: 'text-emerald-700 dark:text-emerald-400'
                  },
                  {
                    key: 'MODERATE' as const,
                    label: 'MODERATE (Trung bình)',
                    color: 'bg-amber-500',
                    text: 'text-amber-700 dark:text-amber-400'
                  },
                  {
                    key: 'LOW' as const,
                    label: 'LOW (Cơ bản / Ít dữ liệu)',
                    color: 'bg-rose-500',
                    text: 'text-rose-700 dark:text-rose-400'
                  }
                ].map(row => {
                  const val = monitor?.confidenceDistribution?.[row.key] || 0;
                  const pct = totalConfidenceSamples > 0 ? Math.round((val / totalConfidenceSamples) * 100) : 0;
                  return (
                    <div key={row.key}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{row.label}</span>
                        <span className={row.text}>
                          {val} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${row.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* LEVEL & STAGE PLACEMENT DISTRIBUTION */}
          <div className="col-span-12 lg:col-span-7 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Phân Bổ Điều Hướng Sau Bài Test (JLPT & Chặng)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tỷ lệ học viên được AI điều hướng vào các cấp độ N5 – N1 và các chặng học phổ biến nhất
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">Theo cấp độ JLPT</div>
                <BarList data={levelBarData} color="emerald" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">Top Chặng AI đề xuất nhiều nhất</div>
                {stageBarData.length > 0 ? (
                  <BarList data={stageBarData} color="indigo" />
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    Chưa có thống kê chặng xếp lớp từ học viên.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RECENT AI TELEMETRY EVENTS TABLE */}
          <div className="col-span-12 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Lịch Sử Phiên Gọi AI Gần Đây
                </h3>
                <p className="text-xs text-slate-500">
                  Ghi nhận trực tiếp các lượt gọi AI Placement & AI Sensei (model, độ tin cậy, cột mốc, độ trễ)
                </p>
              </div>
              <Badge variant="secondary">{monitor?.recentEvents?.length || 0} phiên gần nhất</Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <Table className="min-w-[680px]">
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="pl-4">Thời gian</TableHead>
                    <TableHead>Loại AI</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Mốc / Cấp độ</TableHead>
                    <TableHead>Độ tin cậy</TableHead>
                    <TableHead>Độ trễ</TableHead>
                    <TableHead className="text-right pr-4">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(monitor?.recentEvents || []).slice(0, 12).map(evt => (
                    <TableRow key={evt.id}>
                      <TableCell className="pl-4 text-xs text-slate-500">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleString('vi-VN') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {evt.type === 'SENSEI' ? 'AI Sensei' : 'AI Placement'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300">{evt.model}</TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{evt.milestoneId || '—'}</span>
                        {evt.assignedLevel && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            {evt.assignedLevel}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            evt.confidence === 'HIGH'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : evt.confidence === 'MODERATE'
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-slate-200 text-slate-600'
                          }
                        >
                          {evt.confidence || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {evt.latencyMs} ms
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Badge
                          className={
                            evt.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : evt.status === 'RATE_LIMITED'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }
                        >
                          {evt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!monitor?.recentEvents || monitor.recentEvents.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-500">
                        Chưa ghi nhận phiên gọi AI nào. Dữ liệu sẽ xuất hiện ngay khi học viên thực hiện bài test Xếp lớp hoặc Quest 4 AI Sensei.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 2: HUMAN-IN-THE-LOOP AUDIT QUEUE & PROMPT SANDBOX
      ==================================================================== */}
      {subTab === 'audits' && (
        <div className="space-y-6">
          {/* AUDIT QUEUE */}
          <div className="rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Hàng Đợi Phúc Khảo Khiếu Nại AI (Human-in-the-loop)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhận khiếu nại trực tiếp từ Quest 4 (AI Sensei) của học viên. Phê duyệt sẽ tự động hoàn Điểm Năng Động (AP).
                </p>
              </div>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {(
                  [
                    { id: 'ALL', label: `Tất cả (${audits.length})` },
                    { id: 'PENDING', label: `Chờ duyệt (${pendingAuditsCount})` },
                    { id: 'RESOLVED', label: `Đã xử lý (${audits.length - pendingAuditsCount})` }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAuditFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      auditFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {auditBanner && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  auditBanner.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{auditBanner.msg}</span>
              </div>
            )}

            {filteredAudits.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2.5" />
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  Không có khiếu nại AI nào trong danh mục này
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Khi học viên làm Quest 4 (Viết câu với AI Sensei) và bấm nút "Khiếu nại AI chấm sai", phiếu phúc khảo sẽ xuất hiện tự động tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAudits.map(audit => {
                  const status = (audit.status || 'PENDING').toUpperCase();
                  const isPending = status === 'PENDING';
                  const isBusy = resolvingId === audit.id;
                  const bonusVal = bonusByAudit[audit.id] ?? 25;
                  const noteVal = noteByAudit[audit.id] ?? '';

                  return (
                    <div
                      key={audit.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                              {audit.milestoneTitle || audit.milestoneId || 'Bài viết AI Sensei'}
                            </h4>
                            <Badge
                              className={
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-200 text-slate-700 border-slate-300'
                              }
                            >
                              {isPending ? 'CHỜ PHÚC KHẢO' : status === 'APPROVED' ? 'ĐÃ DUYỆT & HOÀN ĐIỂM' : 'ĐÃ TỪ CHỐI'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Học viên: <span className="font-bold text-slate-700 dark:text-slate-300">@{audit.username || audit.userId}</span> •{' '}
                            {audit.submittedAt ? new Date(audit.submittedAt).toLocaleString('vi-VN') : 'Vừa xong'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                          <span className="text-xs font-bold text-slate-500">Điểm AI</span>
                          <span className="text-2xl font-black text-rose-600">{audit.aiScore ?? 0}/10</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Câu viết của học viên
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                            "{audit.userSubmission || audit.studentInput}"
                          </div>
                          {audit.promptText && (
                            <div className="text-xs text-slate-500">Đề bài: {audit.promptText}</div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Nhận xét của AI Sensei
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                              {audit.aiFeedback || audit.aiResponse || 'Không có ghi chú.'}
                            </p>
                          </div>
                          {(audit.studentAppealReason || audit.studentReason) && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                              <div className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 mb-1">
                                Lý do khiếu nại của học viên
                              </div>
                              <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                                {audit.studentAppealReason || audit.studentReason}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {isPending ? (
                        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-bold text-slate-500">Điểm hoàn lại (AP)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={500}
                                value={bonusVal}
                                onChange={e =>
                                  setBonusByAudit(prev => ({ ...prev, [audit.id]: Math.max(0, Number(e.target.value)) }))
                                }
                                className="h-9 text-xs bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-[11px] font-bold text-slate-500">Ghi chú phúc khảo của Admin</Label>
                              <Input
                                value={noteVal}
                                onChange={e =>
                                  setNoteByAudit(prev => ({ ...prev, [audit.id]: e.target.value }))
                                }
                                placeholder="VD: Câu tự nhiên theo văn nói Nhật, chấp nhận hoàn điểm..."
                                className="h-9 text-xs bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleResolveAudit(audit, 'REJECT')}
                              className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                            >
                              <XCircle className="w-4 h-4 mr-1.5" /> Từ chối
                            </Button>
                            <Button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleResolveAudit(audit, 'APPROVE')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              {isBusy ? 'Đang xử lý...' : `Phê duyệt (+${bonusVal} AP)`}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span>
                            Đã xử lý bởi <strong>{audit.resolvedBy || 'Admin'}</strong>
                            {audit.bonusPointsAwarded ? ` • Đã hoàn +${audit.bonusPointsAwarded} AP` : ''}
                          </span>
                          {audit.adminNote && <span className="italic">Ghi chú: "{audit.adminNote}"</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI SENSEI PROMPT SANDBOX */}
          <div className="rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                AI Sensei Whitelist Sandbox (Kiểm thử chấm bài trực tiếp)
              </h3>
            </div>
            <form onSubmit={handleRunSandbox} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 space-y-1">
                <Label className="text-xs font-bold">Cột mốc kiểm thử Whitelist</Label>
                <select
                  value={sandboxMilestoneId}
                  onChange={e => setSandboxMilestoneId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="">-- Không giới hạn mốc --</option>
                  {milestones.slice(0, 60).map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-6 space-y-1">
                <Label className="text-xs font-bold">Câu tiếng Nhật mẫu của học viên</Label>
                <Input
                  value={sandboxInput}
                  onChange={e => setSandboxInput(e.target.value)}
                  placeholder="Nhập câu tiếng Nhật..."
                  className="rounded-xl"
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button
                  type="submit"
                  disabled={sandboxRunning}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sandboxRunning ? 'Đang chấm...' : 'Chấm thử'}
                </Button>
              </div>
            </form>

            {sandboxResult && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Điểm đánh giá: <span className="text-emerald-600">{sandboxResult.evaluatedScore}/10</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{sandboxResult.model}</Badge>
                    <Badge variant="secondary">{sandboxResult.latencyMs} ms</Badge>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Nhận xét sư phạm:</strong> {sandboxResult.pedagogicalFeedback}
                </p>
                {Array.isArray(sandboxResult.particleErrors) && sandboxResult.particleErrors.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300">
                    <strong>Lỗi trợ từ phát hiện:</strong> {sandboxResult.particleErrors.join(' • ')}
                  </div>
                )}
                <p className="text-emerald-700 dark:text-emerald-400">
                  <strong>Gợi ý tự nhiên:</strong> {sandboxResult.naturalExpressionSuggestion}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 3: DYNAMIC AI CONFIGURATION
      ==================================================================== */}
      {subTab === 'config' && (
        <div className="rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-5 sm:p-6 shadow-xs max-w-3xl">
          <div className="mb-5">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Cấu Hình Tham Số Gemini & AI Sensei Động
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Điều chỉnh trực tiếp Model Gemini, giới hạn ngân sách ngày (`dailyLimit`), timeout và System Prompt mà không cần khởi động lại server.
            </p>
          </div>

          {configMsg && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                configMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {configMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{configMsg.msg}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Chọn nhanh Model Gemini</Label>
                <select
                  value={MODEL_PRESETS.some(p => p.value === cfgModel) ? cfgModel : 'custom'}
                  onChange={e => {
                    if (e.target.value !== 'custom') setCfgModel(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  {MODEL_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Tùy chỉnh mã model...</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Mã Model Gemini thực thi</Label>
                <Input
                  value={cfgModel}
                  onChange={e => setCfgModel(e.target.value)}
                  placeholder="gemini-3.5-flash-lite"
                  className="font-mono text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Hạn mức ngân sách ngày (`dailyLimit` calls/ngày)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100000}
                  value={cfgDailyLimit}
                  onChange={e => setCfgDailyLimit(Number(e.target.value))}
                  required
                />
                <p className="text-[11px] text-slate-400">Đặt 0 để tạm khóa gọi Gemini API (tự động dùng Fallback cục bộ).</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Giới hạn thời gian phản hồi (`timeoutSeconds`)</Label>
                <Input
                  type="number"
                  min={2}
                  max={30}
                  value={cfgTimeout}
                  onChange={e => setCfgTimeout(Number(e.target.value))}
                  required
                />
                <p className="text-[11px] text-slate-400">Khuyến nghị: 5 giây để đảm bảo trải nghiệm mượt trên di động.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  Bật tính năng AI Sensei chấm viết câu tại Quest 4
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khi bật, Quest 4 ở giao diện học viên sẽ gọi Gemini API kèm Whitelist từ vựng & ngữ pháp của mốc để chấm bài.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCfgSenseiEnabled(prev => !prev)}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  cfgSenseiEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
                    cfgSenseiEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">System Prompt chuẩn Whitelist cho AI Sensei</Label>
              <textarea
                rows={4}
                value={cfgPrompt}
                onChange={e => setCfgPrompt(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-400">
                {aiConfig?.updatedAt
                  ? `Cập nhật lần cuối bởi ${aiConfig.updatedBy || 'Admin'} lúc ${new Date(aiConfig.updatedAt).toLocaleString('vi-VN')}`
                  : 'Cấu hình mặc định hệ thống'}
              </div>
              <Button
                type="submit"
                disabled={savingConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {savingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình AI'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
