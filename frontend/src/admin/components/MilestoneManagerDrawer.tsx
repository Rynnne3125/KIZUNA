import React, { useState, useEffect } from 'react';
import {
  Milestone, Stage, MilestoneQuest, MilestoneWhitelistData,
  VocabularyItem, KanjiDictionary, GrammarItem
} from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import {
  X, Layers, Sliders, BookOpen, ListChecks, Save, Trash2,
  Plus, CheckCircle2, Eye, EyeOff, Zap, Award
} from 'lucide-react';

interface MilestoneManagerDrawerProps {
  isOpen: boolean;
  milestone: Milestone | null; // null = tạo mới, khác null = quản lý/chỉnh sửa
  stages: Stage[];
  allMilestones: Milestone[];
  cachedVocab: VocabularyItem[];
  cachedKanji: KanjiDictionary[];
  cachedGrammar: GrammarItem[];
  onClose: () => void;
  onMilestoneSaved: (saved: Milestone, isNew: boolean) => void;
  onMilestoneDeleted: (milestoneId: string) => void;
  onWhitelistVocabAdded?: (newVocab: VocabularyItem) => void;
}

export const MilestoneManagerDrawer: React.FC<MilestoneManagerDrawerProps> = ({
  isOpen,
  milestone,
  stages,
  allMilestones,
  cachedVocab,
  cachedKanji,
  cachedGrammar,
  onClose,
  onMilestoneSaved,
  onMilestoneDeleted,
  onWhitelistVocabAdded
}) => {
  const isEditing = Boolean(milestone);
  const [activeTab, setActiveTab] = useState<'info' | 'gameplay' | 'whitelist' | 'quests'>('info');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Tab 1: Info states
  const [msId, setMsId] = useState('');
  const [stageId, setStageId] = useState('stage_01');
  const [title, setTitle] = useState('');
  const [nejUnit, setNejUnit] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [communicationContext, setCommunicationContext] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Tab 2: Gameplay Balance states
  const [xpReward, setXpReward] = useState(50);
  const [activePointsReward, setActivePointsReward] = useState(70);
  const [prerequisiteMilestoneId, setPrerequisiteMilestoneId] = useState<string>('');

  // Tab 3: Whitelist states
  const [whitelistSubTab, setWhitelistSubTab] = useState<'vocab' | 'kanji' | 'grammar'>('vocab');
  const [whitelist, setWhitelist] = useState<MilestoneWhitelistData | null>(null);
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newSinoVi, setNewSinoVi] = useState('');
  const [newMeaningVi, setNewMeaningVi] = useState('');
  const [newTier, setNewTier] = useState<'CORE' | 'SUPPLEMENTARY'>('CORE');

  // Tab 4: 4 Quests states
  const [quests, setQuests] = useState<MilestoneQuest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setConfirmDelete(false);

    if (milestone) {
      const currentOrder = Number(milestone.orderIndex ?? milestone.order_index ?? 1);
      setMsId(milestone.id);
      setStageId(milestone.stageId || milestone.stage_id || stages[0]?.id || 'stage_01');
      setTitle(milestone.title || '');
      setNejUnit(milestone.nejUnit || `Bài ${currentOrder}`);
      setOrderIndex(currentOrder);
      setCommunicationContext(milestone.communicationContext || '');
      setIsActive(milestone.isActive !== false && milestone.active !== false);

      setXpReward(Number(milestone.xpReward ?? 50));
      setActivePointsReward(Number(milestone.activePointsReward ?? 70));
      setPrerequisiteMilestoneId(milestone.prerequisiteMilestoneId || '');

      // Load Whitelist & Quests
      setLoadingWhitelist(true);
      adminService
        .getMilestoneWhitelist(milestone.id, cachedVocab, cachedKanji, cachedGrammar)
        .then(res => {
          setWhitelist(res);
          setLoadingWhitelist(false);
        });

      setLoadingQuests(true);
      adminService.getMilestoneQuests(milestone.id).then(res => {
        setQuests(res);
        setLoadingQuests(false);
      });
    } else {
      const nextOrder = allMilestones.length + 1;
      setActiveTab('info');
      setMsId(`ms_${String(nextOrder).padStart(2, '0')}`);
      setStageId(stages[0]?.id || 'stage_01');
      setTitle('');
      setNejUnit(`Bài ${nextOrder}`);
      setOrderIndex(nextOrder);
      setCommunicationContext('');
      setIsActive(true);
      setXpReward(50);
      setActivePointsReward(70);
      setPrerequisiteMilestoneId('');
      setWhitelist(null);
      setQuests([]);
    }
  }, [isOpen, milestone]);

  if (!isOpen) return null;

  const showMessage = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showMessage('error', 'Vui lòng nhập tiêu đề cột mốc.');
      return;
    }
    setSaving(true);
    const payload: Partial<Milestone> = {
      id: msId.trim() || `ms_${Date.now()}`,
      stageId,
      stage_id: stageId,
      title: title.trim(),
      nejUnit: nejUnit.trim(),
      orderIndex: Number(orderIndex),
      order_index: Number(orderIndex),
      communicationContext: communicationContext.trim(),
      xpReward: Number(xpReward),
      activePointsReward: Number(activePointsReward),
      prerequisiteMilestoneId: prerequisiteMilestoneId || null,
      isActive,
      active: isActive
    };

    if (isEditing && milestone) {
      const ok = await adminService.updateMilestone(milestone.id, payload);
      setSaving(false);
      if (ok) {
        onMilestoneSaved({ ...milestone, ...payload, id: milestone.id }, false);
        showMessage('success', 'Đã cập nhật thông tin cột mốc lên Firestore.');
      } else {
        showMessage('error', 'Không thể cập nhật cột mốc.');
      }
    } else {
      try {
        const created = await adminService.createMilestone(payload);
        setSaving(false);
        onMilestoneSaved(created, true);
        onClose();
      } catch {
        setSaving(false);
        showMessage('error', 'Không thể tạo cột mốc mới.');
      }
    }
  };

  const handleSaveGameplayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    setSaving(true);
    const ok = await adminService.updateMilestoneGameplayConfig(milestone.id, {
      xpReward: Number(xpReward),
      activePointsReward: Number(activePointsReward),
      prerequisiteMilestoneId: prerequisiteMilestoneId || null
    });
    setSaving(false);
    if (ok) {
      onMilestoneSaved(
        {
          ...milestone,
          xpReward: Number(xpReward),
          activePointsReward: Number(activePointsReward),
          prerequisiteMilestoneId: prerequisiteMilestoneId || null
        },
        false
      );
      showMessage('success', 'Đã lưu cấu hình cân bằng Gameplay & điều kiện mở khóa.');
    } else {
      showMessage('error', 'Không thể lưu cấu hình Gameplay.');
    }
  };

  const handleAddWhitelistVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    if (!newTerm.trim() || !newMeaningVi.trim()) {
      showMessage('error', 'Vui lòng nhập từ tiếng Nhật và nghĩa tiếng Việt.');
      return;
    }
    setSaving(true);
    try {
      const created = await adminService.addWhitelistVocabItem(milestone.id, {
        term: newTerm,
        reading: newReading || newTerm,
        sinoVietnamese: newSinoVi,
        vietnameseMeaning: newMeaningVi,
        whitelistTier: newTier
      });
      setWhitelist(prev =>
        prev
          ? { ...prev, vocabulary: [created, ...prev.vocabulary] }
          : { milestoneId: milestone.id, vocabulary: [created], kanji: [], grammar: [] }
      );
      if (onWhitelistVocabAdded) onWhitelistVocabAdded(created);
      setNewTerm('');
      setNewReading('');
      setNewSinoVi('');
      setNewMeaningVi('');
      showMessage('success', `Đã thêm "${created.term}" vào Whitelist của cột mốc.`);
    } catch {
      showMessage('error', 'Không thể thêm từ vào Whitelist.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuest = async (quest: MilestoneQuest) => {
    setSaving(true);
    try {
      const saved = await adminService.saveMilestoneQuest(quest);
      setQuests(prev => prev.map(q => (q.id === saved.id ? saved : q)));
      setEditingQuestId(null);
      showMessage('success', `Đã lưu bài học "${saved.title}" lên Firestore.`);
    } catch {
      showMessage('error', 'Không thể lưu bài học Quest.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewQuest = async () => {
    if (!milestone) return;
    const nextStep = quests.length + 1;
    const newQuest: MilestoneQuest = {
      id: `${milestone.id}_quest_${nextStep}_${Date.now().toString(36)}`,
      milestoneId: milestone.id,
      stepIndex: nextStep,
      questType: 'FLASHCARD_SRS',
      title: `Bài ${nextStep}: Thử thách bổ sung`,
      description: 'Mô tả nội dung bài luyện tập tại mốc.',
      xpReward: 50,
      activePointsReward: 25
    };
    setSaving(true);
    try {
      const saved = await adminService.saveMilestoneQuest(newQuest);
      setQuests(prev => [...prev, saved]);
      setEditingQuestId(saved.id);
      showMessage('success', 'Đã thêm bài học Quest mới.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    setSaving(true);
    await adminService.deleteMilestoneQuest(questId);
    setQuests(prev => prev.filter(q => q.id !== questId));
    setSaving(false);
    showMessage('success', 'Đã xóa bài học Quest.');
  };

  const handleDeleteMilestone = async () => {
    if (!milestone) return;
    setSaving(true);
    const ok = await adminService.deleteMilestone(milestone.id);
    setSaving(false);
    if (ok) {
      onMilestoneDeleted(milestone.id);
      onClose();
    } else {
      showMessage('error', 'Không thể xóa cột mốc.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {isEditing ? milestone?.title || `Cột mốc ${milestone?.id}` : 'Thêm Cột mốc học tập mới'}
                </h3>
                {isEditing && (
                  <Badge variant="outline" className={isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}>
                    {isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {isEditing ? `ID: ${milestone?.id} • Thuộc chặng: ${stageId}` : 'Khởi tạo mốc mới trong lộ trình KIZUNA'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        {isEditing && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-1 overflow-x-auto pt-2">
            {[
              { id: 'info' as const, label: 'Thông tin & Hiển thị', icon: Layers },
              { id: 'gameplay' as const, label: 'Cân bằng Gameplay', icon: Sliders },
              { id: 'whitelist' as const, label: 'Whitelist Kiến thức', icon: BookOpen },
              { id: 'quests' as const, label: '4 Bài học (Quests)', icon: ListChecks },
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: THÔNG TIN CỘT MỐC & BẬT/TẮT HIỂN THỊ */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-5">
              {/* Toggle Active */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {isActive ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    <span>Trạng thái hiển thị trên Bản đồ Học viên (`isActive`)</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Khi tắt hiển thị, mốc này sẽ tạm ẩn hoặc chuyển sang trạng thái "Đang bảo trì/Sắp ra mắt" đối với học viên.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(prev => !prev)}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
                      isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mã Cột mốc (ID)</Label>
                  <Input
                    value={msId}
                    disabled={isEditing}
                    onChange={e => setMsId(e.target.value)}
                    placeholder="ms_01"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Thuộc Chặng học</Label>
                  <select
                    value={stageId}
                    onChange={e => setStageId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title || s.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Thứ tự Mốc (`orderIndex`)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={orderIndex}
                    onChange={e => setOrderIndex(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Tiêu đề Tiếng Việt của Cột mốc</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ví dụ: Giới thiệu bản thân & Nghề nghiệp"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bài giáo trình (`nejUnit`)</Label>
                  <Input
                    value={nejUnit}
                    onChange={e => setNejUnit(e.target.value)}
                    placeholder="Bài 1 / Unit 1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bối cảnh giao tiếp thực tế (`communicationContext`)</Label>
                <textarea
                  rows={3}
                  value={communicationContext}
                  onChange={e => setCommunicationContext(e.target.value)}
                  placeholder="Mô tả tình huống giao tiếp người Nhật sử dụng kiến thức của mốc này..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                {isEditing ? (
                  !confirmDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(true)}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" /> Xóa Cột mốc
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        onClick={handleDeleteMilestone}
                        className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      >
                        Xác nhận xóa vĩnh viễn
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(false)}
                        className="cursor-pointer"
                      >
                        Hủy
                      </Button>
                    </div>
                  )
                ) : (
                  <div />
                )}

                <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
                  <Save className="w-4 h-4 mr-1.5" />
                  {saving ? 'Đang lưu...' : isEditing ? 'Lưu thông tin Mốc' : 'Tạo Cột mốc'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: MODAL CÂN BẰNG GAMEPLAY & ĐIỀU KIỆN MỞ KHÓA */}
          {activeTab === 'gameplay' && isEditing && (
            <form onSubmit={handleSaveGameplayConfig} className="space-y-5">
              <div className="p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  Cân bằng Phần thưởng & Điều kiện Tiên quyết (Gamification Balance)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Điều chỉnh lượng XP, Điểm Năng Động (Active Points) thưởng khi hoàn thành mốc và ràng buộc mốc phải vượt qua trước đó.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <Label className="text-xs font-bold uppercase text-orange-600 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Điểm Kinh Nghiệm (`xpReward`)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={xpReward}
                    onChange={e => setXpReward(Number(e.target.value))}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Mặc định mốc sơ cấp: 50 XP, mốc nâng cao: 80–120 XP.</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <Label className="text-xs font-bold uppercase text-emerald-600 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Điểm Năng Động (`activePointsReward`)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={activePointsReward}
                    onChange={e => setActivePointsReward(Number(e.target.value))}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Dùng để đua Top Bảng Xếp Hạng (mặc định: 70 AP).</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  Mốc Điều kiện Tiên quyết (`prerequisiteMilestoneId`)
                </Label>
                <select
                  value={prerequisiteMilestoneId}
                  onChange={e => setPrerequisiteMilestoneId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Không yêu cầu (Mở sẵn từ đầu) --</option>
                  {allMilestones
                    .filter(m => m.id !== milestone?.id)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.id}] {m.title || `Cột mốc ${m.orderIndex || m.order_index}`}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Học viên bắt buộc phải hoàn thành mốc tiên quyết này (hoặc vượt qua qua Placement Test) trước khi mở khóa.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
                  <Save className="w-4 h-4 mr-1.5" />
                  {saving ? 'Đang lưu...' : 'Lưu Cân Bằng Gameplay'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: QUẢN TRỊ WHITELIST THEO MỐC */}
          {activeTab === 'whitelist' && isEditing && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Ranh giới Tri thức cho AI Sensei (Knowledge Whitelist)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh mục từ vựng, chữ Hán và ngữ pháp của mốc được truyền vào System Prompt để AI Sensei chấm bài sát trình độ.
                </p>
              </div>

              {/* Form thêm nhanh từ vựng vào Whitelist */}
              <form onSubmit={handleAddWhitelistVocab} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="text-xs font-bold uppercase text-red-600 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Thêm nhanh từ vựng vào Whitelist của Mốc `{milestone?.id}`
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Input
                    placeholder="Từ (Kanji/Kana)"
                    value={newTerm}
                    onChange={e => setNewTerm(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Cách đọc (Hiragana)"
                    value={newReading}
                    onChange={e => setNewReading(e.target.value)}
                  />
                  <Input
                    placeholder="Âm Hán Việt"
                    value={newSinoVi}
                    onChange={e => setNewSinoVi(e.target.value)}
                  />
                  <select
                    value={newTier}
                    onChange={e => setNewTier(e.target.value as 'CORE' | 'SUPPLEMENTARY')}
                    className="h-10 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="CORE">Trọng tâm (Core)</option>
                    <option value="SUPPLEMENTARY">Mở rộng (Supp)</option>
                  </select>
                </div>
                <div className="flex gap-2.5">
                  <Input
                    placeholder="Nghĩa tiếng Việt chuẩn ngữ cảnh..."
                    value={newMeaningVi}
                    onChange={e => setNewMeaningVi(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white shrink-0 cursor-pointer">
                    <Plus className="w-4 h-4 mr-1" /> Thêm vào Whitelist
                  </Button>
                </div>
              </form>

              {/* Sub-tabs */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWhitelistSubTab('vocab')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    whitelistSubTab === 'vocab' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Từ vựng ({whitelist?.vocabulary.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setWhitelistSubTab('kanji')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    whitelistSubTab === 'kanji' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Kanji ({whitelist?.kanji.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setWhitelistSubTab('grammar')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    whitelistSubTab === 'grammar' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Ngữ pháp ({whitelist?.grammar.length || 0})
                </button>
              </div>

              {loadingWhitelist ? (
                <div className="py-8 text-center text-xs text-slate-500">Đang tải Whitelist của cột mốc...</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {whitelistSubTab === 'vocab' && (
                    whitelist?.vocabulary.length ? (
                      whitelist.vocabulary.map(v => (
                        <div key={v.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{v.term || v.kanji}</span>
                              <span className="text-xs text-slate-500">({v.reading || v.kana})</span>
                              {v.sinoVietnamese && (
                                <span className="text-[11px] font-bold text-red-600 uppercase">[{v.sinoVietnamese}]</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {v.vietnameseMeaning || v.meaning}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {v.whitelistTier === 'SUPPLEMENTARY' ? 'Mở rộng' : 'Trọng tâm'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-6 text-center">Chưa có từ vựng nào gắn trực tiếp `milestoneId = {milestone?.id}`. Hãy thêm ở form phía trên.</p>
                    )
                  )}

                  {whitelistSubTab === 'kanji' && (
                    whitelist?.kanji.length ? (
                      whitelist.kanji.map(k => (
                        <div key={k.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-serif font-bold text-slate-900 dark:text-white">{k.kanji || k.id}</span>
                            <div>
                              <div className="text-xs font-bold text-red-600 uppercase">{k.sinoVietnamese || k.hanviet}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-300">{k.vietnameseMeaning || k.meaning}</div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">{k.strokeCount ? `${k.strokeCount} nét` : ''}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-6 text-center">Chưa có chữ Hán nào gắn riêng cho cột mốc này.</p>
                    )
                  )}

                  {whitelistSubTab === 'grammar' && (
                    whitelist?.grammar.length ? (
                      whitelist.grammar.map(g => (
                        <div key={g.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{g.pattern || g.title}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{g.titleVi || g.explanation}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-6 text-center">Chưa có cấu trúc ngữ pháp nào gắn riêng cho cột mốc này.</p>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUẢN LÝ 4 BÀI HỌC QUESTS TRONG MỐC */}
          {activeTab === 'quests' && isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    Chuỗi 4 Bài học tại Cột mốc (`milestone_quests`)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cấu hình tên bài, loại thử thách và điểm thưởng cho từng bước trong phòng luyện tập Quest Room.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewQuest}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" /> Thêm Quest
                </Button>
              </div>

              {loadingQuests ? (
                <div className="py-8 text-center text-xs text-slate-500">Đang tải danh sách Quests...</div>
              ) : (
                <div className="space-y-3">
                  {quests.map(q => {
                    const isEditingThis = editingQuestId === q.id;
                    return (
                      <div key={q.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-extrabold text-xs flex items-center justify-center">
                              #{q.stepIndex}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">{q.title}</div>
                              <div className="text-xs text-slate-500">{q.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline">{q.questType}</Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingQuestId(isEditingThis ? null : q.id)}
                              className="text-xs text-red-600 cursor-pointer"
                            >
                              {isEditingThis ? 'Đóng' : 'Sửa'}
                            </Button>
                          </div>
                        </div>

                        {isEditingThis && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <Label className="text-[11px] font-semibold">Thứ tự bước (1-4)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={q.stepIndex}
                                  onChange={e =>
                                    setQuests(prev =>
                                      prev.map(item => (item.id === q.id ? { ...item, stepIndex: Number(e.target.value) } : item))
                                    )
                                  }
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <Label className="text-[11px] font-semibold">Loại bài tập (`questType`)</Label>
                                <select
                                  value={q.questType}
                                  onChange={e =>
                                    setQuests(prev =>
                                      prev.map(item => (item.id === q.id ? { ...item, questType: e.target.value } : item))
                                    )
                                  }
                                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                                >
                                  <option value="FLASHCARD_SRS">FLASHCARD_SRS (Thẻ lật 3D)</option>
                                  <option value="VOCAB_GATEKEEPER">VOCAB_GATEKEEPER (Phản xạ 100%)</option>
                                  <option value="GRAMMAR_SCRAMBLE">GRAMMAR_SCRAMBLE (Ghép câu ngữ pháp)</option>
                                  <option value="CLOZE_PRACTICE">CLOZE_PRACTICE (Điền khuyết thực chiến)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <Label className="text-[11px] font-semibold">Tiêu đề bài học</Label>
                              <Input
                                value={q.title}
                                onChange={e =>
                                  setQuests(prev =>
                                    prev.map(item => (item.id === q.id ? { ...item, title: e.target.value } : item))
                                  )
                                }
                              />
                            </div>

                            <div>
                              <Label className="text-[11px] font-semibold">Mô tả hướng dẫn</Label>
                              <Input
                                value={q.description || ''}
                                onChange={e =>
                                  setQuests(prev =>
                                    prev.map(item => (item.id === q.id ? { ...item, description: e.target.value } : item))
                                  )
                                }
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <Label className="text-[11px] font-semibold">Thưởng XP</Label>
                                <Input
                                  type="number"
                                  value={q.xpReward ?? 50}
                                  onChange={e =>
                                    setQuests(prev =>
                                      prev.map(item => (item.id === q.id ? { ...item, xpReward: Number(e.target.value) } : item))
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-[11px] font-semibold">Thưởng Điểm Năng Động (AP)</Label>
                                <Input
                                  type="number"
                                  value={q.activePointsReward ?? 25}
                                  onChange={e =>
                                    setQuests(prev =>
                                      prev.map(item =>
                                        item.id === q.id ? { ...item, activePointsReward: Number(e.target.value) } : item
                                      )
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex justify-between pt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteQuest(q.id)}
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa Quest
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={saving}
                                onClick={() => handleSaveQuest(q)}
                                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5 mr-1" /> Lưu Quest này
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
