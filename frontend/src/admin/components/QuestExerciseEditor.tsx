import React, { useMemo, useState } from 'react';
import {
  GrammarItem,
  KanjiDictionary,
  MilestoneQuest,
  MilestoneWhitelistData,
  QuestQuizQuestion,
  QuestRoleplayDialogue,
  QuestScrambleSentence,
  QuestSrsCard,
  VocabularyItem
} from '../types/adminTypes';
import { adminService } from '../services/adminService';
import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Layers,
  MessageCircle,
  Plus,
  Puzzle,
  Search,
  Shield,
  Sparkles,
  Trash2
} from 'lucide-react';

export function getQuestCategory(questType: string): 'SRS' | 'GATEKEEPER' | 'SCRAMBLE' | 'ROLEPLAY' {
  const t = String(questType || '').toUpperCase();
  if (t.includes('GATEKEEPER')) return 'GATEKEEPER';
  if (t.includes('SCRAMBLE') || t.includes('GRAMMAR')) return 'SCRAMBLE';
  if (t.includes('CLOZE') || t.includes('PRACTICE') || t.includes('ROLEPLAY')) return 'ROLEPLAY';
  return 'SRS';
}

export function getQuestExerciseSummary(q: MilestoneQuest): string {
  const cat = getQuestCategory(q.questType);
  if (cat === 'SRS') {
    const count = q.srsCards?.length || q.srsCardIds?.length || 0;
    return count > 0 ? `${count} thẻ SRS đã chọn` : 'Tự động lấy Whitelist mốc';
  }
  if (cat === 'GATEKEEPER') {
    const count = q.quizQuestions?.length || 0;
    return count > 0 ? `${count} câu trắc nghiệm riêng` : 'Tự sinh từ Từ vựng mốc';
  }
  if (cat === 'SCRAMBLE') {
    const count = q.scrambleSentences?.length || 0;
    return count > 0 ? `${count} câu ghép riêng` : 'Tự tách từ Ngữ pháp mốc';
  }
  const count = q.roleplayDialogues?.length || 0;
  return count > 0 ? `${count} tình huống hội thoại` : 'Tình huống mặc định của mốc';
}

interface QuestExerciseEditorProps {
  quest: MilestoneQuest;
  milestoneId: string;
  whitelist: MilestoneWhitelistData | null;
  allVocab: VocabularyItem[];
  allKanji: KanjiDictionary[];
  allGrammar: GrammarItem[];
  onChange: (updatedQuest: MilestoneQuest) => void;
  onVocabCreatedInMilestone?: (vocab: VocabularyItem) => void;
}

function vocabToCard(v: VocabularyItem): QuestSrsCard {
  return {
    id: `card_v_${v.id}`,
    sourceItemId: v.id,
    itemType: 'VOCABULARY',
    term: String(v.term || v.kanji || '').trim(),
    reading: String(v.reading || v.kana || '').trim(),
    sinoVietnamese: String(v.sinoVietnamese || '').trim(),
    meaning: String(v.vietnameseMeaning || v.meaning || '').trim(),
    wordType: String(v.wordType || 'Từ vựng').trim(),
    exampleJp: String(v.exampleSentenceJp || '').trim(),
    exampleVi: String(v.exampleSentenceVi || '').trim()
  };
}

function kanjiToCard(k: KanjiDictionary): QuestSrsCard {
  const onKun = [k.onyomi ? `On: ${k.onyomi}` : '', k.kunyomi ? `Kun: ${k.kunyomi}` : '']
    .filter(Boolean)
    .join(' · ');
  return {
    id: `card_k_${k.id}`,
    sourceItemId: k.id,
    itemType: 'KANJI',
    term: String(k.kanji || k.id || '').trim(),
    reading: onKun,
    sinoVietnamese: String(k.sinoVietnamese || k.hanviet || '').trim(),
    meaning: String(k.vietnameseMeaning || k.meaning || '').trim(),
    wordType: k.strokeCount ? `Kanji (${k.strokeCount} nét)` : 'Kanji',
    exampleJp: String(k.mnemonicStory || '').trim(),
    exampleVi: k.radicals ? `Bộ thủ: ${k.radicals}` : ''
  };
}

function grammarToCard(g: GrammarItem): QuestSrsCard {
  return {
    id: `card_g_${g.id}`,
    sourceItemId: g.id,
    itemType: 'GRAMMAR',
    term: String(g.pattern || g.title || '').trim(),
    reading: String(g.structure || '').trim(),
    meaning: String(g.titleVi || g.meaning || g.explanation || '').trim(),
    wordType: 'Ngữ pháp',
    exampleJp: String(g.masterExampleJp || '').trim(),
    exampleVi: String(g.masterExampleVi || '').trim()
  };
}

export const QuestExerciseEditor: React.FC<QuestExerciseEditorProps> = ({
  quest,
  milestoneId,
  whitelist,
  allVocab,
  allKanji,
  allGrammar,
  onChange,
  onVocabCreatedInMilestone
}) => {
  const category = getQuestCategory(quest.questType);

  // SRS Picker & Inline Creator states
  const [poolTab, setPoolTab] = useState<'vocab' | 'kanji' | 'grammar'>('vocab');
  const [poolScope, setPoolScope] = useState<'milestone' | 'all'>('milestone');
  const [poolSearch, setPoolSearch] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [showCustomCardForm, setShowCustomCardForm] = useState(false);

  const [newCardType, setNewCardType] = useState<QuestSrsCard['itemType']>('VOCABULARY');
  const [newTerm, setNewTerm] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newSino, setNewSino] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExampleJp, setNewExampleJp] = useState('');
  const [newExampleVi, setNewExampleVi] = useState('');
  const [alsoSaveToWhitelist, setAlsoSaveToWhitelist] = useState(true);
  const [busyCreating, setBusyCreating] = useState(false);

  // Quiz question creator
  const [qWord, setQWord] = useState('');
  const [qReading, setQReading] = useState('');
  const [qCorrect, setQCorrect] = useState('');
  const [qWrong1, setQWrong1] = useState('');
  const [qWrong2, setQWrong2] = useState('');
  const [qWrong3, setQWrong3] = useState('');

  // Scramble creator
  const [sOriginal, setSOriginal] = useState('');
  const [sTranslation, setSTranslation] = useState('');

  // Roleplay creator
  const [rTitle, setRTitle] = useState('');
  const [rPartnerName, setRPartnerName] = useState('Tanaka-san (田中さん)');
  const [rSpeechJp, setRSpeechJp] = useState('');
  const [rSpeechVi, setRSpeechVi] = useState('');
  const [rPrompt, setRPrompt] = useState('');
  const [rSample, setRSample] = useState('');
  const [rKeywords, setRKeywords] = useState('です');

  const srsCards: QuestSrsCard[] = quest.srsCards || [];
  const attachedSourceIds = useMemo(
    () => new Set(srsCards.map(c => c.sourceItemId || c.id)),
    [srsCards]
  );

  const updateCards = (nextCards: QuestSrsCard[]) => {
    onChange({
      ...quest,
      srsCards: nextCards,
      srsCardIds: nextCards.map(c => c.sourceItemId || c.id)
    });
  };

  // Pools for picking cards
  const vocabPool = useMemo(() => {
    const base = poolScope === 'milestone'
      ? (whitelist?.vocabulary?.length ? whitelist.vocabulary : allVocab.filter(v => (v.milestoneId || v.milestone_id) === milestoneId))
      : allVocab;
    const q = poolSearch.trim().toLowerCase();
    return base.filter(v =>
      !q ||
      String(v.term || v.kanji || '').toLowerCase().includes(q) ||
      String(v.reading || v.kana || '').toLowerCase().includes(q) ||
      String(v.vietnameseMeaning || v.meaning || '').toLowerCase().includes(q)
    );
  }, [poolScope, whitelist?.vocabulary, allVocab, milestoneId, poolSearch]);

  const kanjiPool = useMemo(() => {
    const base = poolScope === 'milestone'
      ? (whitelist?.kanji?.length ? whitelist.kanji : allKanji.filter(k => (k.milestoneId || k.milestone_id) === milestoneId))
      : allKanji;
    const q = poolSearch.trim().toLowerCase();
    return base.filter(k =>
      !q ||
      String(k.kanji || '').toLowerCase().includes(q) ||
      String(k.sinoVietnamese || k.hanviet || '').toLowerCase().includes(q) ||
      String(k.vietnameseMeaning || k.meaning || '').toLowerCase().includes(q)
    );
  }, [poolScope, whitelist?.kanji, allKanji, milestoneId, poolSearch]);

  const grammarPool = useMemo(() => {
    const base = poolScope === 'milestone'
      ? (whitelist?.grammar?.length ? whitelist.grammar : allGrammar.filter(g => (g.milestoneId || g.milestone_id) === milestoneId))
      : allGrammar;
    const q = poolSearch.trim().toLowerCase();
    return base.filter(g =>
      !q ||
      String(g.pattern || g.title || '').toLowerCase().includes(q) ||
      String(g.titleVi || g.meaning || '').toLowerCase().includes(q)
    );
  }, [poolScope, whitelist?.grammar, allGrammar, milestoneId, poolSearch]);

  const togglePoolCard = (card: QuestSrsCard) => {
    const key = card.sourceItemId || card.id;
    if (attachedSourceIds.has(key)) {
      updateCards(srsCards.filter(c => (c.sourceItemId || c.id) !== key));
    } else {
      updateCards([...srsCards, card]);
    }
  };

  const handleLoadAllMilestoneItems = (kind: 'vocab' | 'kanji' | 'grammar') => {
    const incoming: QuestSrsCard[] =
      kind === 'vocab'
        ? (whitelist?.vocabulary || []).map(vocabToCard)
        : kind === 'kanji'
        ? (whitelist?.kanji || []).map(kanjiToCard)
        : (whitelist?.grammar || []).map(grammarToCard);

    const existingKeys = new Set(srsCards.map(c => c.sourceItemId || c.id));
    const merged = [...srsCards, ...incoming.filter(c => !existingKeys.has(c.sourceItemId || c.id))];
    updateCards(merged);
  };

  const handleMoveCard = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= srsCards.length) return;
    const copy = [...srsCards];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    updateCards(copy);
  };

  const handleAddCustomCard = async () => {
    if (!newTerm.trim() || !newMeaning.trim()) return;
    setBusyCreating(true);
    try {
      let sourceItemId: string | undefined;
      if (alsoSaveToWhitelist && newCardType === 'VOCABULARY') {
        const savedVocab = await adminService.addWhitelistVocabItem(milestoneId, {
          term: newTerm.trim(),
          reading: newReading.trim() || newTerm.trim(),
          sinoVietnamese: newSino.trim(),
          vietnameseMeaning: newMeaning.trim(),
          exampleSentenceJp: newExampleJp.trim(),
          exampleSentenceVi: newExampleVi.trim(),
          whitelistTier: 'CORE'
        });
        sourceItemId = savedVocab.id;
        onVocabCreatedInMilestone?.(savedVocab);
      }

      const createdCard: QuestSrsCard = {
        id: sourceItemId ? `card_v_${sourceItemId}` : `card_custom_${Date.now().toString(36)}`,
        sourceItemId,
        itemType: newCardType,
        term: newTerm.trim(),
        reading: newReading.trim(),
        sinoVietnamese: newSino.trim().toUpperCase(),
        meaning: newMeaning.trim(),
        exampleJp: newExampleJp.trim(),
        exampleVi: newExampleVi.trim()
      };

      updateCards([...srsCards, createdCard]);
      setNewTerm('');
      setNewReading('');
      setNewSino('');
      setNewMeaning('');
      setNewExampleJp('');
      setNewExampleVi('');
      setShowCustomCardForm(false);
    } finally {
      setBusyCreating(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER 1: SRS FLASHCARDS BUILDER
  // --------------------------------------------------------------------------
  if (category === 'SRS') {
    return (
      <div className="mt-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/15 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 shrink-0" />
              <span>Bộ thẻ SRS của Quest ({srsCards.length} thẻ)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {srsCards.length > 0
                ? 'Học viên sẽ học chính xác danh sách thẻ bên dưới theo đúng thứ tự. Nhớ bấm "Lưu Quest này" sau khi chọn.'
                : 'Chưa chọn thẻ riêng. Nếu để trống, học viên sẽ học toàn bộ từ vựng trong Whitelist của cột mốc.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowCustomCardForm(prev => !prev)}
            className="h-8 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-100/60 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Tạo thẻ mới
          </Button>
        </div>

        {/* Quick batch load from milestone whitelist */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleLoadAllMilestoneItems('vocab')}
            disabled={!whitelist?.vocabulary?.length}
            className="h-7 px-2.5 text-[11px] bg-white dark:bg-slate-900 cursor-pointer"
          >
            + Nạp Từ vựng mốc ({whitelist?.vocabulary?.length || 0})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleLoadAllMilestoneItems('kanji')}
            disabled={!whitelist?.kanji?.length}
            className="h-7 px-2.5 text-[11px] bg-white dark:bg-slate-900 cursor-pointer"
          >
            + Nạp Kanji mốc ({whitelist?.kanji?.length || 0})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleLoadAllMilestoneItems('grammar')}
            disabled={!whitelist?.grammar?.length}
            className="h-7 px-2.5 text-[11px] bg-white dark:bg-slate-900 cursor-pointer"
          >
            + Nạp Ngữ pháp mốc ({whitelist?.grammar?.length || 0})
          </Button>
          {srsCards.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => updateCards([])}
              className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 cursor-pointer ml-auto"
            >
              Xóa hết ({srsCards.length})
            </Button>
          )}
        </div>

        {/* Inline create new SRS card */}
        {showCustomCardForm && (
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Tạo thẻ SRS mới trực tiếp
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={newCardType}
                onChange={e => setNewCardType(e.target.value as QuestSrsCard['itemType'])}
                className="h-9 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="VOCABULARY">Từ vựng</option>
                <option value="KANJI">Chữ Hán (Kanji)</option>
                <option value="GRAMMAR">Ngữ pháp</option>
                <option value="CUSTOM">Thẻ tùy chỉnh</option>
              </select>
              <Input
                placeholder="Mặt trước (VD: 学生)"
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Cách đọc (VD: がくせい)"
                value={newReading}
                onChange={e => setNewReading(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Âm Hán Việt"
                value={newSino}
                onChange={e => setNewSino(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <Input
              placeholder="Mặt sau — Nghĩa tiếng Việt *"
              value={newMeaning}
              onChange={e => setNewMeaning(e.target.value)}
              className="h-9 text-xs"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Câu ví dụ tiếng Nhật (tùy chọn)"
                value={newExampleJp}
                onChange={e => setNewExampleJp(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Dịch câu ví dụ tiếng Việt (tùy chọn)"
                value={newExampleVi}
                onChange={e => setNewExampleVi(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            {newCardType === 'VOCABULARY' && (
              <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoSaveToWhitelist}
                  onChange={e => setAlsoSaveToWhitelist(e.target.checked)}
                />
                <span>Đồng thời lưu vào Kho Từ vựng & Whitelist của cột mốc `{milestoneId}`</span>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomCardForm(false)} className="h-8 text-xs">
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busyCreating || !newTerm.trim() || !newMeaning.trim()}
                onClick={handleAddCustomCard}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {busyCreating ? 'Đang thêm...' : '+ Thêm thẻ vào Quest'}
              </Button>
            </div>
          </div>
        )}

        {/* Selected SRS cards list */}
        {srsCards.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {srsCards.map((card, idx) => {
              const isCardEditing = editingCardId === card.id;
              const badgeColor =
                card.itemType === 'KANJI'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : card.itemType === 'GRAMMAR'
                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                  : card.itemType === 'CUSTOM'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700';

              return (
                <div key={card.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${badgeColor}`}>
                        {card.itemType === 'VOCABULARY' ? 'Từ vựng' : card.itemType === 'KANJI' ? 'Kanji' : card.itemType === 'GRAMMAR' ? 'Ngữ pháp' : 'Tùy chỉnh'}
                      </Badge>
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{card.term}</span>
                      {card.reading && <span className="text-[11px] text-slate-400 truncate">({card.reading})</span>}
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">— {card.meaning}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Đưa lên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, 1)}
                        disabled={idx === srsCards.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Đưa xuống"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCardId(isCardEditing ? null : card.id)}
                        className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                        title="Sửa nội dung thẻ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCards(srsCards.filter(c => c.id !== card.id))}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Gỡ thẻ khỏi Quest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isCardEditing && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={card.term}
                        onChange={e =>
                          updateCards(srsCards.map(c => (c.id === card.id ? { ...c, term: e.target.value } : c)))
                        }
                        placeholder="Mặt trước (JP)"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={card.reading || ''}
                        onChange={e =>
                          updateCards(srsCards.map(c => (c.id === card.id ? { ...c, reading: e.target.value } : c)))
                        }
                        placeholder="Cách đọc (Kana)"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={card.meaning}
                        onChange={e =>
                          updateCards(srsCards.map(c => (c.id === card.id ? { ...c, meaning: e.target.value } : c)))
                        }
                        placeholder="Nghĩa tiếng Việt"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={card.sinoVietnamese || ''}
                        onChange={e =>
                          updateCards(srsCards.map(c => (c.id === card.id ? { ...c, sinoVietnamese: e.target.value } : c)))
                        }
                        placeholder="Âm Hán Việt"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={card.exampleJp || ''}
                        onChange={e =>
                          updateCards(srsCards.map(c => (c.id === card.id ? { ...c, exampleJp: e.target.value } : c)))
                        }
                        placeholder="Câu ví dụ JP"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={card.exampleVi || ''}
                        onChange={e =>
                          updateCards(srsCards.map(c => (c.id === card.id ? { ...c, exampleVi: e.target.value } : c)))
                        }
                        placeholder="Dịch ví dụ VI"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Picker from Milestone Whitelist or Global Catalog */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {([
                { id: 'vocab' as const, label: `Từ vựng (${vocabPool.length})` },
                { id: 'kanji' as const, label: `Kanji (${kanjiPool.length})` },
                { id: 'grammar' as const, label: `Ngữ pháp (${grammarPool.length})` }
              ]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPoolTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    poolTab === t.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPoolScope(prev => (prev === 'milestone' ? 'all' : 'milestone'))}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {poolScope === 'milestone' ? 'Đang lọc: Của mốc này' : 'Đang xem: Toàn kho'}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={poolSearch}
              onChange={e => setPoolSearch(e.target.value)}
              placeholder="Tìm từ, kanji, mẫu ngữ pháp để tick vào Quest..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {poolTab === 'vocab' &&
              (vocabPool.slice(0, 40).length > 0 ? (
                vocabPool.slice(0, 40).map(v => {
                  const selected = attachedSourceIds.has(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => togglePoolCard(vocabToCard(v))}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        selected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">
                        <b>{v.term || v.kanji}</b> <span className="text-slate-400">({v.reading || v.kana})</span> — {v.vietnameseMeaning || v.meaning}
                      </span>
                      <span className={`text-[10px] font-bold shrink-0 flex items-center gap-0.5 ${selected ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {selected ? <><Check className="w-3 h-3" /> Đã chọn</> : '+ Chọn'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-[11px] text-slate-400 py-3 text-center">Không có từ vựng phù hợp. Thử chuyển sang "Toàn kho" hoặc bấm "Tạo thẻ mới".</div>
              ))}

            {poolTab === 'kanji' &&
              (kanjiPool.slice(0, 40).length > 0 ? (
                kanjiPool.slice(0, 40).map(k => {
                  const selected = attachedSourceIds.has(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => togglePoolCard(kanjiToCard(k))}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        selected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">
                        <b className="font-serif text-sm">{k.kanji}</b> [{k.sinoVietnamese || k.hanviet}] — {k.vietnameseMeaning || k.meaning}
                      </span>
                      <span className="text-[10px] font-bold shrink-0">
                        {selected ? '✓ Đã chọn' : '+ Chọn'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-[11px] text-slate-400 py-3 text-center">Không có chữ Hán phù hợp.</div>
              ))}

            {poolTab === 'grammar' &&
              (grammarPool.slice(0, 40).length > 0 ? (
                grammarPool.slice(0, 40).map(g => {
                  const selected = attachedSourceIds.has(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => togglePoolCard(grammarToCard(g))}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        selected
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 text-purple-900 dark:text-purple-200'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">
                        <b>{g.pattern || g.title}</b> — {g.titleVi || g.meaning}
                      </span>
                      <span className="text-[10px] font-bold shrink-0">
                        {selected ? '✓ Đã chọn' : '+ Chọn'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-[11px] text-slate-400 py-3 text-center">Không có mẫu ngữ pháp phù hợp.</div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER 2: GATEKEEPER QUIZ BUILDER
  // --------------------------------------------------------------------------
  if (category === 'GATEKEEPER') {
    const questions: QuestQuizQuestion[] = quest.quizQuestions || [];

    const handleAutoGenerateQuiz = () => {
      const pool = whitelist?.vocabulary || [];
      if (pool.length < 4) return;
      const shuffle = <T,>(arr: T[]): T[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };
      const generated: QuestQuizQuestion[] = pool.slice(0, 10).map((item, idx) => {
        const correct = String(item.vietnameseMeaning || item.meaning || 'Nghĩa từ vựng');
        const wrongs = shuffle(
          pool
            .filter(w => w.id !== item.id)
            .map(w => String(w.vietnameseMeaning || w.meaning || ''))
            .filter(m => m && m !== correct)
        ).slice(0, 3);
        return {
          id: `gq_${item.id}_${idx}`,
          word: String(item.term || item.kanji || item.reading),
          reading: String(item.reading || item.kana || ''),
          correctAnswer: correct,
          options: shuffle([correct, ...wrongs])
        };
      });
      onChange({ ...quest, quizQuestions: generated });
    };

    const handleAddQuizQuestion = () => {
      if (!qWord.trim() || !qCorrect.trim()) return;
      const opts = [qCorrect.trim(), qWrong1.trim(), qWrong2.trim(), qWrong3.trim()].filter(Boolean);
      const next: QuestQuizQuestion = {
        id: `gq_${Date.now().toString(36)}`,
        word: qWord.trim(),
        reading: qReading.trim(),
        correctAnswer: qCorrect.trim(),
        options: opts.length >= 2 ? opts : [qCorrect.trim(), 'Đáp án nhiễu 1', 'Đáp án nhiễu 2']
      };
      onChange({ ...quest, quizQuestions: [...questions, next] });
      setQWord('');
      setQReading('');
      setQCorrect('');
      setQWrong1('');
      setQWrong2('');
      setQWrong3('');
    };

    return (
      <div className="mt-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/15 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>Câu hỏi Trắc nghiệm Gatekeeper ({questions.length} câu)</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={(whitelist?.vocabulary?.length || 0) < 4}
            onClick={handleAutoGenerateQuiz}
            className="h-7 text-[11px] bg-white dark:bg-slate-900 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 mr-1" /> Sinh từ Whitelist mốc
          </Button>
        </div>

        {questions.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {questions.map((item, idx) => (
              <div key={item.id || idx} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 truncate">
                  <b>{idx + 1}. {item.word}</b> {item.reading && <span className="text-slate-400">({item.reading})</span>} →{' '}
                  <span className="text-emerald-700 font-semibold">{item.correctAnswer}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...quest, quizQuestions: questions.filter((_, i) => i !== idx) })}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Từ / Kanji *" value={qWord} onChange={e => setQWord(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Cách đọc" value={qReading} onChange={e => setQReading(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Đáp án đúng (VI) *" value={qCorrect} onChange={e => setQCorrect(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Nhiễu 1" value={qWrong1} onChange={e => setQWrong1(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Nhiễu 2" value={qWrong2} onChange={e => setQWrong2(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Nhiễu 3" value={qWrong3} onChange={e => setQWrong3(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={handleAddQuizQuestion} disabled={!qWord.trim() || !qCorrect.trim()} className="h-7 text-xs bg-sky-600 text-white cursor-pointer">
              + Thêm câu hỏi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER 3: GRAMMAR SCRAMBLE BUILDER
  // --------------------------------------------------------------------------
  if (category === 'SCRAMBLE') {
    const sentences: QuestScrambleSentence[] = quest.scrambleSentences || [];

    const handleImportFromGrammar = () => {
      const imported: QuestScrambleSentence[] = [];
      (whitelist?.grammar || []).forEach(g => {
        if (g.masterExampleJp && g.masterExampleVi) {
          imported.push({ id: `sc_${g.id}`, original: g.masterExampleJp, translation: g.masterExampleVi });
        }
      });
      if (imported.length > 0) {
        onChange({ ...quest, scrambleSentences: [...sentences, ...imported] });
      }
    };

    const handleAddSentence = () => {
      if (!sOriginal.trim() || !sTranslation.trim()) return;
      onChange({
        ...quest,
        scrambleSentences: [
          ...sentences,
          { id: `sc_${Date.now().toString(36)}`, original: sOriginal.trim(), translation: sTranslation.trim() }
        ]
      });
      setSOriginal('');
      setSTranslation('');
    };

    return (
      <div className="mt-3 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/15 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
            <Puzzle className="w-4 h-4" />
            <span>Câu ghép Ngữ pháp ({sentences.length} câu)</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!whitelist?.grammar?.length}
            onClick={handleImportFromGrammar}
            className="h-7 text-[11px] bg-white dark:bg-slate-900 cursor-pointer"
          >
            + Lấy ví dụ Ngữ pháp mốc
          </Button>
        </div>

        {sentences.length > 0 && (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {sentences.map((s, idx) => (
              <div key={s.id || idx} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 truncate">
                  <b>{idx + 1}. {s.original}</b> — <span className="text-slate-500">{s.translation}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...quest, scrambleSentences: sentences.filter((_, i) => i !== idx) })}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Input placeholder="Câu tiếng Nhật chuẩn *" value={sOriginal} onChange={e => setSOriginal(e.target.value)} className="sm:col-span-2 h-8 text-xs" />
          <Input placeholder="Nghĩa tiếng Việt *" value={sTranslation} onChange={e => setSTranslation(e.target.value)} className="sm:col-span-2 h-8 text-xs" />
          <Button type="button" size="sm" onClick={handleAddSentence} disabled={!sOriginal.trim() || !sTranslation.trim()} className="h-8 text-xs bg-purple-600 text-white cursor-pointer">
            + Thêm câu
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER 4: ROLEPLAY / CLOZE PRACTICE BUILDER
  // --------------------------------------------------------------------------
  const dialogues: QuestRoleplayDialogue[] = quest.roleplayDialogues || [];

  const handleAddDialogue = () => {
    if (!rTitle.trim() || !rSpeechJp.trim() || !rPrompt.trim()) return;
    const next: QuestRoleplayDialogue = {
      id: `dial_${Date.now().toString(36)}`,
      title: rTitle.trim(),
      partnerName: rPartnerName.trim() || 'Sensei',
      partnerSpeechJp: rSpeechJp.trim(),
      partnerSpeechVi: rSpeechVi.trim(),
      learnerPrompt: rPrompt.trim(),
      sampleAnswer: rSample.trim(),
      requiredKeywords: rKeywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
    };
    onChange({ ...quest, roleplayDialogues: [...dialogues, next] });
    setRTitle('');
    setRSpeechJp('');
    setRSpeechVi('');
    setRPrompt('');
    setRSample('');
  };

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/15 space-y-3">
      <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
        <MessageCircle className="w-4 h-4" />
        <span>Tình huống Đối thoại AI Sensei ({dialogues.length} tình huống)</span>
      </div>

      {dialogues.length > 0 && (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {dialogues.map((d, idx) => (
            <div key={d.id || idx} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0 truncate">
                <b>{idx + 1}. {d.title}</b> — <span className="text-slate-500">{d.partnerSpeechJp}</span>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...quest, roleplayDialogues: dialogues.filter((_, i) => i !== idx) })}
                className="text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Tên tình huống *" value={rTitle} onChange={e => setRTitle(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Vai đối thoại (VD: Tanaka-san)" value={rPartnerName} onChange={e => setRPartnerName(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Lời thoại JP của nhân vật *" value={rSpeechJp} onChange={e => setRSpeechJp(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Nghĩa VI lời thoại" value={rSpeechVi} onChange={e => setRSpeechVi(e.target.value)} className="h-8 text-xs" />
        </div>
        <Input placeholder="Yêu cầu cho học viên *" value={rPrompt} onChange={e => setRPrompt(e.target.value)} className="h-8 text-xs" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Câu trả lời mẫu (JP)" value={rSample} onChange={e => setRSample(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Từ khóa bắt buộc (cách nhau dấu phẩy)" value={rKeywords} onChange={e => setRKeywords(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleAddDialogue}
            disabled={!rTitle.trim() || !rSpeechJp.trim() || !rPrompt.trim()}
            className="h-7 text-xs bg-amber-600 text-white cursor-pointer"
          >
            + Thêm tình huống
          </Button>
        </div>
      </div>
    </div>
  );
};
