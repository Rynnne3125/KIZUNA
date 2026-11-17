import React, { useState, useEffect } from 'react';
import {
  VocabularyItem, GrammarItem, KanjiDictionary, JlptExam, Milestone
} from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { X, BookOpen, FileText, GraduationCap, Trash2, Save, AlertCircle } from 'lucide-react';

export type ContentKind = 'vocabulary' | 'grammar' | 'kanji' | 'exam';

interface ContentEditorModalProps {
  isOpen: boolean;
  kind: ContentKind;
  item: any | null; // null = Thêm mới, khác null = Chỉnh sửa
  milestones?: Milestone[];
  onClose: () => void;
  onSaved: (kind: ContentKind, savedItem: any, isNew: boolean) => void;
  onDeleted: (kind: ContentKind, id: string) => void;
}

export const ContentEditorModal: React.FC<ContentEditorModalProps> = ({
  isOpen,
  kind,
  item,
  milestones = [],
  onClose,
  onSaved,
  onDeleted
}) => {
  const isEditing = Boolean(item);
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields
  const [level, setLevel] = useState('N5');
  const [milestoneId, setMilestoneId] = useState('');

  // Vocabulary fields
  const [term, setTerm] = useState('');
  const [reading, setReading] = useState('');
  const [sinoVietnamese, setSinoVietnamese] = useState('');
  const [vietnameseMeaning, setVietnameseMeaning] = useState('');
  const [wordType, setWordType] = useState('Danh từ');
  const [exampleSentenceJp, setExampleSentenceJp] = useState('');
  const [exampleSentenceVi, setExampleSentenceVi] = useState('');

  // Grammar fields
  const [pattern, setPattern] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [explanation, setExplanation] = useState('');
  const [nuanceReason, setNuanceReason] = useState('');
  const [masterExampleJp, setMasterExampleJp] = useState('');
  const [masterExampleVi, setMasterExampleVi] = useState('');

  // Kanji fields
  const [kanjiChar, setKanjiChar] = useState('');
  const [onyomi, setOnyomi] = useState('');
  const [kunyomi, setKunyomi] = useState('');
  const [strokeCount, setStrokeCount] = useState(4);
  const [radicals, setRadicals] = useState('');
  const [mnemonicStory, setMnemonicStory] = useState('');

  // Exam fields
  const [examLabel, setExamLabel] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(105);
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [examYear, setExamYear] = useState(2024);
  const [examMonth, setExamMonth] = useState(7);
  const [audioUrl, setAudioUrl] = useState('');
  const [explanationCount, setExplanationCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);
    setError(null);

    if (item) {
      const normalizedLvl = String(item.level || item.jlptLevel || 'N5').toUpperCase();
      setLevel(['N5', 'N4', 'N3', 'N2', 'N1'].includes(normalizedLvl) ? normalizedLvl : 'N5');
      setMilestoneId(String(item.milestoneId || item.milestone_id || ''));

      if (kind === 'vocabulary') {
        setTerm(String(item.term || item.kanji || ''));
        setReading(String(item.reading || item.kana || ''));
        setSinoVietnamese(String(item.sinoVietnamese || ''));
        setVietnameseMeaning(String(item.vietnameseMeaning || item.meaning || ''));
        setWordType(String(item.wordType || 'Danh từ'));
        setExampleSentenceJp(String(item.exampleSentenceJp || ''));
        setExampleSentenceVi(String(item.exampleSentenceVi || ''));
      } else if (kind === 'grammar') {
        setPattern(String(item.pattern || item.title || ''));
        setTitleVi(String(item.titleVi || item.meaning || ''));
        setExplanation(String(item.explanation || item.meaning || ''));
        setNuanceReason(String(item.nuanceReason || ''));
        setMasterExampleJp(String(item.masterExampleJp || ''));
        setMasterExampleVi(String(item.masterExampleVi || ''));
      } else if (kind === 'kanji') {
        setKanjiChar(String(item.kanji || item.id || ''));
        setSinoVietnamese(String(item.sinoVietnamese || item.hanviet || ''));
        setVietnameseMeaning(String(item.vietnameseMeaning || item.meaning || ''));
        setOnyomi(String(item.onyomi || ''));
        setKunyomi(String(item.kunyomi || ''));
        setStrokeCount(Number(item.strokeCount || 4));
        setRadicals(String(item.radicals || ''));
        setMnemonicStory(String(item.mnemonicStory || ''));
      } else if (kind === 'exam') {
        setExamLabel(String(item.label || item.title || item.id || ''));
        setDurationMinutes(Number(item.durationMinutes || 105));
        setTotalQuestions(Number(item.totalQuestions ?? item.questionCount ?? 50));
        setExamYear(Number(item.year || 2024));
        setExamMonth(Number(item.month || 7));
        setAudioUrl(String(item.audioUrl || ''));
        setExplanationCount(Number(item.explanationCount ?? 0));
      }
    } else {
      setLevel('N5');
      setMilestoneId('');
      setTerm('');
      setReading('');
      setSinoVietnamese('');
      setVietnameseMeaning('');
      setWordType('Danh từ');
      setExampleSentenceJp('');
      setExampleSentenceVi('');
      setPattern('');
      setTitleVi('');
      setExplanation('');
      setNuanceReason('');
      setMasterExampleJp('');
      setMasterExampleVi('');
      setKanjiChar('');
      setOnyomi('');
      setKunyomi('');
      setStrokeCount(4);
      setRadicals('');
      setMnemonicStory('');
      setExamLabel('');
      setDurationMinutes(105);
      setTotalQuestions(50);
      setExamYear(new Date().getFullYear());
      setExamMonth(7);
      setAudioUrl('');
      setExplanationCount(0);
    }
  }, [isOpen, kind, item]);

  if (!isOpen) return null;

  const getHeaderTitle = () => {
    if (kind === 'vocabulary') return isEditing ? 'Chỉnh sửa Từ vựng' : 'Thêm Từ vựng mới';
    if (kind === 'grammar') return isEditing ? 'Chỉnh sửa Ngữ pháp' : 'Thêm Mẫu ngữ pháp mới';
    if (kind === 'kanji') return isEditing ? 'Chỉnh sửa Chữ Hán (Kanji)' : 'Thêm Chữ Hán (Kanji) mới';
    return isEditing ? 'Quản lý & Chỉnh sửa Đề thi JLPT' : 'Tạo Đề thi JLPT mới';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (kind === 'vocabulary') {
        if (!term.trim() || !vietnameseMeaning.trim()) {
          setError('Vui lòng nhập Từ (Kanji/Kana) và Nghĩa tiếng Việt.');
          setSaving(false);
          return;
        }
        const payload: Partial<VocabularyItem> = {
          term: term.trim(),
          reading: (reading || term).trim(),
          sinoVietnamese: sinoVietnamese.trim().toUpperCase(),
          vietnameseMeaning: vietnameseMeaning.trim(),
          wordType,
          level,
          milestoneId,
          exampleSentenceJp: exampleSentenceJp.trim(),
          exampleSentenceVi: exampleSentenceVi.trim()
        };
        if (isEditing && item) {
          const ok = await adminService.updateVocabulary(item.id, payload);
          if (ok) {
            onSaved('vocabulary', { ...item, ...payload, id: item.id, kanji: term.trim(), kana: (reading || term).trim(), meaning: vietnameseMeaning.trim() }, false);
            onClose();
          } else setError('Không thể cập nhật từ vựng.');
        } else {
          const created = await adminService.createVocabulary(payload);
          onSaved('vocabulary', created, true);
          onClose();
        }
      } else if (kind === 'grammar') {
        if (!pattern.trim() || !titleVi.trim()) {
          setError('Vui lòng nhập Mẫu câu ngữ pháp và Ý nghĩa tiếng Việt.');
          setSaving(false);
          return;
        }
        const payload: Partial<GrammarItem> = {
          pattern: pattern.trim(),
          titleVi: titleVi.trim(),
          explanation: (explanation || titleVi).trim(),
          nuanceReason: nuanceReason.trim(),
          masterExampleJp: masterExampleJp.trim(),
          masterExampleVi: masterExampleVi.trim(),
          level,
          milestoneId
        };
        if (isEditing && item) {
          const ok = await adminService.updateGrammar(item.id, payload);
          if (ok) {
            onSaved('grammar', { ...item, ...payload, id: item.id, title: pattern.trim(), meaning: titleVi.trim() }, false);
            onClose();
          } else setError('Không thể cập nhật ngữ pháp.');
        } else {
          const created = await adminService.createGrammar(payload);
          onSaved('grammar', created, true);
          onClose();
        }
      } else if (kind === 'kanji') {
        if (!kanjiChar.trim() || !vietnameseMeaning.trim()) {
          setError('Vui lòng nhập Chữ Hán và Nghĩa tiếng Việt.');
          setSaving(false);
          return;
        }
        const payload: Partial<KanjiDictionary> = {
          kanji: kanjiChar.trim(),
          sinoVietnamese: sinoVietnamese.trim().toUpperCase(),
          vietnameseMeaning: vietnameseMeaning.trim(),
          onyomi: onyomi.trim(),
          kunyomi: kunyomi.trim(),
          strokeCount: Number(strokeCount || 1),
          radicals: radicals.trim(),
          mnemonicStory: mnemonicStory.trim(),
          level,
          milestoneId
        };
        if (isEditing && item) {
          const ok = await adminService.updateKanji(item.id, payload);
          if (ok) {
            onSaved('kanji', { ...item, ...payload, id: item.id, hanviet: sinoVietnamese.trim().toUpperCase(), meaning: vietnameseMeaning.trim() }, false);
            onClose();
          } else setError('Không thể cập nhật Kanji.');
        } else {
          const created = await adminService.createKanji(payload);
          onSaved('kanji', created, true);
          onClose();
        }
      } else if (kind === 'exam') {
        if (!examLabel.trim()) {
          setError('Vui lòng nhập Tên đề thi JLPT.');
          setSaving(false);
          return;
        }
        const payload: Partial<JlptExam> = {
          label: examLabel.trim(),
          title: examLabel.trim(),
          level,
          durationMinutes: Number(durationMinutes || 105),
          totalQuestions: Number(totalQuestions || 50),
          questionCount: Number(totalQuestions || 50),
          actualQuestionCount: Number(totalQuestions || 50),
          year: Number(examYear || 2024),
          month: Number(examMonth || 7),
          audioUrl: audioUrl.trim(),
          explanationCount: Number(explanationCount || 0)
        };
        if (isEditing && item) {
          const ok = await adminService.updateExam(item.id, payload);
          if (ok) {
            onSaved('exam', { ...item, ...payload, id: item.id }, false);
            onClose();
          } else setError('Không thể cập nhật đề thi.');
        } else {
          const created = await adminService.createExam(payload);
          onSaved('exam', created, true);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi lưu dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setSaving(true);
    let ok = false;
    if (kind === 'vocabulary') ok = await adminService.deleteVocabulary(item.id);
    else if (kind === 'grammar') ok = await adminService.deleteGrammar(item.id);
    else if (kind === 'kanji') ok = await adminService.deleteKanji(item.id);
    else if (kind === 'exam') ok = await adminService.deleteExam(item.id);

    setSaving(false);
    if (ok) {
      onDeleted(kind, item.id);
      onClose();
    } else {
      setError('Không thể xóa bản ghi này.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-sm">
              {kind === 'vocabulary' ? (
                <BookOpen className="w-5 h-5" />
              ) : kind === 'exam' ? (
                <GraduationCap className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{getHeaderTitle()}</h3>
              <p className="text-xs text-slate-500">
                {isEditing ? `ID: ${item?.id}` : 'Lưu trực tiếp vào kho học liệu hệ thống'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Common Level & Milestone Link */}
          <div className={`grid grid-cols-1 ${kind === 'exam' ? '' : 'sm:grid-cols-2'} gap-3`}>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cấp độ JLPT</Label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="N5">JLPT N5</option>
                <option value="N4">JLPT N4</option>
                <option value="N3">JLPT N3</option>
                <option value="N2">JLPT N2</option>
                <option value="N1">JLPT N1</option>
              </select>
            </div>

            {kind !== 'exam' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gắn với Cột mốc (`milestoneId`)</Label>
                <select
                  value={milestoneId}
                  onChange={e => setMilestoneId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Kho chung (Tất cả mốc) --</option>
                  {safeMilestones.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.title || `Cột mốc ${m.orderIndex || m.order_index}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ================= 1. VOCABULARY FORM ================= */}
          {kind === 'vocabulary' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Từ vựng (Kanji / Kana) *</Label>
                  <Input
                    value={term}
                    onChange={e => setTerm(e.target.value)}
                    placeholder="Ví dụ: 学生"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cách đọc (Hiragana)</Label>
                  <Input
                    value={reading}
                    onChange={e => setReading(e.target.value)}
                    placeholder="Ví dụ: がくせい"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Âm Hán Việt</Label>
                  <Input
                    value={sinoVietnamese}
                    onChange={e => setSinoVietnamese(e.target.value)}
                    placeholder="Ví dụ: HỌC SINH"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Từ loại (`wordType`)</Label>
                  <select
                    value={wordType}
                    onChange={e => setWordType(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="Danh từ">Danh từ (名詞)</option>
                    <option value="Động từ nhóm 1">Động từ nhóm 1 (五段)</option>
                    <option value="Động từ nhóm 2">Động từ nhóm 2 (一段)</option>
                    <option value="Động từ nhóm 3">Động từ nhóm 3 (불규칙)</option>
                    <option value="Tính từ -i">Tính từ đuôi -i (い形容詞)</option>
                    <option value="Tính từ -na">Tính từ đuôi -na (な形容詞)</option>
                    <option value="Phó từ">Phó từ (副詞)</option>
                    <option value="Cụm giao tiếp">Cụm giao tiếp</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nghĩa Tiếng Việt *</Label>
                <Input
                  value={vietnameseMeaning}
                  onChange={e => setVietnameseMeaning(e.target.value)}
                  placeholder="Ví dụ: Học sinh, sinh viên"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Câu ví dụ tiếng Nhật</Label>
                  <Input
                    value={exampleSentenceJp}
                    onChange={e => setExampleSentenceJp(e.target.value)}
                    placeholder="私は学生です。"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dịch nghĩa câu ví dụ</Label>
                  <Input
                    value={exampleSentenceVi}
                    onChange={e => setExampleSentenceVi(e.target.value)}
                    placeholder="Tôi là sinh viên."
                  />
                </div>
              </div>
            </>
          )}

          {/* ================= 2. GRAMMAR FORM ================= */}
          {kind === 'grammar' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mẫu câu ngữ pháp (`pattern`) *</Label>
                <Input
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  placeholder="Ví dụ: N1 は N2 です"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ý nghĩa ngắn gọn (`titleVi`) *</Label>
                <Input
                  value={titleVi}
                  onChange={e => setTitleVi(e.target.value)}
                  placeholder="Ví dụ: N1 là N2 (Khẳng định lịch sự)"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Giải thích chi tiết & Cách dùng (`explanation`)</Label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Giải thích công thức ghép câu và cách sử dụng..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sắc thái giao tiếp tự nhiên của người Nhật (`nuanceReason`)</Label>
                <textarea
                  rows={2}
                  value={nuanceReason}
                  onChange={e => setNuanceReason(e.target.value)}
                  placeholder="Tại sao người Nhật dùng cấu trúc này trong thực tế..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Câu ví dụ mẫu (JP)</Label>
                  <Input
                    value={masterExampleJp}
                    onChange={e => setMasterExampleJp(e.target.value)}
                    placeholder="田中さんは会社員です。"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dịch nghĩa ví dụ (VI)</Label>
                  <Input
                    value={masterExampleVi}
                    onChange={e => setMasterExampleVi(e.target.value)}
                    placeholder="Anh Tanaka là nhân viên công ty."
                  />
                </div>
              </div>
            </>
          )}

          {/* ================= 3. KANJI FORM ================= */}
          {kind === 'kanji' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Chữ Hán (`kanji`) *</Label>
                  <Input
                    value={kanjiChar}
                    onChange={e => setKanjiChar(e.target.value)}
                    placeholder="日"
                    className="text-xl font-serif font-bold text-center"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Âm Hán Việt *</Label>
                  <Input
                    value={sinoVietnamese}
                    onChange={e => setSinoVietnamese(e.target.value)}
                    placeholder="NHẬT"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Số nét vẽ</Label>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={strokeCount}
                    onChange={e => setStrokeCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nghĩa Tiếng Việt *</Label>
                <Input
                  value={vietnameseMeaning}
                  onChange={e => setVietnameseMeaning(e.target.value)}
                  placeholder="Mặt trời, ngày, nước Nhật"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Âm On (`onyomi`)</Label>
                  <Input
                    value={onyomi}
                    onChange={e => setOnyomi(e.target.value)}
                    placeholder="ニチ, ジツ"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Âm Kun (`kunyomi`)</Label>
                  <Input
                    value={kunyomi}
                    onChange={e => setKunyomi(e.target.value)}
                    placeholder="ひ, -び, -か"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bộ thủ (`radicals`)</Label>
                  <Input
                    value={radicals}
                    onChange={e => setRadicals(e.target.value)}
                    placeholder="日 (Nhật)"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Câu chuyện mẹo nhớ (`mnemonicStory`)</Label>
                <textarea
                  rows={2}
                  value={mnemonicStory}
                  onChange={e => setMnemonicStory(e.target.value)}
                  placeholder="Hình ảnh mặt trời mọc vuông vức..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
            </>
          )}

          {/* ================= 4. EXAM FORM ================= */}
          {kind === 'exam' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tên Đề thi (`label`) *</Label>
                <Input
                  value={examLabel}
                  onChange={e => setExamLabel(e.target.value)}
                  placeholder="Ví dụ: JLPT-N3 07 2024"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Thời gian làm bài (Phút)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tổng số câu hỏi</Label>
                  <Input
                    type="number"
                    min={1}
                    max={250}
                    value={totalQuestions}
                    onChange={e => setTotalQuestions(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Số câu có lời giải</Label>
                  <Input
                    type="number"
                    min={0}
                    max={250}
                    value={explanationCount}
                    onChange={e => setExplanationCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Năm tổ chức thi (`year`)</Label>
                  <Input
                    type="number"
                    min={2010}
                    max={2035}
                    value={examYear}
                    onChange={e => setExamYear(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Đợt thi (`month`)</Label>
                  <select
                    value={examMonth}
                    onChange={e => setExamMonth(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value={7}>Đợt 1 (Tháng 7)</option>
                    <option value={12}>Đợt 2 (Tháng 12)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Đường dẫn Audio Nghe hiểu (`audioUrl`)</Label>
                <Input
                  value={audioUrl}
                  onChange={e => setAudioUrl(e.target.value)}
                  placeholder="https://firebasestorage.googleapis.com/..."
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            {isEditing ? (
              !confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Xóa mục này
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={handleDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  >
                    Xác nhận xóa
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

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                Đóng
              </Button>
              <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white cursor-pointer">
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Thêm mới'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
