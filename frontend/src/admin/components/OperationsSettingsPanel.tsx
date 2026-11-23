import React, { useState, useEffect, useMemo } from 'react';
import {
  AdminActivityLog,
  SystemSettings,
  Stage,
  Milestone,
  VocabularyItem,
  GrammarItem,
  KanjiDictionary,
  JlptExam
} from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/admin/components/ui/table';
import {
  Wrench,
  ShieldCheck,
  DatabaseBackup,
  RotateCcw,
  ScrollText,
  Save,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download
} from 'lucide-react';

interface OperationsSettingsPanelProps {
  settings: SystemSettings | null;
  activityLogs: AdminActivityLog[];
  curriculumSnapshot: {
    stages: Stage[];
    milestones: Milestone[];
    vocabulary: VocabularyItem[];
    grammar: GrammarItem[];
    kanji: KanjiDictionary[];
    exams: JlptExam[];
  };
  onSettingsUpdated: (next: SystemSettings) => void;
  onRefreshLogs: () => Promise<void>;
  onSeedRestored: () => Promise<void>;
}

export const OperationsSettingsPanel: React.FC<OperationsSettingsPanelProps> = ({
  settings,
  activityLogs,
  curriculumSnapshot,
  onSettingsUpdated,
  onRefreshLogs,
  onSeedRestored
}) => {
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.maintenanceMode ?? false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    settings?.maintenanceMessage ||
      'Hệ thống KIZUNA đang được bảo trì và cập nhật nội dung giáo trình. Vui lòng quay lại sau ít phút.'
  );
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(settings?.allowNewRegistrations ?? true);
  const [aiSenseiEnabled, setAiSenseiEnabled] = useState(settings?.aiSenseiEnabled ?? true);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [exportingBackup, setExportingBackup] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoringSeed, setRestoringSeed] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'USER' | 'CURRICULUM' | 'AI' | 'SYSTEM'>('ALL');
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  useEffect(() => {
    if (settings) {
      setMaintenanceMode(settings.maintenanceMode);
      if (settings.maintenanceMessage) setMaintenanceMessage(settings.maintenanceMessage);
      setAllowNewRegistrations(settings.allowNewRegistrations);
      setAiSenseiEnabled(settings.aiSenseiEnabled);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const saved = await adminService.updateSystemSettings({
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim(),
        allowNewRegistrations,
        aiSenseiEnabled
      });
      onSettingsUpdated(saved);
      setSettingsFeedback({
        type: 'success',
        msg: saved.maintenanceMode
          ? 'Đã BẬT Chế độ Bảo trì Hệ thống! Học viên sẽ thấy thông báo bảo trì, Admin vẫn vận hành bình thường.'
          : 'Đã lưu cài đặt hệ thống (Chế độ hoạt động bình thường).'
      });
      await onRefreshLogs();
    } catch {
      setSettingsFeedback({ type: 'error', msg: 'Không thể lưu cài đặt hệ thống.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    setBackupFeedback(null);
    try {
      const backup = await adminService.exportCurriculumBackup(curriculumSnapshot);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kizuna-curriculum-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupFeedback({ type: 'success', msg: 'Đã xuất file sao lưu JSON toàn bộ giáo trình thành công!' });
      await onRefreshLogs();
    } catch {
      setBackupFeedback({ type: 'error', msg: 'Lỗi khi xuất sao lưu giáo trình.' });
    } finally {
      setExportingBackup(false);
    }
  };

  const handleRestoreSeed = async () => {
    setRestoringSeed(true);
    setBackupFeedback(null);
    try {
      const res = await adminService.restoreSeedCurriculum();
      if (res.ok) {
        setBackupFeedback({ type: 'success', msg: res.message });
        setConfirmRestore(false);
        await onSeedRestored();
      } else {
        setBackupFeedback({ type: 'error', msg: res.message });
      }
    } finally {
      setRestoringSeed(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return activityLogs.filter(log => {
      const type = (log.targetType || '').toUpperCase();
      const matchType =
        logFilter === 'ALL' ||
        (logFilter === 'USER' && type === 'USER') ||
        (logFilter === 'AI' && (type.startsWith('AI') || log.action.startsWith('AI'))) ||
        (logFilter === 'SYSTEM' && type === 'SYSTEM') ||
        (logFilter === 'CURRICULUM' && ['STAGE', 'MILESTONE', 'QUEST', 'VOCABULARY', 'KANJI', 'GRAMMAR', 'EXAM'].includes(type));
      const matchSearch =
        !q ||
        (log.adminUsername || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.targetId || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [activityLogs, logFilter, logSearch]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 pb-8">
      {/* 1. SYSTEM SETTINGS & MAINTENANCE MODE */}
      <div className="lg:col-span-7 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-5 min-w-0">
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600 shrink-0" />
              Trung Tâm Cài Đặt & Chế Độ Bảo Trì
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiểm soát trạng thái hoạt động toàn hệ thống, tạm khóa truy cập học viên khi bảo trì giáo trình
            </p>
          </div>
          <Badge
            className={`shrink-0 ${
              maintenanceMode
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {maintenanceMode ? 'ĐANG BẢO TRÌ' : 'HOẠT ĐỘNG'}
          </Badge>
        </div>

        {settingsFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              settingsFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{settingsFeedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-3 ${
              maintenanceMode
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <AlertTriangle className={`w-4 h-4 shrink-0 ${maintenanceMode ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Chế độ Bảo trì Hệ thống (`maintenanceMode`)</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Khi bật, học viên (ROLE_USER) sẽ thấy màn hình thông báo bảo trì. Tài khoản Quản trị (ROLE_ADMIN) vẫn truy cập bình thường.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(prev => !prev)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                maintenanceMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
                  maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Thông báo hiển thị khi bảo trì</Label>
            <textarea
              rows={2}
              value={maintenanceMessage}
              onChange={e => setMaintenanceMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-white">Cho phép đăng ký mới</div>
                <div className="text-[11px] text-slate-500">Mở/đóng cổng tạo tài khoản mới</div>
              </div>
              <button
                type="button"
                onClick={() => setAllowNewRegistrations(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  allowNewRegistrations ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    allowNewRegistrations ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-white">AI Sensei Quest 4</div>
                <div className="text-[11px] text-slate-500">Bật chấm viết câu & khiếu nại AI</div>
              </div>
              <button
                type="button"
                onClick={() => setAiSenseiEnabled(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  aiSenseiEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    aiSenseiEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 text-center sm:text-left">
              {settings?.updatedAt ? `Cập nhật bởi ${settings.updatedBy || 'Admin'} • ${new Date(settings.updatedAt).toLocaleString('vi-VN')}` : ''}
            </span>
            <Button type="submit" disabled={savingSettings} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer w-full sm:w-auto h-10">
              <Save className="w-4 h-4 mr-1.5" />
              {savingSettings ? 'Đang lưu...' : 'Lưu Cài Đặt Hệ Thống'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. CURRICULUM BACKUP & SEED RESTORE */}
      <div className="lg:col-span-5 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-5 min-w-0">
        <div className="space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <DatabaseBackup className="w-5 h-5 text-indigo-600 shrink-0" />
              Sao Lưu & Khôi Phục Giáo Trình
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Xuất bản sao lưu JSON dự phòng hoặc khôi phục nhanh về dữ liệu chuẩn gốc `KIZUNA_NEJ_SEED_DATA.json`
            </p>
          </div>

          {backupFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                backupFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{backupFeedback.msg}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3">
            <div className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
              1. Xuất Sao Lưu Toàn Bộ Giáo Trình (.JSON)
            </div>
            <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
              Gồm {curriculumSnapshot.stages.length} chặng, {curriculumSnapshot.milestones.length} mốc, {curriculumSnapshot.vocabulary.length} từ vựng, {curriculumSnapshot.grammar.length} ngữ pháp, {curriculumSnapshot.kanji.length} Kanji và {curriculumSnapshot.exams.length} đề thi.
            </p>
            <Button
              type="button"
              disabled={exportingBackup}
              onClick={handleExportBackup}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {exportingBackup ? 'Đang đóng gói...' : 'Tải file Backup JSON dự phòng'}
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 space-y-3">
            <div className="text-xs font-extrabold text-rose-800 dark:text-rose-300">
              2. Khôi Phục Dữ Liệu Chuẩn Gốc (Seed Restore)
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400">
              Nạp lại toàn bộ chặng, cột mốc, từ vựng, Kanji và ngữ pháp từ tập tin chuẩn `docs/KIZUNA_NEJ_SEED_DATA.json` khi lỡ chỉnh sửa sai.
            </p>
            {!confirmRestore ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmRestore(true)}
                className="w-full h-10 border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Khôi phục về Seed Data chuẩn
              </Button>
            ) : (
              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <Button
                  type="button"
                  disabled={restoringSeed}
                  onClick={handleRestoreSeed}
                  className="sm:flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer text-xs"
                >
                  {restoringSeed ? 'Đang khôi phục...' : 'Xác nhận'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmRestore(false)}
                  className="h-10 rounded-xl cursor-pointer text-xs"
                >
                  Hủy
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. ADMIN ACTIVITY / AUDIT LOGS */}
      <div className="lg:col-span-12 rounded-3xl bg-white/95 dark:bg-slate-900/90 border border-emerald-100/70 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-emerald-600 shrink-0" />
              Nhật Ký Hoạt Động Quản Trị
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lưu vết đầy đủ lịch sử chỉnh sửa giáo trình, phân quyền, khóa tài khoản, chống gian lận, phúc khảo AI và thay đổi cấu hình ({filteredLogs.length} bản ghi)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
              <Input
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Tìm admin, hành động, chi tiết..."
                className="pl-9 w-full sm:w-56 h-10 sm:h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <select
              value={logFilter}
              onChange={e => setLogFilter(e.target.value as any)}
              className="h-10 sm:h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold w-full sm:w-auto"
            >
              <option value="ALL">Mọi phân hệ</option>
              <option value="USER">Người dùng & Anti-Cheat</option>
              <option value="CURRICULUM">Giáo trình & Học liệu</option>
              <option value="AI">AI & Phúc khảo</option>
              <option value="SYSTEM">Hệ thống & Backup</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshingLogs}
              onClick={async () => {
                setRefreshingLogs(true);
                await onRefreshLogs();
                setRefreshingLogs(false);
              }}
              className="h-10 sm:h-9 rounded-xl cursor-pointer w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshingLogs ? 'animate-spin' : ''}`} />
              Tải lại
            </Button>
          </div>
        </div>

        {/* Mobile-First Card List for Activity Logs */}
        <div className="block md:hidden space-y-2.5">
          {filteredLogs.slice(0, 50).map(log => (
            <div
              key={log.id}
              className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={
                    log.action.includes('DELETE') || log.action.includes('BAN') || log.action.includes('ANTI_CHEAT')
                      ? 'border-rose-200 bg-rose-50 text-rose-700 font-mono text-[10px]'
                      : log.action.includes('AI_')
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 font-mono text-[10px]'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-[10px]'
                  }
                >
                  {log.action}
                </Badge>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                {log.details}
              </p>

              <div className="flex items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60">
                <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {log.adminUsername}
                </span>
                <span className="font-mono text-slate-500 truncate">
                  {log.targetType}
                  {log.targetId ? `:${log.targetId}` : ''}
                </span>
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 px-4 text-xs text-slate-500 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              Chưa có bản ghi nhật ký hoạt động nào. Mọi thao tác quản trị từ bây giờ sẽ được tự động lưu vết tại đây.
            </div>
          )}
        </div>

        {/* Desktop Table for Activity Logs */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="pl-4">Thời gian</TableHead>
                <TableHead>Quản trị viên</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead className="pr-4">Chi tiết thay đổi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.slice(0, 50).map(log => (
                <TableRow key={log.id}>
                  <TableCell className="pl-4 text-xs text-slate-500 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-800 dark:text-white">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {log.adminUsername}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        log.action.includes('DELETE') || log.action.includes('BAN') || log.action.includes('ANTI_CHEAT')
                          ? 'border-rose-200 bg-rose-50 text-rose-700 font-mono text-[10px]'
                          : log.action.includes('AI_')
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 font-mono text-[10px]'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-[10px]'
                      }
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    {log.targetType}
                    {log.targetId ? `:${log.targetId}` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-300 pr-4">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                    Chưa có bản ghi nhật ký hoạt động nào. Mọi thao tác quản trị từ bây giờ sẽ được tự động lưu vết tại đây.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
