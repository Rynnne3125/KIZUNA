import React, { useState, useEffect } from 'react';
import { Stage } from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { X, Map, Trash2, Save, AlertCircle } from 'lucide-react';

interface StageEditorModalProps {
  isOpen: boolean;
  stage: Stage | null; // null = tạo mới, khác null = chỉnh sửa
  nextOrderIndex?: number;
  onClose: () => void;
  onStageSaved: (saved: Stage, isNew: boolean) => void;
  onStageDeleted: (stageId: string) => void;
}

export const StageEditorModal: React.FC<StageEditorModalProps> = ({
  isOpen,
  stage,
  nextOrderIndex = 1,
  onClose,
  onStageSaved,
  onStageDeleted
}) => {
  const isEditing = Boolean(stage);
  const [stageId, setStageId] = useState('');
  const [title, setTitle] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [description, setDescription] = useState('');
  const [jlptLevel, setJlptLevel] = useState('N5');
  const [colorStart, setColorStart] = useState('#ef4444');
  const [colorEnd, setColorEnd] = useState('#f97316');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stage) {
      setStageId(stage.id);
      setTitle(stage.title || '');
      setOrderIndex(Number(stage.orderIndex ?? stage.order_index ?? 1));
      setDescription(stage.description || '');
      setJlptLevel(stage.jlptLevel || 'N5');
      setColorStart(stage.colorGradient?.[0] || stage.themeColor || '#ef4444');
      setColorEnd(stage.colorGradient?.[1] || stage.themeColor || '#f97316');
    } else {
      setStageId(`stage_0${nextOrderIndex}`);
      setTitle('');
      setOrderIndex(nextOrderIndex);
      setDescription('');
      setJlptLevel('N5');
      setColorStart('#ef4444');
      setColorEnd('#f97316');
    }
    setConfirmDelete(false);
    setError(null);
  }, [stage, nextOrderIndex, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề chặng học.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload: Partial<Stage> = {
        id: stageId.trim() || `stage_${Date.now()}`,
        title: title.trim(),
        orderIndex: Number(orderIndex),
        order_index: Number(orderIndex),
        description: description.trim(),
        jlptLevel,
        themeColor: colorStart,
        colorGradient: [colorStart, colorEnd]
      };

      if (isEditing && stage) {
        const ok = await adminService.updateStage(stage.id, payload);
        if (ok) {
          onStageSaved({ ...stage, ...payload, id: stage.id }, false);
          onClose();
        } else {
          setError('Không thể cập nhật chặng học.');
        }
      } else {
        const created = await adminService.createStage(payload);
        onStageSaved(created, true);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi lưu chặng học.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!stage) return;
    setSaving(true);
    const ok = await adminService.deleteStage(stage.id);
    setSaving(false);
    if (ok) {
      onStageDeleted(stage.id);
      onClose();
    } else {
      setError('Không thể xóa chặng học này.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
              style={{ background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})` }}
            >
              <Map className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {isEditing ? `Chỉnh sửa Chặng: ${stage?.id}` : 'Thêm Chặng học mới'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Đồng bộ trực tiếp lên Firestore `stages`</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mã Chặng (ID)</Label>
              <Input
                value={stageId}
                disabled={isEditing}
                onChange={e => setStageId(e.target.value)}
                placeholder="stage_01"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Thứ tự hiển thị</Label>
              <Input
                type="number"
                min={1}
                value={orderIndex}
                onChange={e => setOrderIndex(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cấp độ JLPT</Label>
              <select
                value={jlptLevel}
                onChange={e => setJlptLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="N5">JLPT N5</option>
                <option value="N4">JLPT N4</option>
                <option value="N3">JLPT N3</option>
                <option value="N2">JLPT N2</option>
                <option value="N1">JLPT N1</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tiêu đề Chặng học</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ví dụ: Chặng 1: Bảng chữ cái & Giao tiếp căn bản"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mô tả mục tiêu của Chặng</Label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả nội dung và kỹ năng học viên đạt được sau khi hoàn thành chặng này..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Màu chủ đạo (Start)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorStart}
                  onChange={e => setColorStart(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                />
                <Input value={colorStart} onChange={e => setColorStart(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Màu chuyển sắc (End)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorEnd}
                  onChange={e => setColorEnd(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                />
                <Input value={colorEnd} onChange={e => setColorEnd(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            {isEditing ? (
              !confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full sm:w-auto h-10 border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Xóa Chặng
                </Button>
              ) : (
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={handleDelete}
                    className="h-10 sm:h-9 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  >
                    Xác nhận xóa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    className="h-10 sm:h-9 cursor-pointer"
                  >
                    Hủy
                  </Button>
                </div>
              )
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="h-10 cursor-pointer">
                Đóng
              </Button>
              <Button type="submit" disabled={saving} className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 cursor-pointer">
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? 'Đang lưu...' : isEditing ? 'Lưu cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
