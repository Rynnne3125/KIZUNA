import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Volume2, 
  RotateCw, 
  Check, 
  HelpCircle, 
  Sparkles, 
  BookOpen, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Keyboard, 
  MessageSquare,
  BookmarkCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES FOR 3 EXERCISE TYPES (1, 2, 3)
// ============================================================================

export type FlashcardExerciseType = '1' | '2' | '3';

// Loại 1: Từ vựng & Hán tự (単語・漢字)
export interface VocabCardData {
  id: string;
  kanji: string;
  reading: string;
  furiganaBreakdown?: Array<{ kanji: string; kana: string }>;
  sinoVietnamese?: string;
  wordType: string; // e.g. "Danh từ", "Động từ N2", "Tính từ -i"
  vietnameseMeaning: string;
  nuanceExplanation: string;
  exampleJp: string;
  exampleFurigana?: string;
  exampleVi: string;
  collocation?: string;
}

// Loại 2: Điền khuyết & Trắc nghiệm mẫu câu (文法・選択)
export interface ClozeCardData {
  id: string;
  grammarPattern: string;
  questionSentenceJp: string; // "雨が降っている _______、傘を持っていきません。"
  questionTranslationVi: string;
  options: Array<{ id: string; text: string; reading?: string; isCorrect: boolean }>;
  correctReason: string;
  grammarFormula: string;
  whyWrongNotes?: string;
  fullSentenceJp: string;
  fullSentenceVi: string;
}

// Loại 3: Phản xạ hội thoại & Shadowing (実戦会話・シャドーイング)
export interface DialogueCardData {
  id: string;
  situationContextVi: string; // "Tại quán cà phê: Nhân viên hỏi bạn dùng tại chỗ hay mang đi"
  partnerRole: string; // "店員 (Nhân viên)"
  partnerPromptJp: string; // "店内でお召し上がりですか。それともお持ち帰りですか？"
  partnerPromptReading: string;
  learnerRole: string; // "お客様 (Bạn)"
  suggestedGoalVi: string; // "Hãy trả lời tự nhiên: 'Dùng tại quán ạ'"
  nativeAnswerJp: string; // "店内でお願いします。"
  nativeAnswerReading: string;
  keigoNuance: string; // Giải thích sắc thái lịch sự vs thân mật
  casualAlternativeJp?: string; // "ここで食べる！"
  culturalTip: string; // Mẹo ứng xử văn hóa Nhật Bản
}

// Dữ liệu mẫu chuẩn sách bài học tiếng Nhật (Bài học thực chiến)
const SAMPLE_TYPE_1_VOCAB: VocabCardData[] = [
  {
    id: 'v1',
    kanji: '約束',
    reading: 'やくそく',
    furiganaBreakdown: [{ kanji: '約', kana: 'やく' }, { kanji: '束', kana: 'そく' }],
    sinoVietnamese: 'ƯỚC THÚC',
    wordType: 'Danh từ · Động từ する',
    vietnameseMeaning: 'Lời hứa, hẹn ước, cuộc hẹn',
    nuanceExplanation: 'Dùng cho cả lời hứa danh dự lẫn cuộc hẹn gặp gỡ với bạn bè hoặc đối tác.',
    exampleJp: '友達と新宿で映画を見る約束をしました。',
    exampleVi: 'Tôi đã hẹn với bạn đi xem phim ở Shinjuku.',
    collocation: '約束を守る (Giữ lời hứa) / 約束を破る (Thất hứa)'
  },
  {
    id: 'v2',
    kanji: '遠慮',
    reading: 'えんりょ',
    furiganaBreakdown: [{ kanji: '遠', kana: 'えん' }, { kanji: '慮', kana: 'りょ' }],
    sinoVietnamese: 'VIỄN LỰ',
    wordType: 'Danh từ · Động từ する',
    vietnameseMeaning: 'Ngại ngùng, khách khí, kiềm chế',
    nuanceExplanation: 'Nét văn hóa cốt lõi của người Nhật: tránh làm phiền hoặc làm đối phương khó xử.',
    exampleJp: 'どうぞ遠慮しないで、たくさん召し上がってください。',
    exampleVi: 'Xin đừng khách khí, hãy dùng thật nhiều vào nhé.',
    collocation: '遠慮なく (Không khách sáo) / 遠慮がち (Hay e dè)'
  },
  {
    id: 'v3',
    kanji: '挨拶',
    reading: 'あいさつ',
    sinoVietnamese: 'AI TÁT',
    wordType: 'Danh từ · Động từ する',
    vietnameseMeaning: 'Chào hỏi, lời chào, phát biểu',
    nuanceExplanation: 'Không chỉ là "xin chào" mà bao gồm toàn bộ nghi thức chào đón trong xã hội Nhật.',
    exampleJp: '朝、隣の人に笑顔で挨拶を交わした。',
    exampleVi: 'Buổi sáng, tôi đã mỉm cười chào hỏi với người hàng xóm.',
    collocation: '挨拶回り (Đi chào hỏi xã giao)'
  },
  {
    id: 'v4',
    kanji: '丁寧',
    reading: 'ていねい',
    furiganaBreakdown: [{ kanji: '丁', kana: 'てい' }, { kanji: '寧', kana: 'ねい' }],
    sinoVietnamese: 'ĐINH NINH',
    wordType: 'Tính từ đuôi な',
    vietnameseMeaning: 'Lịch sự, nhã nhặn, cẩn thận, chu đáo',
    nuanceExplanation: 'Dùng để khen thái độ cư xử nhã nhặn hoặc thao tác gói hàng, làm việc tỉ mỉ.',
    exampleJp: '先生はどんな質問にも丁寧に答えてくださいます。',
    exampleVi: 'Thầy giáo luôn ân cần trả lời cẩn thận mọi câu hỏi.',
    collocation: '丁寧な言葉遣い (Cách dùng từ lịch thiệp)'
  }
];

const SAMPLE_TYPE_2_CLOZE: ClozeCardData[] = [
  {
    id: 'c1',
    grammarPattern: '〜のに (Mặc dù / Vậy mà)',
    questionSentenceJp: '一生懸命勉強した 【　？　】、試験に合格できませんでした。',
    questionTranslationVi: 'Mặc dù đã học tập hết sức chăm chỉ, vậy mà vẫn không thi đỗ.',
    options: [
      { id: 'opt1', text: 'から', isCorrect: false },
      { id: 'opt2', text: 'のに', isCorrect: true },
      { id: 'opt3', text: 'ので', isCorrect: false },
      { id: 'opt4', text: 'ても', isCorrect: false }
    ],
    correctReason: '「〜のに」 dùng để nối hai vế mang ý bất ngờ, tiếc nuối, trái ngược với kết quả mong đợi tự nhiên.',
    grammarFormula: 'V thể thường (普通形) + のに / A-i + のに / Na/N + なのに',
    whyWrongNotes: '「から / ので」 chỉ nguyên nhân kết quả thuận. 「ても」 mang nghĩa giả định (dù... thì cũng), còn ở đây sự việc "đã học" đã xảy ra.',
    fullSentenceJp: '一生懸命勉強したのに、試験に合格できませんでした。',
    fullSentenceVi: 'Mặc dù đã học tập hết sức chăm chỉ, vậy mà vẫn không thi đỗ.'
  },
  {
    id: 'c2',
    grammarPattern: '〜ようにする (Cố gắng tạo thói quen)',
    questionSentenceJp: '健康のために、毎朝野菜ジュースを飲む 【　？　】 います。',
    questionTranslationVi: 'Vì sức khỏe, tôi đang cố gắng tạo thói quen uống nước ép rau mỗi sáng.',
    options: [
      { id: 'opt1', text: 'ようにして', isCorrect: true },
      { id: 'opt2', text: 'ことにして', isCorrect: false },
      { id: 'opt3', text: 'そうにして', isCorrect: false },
      { id: 'opt4', text: 'とおりにして', isCorrect: false }
    ],
    correctReason: '「〜ようにしている」 thể hiện sự nỗ lực duy trì một hành động thường xuyên thành thói quen tốt.',
    grammarFormula: 'V-ru / V-nai + ようにする',
    whyWrongNotes: '「ことにする」 là đưa ra quyết định tại một thời điểm, không nhấn mạnh tính nỗ lực rèn thói quen như 「ようにする」.',
    fullSentenceJp: '健康のために、毎朝野菜ジュースを飲むようにしています。',
    fullSentenceVi: 'Vì sức khỏe, tôi đang cố gắng tạo thói quen uống nước ép rau củ mỗi sáng.'
  },
  {
    id: 'c3',
    grammarPattern: '〜てたまらない (Không chịu nổi / Vô cùng)',
    questionSentenceJp: '日本へ留学した友達に、会いたく 【　？　】。',
    questionTranslationVi: 'Tôi nhớ và muốn gặp người bạn đã sang Nhật du học đến cồn cào ruột gan.',
    options: [
      { id: 'opt1', text: 'てたまらない', isCorrect: true },
      { id: 'opt2', text: 'ていけない', isCorrect: false },
      { id: 'opt3', text: 'てならない', isCorrect: false },
      { id: 'opt4', text: 'てしかたない', isCorrect: false }
    ],
    correctReason: '「〜てたまらない」 biểu thị cảm xúc, mong muốn bản năng cá nhân mãnh liệt đến mức không kìm nén nổi.',
    grammarFormula: 'V-tai (bỏ い) + くてたまらない / A-i (bỏ い) + くてたまらない',
    whyWrongNotes: '「会いたい」 đổi sang thể liên kết là 「会いたくて」 + たまらない.',
    fullSentenceJp: '日本へ留学した友達に、会いたくてたまらない。',
    fullSentenceVi: 'Tôi nhớ và muốn gặp người bạn sang Nhật du học đến không chịu nổi.'
  }
];

const SAMPLE_TYPE_3_DIALOGUE: DialogueCardData[] = [
  {
    id: 'd1',
    situationContextVi: 'Tại nhà hàng: Nhân viên quầy thu ngân hỏi bạn thanh toán chung hay riêng',
    partnerRole: 'レジ店員 (Thu ngân)',
    partnerPromptJp: 'お会計はご一緒でよろしいでしょうか？',
    partnerPromptReading: 'おかいけいは ごいっしょで よろしいでしょうか？',
    learnerRole: 'あなた (Bạn)',
    suggestedGoalVi: 'Nói tự nhiên: "Xin vui lòng tính riêng giúp chúng tôi ạ"',
    nativeAnswerJp: '別々でお願いします。',
    nativeAnswerReading: 'べつべつで おねがいします。',
    keigoNuance: 'Từ 「別々 (べつべつ)」 là cách nói chuẩn mực, tự nhiên và ngắn gọn nhất tại quầy tính tiền Nhật Bản.',
    casualAlternativeJp: '割り勘でいこう！ (Chia tiền thôi!)',
    culturalTip: 'Tại Nhật, văn hóa chia tiền gọi là 「割り勘 (わりかん)」. Khi ở quầy tính tiền quán ăn đông người, người Nhật hay chọn nói "別々で" hoặc một người trả trước rồi ra ngoài chia tiền lẻ.'
  },
  {
    id: 'd2',
    situationContextVi: 'Tại văn phòng: Đồng nghiệp nhờ bạn xem qua bản tài liệu trước giờ họp',
    partnerRole: '同僚 (Đồng nghiệp)',
    partnerPromptJp: 'もしよろしければ、この企画書をちょっと見ていただけませんか？',
    partnerPromptReading: 'もしよろしければ、この きかくしょを ちょっと みていただけませんか？',
    learnerRole: 'あなた (Bạn)',
    suggestedGoalVi: 'Nói nhã nhặn: "Vâng được chứ, để tôi xem ngay đây ạ"',
    nativeAnswerJp: 'はい、喜んで拝見します。',
    nativeAnswerReading: 'はい、よろこんで はいけんします。',
    keigoNuance: 'Dùng Khiêm nhường ngữ 「拝見する (はいけんする)」 thay cho 「見る」 để thể hiện sự tôn trọng tối đa đối với tài liệu của đối phương.',
    casualAlternativeJp: 'うん、いいよ！すぐ見るね。(Ừ được chứ, tớ xem ngay nè!)',
    culturalTip: 'Trong giao tiếp kinh doanh Nhật Bản, cụm từ 「喜んで〜 (Tôi rất sẵn lòng...)」 tạo ấn tượng vô cùng tích cực và chuyên nghiệp.'
  },
  {
    id: 'd3',
    situationContextVi: 'Tại nhà người Nhật: Chủ nhà mời bạn dùng thêm một tách trà xanh nóng',
    partnerRole: '大家さん (Chủ nhà)',
    partnerPromptJp: 'お茶、もう一杯いかがですか？',
    partnerPromptReading: 'おちゃ、もういっぱいいかがですか？',
    learnerRole: 'あなた (Bạn)',
    suggestedGoalVi: 'Nói từ chối khéo léo: "Dạ thôi ạ, cháu đã dùng đủ rồi, xin cảm ơn bác"',
    nativeAnswerJp: '十分いただきましたので、お気遣いなく。',
    nativeAnswerReading: 'じゅうぶん いただきましたので、おきづかいなく。',
    keigoNuance: 'Người Nhật hiếm khi nói thẳng "いりません" (Không cần). Họ dùng "十分いただきました" (Đã nhận đủ thịnh tình) kèm "お気遣いなく" (Xin bác đừng bận tâm) để lịch thiệp.',
    casualAlternativeJp: 'もう大丈夫だよ、ありがとう！ (Mình đủ rồi, cảm ơn nha!)',
    culturalTip: 'Văn hóa từ chối tinh tế Enryo (遠慮): Thừa nhận lòng tốt của đối phương trước khi từ chối giúp giữ gìn mối quan hệ hòa hợp (Wa - 和).'
  }
];

// ============================================================================
// ANIMATED CAT MASCOT SVG COMPONENT (KIZUNA NEKO)
// ============================================================================

interface CatMascotProps {
  exerciseType: FlashcardExerciseType;
  isFlipped: boolean;
  isCorrect?: boolean;
}

export const KizunaCatMascot: React.FC<CatMascotProps> = ({
  exerciseType,
  isFlipped,
  isCorrect
}) => {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center select-none pointer-events-none transition-transform duration-300">
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        <defs>
          <radialGradient id="catBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="catFur" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fbf6ee" />
          </linearGradient>
          <linearGradient id="catCollar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="bellGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* Đuôi mèo ngoe nguẩy nhẹ nhàng */}
        <path
          d="M 30 92 C 15 90, 8 72, 16 64 C 20 60, 26 68, 22 75 C 20 80, 25 86, 32 87 Z"
          fill="#fbf6ee"
          stroke="#475569"
          strokeWidth="2.5"
          className="neko-tail origin-bottom-right"
        />

        {/* Bàn chân sau & thân tròn */}
        <ellipse cx="60" cy="86" rx="34" ry="24" fill="url(#catFur)" stroke="#334155" strokeWidth="2.5" />

        {/* Mảng màu lông tam thể (Calico patch cam & đen nâu) */}
        <path
          d="M 40 70 Q 52 74, 50 90 Q 36 94, 38 78 Z"
          fill="#ea580c"
          opacity="0.85"
        />
        <path
          d="M 76 68 Q 84 75, 82 88 Q 72 88, 70 78 Z"
          fill="#334155"
          opacity="0.75"
        />

        {/* Tai trái mèo */}
        <path
          d="M 36 46 L 24 22 C 24 22, 42 26, 48 38 Z"
          fill="#ffffff"
          stroke="#334155"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="neko-ear-left"
        />
        {/* Lòng tai trái màu hồng phấn */}
        <path d="M 34 40 L 28 26 C 28 26, 40 29, 44 36 Z" fill="#fbcfe8" />

        {/* Tai phải mèo */}
        <path
          d="M 84 46 L 96 22 C 96 22, 78 26, 72 38 Z"
          fill="#ffffff"
          stroke="#334155"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="neko-ear-right"
        />
        {/* Lòng tai phải màu cam tam thể */}
        <path d="M 86 40 L 92 26 C 92 26, 80 29, 76 36 Z" fill="#fdba74" />

        {/* Đầu mèo tròn trịa */}
        <ellipse cx="60" cy="52" rx="32" ry="26" fill="url(#catFur)" stroke="#334155" strokeWidth="2.5" />

        {/* Đốm cam trên đầu */}
        <path d="M 46 29 Q 54 36, 62 30 Q 56 26, 46 29 Z" fill="#ea580c" opacity="0.8" />

        {/* Vòng cổ đỏ & Chuông vàng phong cách Maneki Neko */}
        <path d="M 40 72 Q 60 80, 80 72" stroke="url(#catCollar)" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="60" cy="77" r="5" fill="url(#bellGold)" stroke="#854d0e" strokeWidth="1.5" />
        <circle cx="60" cy="78" r="1.2" fill="#713f12" />

        {/* Má hồng kawaii */}
        <ellipse cx="38" cy="58" rx="5" ry="3" fill="url(#catBlush)" />
        <ellipse cx="82" cy="58" rx="5" ry="3" fill="url(#catBlush)" />

        {/* Râu mèo */}
        <g stroke="#64748b" strokeWidth="1.5" strokeLinecap="round">
          <line x1="26" y1="53" x2="14" y2="50" />
          <line x1="26" y1="57" x2="13" y2="58" />
          <line x1="94" y1="53" x2="106" y2="50" />
          <line x1="94" y1="57" x2="107" y2="58" />
        </g>

        {/* Mũi hồng nhỏ */}
        <polygon points="58,54 62,54 60,56.5" fill="#f43f5e" />

        {/* Miệng mèo hình chữ w (Anime cat mouth) */}
        <path
          d="M 55 58 Q 60 61, 60 56.5 Q 60 61, 65 58"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* MẮT MÈO: Biểu cảm tương tác theo loại bài tập & trạng thái lật */}
        {isFlipped ? (
          // Mắt híp cười tít khi đã lật mở đáp án (Happy anime eyes: ^^)
          <g stroke="#334155" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M 43 51 Q 48 46, 53 51" />
            <path d="M 67 51 Q 72 46, 77 51" />
            {/* Tia sáng vui vẻ */}
            <circle cx="60" cy="38" r="1.5" fill="#eab308" />
          </g>
        ) : (
          // Mắt tròn long lanh tò mò (Chớp mắt theo keyframe)
          <g className="neko-eyes">
            <ellipse cx="48" cy="49" rx="4" ry="5" fill="#1e293b" />
            <circle cx="46.5" cy="47.5" r="1.5" fill="#ffffff" />
            <ellipse cx="72" cy="49" rx="4" ry="5" fill="#1e293b" />
            <circle cx="70.5" cy="47.5" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* PHỤ KIỆN THEO TỪNG LOẠI BÀI TẬP (1, 2, 3) */}
        {exerciseType === '1' && (
          // Loại 1: Mèo cầm nhành hoa anh đào (Sakura)
          <g className="neko-sakura">
            <path d="M 80 82 Q 88 78, 94 72" stroke="#78350f" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="94" cy="71" r="5" fill="#fda4af" stroke="#f43f5e" strokeWidth="1" />
            <circle cx="94" cy="71" r="1.5" fill="#fff1f2" />
          </g>
        )}

        {exerciseType === '2' && (
          // Loại 2: Kính tròn trí tuệ cho bài trắc nghiệm ngữ pháp
          <g stroke="#d97706" strokeWidth="2" fill="rgba(254, 240, 138, 0.2)">
            <circle cx="48" cy="49" r="8" />
            <circle cx="72" cy="49" r="8" />
            <line x1="56" y1="49" x2="64" y2="49" />
          </g>
        )}

        {exerciseType === '3' && (
          // Loại 3: Tách trà xanh bốc khói hoặc dải băng đầu Hachimaki
          <g className="neko-tea">
            {/* Tách trà Matcha */}
            <rect x="74" y="78" width="14" height="12" rx="3" fill="#2d6d4b" stroke="#14532d" strokeWidth="1.5" />
            <ellipse cx="81" cy="78" rx="6" ry="2" fill="#86efac" />
            {/* Làn khói trà */}
            <path d="M 80 75 Q 82 71, 79 67" stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round" className="tea-steam" />
          </g>
        )}

        {/* Hai bàn chân trước đặt trước ngực đáng yêu */}
        <ellipse cx="49" cy="80" rx="5" ry="4" fill="#ffffff" stroke="#334155" strokeWidth="2" />
        <ellipse cx="71" cy="80" rx="5" ry="4" fill="#ffffff" stroke="#334155" strokeWidth="2" />

        {/* Chân phải vẫy nhẹ nếu có đáp án đúng */}
        {isCorrect && (
          <g className="neko-paw-wave">
            <ellipse cx="88" cy="62" rx="5" ry="4" fill="#ffffff" stroke="#334155" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: JAPANESE LESSON FLASHCARD (1, 2, 3)
// ============================================================================

import { VocabularyItem } from '../types/kizuna';

interface JapaneseLessonFlashcardsProps {
  lessonTitle?: string;
  bookTitle?: string;
  unitWords?: VocabularyItem[];
  onCompleteUnit?: () => void;
}

export const JapaneseLessonFlashcards: React.FC<JapaneseLessonFlashcardsProps> = ({
  lessonTitle = 'Bài 1: Giao tiếp & Sinh hoạt hàng ngày',
  bookTitle = 'Mimi Kara Oboeru & Minna no Nihongo',
  unitWords
}) => {
  // Trạng thái loại bài tập: 1, 2, 3 (Người dùng yêu cầu chỉ ghi dạng 1 2 3)
  const [activeExerciseType, setActiveExerciseType] = useState<FlashcardExerciseType>('1');

  // Trạng thái thẻ lật
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  // Trạng thái trả lời (Cho bài tập 2)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Hiệu ứng phím bấm trên bàn phím (Tactile visual feedback)
  const [activeKeyEffect, setActiveKeyEffect] = useState<'left' | 'right' | 'space' | null>(null);

  // Tiến trình hoàn thành
  const [masteredCards, setMasteredCards] = useState<Record<FlashcardExerciseType, Set<string>>>({
    '1': new Set(),
    '2': new Set(),
    '3': new Set()
  });

  // Tham chiếu DOM container để cuộn và focus
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Danh sách thẻ dạng 1: Kết hợp từ vựng Unit hoặc mẫu sách chuẩn
  const vocabList: VocabCardData[] = useMemo(() => {
    if (!unitWords || unitWords.length === 0) return SAMPLE_TYPE_1_VOCAB;
    return unitWords.map(item => ({
      id: item.id,
      kanji: item.term,
      reading: item.reading || item.hiragana || '',
      sinoVietnamese: item.sinoVietnamese,
      wordType: item.wordType || item.part_of_speech || 'Từ vựng trọng tâm',
      vietnameseMeaning: item.vietnameseMeaning || item.meaning_vi || '',
      nuanceExplanation: item.chapterTitle || 'Từ vựng trong bài học của sách',
      exampleJp: item.exampleSentenceJp || `${item.term}を正しく使います。`,
      exampleVi: item.exampleSentenceVi || `Sử dụng chuẩn xác từ vựng ${item.term}.`,
      collocation: item.hiragana ? `Đọc: ${item.reading}` : undefined
    }));
  }, [unitWords]);

  // Danh sách thẻ dạng 2:
  const clozeList: ClozeCardData[] = useMemo(() => {
    if (!unitWords || unitWords.length < 3) return SAMPLE_TYPE_2_CLOZE;
    
    // Tự sinh thêm thẻ điền khuyết từ các câu ví dụ trong sách của Unit
    const dynamicClozes: ClozeCardData[] = unitWords
      .filter(w => w.exampleSentenceJp && w.exampleSentenceJp.includes(w.term))
      .slice(0, 5)
      .map((w, idx) => {
        const distractorTerms = unitWords
          .filter(other => other.id !== w.id)
          .slice(0, 3)
          .map(d => d.term);
        const optionsList = [
          { id: `opt_corr_${w.id}`, text: w.term, isCorrect: true },
          ...distractorTerms.map((dist, dIdx) => ({
            id: `opt_dist_${w.id}_${dIdx}`,
            text: dist,
            isCorrect: false
          }))
        ].sort(() => 0.5 - Math.random());

        return {
          id: `dyn_c_${w.id}`,
          grammarPattern: `Vận dụng từ vựng & cấu trúc: ${w.term}`,
          questionSentenceJp: w.exampleSentenceJp!.replace(w.term, '【　？　】'),
          questionTranslationVi: w.exampleSentenceVi || `Điền từ thích hợp vào câu.`,
          options: optionsList,
          correctReason: `Từ chính xác điền vào câu là 「${w.term}」 mang nghĩa: ${w.vietnameseMeaning}.`,
          grammarFormula: `${w.term} (${w.reading}) - ${w.wordType || 'Từ vựng'}`,
          fullSentenceJp: w.exampleSentenceJp!,
          fullSentenceVi: w.exampleSentenceVi || ''
        };
      });

    return dynamicClozes.length > 0 ? [...dynamicClozes, ...SAMPLE_TYPE_2_CLOZE] : SAMPLE_TYPE_2_CLOZE;
  }, [unitWords]);

  // Danh sách thẻ dạng 3:
  const dialogueList: DialogueCardData[] = SAMPLE_TYPE_3_DIALOGUE;

  // Lấy danh sách thẻ hiện tại theo loại 1, 2, 3
  const currentTotalCards = 
    activeExerciseType === '1' ? vocabList.length :
    activeExerciseType === '2' ? clozeList.length :
    dialogueList.length;

  // Lấy dữ liệu thẻ hiện tại
  const currentVocab = vocabList[currentIndex] || vocabList[0];
  const currentCloze = clozeList[currentIndex] || clozeList[0];
  const currentDialogue = dialogueList[currentIndex] || dialogueList[0];

  // Phát âm tiếng Nhật tự nhiên qua Web Speech API
  const speakJapanese = useCallback((text: string, rate: number = 0.9) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }, []);

  // Chuyển sang thẻ tiếp theo
  const handleNextCard = useCallback(() => {
    if (currentIndex < currentTotalCards - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
    } else {
      // Đã đến thẻ cuối cùng
      setIsFlipped(false);
    }
  }, [currentIndex, currentTotalCards]);

  // Quay lại thẻ trước đó
  const handlePrevCard = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFlipped(false);
    }
  }, [currentIndex]);

  // Lật thẻ qua lại
  const handleToggleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // Xử lý chuyển loại bài tập (1, 2, 3)
  const handleChangeExerciseType = (type: FlashcardExerciseType) => {
    if (type === activeExerciseType) return;
    setActiveExerciseType(type);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
  };

  // Đánh dấu đã thuộc / cần ôn
  const toggleMastered = (cardId: string) => {
    setMasteredCards(prev => {
      const nextSet = new Set(prev[activeExerciseType]);
      if (nextSet.has(cardId)) {
        nextSet.delete(cardId);
      } else {
        nextSet.add(cardId);
      }
      return { ...prev, [activeExerciseType]: nextSet };
    });
  };

  // TƯƠNG TÁC BẰNG PHÍM MŨI TÊN (ArrowLeft & ArrowRight)
  // Theo yêu cầu: Thẻ lật có thể tương tác bằng phím mũi tên qua trái qua phải thay vì click chuột vào button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nếu người dùng đang gõ trong ô input/textarea thì bỏ qua
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // PHÍM QUA PHẢI (ArrowRight →):
      // - Nếu thẻ đang ở Mặt Trước: LẬT THẺ SANG MẶT SAU (đáp án/giải nghĩa)
      // - Nếu thẻ đang ở Mặt Sau: CHUYỂN SANG THẺ TIẾP THEO (Next card)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveKeyEffect('right');
        setTimeout(() => setActiveKeyEffect(null), 200);

        if (!isFlipped) {
          setIsFlipped(true);
        } else {
          handleNextCard();
        }
      }

      // PHÍM QUA TRÁI (ArrowLeft ←):
      // - Nếu thẻ đang ở Mặt Sau: LẬT LẠI VỀ MẶT TRƯỚC
      // - Nếu thẻ đang ở Mặt Trước: QUAY LẠI THẺ TRƯỚC ĐÓ (Prev card)
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveKeyEffect('left');
        setTimeout(() => setActiveKeyEffect(null), 200);

        if (isFlipped) {
          setIsFlipped(false);
        } else {
          handlePrevCard();
        }
      }

      // Phím Space: Lật thẻ nhanh
      else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setActiveKeyEffect('space');
        setTimeout(() => setActiveKeyEffect(null), 200);
        handleToggleFlip();
      }

      // Phím số 1, 2, 3: Chuyển nhanh giữa 3 loại bài tập
      else if (e.key === '1') {
        e.preventDefault();
        handleChangeExerciseType('1');
      } else if (e.key === '2') {
        e.preventDefault();
        handleChangeExerciseType('2');
      } else if (e.key === '3') {
        e.preventDefault();
        handleChangeExerciseType('3');
      }

      // Phím A hoặc S: Nghe phát âm
      else if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeExerciseType === '1') {
          speakJapanese(currentVocab.kanji);
        } else if (activeExerciseType === '2') {
          speakJapanese(isFlipped ? currentCloze.fullSentenceJp : currentCloze.questionSentenceJp);
        } else if (activeExerciseType === '3') {
          speakJapanese(isFlipped ? currentDialogue.nativeAnswerJp : currentDialogue.partnerPromptJp);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFlipped, 
    handleNextCard, 
    handlePrevCard, 
    handleToggleFlip, 
    activeExerciseType, 
    currentVocab, 
    currentCloze, 
    currentDialogue, 
    speakJapanese
  ]);

  // Kiểm tra bài tập 2: khi chọn phương án
  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
    setIsAnswerSubmitted(true);
  };

  const isCurrentMastered = 
    activeExerciseType === '1' ? masteredCards['1'].has(currentVocab.id) :
    activeExerciseType === '2' ? masteredCards['2'].has(currentCloze.id) :
    masteredCards['3'].has(currentDialogue.id);

  return (
    <div 
      ref={cardContainerRef}
      className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 font-sans text-slate-800"
    >
      {/* SCOPED CSS CHO HOẠT HÌNH MÈO VÀ LẬT THẺ 3D */}
      <style>{`
        @keyframes nekoEarWiggleLeft {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg); }
        }
        @keyframes nekoEarWiggleRight {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes nekoTailWag {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-14deg); }
        }
        @keyframes nekoBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes teaSteamFloat {
          0% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(-3px); }
          100% { opacity: 0.2; transform: translateY(-6px); }
        }
        .neko-ear-left {
          transform-origin: 36px 46px;
          animation: nekoEarWiggleLeft 3.5s ease-in-out infinite;
        }
        .neko-ear-right {
          transform-origin: 84px 46px;
          animation: nekoEarWiggleRight 4s ease-in-out infinite 0.5s;
        }
        .neko-tail {
          animation: nekoTailWag 2.5s ease-in-out infinite;
        }
        .neko-eyes {
          transform-origin: 60px 49px;
          animation: nekoBlink 4s infinite;
        }
        .tea-steam {
          animation: teaSteamFloat 2s ease-in-out infinite;
        }
        .japanese-washi-pattern {
          background-color: #faf7f2;
          background-image: radial-gradient(#d6cebe 0.75px, transparent 0.75px), radial-gradient(#e8dfd1 0.75px, #faf7f2 0.75px);
          background-size: 30px 30px;
          background-position: 0 0, 15px 15px;
        }
        .japanese-tatami-border {
          box-shadow: 0 10px 25px -5px rgba(30, 41, 59, 0.08), 0 8px 10px -6px rgba(30, 41, 59, 0.04);
        }
        /* Dấu triện Hanko phong cách Nhật Bản */
        .hanko-stamp {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #b91c1c;
          color: #b91c1c;
          border-radius: 6px;
          padding: 2px 8px;
          font-weight: 900;
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif;
          letter-spacing: 0.05em;
          background: rgba(254, 242, 242, 0.6);
        }
      `}</style>

      {/* HEADER: THÔNG TIN BÀI HỌC THEO SÁCH & TIẾN ĐỘ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="hanko-stamp text-xs">教科書</span>
            <span className="text-xs font-semibold text-emerald-800 tracking-wide uppercase">
              {bookTitle}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 flex items-center gap-2">
            {lessonTitle}
          </h2>
        </div>

        {/* BỘ NÚT CHUYỂN DẠNG BÀI TẬP: ĐÚNG YÊU CẦU "CHỈ GHI DẠNG 1 2 3 LÀ ĐƯỢC" */}
        <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 shadow-inner">
          {(['1', '2', '3'] as FlashcardExerciseType[]).map(type => {
            const isActive = activeExerciseType === type;
            const masteredCount = masteredCards[type].size;
            return (
              <button
                key={type}
                onClick={() => handleChangeExerciseType(type)}
                title={`Bài tập dạng ${type} (Nhấn phím ${type})`}
                className={`
                  relative w-12 h-11 sm:w-14 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-lg sm:text-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-white text-emerald-700 shadow-md border-2 border-emerald-600 scale-105' 
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 border border-transparent'
                  }
                `}
              >
                <span>{type}</span>
                {masteredCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
                    {masteredCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* THANH TRẠNG THÁI TIẾN TRÌNH & NÚT BẬT TẮT FURIGANA */}
      <div className="flex items-center justify-between gap-3 mb-4 text-xs sm:text-sm text-stone-600">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-semibold text-slate-700">
            Thẻ {currentIndex + 1} / {currentTotalCards}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-emerald-700 font-medium">
            Đã thuộc: {masteredCards[activeExerciseType].size}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút bật tắt Furigana */}
          <button
            onClick={() => setShowFurigana(!showFurigana)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
              ${showFurigana 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                : 'bg-stone-100 text-stone-500 border-stone-200'
              }
            `}
            title="Bật/Tắt hiển thị cách đọc Furigana"
          >
            {showFurigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Furigana</span>
          </button>

          {/* Nút đánh dấu đã thuộc */}
          <button
            onClick={() => {
              const currentId = 
                activeExerciseType === '1' ? currentVocab.id :
                activeExerciseType === '2' ? currentCloze.id :
                currentDialogue.id;
              toggleMastered(currentId);
            }}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
              ${isCurrentMastered
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-stone-50 text-stone-500 border-stone-200 hover:text-stone-700'
              }
            `}
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${isCurrentMastered ? 'text-amber-600 fill-amber-500' : ''}`} />
            <span>{isCurrentMastered ? 'Đã nhớ' : 'Chưa nhớ'}</span>
          </button>
        </div>
      </div>

      {/* THANH LINE TIẾN ĐỘ THEO PHONG CÁCH TỐI GIẢN NHẬT */}
      <div className="w-full h-1.5 bg-stone-200 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / currentTotalCards) * 100}%` }}
        />
      </div>

      {/* =========================================================================
          KHUNG THẺ CHÍNH (3D PERSPECTIVE FLIP CARD)
          ========================================================================= */}
      <div 
        className="relative w-full min-h-[420px] sm:min-h-[460px] perspective-[1200px]"
      >
        <div 
          onClick={handleToggleFlip}
          className={`
            relative w-full min-h-[420px] sm:min-h-[460px] rounded-3xl cursor-pointer transition-transform duration-500 transform-style-3d japanese-tatami-border
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* =====================================================================
              MẶT TRƯỚC CỦA THẺ (FRONT FACE)
              ===================================================================== */}
          <div 
            className="absolute inset-0 w-full h-full rounded-3xl japanese-washi-pattern border-2 border-stone-300/80 p-5 sm:p-8 flex flex-col justify-between backface-hidden overflow-hidden"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* HỌA TIẾT CHÌM MÈO NHỎ & DẤU CHÂN MÈO TRÊN NỀN THẺ */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04] flex flex-wrap gap-8 p-6 overflow-hidden select-none">
              <span className="text-4xl">🐾</span>
              <span className="text-4xl">🐾</span>
              <span className="text-4xl">🌸</span>
              <span className="text-4xl">🐾</span>
              <span className="text-4xl">🐾</span>
              <span className="text-4xl">🌸</span>
            </div>

            {/* HEADER MẶT TRƯỚC: TEM TRIỆN & LINH VẬT MÈO */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="hanko-stamp text-xs sm:text-sm">
                  {activeExerciseType === '1' ? '単語 · 壱' : activeExerciseType === '2' ? '文法 · 弐' : '会話 · 参'}
                </span>
                <span className="text-xs font-bold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded">
                  Mặt câu hỏi
                </span>
              </div>

              {/* CHÚ MÈO HOẠT HÌNH TRÊN NỀN THẺ (KIZUNA NEKO) */}
              <div className="absolute top-0 right-0 sm:right-2">
                <KizunaCatMascot 
                  exerciseType={activeExerciseType} 
                  isFlipped={false} 
                />
              </div>
            </div>

            {/* NỘI DUNG MẶT TRƯỚC THEO TỪNG LOẠI BÀI TẬP (1, 2, 3) */}
            <div className="my-auto py-4 relative z-10">
              {/* --- LOẠI 1: TỪ VỰNG & HÁN TỰ --- */}
              {activeExerciseType === '1' && (
                <div className="text-center">
                  {/* Loại từ */}
                  <div className="inline-block px-3 py-1 bg-stone-200/80 text-stone-700 text-xs font-bold rounded-full mb-3">
                    {currentVocab.wordType}
                  </div>

                  {/* Chữ Hán to bản & Furigana */}
                  <div className="flex items-center justify-center gap-3">
                    <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-wider font-serif">
                      {showFurigana && currentVocab.furiganaBreakdown ? (
                        <ruby className="ruby-position-over">
                          {currentVocab.furiganaBreakdown.map((part, i) => (
                            <React.Fragment key={i}>
                              {part.kanji}
                              <rt className="text-base sm:text-lg text-emerald-700 font-sans font-bold">
                                {part.kana}
                              </rt>
                            </React.Fragment>
                          ))}
                        </ruby>
                      ) : (
                        currentVocab.kanji
                      )}
                    </h1>

                    {/* Nút phát âm âm thanh */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJapanese(currentVocab.kanji);
                      }}
                      className="p-2 sm:p-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-transform hover:scale-110 shadow-xs"
                      title="Nghe phát âm từ vựng (Nhấn phím A)"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Phiên âm Hiragana thuần túy (Nếu tắt Furigana thì hiển thị gợi ý) */}
                  {!showFurigana && (
                    <div className="text-emerald-700 font-semibold text-lg sm:text-xl mt-2 tracking-widest">
                      {currentVocab.reading}
                    </div>
                  )}

                  {/* Âm Hán Việt */}
                  {currentVocab.sinoVietnamese && (
                    <div className="mt-3 text-xs sm:text-sm font-bold text-stone-500 tracking-widest uppercase">
                      〔 {currentVocab.sinoVietnamese} 〕
                    </div>
                  )}

                  {/* Gợi ý cụm từ đi kèm */}
                  {currentVocab.collocation && (
                    <div className="mt-4 inline-block bg-white/80 border border-stone-200 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm text-stone-600 shadow-xs">
                      <span className="font-bold text-stone-400 mr-1.5">Liên kết:</span>
                      {currentVocab.collocation}
                    </div>
                  )}
                </div>
              )}

              {/* --- LOẠI 2: ĐIỀN KHUYẾT & TRẮC NGHIỆM MẪU CÂU --- */}
              {activeExerciseType === '2' && (
                <div className="max-w-xl mx-auto">
                  {/* Badge Mẫu câu trọng tâm */}
                  <div className="text-center mb-3">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full border border-amber-200">
                      Mẫu câu: {currentCloze.grammarPattern}
                    </span>
                  </div>

                  {/* Câu hỏi có ô trống khuyết */}
                  <div className="bg-white/90 border-2 border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-slate-800 leading-relaxed font-serif">
                      {currentCloze.questionSentenceJp}
                    </div>
                    <div className="text-xs sm:text-sm text-stone-500 mt-2">
                      💡 {currentCloze.questionTranslationVi}
                    </div>
                  </div>

                  {/* 4 Phương án lựa chọn A, B, C, D */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3" onClick={e => e.stopPropagation()}>
                    {currentCloze.options.map((opt, idx) => {
                      const isSelected = selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`
                            p-3 rounded-xl border-2 font-bold text-sm sm:text-base transition-all duration-150 flex items-center justify-between
                            ${isSelected 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-102' 
                              : 'bg-white/95 text-stone-700 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                            }
                          `}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{opt.text}</span>
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- LOẠI 3: PHẢN XẠ HỘI THOẠI & SHADOWING --- */}
              {activeExerciseType === '3' && (
                <div className="max-w-xl mx-auto">
                  {/* Bối cảnh giao tiếp trong bài */}
                  <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 mb-4 text-left shadow-xs">
                    <div className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Tình huống thực tế trong sách
                    </div>
                    <div className="text-xs sm:text-sm text-stone-700 font-medium">
                      {currentDialogue.situationContextVi}
                    </div>
                  </div>

                  {/* Đối phương nói (Nhân viên / Khách hàng / Đồng nghiệp) */}
                  <div className="bg-white/90 border-2 border-stone-200 rounded-2xl p-4 sm:p-5 text-left shadow-xs mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {currentDialogue.partnerRole}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentDialogue.partnerPromptJp);
                        }}
                        className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                        title="Nghe câu thoại đối phương"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-base sm:text-xl font-bold text-slate-800 font-serif leading-relaxed">
                      「{currentDialogue.partnerPromptJp}」
                    </div>
                    <div className="text-xs text-emerald-700 mt-1 font-medium">
                      {currentDialogue.partnerPromptReading}
                    </div>
                  </div>

                  {/* Nhiệm vụ của bạn */}
                  <div className="text-center p-2.5 bg-stone-100/80 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-600 font-medium">
                    🎯 <strong className="text-slate-800">Nhiệm vụ:</strong> {currentDialogue.suggestedGoalVi}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER MẶT TRƯỚC: HƯỚNG DẪN TƯƠNG TÁC PHÍM MŨI TÊN */}
            <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between text-xs text-stone-500 relative z-10">
              <span className="flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 text-stone-400" />
                <span>Nhấn thẻ hoặc dùng phím mũi tên để lật</span>
              </span>

              {/* GỢI Ý PHÍM TẮT ĐƯỢC THIẾT KẾ NỔI BẬT */}
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline font-medium text-stone-400">Lật thẻ:</span>
                <kbd className={`px-2 py-1 rounded bg-stone-200/80 font-mono font-bold text-stone-700 border border-stone-300 shadow-2xs transition-all ${activeKeyEffect === 'right' ? 'bg-emerald-600 text-white scale-110' : ''}`}>
                  Phím →
                </kbd>
              </div>
            </div>
          </div>

          {/* =====================================================================
              MẶT SAU CỦA THẺ (BACK FACE - LẬT 180 ĐỘ)
              ===================================================================== */}
          <div 
            className="absolute inset-0 w-full h-full rounded-3xl bg-white border-2 border-emerald-600/30 p-5 sm:p-8 flex flex-col justify-between backface-hidden rotate-y-180 overflow-hidden shadow-xl"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* HỌA TIẾT HOA ANH ĐÀO & DẤU CHÂN MÈO TRÊN NỀN SAU */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex flex-wrap gap-10 p-6 overflow-hidden select-none">
              <span className="text-4xl">🌸</span>
              <span className="text-4xl">🐾</span>
              <span className="text-4xl">🌸</span>
              <span className="text-4xl">🐾</span>
            </div>

            {/* HEADER MẶT SAU: TEM TRIỆN & LINH VẬT MÈO CHÚC MỪNG */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="hanko-stamp text-xs sm:text-sm border-emerald-700 text-emerald-700 bg-emerald-50">
                  {activeExerciseType === '1' ? '解釈 · Giải nghĩa' : activeExerciseType === '2' ? '正解 · Đáp án' : '模範 · Phản xạ'}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Mặt giải thích
                </span>
              </div>

              {/* CHÚ MÈO HOẠT HÌNH TRẠNG THÁI VUI VẺ */}
              <div className="absolute top-0 right-0 sm:right-2">
                <KizunaCatMascot 
                  exerciseType={activeExerciseType} 
                  isFlipped={true} 
                  isCorrect={true} 
                />
              </div>
            </div>

            {/* NỘI DUNG MẶT SAU THEO TỪNG LOẠI BÀI TẬP (1, 2, 3) */}
            <div className="my-auto py-3 relative z-10 text-left">
              {/* --- LOẠI 1 (MẶT SAU): NGHĨA & CÂU VÍ DỤ --- */}
              {activeExerciseType === '1' && (
                <div className="space-y-4">
                  {/* Nghĩa tiếng Việt */}
                  <div>
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Ý nghĩa chuẩn mực
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
                      {currentVocab.vietnameseMeaning}
                    </div>
                  </div>

                  {/* Sắc thái & Lưu ý cách dùng */}
                  {currentVocab.nuanceExplanation && (
                    <div className="bg-emerald-50/80 border-l-4 border-emerald-600 p-3 rounded-r-xl text-xs sm:text-sm text-emerald-900 leading-relaxed">
                      <span className="font-bold mr-1">💡 Sắc thái:</span>
                      {currentVocab.nuanceExplanation}
                    </div>
                  )}

                  {/* Câu ví dụ trong bài học */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-stone-500 uppercase">
                        例文 · Câu ví dụ thực tế
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentVocab.exampleJp);
                        }}
                        className="p-1 rounded-full bg-stone-200/80 hover:bg-emerald-100 hover:text-emerald-700 text-stone-600 transition-colors"
                        title="Nghe câu ví dụ"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-800 font-serif leading-relaxed">
                      {currentVocab.exampleJp}
                    </div>
                    <div className="text-xs sm:text-sm text-stone-600 mt-1">
                      {currentVocab.exampleVi}
                    </div>
                  </div>
                </div>
              )}

              {/* --- LOẠI 2 (MẶT SAU): ĐÁP ÁN ĐÚNG & PHÂN TÍCH NGỮ PHÁP --- */}
              {activeExerciseType === '2' && (
                <div className="space-y-3.5">
                  {/* Đáp án chính xác */}
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 sm:p-4">
                    <div>
                      <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                        Đáp án chính xác
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5">
                        {currentCloze.options.find(o => o.isCorrect)?.text}
                      </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>

                  {/* Câu hoàn chỉnh */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 sm:p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-500">Câu hoàn chỉnh:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentCloze.fullSentenceJp);
                        }}
                        className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-full"
                        title="Nghe câu hoàn chỉnh"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                      {currentCloze.fullSentenceJp}
                    </div>
                    <div className="text-xs sm:text-sm text-stone-600 mt-1">
                      {currentCloze.fullSentenceVi}
                    </div>
                  </div>

                  {/* Công thức & Phân tích cấu trúc */}
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl text-amber-900">
                      <strong className="text-amber-800">Công thức cấu trúc:</strong> {currentCloze.grammarFormula}
                    </div>
                    <div className="text-stone-700 leading-relaxed pl-1">
                      <strong className="text-slate-800">Phân tích:</strong> {currentCloze.correctReason}
                    </div>
                  </div>
                </div>
              )}

              {/* --- LOẠI 3 (MẶT SAU): MẪU CÂU ĐỐI THOẠI & VĂN HÓA BẢN XỨ --- */}
              {activeExerciseType === '3' && (
                <div className="space-y-3.5">
                  {/* Câu phản xạ tự nhiên chuẩn người Nhật */}
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
                        Câu phản xạ tự nhiên chuẩn bản xứ
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(currentDialogue.nativeAnswerJp);
                        }}
                        className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                        title="Nghe phát âm chuẩn Shadowing"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-950 font-serif">
                      「{currentDialogue.nativeAnswerJp}」
                    </div>
                    <div className="text-xs text-emerald-700 mt-1 font-semibold">
                      {currentDialogue.nativeAnswerReading}
                    </div>
                  </div>

                  {/* Giải thích sắc thái Keigo & Biến thể thân mật */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-xl">
                      <strong className="text-slate-800 block mb-1">Sắc thái Keigo:</strong>
                      <span className="text-stone-600 leading-relaxed">{currentDialogue.keigoNuance}</span>
                    </div>

                    {currentDialogue.casualAlternativeJp && (
                      <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-xl">
                        <strong className="text-slate-800 block mb-1">Thân mật (Bạn bè):</strong>
                        <span className="text-emerald-800 font-bold">{currentDialogue.casualAlternativeJp}</span>
                      </div>
                    )}
                  </div>

                  {/* Văn hóa giao tiếp Nhật Bản */}
                  <div className="bg-amber-50/80 border-l-4 border-amber-500 p-2.5 rounded-r-xl text-xs sm:text-sm text-amber-900 leading-relaxed">
                    <strong className="text-amber-800">🎌 Văn hóa bản xứ:</strong> {currentDialogue.culturalTip}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER MẶT SAU: ĐIỀU HƯỚNG SANG THẺ TIẾP THEO BẰNG PHÍM MŨI TÊN */}
            <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between text-xs text-stone-500 relative z-10">
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-0.5 rounded bg-stone-100 font-mono font-bold text-stone-700 border border-stone-300 ${activeKeyEffect === 'left' ? 'bg-emerald-600 text-white' : ''}`}>
                  ← Về trước
                </kbd>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline font-medium text-stone-400">Thẻ kế tiếp:</span>
                <kbd className={`px-2.5 py-1 rounded bg-emerald-600 font-mono font-bold text-white shadow-xs transition-all ${activeKeyEffect === 'right' ? 'scale-110' : ''}`}>
                  Phím →
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          THANH ĐIỀU HƯỚNG BÀN PHÍM TỐI ƯU (KEYBOARD NAVIGATION BAR)
          Cho phép dùng cả phím bàn phím lẫn click chuột dự phòng
          ========================================================================= */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/90 border border-stone-200/80 rounded-2xl p-3 sm:p-4 shadow-sm">
        {/* Phím mũi tên qua trái (←) */}
        <button
          onClick={isFlipped ? () => setIsFlipped(false) : handlePrevCard}
          disabled={!isFlipped && currentIndex === 0}
          className={`
            w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all
            ${!isFlipped && currentIndex === 0
              ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400 border border-stone-200'
              : 'bg-stone-100 hover:bg-stone-200/80 active:bg-stone-300 text-stone-700 border border-stone-300 hover:scale-102'
            }
          `}
          title="Nhấn phím mũi tên trái ←"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isFlipped ? 'Mặt trước' : 'Thẻ trước'}</span>
          <kbd className={`ml-1 text-[11px] font-mono px-1.5 py-0.5 rounded border border-stone-300 bg-white ${activeKeyEffect === 'left' ? 'bg-emerald-600 text-white' : ''}`}>
            ←
          </kbd>
        </button>

        {/* Nút lật thẻ nhanh ở giữa (Space) */}
        <button
          onClick={handleToggleFlip}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-sm transition-all hover:scale-102"
          title="Nhấn phím Space để lật"
        >
          <RotateCw className="w-4 h-4 text-emerald-600" />
          <span>Lật thẻ (Mặt {isFlipped ? 'sau' : 'trước'})</span>
          <kbd className={`ml-1 text-[11px] font-mono px-1.5 py-0.5 rounded border border-emerald-300 bg-white ${activeKeyEffect === 'space' ? 'bg-emerald-600 text-white' : ''}`}>
            Space
          </kbd>
        </button>

        {/* Phím mũi tên qua phải (→) */}
        <button
          onClick={!isFlipped ? () => setIsFlipped(true) : handleNextCard}
          disabled={isFlipped && currentIndex === currentTotalCards - 1}
          className={`
            w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all
            ${isFlipped && currentIndex === currentTotalCards - 1
              ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400 border border-stone-200'
              : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white shadow-md hover:scale-102'
            }
          `}
          title="Nhấn phím mũi tên phải →"
        >
          <span>{!isFlipped ? 'Xem đáp án' : 'Thẻ tiếp'}</span>
          <ChevronRight className="w-4 h-4" />
          <kbd className={`ml-1 text-[11px] font-mono px-1.5 py-0.5 rounded border border-emerald-800 bg-emerald-800/80 text-white ${activeKeyEffect === 'right' ? 'bg-white text-emerald-800' : ''}`}>
            →
          </kbd>
        </button>
      </div>

      {/* FOOTER TIP: HƯỚNG DẪN BÀN PHÍM NHANH */}
      <div className="mt-3 text-center text-xs text-stone-500 flex items-center justify-center gap-4 flex-wrap">
        <span className="flex items-center gap-1">
          <Keyboard className="w-3.5 h-3.5 text-stone-400" />
          <span>Phím tắt:</span>
        </span>
        <span><kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">←</kbd> Trái</span>
        <span><kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">→</kbd> Phải</span>
        <span><kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">1</kbd> <kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">2</kbd> <kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">3</kbd> Đổi dạng</span>
        <span><kbd className="font-mono bg-stone-200/70 px-1.5 py-0.5 rounded">A</kbd> Phát âm</span>
      </div>
    </div>
  );
};
