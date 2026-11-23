import React, { useState, useRef } from 'react';
import { adminService } from '../services/adminService';
import { Button } from '@/admin/components/ui/button';
import { Badge } from '@/admin/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/admin/components/ui/table';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export type BulkCsvKind = 'vocabulary' | 'kanji';

interface BulkCsvImportModalProps {
  isOpen: boolean;
  kind: BulkCsvKind;
  onClose: () => void;
  onImported: (kind: BulkCsvKind, items: any[]) => void;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvContent(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every(v => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function escapeCsvCell(value: any): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportItemsToCsv(kind: BulkCsvKind, items: any[]) {
  let headers: string[];
  let rows: string[][];

  if (kind === 'vocabulary') {
    headers = ['term', 'reading', 'sinoVietnamese', 'vietnameseMeaning', 'wordType', 'level', 'milestoneId', 'exampleSentenceJp', 'exampleSentenceVi'];
    rows = items.map(v => [
      v.term || v.kanji || '',
      v.reading || v.kana || '',
      v.sinoVietnamese || '',
      v.vietnameseMeaning || v.meaning || '',
      v.wordType || 'Danh từ',
      v.level || v.jlptLevel || 'N5',
      v.milestoneId || v.milestone_id || '',
      v.exampleSentenceJp || '',
      v.exampleSentenceVi || ''
    ]);
  } else {
    headers = ['kanji', 'sinoVietnamese', 'vietnameseMeaning', 'onyomi', 'kunyomi', 'strokeCount', 'radicals', 'level', 'milestoneId', 'mnemonicStory'];
    rows = items.map(k => [
      k.kanji || k.id || '',
      k.sinoVietnamese || k.hanviet || '',
      k.vietnameseMeaning || k.meaning || '',
      k.onyomi || '',
      k.kunyomi || '',
      String(k.strokeCount || 1),
      k.radicals || '',
      k.level || k.jlptLevel || 'N5',
      k.milestoneId || k.milestone_id || '',
      k.mnemonicStory || ''
    ]);
  }

  const csvBody = [headers.join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kizuna-${kind}-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const VOCAB_TEMPLATE_CSV = `term,reading,sinoVietnamese,vietnameseMeaning,wordType,level,milestoneId,exampleSentenceJp,exampleSentenceVi
学生,がくせい,HỌC SINH,"Học sinh, sinh viên",Danh từ,N5,ms_minna_b01,私は学生です。,Tôi là sinh viên.
先生,せんせい,TIÊN SINH,"Thầy giáo, cô giáo",Danh từ,N5,ms_minna_b01,田中先生は優しいです。,Thầy Tanaka rất hiền.
会社員,かいしゃいん,HỘI XÃ VIÊN,Nhân viên công ty,Danh từ,N5,ms_minna_b01,父は会社員です。,Bố tôi là nhân viên công ty.`;

const KANJI_TEMPLATE_CSV = `kanji,sinoVietnamese,vietnameseMeaning,onyomi,kunyomi,strokeCount,radicals,level,milestoneId,mnemonicStory
日,NHẬT,"Mặt trời, ngày","ニチ, ジツ","ひ, -び, -か",4,日,N5,ms_minna_b01,Hình ảnh mặt trời tỏa sáng vuông vức.
本,BẢN,"Sách, gốc rễ",ホン,もと,5,木,N5,ms_minna_b01,Cây (木) có gạch dưới chỉ phần gốc rễ.
人,NHÂN,Người,"ジン, ニン",ひと,2,人,N5,ms_minna_b01,Hai chân bước đi tựa vào nhau thành chữ Nhân.`;

export const BulkCsvImportModal: React.FC<BulkCsvImportModalProps> = ({
  isOpen,
  kind,
  onClose,
  onImported
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawCsv, setRawCsv] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isVocab = kind === 'vocabulary';

  const handleDownloadTemplate = () => {
    const content = isVocab ? VOCAB_TEMPLATE_CSV : KANJI_TEMPLATE_CSV;
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isVocab ? 'kizuna-template-vocabulary.csv' : 'kizuna-template-kanji.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParseText = (text: string) => {
    setRawCsv(text);
    setError(null);
    setSuccessMsg(null);
    const rows = parseCsvContent(text);
    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      handleParseText(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const validRows = parsedRows.filter(r =>
    isVocab
      ? Boolean((r.term || r.kanji || '').trim() && (r.vietnameseMeaning || r.meaning || '').trim())
      : Boolean((r.kanji || '').trim() && (r.vietnameseMeaning || r.meaning || '').trim())
  );

  const handleImport = async () => {
    if (validRows.length === 0) {
      setError('Không có dòng hợp lệ nào để nhập. Hãy kiểm tra đúng tên cột mẫu CSV.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const saved = isVocab
        ? await adminService.bulkImportVocabulary(validRows)
        : await adminService.bulkImportKanji(validRows);
      onImported(kind, saved);
      setSuccessMsg(`Đã nhập thành công ${saved.length} mục ${isVocab ? 'từ vựng' : 'chữ Hán (Kanji)'} vào hệ thống!`);
      setTimeout(() => {
        setRawCsv('');
        setParsedRows([]);
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi nhập dữ liệu hàng loạt.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Nhập Hàng Loạt {isVocab ? 'Từ Vựng' : 'Chữ Hán (Kanji)'} qua CSV
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Tải file mẫu UTF-8, điền danh sách bằng Excel/Google Sheets và tải lên 1 lần
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step 1 & 2 Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">Bước 1: Tải file mẫu CSV chuẩn</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  File đã gắn sẵn UTF-8 BOM, mở trực tiếp bằng Excel không bị lỗi phông chữ Nhật/Việt.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="w-full h-10 rounded-xl cursor-pointer">
                <Download className="w-4 h-4 mr-1.5 text-emerald-600" />
                Tải mẫu {isVocab ? 'Vocabulary' : 'Kanji'}.csv
              </Button>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Bước 2: Chọn file CSV cần nhập</div>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                  Hoặc dán trực tiếp nội dung CSV vào khung bên dưới để xem trước.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-1.5" /> Chọn file .CSV từ máy
              </Button>
            </div>
          </div>

          {/* Paste CSV textarea */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Nội dung CSV (hỗ trợ chỉnh sửa nhanh)
              </span>
              <button
                type="button"
                onClick={() => handleParseText(isVocab ? VOCAB_TEMPLATE_CSV : KANJI_TEMPLATE_CSV)}
                className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                Nạp thử dữ liệu mẫu (3 dòng)
              </button>
            </div>
            <textarea
              rows={5}
              value={rawCsv}
              onChange={e => handleParseText(e.target.value)}
              placeholder={isVocab ? 'term,reading,sinoVietnamese,vietnameseMeaning,wordType,level,milestoneId,...' : 'kanji,sinoVietnamese,vietnameseMeaning,onyomi,kunyomi,strokeCount,radicals,level,...'}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Live Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                  Xem trước dữ liệu ({validRows.length}/{parsedRows.length} dòng hợp lệ)
                </span>
                {validRows.length < parsedRows.length && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                    {parsedRows.length - validRows.length} dòng thiếu trường bắt buộc sẽ bị bỏ qua
                  </Badge>
                )}
              </div>

              {/* Mobile-First Preview Card List */}
              <div className="block sm:hidden space-y-2 max-h-56 overflow-y-auto">
                {validRows.slice(0, 15).map((r, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {isVocab ? r.term || r.kanji : r.kanji}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {isVocab ? r.reading || r.kana : r.sinoVietnamese || r.hanviet}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {(r.level || r.jlptLevel || 'N5').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">{r.vietnameseMeaning || r.meaning}</div>
                    {r.milestoneId && (
                      <div className="text-[10px] font-mono text-slate-400">Mốc: {r.milestoneId}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Preview Table */}
              <div className="hidden sm:block max-h-52 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow>
                      <TableHead className="text-xs">{isVocab ? 'Từ vựng' : 'Chữ Hán'}</TableHead>
                      <TableHead className="text-xs">{isVocab ? 'Cách đọc' : 'Hán Việt'}</TableHead>
                      <TableHead className="text-xs">Nghĩa Tiếng Việt</TableHead>
                      <TableHead className="text-xs">Cấp độ</TableHead>
                      <TableHead className="text-xs">Mốc</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validRows.slice(0, 15).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-sm">{isVocab ? r.term || r.kanji : r.kanji}</TableCell>
                        <TableCell className="text-xs">{isVocab ? r.reading || r.kana : r.sinoVietnamese || r.hanviet}</TableCell>
                        <TableCell className="text-xs">{r.vietnameseMeaning || r.meaning}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{(r.level || r.jlptLevel || 'N5').toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-500">{r.milestoneId || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Sẵn sàng nhập: <strong className="text-emerald-600">{validRows.length}</strong> bản ghi
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 sm:h-9 rounded-xl cursor-pointer">
              Hủy
            </Button>
            <Button
              type="button"
              disabled={importing || validRows.length === 0}
              onClick={handleImport}
              className="h-10 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {importing ? 'Đang nhập...' : `Nhập (${validRows.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
