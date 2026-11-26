import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from '../types/auth';
import { UserProgressData } from '../types/progress';
import { authService, getLocalDateString } from './authService';
import { progressService } from './progressService';

export type DailyQuestCategory = 'GRAMMAR_TRAP' | 'KANJI_CONTEXT' | 'READING_INFERENCE';

export interface DailyQuestItem {
  id: string;
  order: number;
  category: DailyQuestCategory;
  categoryLabel: string;
  difficultyLabel: string;
  title: string;
  passage?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  pointsReward: number;
  xpReward: number;
  completed: boolean;
  failed?: boolean;
  selectedOptionIndex?: number;
}

export interface DailyQuestBundle {
  date: string;
  userId: string;
  level: string;
  weakFocus: string;
  source: 'GEMINI_LIVE' | 'GEMINI_HYBRID' | 'CURATED_FALLBACK';
  model?: string;
  cached?: boolean;
  bonusClaimed: boolean;
  quests: DailyQuestItem[];
  generatedAt?: string;
}

export const STREAK_FREEZE_COST = 100;
export const MAX_STREAK_FREEZES = 2;
export const DAILY_BONUS_POINTS = 50;
export const DAILY_BONUS_XP = 100;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const JAPANESE_CHAR_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
const DISALLOWED_ENGLISH_SET = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'which', 'what',
  'when', 'where', 'who', 'why', 'how', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'does', 'did', 'will', 'would', 'could', 'should', 'must',
  'might', 'option', 'options', 'answer', 'answers', 'correct', 'incorrect', 'wrong',
  'choose', 'select', 'question', 'sentence', 'meaning', 'means', 'grammar',
  'vocabulary', 'reading', 'explanation', 'because', 'therefore', 'however',
  'although', 'example', 'note', 'hint', 'please', 'refers', 'used', 'using',
  'particle', 'particles', 'verb', 'verbs', 'noun', 'nouns', 'adjective', 'adverb',
  'polite', 'casual', 'form', 'tense', 'passive', 'causative', 'honorific', 'humble',
  'false', 'true', 'none', 'above', 'below', 'between', 'instead', 'about', 'after',
  'before', 'during', 'without', 'under', 'over', 'again', 'always', 'never'
]);

/**
 * Lấy mã tuần ISO-8601 theo giờ địa phương (ví dụ: "2026-W48") để reset BXH Tuần vào 00:00 thứ Hai.
 */
export function getCurrentIsoWeekKey(date: Date = new Date()): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = (target.getDay() + 6) % 7; // Mon=0 .. Sun=6
  target.setDate(target.getDate() - dayNum + 3); // Thursday of current ISO week
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNum = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Số ngày còn lại của tuần hiện tại (tính cả hôm nay đến hết Chủ Nhật).
 */
export function getDaysRemainingInWeek(date: Date = new Date()): number {
  const dayOfWeek = date.getDay(); // Sun=0, Mon=1..Sat=6
  return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
}

export function containsDisallowedEnglish(text?: string): boolean {
  if (!text) return false;
  const words = text.match(/\b[A-Za-zÀ-ỹ]{2,}\b/g);
  if (!words) return false;
  for (const w of words) {
    const lower = w.toLowerCase();
    if (DISALLOWED_ENGLISH_SET.has(lower)) return true;
    if (/^[A-Za-z]{5,}$/.test(w) && /(tion|sion|ment|ness|able|ible|ious|eous|less)$/.test(lower)) {
      return true;
    }
  }
  return false;
}

function isValidQuestItem(q: any): q is DailyQuestItem {
  if (!q || typeof q !== 'object') return false;
  if (!q.title || !q.question || !q.explanation) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  const cleanOpts = q.options.map((o: any) => String(o || '').trim());
  if (cleanOpts.some((o: string) => !o)) return false;
  if (new Set(cleanOpts.map((o: string) => o.toLowerCase())).size !== 4) return false;
  const idx = Number(q.correctIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx > 3) return false;

  const jpSample = `${q.passage || ''} ${q.question} ${cleanOpts.join(' ')}`;
  if (!JAPANESE_CHAR_REGEX.test(jpSample)) return false;

  if (
    containsDisallowedEnglish(q.title) ||
    containsDisallowedEnglish(q.passage) ||
    containsDisallowedEnglish(q.question) ||
    containsDisallowedEnglish(q.explanation) ||
    cleanOpts.some((o: string) => containsDisallowedEnglish(o))
  ) {
    return false;
  }
  return true;
}

function getStorageKey(userId: string, date: string): string {
  return `kizuna_daily_quest_${userId}_${date}`;
}

function normalizeLevel(raw?: string): 'N5' | 'N4' | 'N3' | 'N2' | 'N1' {
  const upper = String(raw || '').trim().toUpperCase();
  if (upper === 'N5' || upper === 'N4' || upper === 'N3' || upper === 'N2' || upper === 'N1') {
    return upper;
  }
  return 'N5';
}

function buildLocalCuratedBundle(
  userId: string,
  date: string,
  level: string,
  progress: UserProgressData | null
): DailyQuestBundle {
  const lvl = normalizeLevel(level);
  const vocab = progress?.vocabLearned || 0;
  const kanji = progress?.kanjiLearned || 0;
  const grammar = progress?.grammarLearned || 0;
  const weakFocus = kanji <= vocab && kanji <= grammar
    ? 'Hán tự và đọc hiểu ngữ cảnh'
    : grammar <= vocab
      ? 'Ngữ pháp và phân biệt trợ từ'
      : 'Vận dụng từ vựng và phản xạ đề thi';

  const banks: Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', DailyQuestItem[]> = {
    N5: [
      {
        id: `dq_${date.replace(/-/g, '')}_1`,
        order: 1,
        category: 'GRAMMAR_TRAP',
        categoryLabel: 'Bẫy Ngữ Pháp',
        difficultyLabel: 'Thử thách',
        title: 'Phân biệt trợ từ chỉ nơi chốn 「に」 và 「で」',
        passage: '',
        question: 'Chọn cặp trợ từ chính xác:\n毎日、図書館（　　）日本語を勉強して、５時（　　）家へ帰ります。',
        options: ['で ／ に', 'に ／ で', 'を ／ に', 'へ ／ で'],
        correctIndex: 0,
        explanation: '「図書館で勉強する」 dùng 「で」 chỉ địa điểm diễn ra hành động; 「５時に帰る」 dùng 「に」 chỉ thời điểm cụ thể.',
        pointsReward: 15,
        xpReward: 30,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_2`,
        order: 2,
        category: 'KANJI_CONTEXT',
        categoryLabel: 'Hán Tự Ngữ Cảnh',
        difficultyLabel: 'Thử thách',
        title: 'Cách đọc đặc biệt của ngày trong tháng',
        passage: '',
        question: 'Cách đọc đúng của từ gạch chân là gì?\n「先月、<u>二十日</u>に日本へ来ました。」',
        options: ['はつか', 'にじゅうにち', 'はたち', 'ふつか'],
        correctIndex: 0,
        explanation: '「二十日」 (ngày 20) là ngoại lệ đọc là 「はつか」; còn 「はたち」 là 20 tuổi (二十歳).',
        pointsReward: 20,
        xpReward: 40,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_3`,
        order: 3,
        category: 'READING_INFERENCE',
        categoryLabel: 'Đọc Hiểu Suy Luận',
        difficultyLabel: 'Thử thách',
        title: 'Suy luận thời gian và địa điểm hẹn',
        passage: '田中：山田さん、明日の映画は何時からですか。\n山田：３時からです。でも、その前に昼ご飯を食べませんか。\n田中：いいですね。じゃあ、１時半に駅で会いましょう。',
        question: 'Hai người sẽ gặp nhau lúc mấy giờ và làm gì trước?',
        options: [
          'Gặp lúc 13:30 ở nhà ga để ăn trưa trước khi xem phim',
          'Gặp lúc 15:00 ở rạp chiếu phim rồi mới ăn trưa',
          'Gặp lúc 13:30 ở nhà hàng gần trường học',
          'Xem phim lúc 13:30 rồi 15:00 gặp nhau ở nhà ga'
        ],
        correctIndex: 0,
        explanation: '「その前に」 nghĩa là trước 3 giờ xem phim; họ hẹn 「１時半に駅で」 (13:30 tại nhà ga).',
        pointsReward: 25,
        xpReward: 50,
        completed: false
      }
    ],
    N4: [
      {
        id: `dq_${date.replace(/-/g, '')}_1`,
        order: 1,
        category: 'GRAMMAR_TRAP',
        categoryLabel: 'Bẫy Ngữ Pháp',
        difficultyLabel: 'Thử thách',
        title: 'Phân biệt 「〜ように」 và 「〜ために」',
        passage: '',
        question: 'Chọn đáp án tự nhiên nhất:\n日本語が上手になる（　　　）、毎日ニュースを聞いています。',
        options: ['ように', 'ために', 'そうに', 'ことに'],
        correctIndex: 0,
        explanation: '「上手になる」 diễn tả trạng thái năng lực đạt được (không hoàn toàn là hành động ý chí trực tiếp) nên dùng 「ように」.',
        pointsReward: 15,
        xpReward: 30,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_2`,
        order: 2,
        category: 'KANJI_CONTEXT',
        categoryLabel: 'Hán Tự Ngữ Cảnh',
        difficultyLabel: 'Thử thách',
        title: 'Bị động gián tiếp trong tình huống đời sống',
        passage: '',
        question: 'Chọn dạng động từ Hán tự đúng ngữ cảnh:\n大切な約束を忘れて、友達に（　　　）しまいました。',
        options: ['怒られて', '叱って', '謝られて', '笑って'],
        correctIndex: 0,
        explanation: 'Vì quên cuộc hẹn quan trọng nên bị bạn giận → dùng thể bị động 「怒られてしまいました」.',
        pointsReward: 20,
        xpReward: 40,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_3`,
        order: 3,
        category: 'READING_INFERENCE',
        categoryLabel: 'Đọc Hiểu Suy Luận',
        difficultyLabel: 'Thử thách',
        title: 'Đọc hiểu thông báo tại thư viện',
        passage: 'お知らせ：来週の月曜日は祝日のため、図書館は休みです。ただし、返却ボックスは２４時間使えますので、本を返す人は利用してください。',
        question: 'Người muốn trả sách vào thứ Hai tuần sau cần làm gì?',
        options: [
          'Bỏ sách vào hộp trả sách bên ngoài vì thư viện nghỉ lễ',
          'Vào quầy thư viện trả trực tiếp như ngày thường',
          'Chờ đến thứ Ba mới được phép trả sách',
          'Chỉ trả được sách trước 5 giờ chiều ngày thứ Hai'
        ],
        correctIndex: 0,
        explanation: 'Thư viện nghỉ lễ (休み) nhưng hộp trả sách (返却ボックス) mở 24 giờ cho người trả sách.',
        pointsReward: 25,
        xpReward: 50,
        completed: false
      }
    ],
    N3: [
      {
        id: `dq_${date.replace(/-/g, '')}_1`,
        order: 1,
        category: 'GRAMMAR_TRAP',
        categoryLabel: 'Bẫy Ngữ Pháp',
        difficultyLabel: 'Thử thách',
        title: 'Sắc thái phủ nhận một phần 「〜わけではない」',
        passage: '',
        question: 'Chọn mẫu câu đúng sắc thái:\n甘いものが嫌いな（　　　　）が、健康のためにあまり食べないようにしている。',
        options: ['わけではない', 'はずがない', 'に違いない', 'べきではない'],
        correctIndex: 0,
        explanation: '「〜わけではない」 diễn đạt "không hẳn là ghét đồ ngọt, chỉ là hạn chế ăn vì sức khỏe".',
        pointsReward: 15,
        xpReward: 30,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_2`,
        order: 2,
        category: 'KANJI_CONTEXT',
        categoryLabel: 'Hán Tự Ngữ Cảnh',
        difficultyLabel: 'Thử thách',
        title: 'Phân biệt từ Hán tự đồng âm công sở',
        passage: '',
        question: 'Chọn từ thích hợp điền vào chỗ trống:\n会議の資料は、昨日のうちに全員に（　　）済みです。',
        options: ['配布', '配達', '配送', '配置'],
        correctIndex: 0,
        explanation: '「配布（はいふ）」 nghĩa là phát tài liệu cho mọi người; 「配達/配送」 là giao hàng.',
        pointsReward: 20,
        xpReward: 40,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_3`,
        order: 3,
        category: 'READING_INFERENCE',
        categoryLabel: 'Đọc Hiểu Suy Luận',
        difficultyLabel: 'Thử thách',
        title: 'Suy luận quan điểm của tác giả',
        passage: '最近のスマホは機能が多すぎて、かえって使いにくいという声もある。しかし、必要な機能だけを選んで設定すれば、生活はずっと便利になるはずだ。',
        question: 'Tác giả cho rằng điều quan trọng khi dùng điện thoại nhiều tính năng là gì?',
        options: [
          'Chỉ chọn và cài đặt những tính năng thực sự cần thiết cho bản thân',
          'Quay lại dùng điện thoại đời cũ ít tính năng hơn',
          'Học thuộc toàn bộ mọi tính năng của máy trước khi dùng',
          'Hạn chế sử dụng điện thoại trong sinh hoạt hằng ngày'
        ],
        correctIndex: 0,
        explanation: 'Sau 「しかし」, tác giả nhấn mạnh nếu chọn lọc 「必要な機能だけを選んで設定すれば」 thì cuộc sống sẽ tiện lợi hơn.',
        pointsReward: 25,
        xpReward: 50,
        completed: false
      }
    ],
    N2: [
      {
        id: `dq_${date.replace(/-/g, '')}_1`,
        order: 1,
        category: 'GRAMMAR_TRAP',
        categoryLabel: 'Bẫy Ngữ Pháp',
        difficultyLabel: 'Thử thách',
        title: 'Phân biệt 「〜ざるを得ない」 và 「〜かねない」',
        passage: '',
        question: 'Chọn cấu trúc phù hợp với tình huống bất khả kháng:\n台風で電車が止まったため、今日は歩いて帰ら（　　　　）。',
        options: ['ざるを得ない', 'かねない', 'っこない', 'ものか'],
        correctIndex: 0,
        explanation: '「〜ざるを得ない」 nghĩa là "đành phải làm" vì không còn lựa chọn khác (bỏ 「する」 thành 「せざるを得ない」).',
        pointsReward: 15,
        xpReward: 30,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_2`,
        order: 2,
        category: 'KANJI_CONTEXT',
        categoryLabel: 'Hán Tự Ngữ Cảnh',
        difficultyLabel: 'Thử thách',
        title: 'Động từ ghép Hán tự N2 trong thông báo',
        passage: '',
        question: 'Chọn từ đúng nghĩa "hoãn lại / dời lịch":\n悪天候のため、明日のイベントは来週に（　　）されました。',
        options: ['延期', '延長', '遅延', '停止'],
        correctIndex: 0,
        explanation: '「延期（えんき）」 là hoãn sang ngày khác; 「延長」 là kéo dài thêm thời lượng; 「遅延」 là đến trễ.',
        pointsReward: 20,
        xpReward: 40,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_3`,
        order: 3,
        category: 'READING_INFERENCE',
        categoryLabel: 'Đọc Hiểu Suy Luận',
        difficultyLabel: 'Thử thách',
        title: 'Đọc hiểu email trao đổi công việc',
        passage: '佐藤様：先ほどお送りいただいた企画書ですが、全体の構成は素晴らしいと思います。ただ、予算の部分についてもう少し具体的な数字があると、会議で承認されやすくなるはずです。',
        question: 'Người gửi email muốn anh Sato chỉnh sửa điểm nào trong bản kế hoạch?',
        options: [
          'Bổ sung các con số cụ thể hơn ở phần ngân sách để dễ được duyệt',
          'Viết lại toàn bộ bố cục tổng thể của bản kế hoạch',
          'Hủy bỏ cuộc họp vì ngân sách chưa đạt yêu cầu',
          'Gửi lại email mới do tệp đính kèm bị lỗi'
        ],
        correctIndex: 0,
        explanation: 'Người viết khen bố cục tổng thể (全体の構成は素晴らしい) và chỉ đề nghị bổ sung số liệu cụ thể ở phần ngân sách (予算の部分).',
        pointsReward: 25,
        xpReward: 50,
        completed: false
      }
    ],
    N1: [
      {
        id: `dq_${date.replace(/-/g, '')}_1`,
        order: 1,
        category: 'GRAMMAR_TRAP',
        categoryLabel: 'Bẫy Ngữ Pháp',
        difficultyLabel: 'Thử thách',
        title: 'Cấu trúc N1 「〜を禁じ得ない」',
        passage: '',
        question: 'Chọn biểu hiện trang trọng mang nghĩa "không thể kìm nén nổi cảm xúc":\n長年の努力が報われず、彼の無念さを思うと同情（　　　　）。',
        options: ['を禁じ得ない', 'に堪えない', '極まりない', 'どころではない'],
        correctIndex: 0,
        explanation: '「同情を禁じ得ない」 là cụm cố định N1 diễn tả không thể kìm nén được sự đồng cảm trước hoàn cảnh đáng tiếc.',
        pointsReward: 15,
        xpReward: 30,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_2`,
        order: 2,
        category: 'KANJI_CONTEXT',
        categoryLabel: 'Hán Tự Ngữ Cảnh',
        difficultyLabel: 'Thử thách',
        title: 'Phân biệt từ Hán tự học thuật N1',
        passage: '',
        question: 'Chọn từ phù hợp nghĩa "thúc đẩy / khuyến khích thực hiện":\n少子化対策として、子育て支援制度の充実を（　　）べきだ。',
        options: ['図る', '計る', '測る', '量る'],
        correctIndex: 0,
        explanation: '「充実を図る（はかる）」 nghĩa là mưu cầu / thúc đẩy hoàn thiện chế độ; 「計る・測る・量る」 dùng để đo thời gian/độ dài/khối lượng.',
        pointsReward: 20,
        xpReward: 40,
        completed: false
      },
      {
        id: `dq_${date.replace(/-/g, '')}_3`,
        order: 3,
        category: 'READING_INFERENCE',
        categoryLabel: 'Đọc Hiểu Suy Luận',
        difficultyLabel: 'Thử thách',
        title: 'Phân tích lập luận xã luận ngắn N1',
        passage: '効率化ばかりを追い求めると、一見無駄に見える余白が失われる。だが、新しい発想は往々にして、その「無駄」とされてきた試行錯誤の中から生まれるものだ。',
        question: 'Thông điệp chính của đoạn văn trên là gì?',
        options: [
          'Những thử nghiệm tưởng như dư thừa lại thường là nguồn gốc của ý tưởng mới',
          'Cần loại bỏ mọi khoảng trống dư thừa để tối đa hóa hiệu suất',
          'Tư duy sáng tạo chỉ xuất hiện khi quy trình được tự động hóa hoàn toàn',
          'Hiệu suất công việc không liên quan đến quá trình thử và sai'
        ],
        correctIndex: 0,
        explanation: 'Tác giả nhấn mạnh sau 「だが」: ý tưởng mới thường nảy sinh từ chính quá trình thử-sai từng bị xem là dư thừa (「無駄」とされてきた試行錯誤).',
        pointsReward: 25,
        xpReward: 50,
        completed: false
      }
    ]
  };

  return {
    date,
    userId,
    level: lvl,
    weakFocus,
    source: 'CURATED_FALLBACK',
    model: 'kizuna-curated-jlpt',
    bonusClaimed: false,
    quests: banks[lvl]
  };
}

export const dailyQuestService = {
  /**
   * Đọc đồng bộ bộ Nhiệm Vụ Ngày đã lưu trong ngày từ localStorage (0ms, không nháy loading).
   */
  getCachedDailyQuestsSync(userId?: string | null): DailyQuestBundle | null {
    if (!userId) return null;
    const today = getLocalDateString(new Date());
    try {
      const raw = localStorage.getItem(getStorageKey(userId, today));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DailyQuestBundle;
      if (parsed && parsed.date === today && Array.isArray(parsed.quests) && parsed.quests.length === 3) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  },

  /**
   * Lấy hoặc sinh 3 Nhiệm Vụ Ngày cho học viên (chỉ sinh tối đa 1 lần/ngày, lưu theo ngày trong localStorage + Firestore).
   */
  async getOrGenerateDailyQuests(
    user: User,
    userProgress: UserProgressData | null,
    currentStageTitle?: string,
    currentMilestoneTitle?: string,
    completedMilestonesCount = 0
  ): Promise<DailyQuestBundle> {
    const today = getLocalDateString(new Date());
    const storageKey = getStorageKey(user.id, today);
    const level = normalizeLevel(user.level);

    // 1. Kiểm tra localStorage cache trong ngày (0 token, phản hồi tức thì)
    const cachedSync = this.getCachedDailyQuestsSync(user.id);
    if (cachedSync && cachedSync.quests.every(isValidQuestItem)) {
      return cachedSync;
    }

    // 2. Kiểm tra Firestore daily_quests/{userId}_{date}
    const docId = `${user.id}_${today}`;
    if (db && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const snap = await getDoc(doc(db, 'daily_quests', docId));
        if (snap.exists()) {
          const remote = snap.data() as DailyQuestBundle;
          if (remote && Array.isArray(remote.quests) && remote.quests.length === 3 && remote.quests.every(isValidQuestItem)) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(remote));
            } catch {}
            return remote;
          }
        }
      } catch {
        // continue to API generation
      }
    }

    // 3. Gọi Spring Boot Gemini API (/api/v1/ai/daily-quest/generate) để sinh đề từ user_progress
    const fallbackBundle = buildLocalCuratedBundle(user.id, today, level, userProgress);
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const jwt = authService.getBackendJwt();
        const res = await fetch(`${API_BASE_URL}/api/v1/ai/daily-quest/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
          },
          body: JSON.stringify({
            userId: user.id,
            date: today,
            level,
            currentStageTitle: currentStageTitle || userProgress?.currentStageTitle || '',
            currentMilestoneId: userProgress?.currentMilestoneId || '',
            currentMilestoneTitle: currentMilestoneTitle || userProgress?.currentMilestoneTitle || '',
            vocabLearned: userProgress?.vocabLearned || 0,
            kanjiLearned: userProgress?.kanjiLearned || 0,
            grammarLearned: userProgress?.grammarLearned || 0,
            examsCompleted: userProgress?.examsCompleted || 0,
            completedMilestonesCount
          }),
          signal: AbortSignal.timeout(16000)
        });

        if (res.ok) {
          const envelope = await res.json();
          const data = envelope?.data as DailyQuestBundle | undefined;
          if (data && Array.isArray(data.quests) && data.quests.length === 3) {
            // Đảm bảo từng câu hỏi đạt chuẩn không tiếng Anh & đủ 4 đáp án khác nhau
            const validatedQuests = data.quests.map((q, idx) =>
              isValidQuestItem(q)
                ? { ...q, completed: Boolean(q.completed), failed: Boolean(q.failed) }
                : fallbackBundle.quests[idx]
            );
            const finalBundle: DailyQuestBundle = {
              date: data.date || today,
              userId: user.id,
              level: data.level || level,
              weakFocus: data.weakFocus || fallbackBundle.weakFocus,
              source: data.source || 'GEMINI_LIVE',
              model: data.model,
              bonusClaimed: Boolean(data.bonusClaimed),
              quests: validatedQuests,
              generatedAt: data.generatedAt || new Date().toISOString()
            };
            try {
              localStorage.setItem(storageKey, JSON.stringify(finalBundle));
            } catch {}
            if (db) {
              setDoc(doc(db, 'daily_quests', docId), finalBundle, { merge: true }).catch(() => {});
            }
            return finalBundle;
          }
        }
      } catch {
        // fallback cleanly below
      }
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(fallbackBundle));
    } catch {}
    if (db && (typeof navigator === 'undefined' || navigator.onLine)) {
      setDoc(doc(db, 'daily_quests', docId), fallbackBundle, { merge: true }).catch(() => {});
    }
    return fallbackBundle;
  },

  /**
   * Đánh dấu hoàn thành 1 nhiệm vụ ngày và tự cộng điểm năng động + XP (+ bonus 3/3 nếu vừa xong câu cuối với cả 3 đúng).
   */
  async completeDailyQuest(
    userId: string,
    bundle: DailyQuestBundle,
    questId: string,
    selectedOptionIndex?: number
  ): Promise<{ updatedBundle: DailyQuestBundle; bonusJustAwarded: boolean; pointsAwarded: number; xpAwarded: number }> {
    const target = bundle.quests.find(q => q.id === questId);
    if (!target || target.completed || target.failed) {
      return { updatedBundle: bundle, bonusJustAwarded: false, pointsAwarded: 0, xpAwarded: 0 };
    }

    const updatedQuests = bundle.quests.map(q =>
      q.id === questId
        ? { ...q, completed: true, failed: false, selectedOptionIndex: selectedOptionIndex ?? q.correctIndex }
        : q
    );
    const allCompleted = updatedQuests.every(q => q.completed);
    const bonusJustAwarded = allCompleted && !bundle.bonusClaimed;

    const pointsAwarded = target.pointsReward + (bonusJustAwarded ? DAILY_BONUS_POINTS : 0);
    const xpAwarded = target.xpReward + (bonusJustAwarded ? DAILY_BONUS_XP : 0);

    const updatedBundle: DailyQuestBundle = {
      ...bundle,
      quests: updatedQuests,
      bonusClaimed: bundle.bonusClaimed || bonusJustAwarded
    };

    const storageKey = getStorageKey(userId, bundle.date);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedBundle));
    } catch {}

    if (db && (typeof navigator === 'undefined' || navigator.onLine)) {
      const docId = `${userId}_${bundle.date}`;
      setDoc(doc(db, 'daily_quests', docId), updatedBundle, { merge: true }).catch(() => {});
    }

    await progressService.recordActivity(userId, 'roadmap', 1, pointsAwarded, xpAwarded);
    return { updatedBundle, bonusJustAwarded, pointsAwarded, xpAwarded };
  },

  /**
   * Đánh dấu thử thách đã trả lời sai (không cho làm lại trong ngày, lưu trạng thái để ẩn sau khi đóng).
   */
  async failDailyQuest(
    userId: string,
    bundle: DailyQuestBundle,
    questId: string,
    selectedOptionIndex: number
  ): Promise<DailyQuestBundle> {
    const target = bundle.quests.find(q => q.id === questId);
    if (!target || target.completed || target.failed) {
      return bundle;
    }

    const updatedQuests = bundle.quests.map(q =>
      q.id === questId ? { ...q, completed: false, failed: true, selectedOptionIndex } : q
    );

    const updatedBundle: DailyQuestBundle = {
      ...bundle,
      quests: updatedQuests
    };

    const storageKey = getStorageKey(userId, bundle.date);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedBundle));
    } catch {}

    if (db && (typeof navigator === 'undefined' || navigator.onLine)) {
      const docId = `${userId}_${bundle.date}`;
      setDoc(doc(db, 'daily_quests', docId), updatedBundle, { merge: true }).catch(() => {});
    }

    return updatedBundle;
  },

  /**
   * Đổi Điểm Năng Động lấy Khiên Bảo Vệ Streak (giá 100 pts, tối đa 2 khiên).
   * Chỉ trừ từ activePoints (ví điểm năng động), KHÔNG trừ totalXp hay weeklyActivePoints.
   */
  async buyStreakFreeze(userId: string): Promise<{ ok: boolean; message: string; user?: User }> {
    const current = authService.getCurrentUser();
    if (!current || current.id !== userId) {
      return { ok: false, message: 'Vui lòng đăng nhập để đổi Khiên Bảo Vệ Streak.' };
    }

    const currentPoints = current.activePoints || 0;
    const currentFreezes = current.streakFreezes || 0;

    if (currentFreezes >= MAX_STREAK_FREEZES) {
      return { ok: false, message: `Bạn đã dự trữ tối đa ${MAX_STREAK_FREEZES} Khiên Bảo Vệ Streak.` };
    }
    if (currentPoints < STREAK_FREEZE_COST) {
      return {
        ok: false,
        message: `Cần ${STREAK_FREEZE_COST} Điểm năng động để đổi 1 Khiên (bạn hiện có ${currentPoints} pts).`
      };
    }

    const nextPoints = currentPoints - STREAK_FREEZE_COST;
    const nextFreezes = currentFreezes + 1;
    const updatedUser: User = {
      ...current,
      activePoints: nextPoints,
      streakFreezes: nextFreezes
    };

    authService.updateCurrentUser({
      activePoints: nextPoints,
      streakFreezes: nextFreezes
    });

    try {
      const regRaw = localStorage.getItem('kizuna_registered_users');
      if (regRaw) {
        const regUsers = JSON.parse(regRaw);
        const idx = regUsers.findIndex((u: any) => u.id === userId || u.email?.toLowerCase() === current.email?.toLowerCase());
        if (idx >= 0) {
          regUsers[idx].activePoints = nextPoints;
          regUsers[idx].streakFreezes = nextFreezes;
          localStorage.setItem('kizuna_registered_users', JSON.stringify(regUsers));
        }
      }
    } catch {}

    if (db && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          activePoints: nextPoints,
          streakFreezes: nextFreezes
        });
      } catch {
        setDoc(doc(db, 'users', userId), {
          activePoints: nextPoints,
          streakFreezes: nextFreezes
        }, { merge: true }).catch(() => {});
      }
    }

    return {
      ok: true,
      message: `Đã đổi thành công 1 Khiên Bảo Vệ Streak! (Hiện có ${nextFreezes}/${MAX_STREAK_FREEZES} khiên)`,
      user: updatedUser
    };
  }
};
