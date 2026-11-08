export interface ScreeningAnswer {
  studyBackground: 'never' | 'basic_alphabet' | 'finished_n5' | 'intermediate_or_higher';
  certificate: 'none' | 'failed_before' | 'has_n5' | 'has_n4' | 'has_n3' | 'other_cert';
  goal: 'it_career' | 'study_abroad' | 'pass_jlpt' | 'hobby';
  weeklyHours: 'less_3h' | '3_to_7h' | 'more_7h';
}

export interface DiagnosticQuestion {
  id: string;
  level: 'N5' | 'N4' | 'N3';
  category: 'alphabet' | 'vocabulary' | 'grammar' | 'kanji' | 'reading';
  question: string;
  contextJp?: string;
  furigana?: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
    subtext?: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanationVi: string;
  points: number;
}

// 1. Câu hỏi khảo sát nền tảng và bằng cấp trước khi vào bài test
export const SCREENING_QUESTIONS = {
  background: {
    id: 'studyBackground',
    title: 'Bạn đã từng tiếp xúc hoặc học tiếng Nhật chưa?',
    subtitle: 'KIZUNA sẽ căn cứ vào đây để chọn độ khó khởi điểm phù hợp nhất.',
    options: [
      {
        value: 'never',
        label: 'Hoàn toàn chưa biết gì',
        desc: 'Chưa thuộc 2 bảng chữ cái Hiragana & Katakana.',
        badge: 'Người mới bắt đầu',
        startStage: 'BEGINNER'
      },
      {
        value: 'basic_alphabet',
        label: 'Đã thuộc 2 bảng chữ cái',
        desc: 'Đang bắt đầu bập bẹ học các mẫu câu chào hỏi, từ vựng sơ cấp.',
        badge: 'Nhập môn N5',
        startStage: 'N5'
      },
      {
        value: 'finished_n5',
        label: 'Đã học xong sơ cấp (khoảng 25 bài Minna)',
        desc: 'Có thể giao tiếp đơn giản và nắm chắc ngữ pháp cơ bản.',
        badge: 'Tiến lên N4',
        startStage: 'N4'
      },
      {
        value: 'intermediate_or_higher',
        label: 'Đã học từ trung cấp N3 trở lên',
        desc: 'Có thể đọc hiểu báo chí cơ bản và giao tiếp lưu loát.',
        badge: 'Trung cấp N3+',
        startStage: 'N3'
      }
    ]
  },
  certificate: {
    id: 'certificate',
    title: 'Bạn đã từng thi hoặc sở hữu chứng chỉ tiếng Nhật nào chưa?',
    subtitle: 'Minh chứng giúp hệ thống đo lường khoảng cách giữa bằng cấp và năng lực phản xạ thực tế.',
    options: [
      {
        value: 'none',
        label: 'Chưa từng tham gia kỳ thi nào',
        desc: 'Tự học hoặc mới bắt đầu tìm hiểu tiếng Nhật.'
      },
      {
        value: 'failed_before',
        label: 'Đã từng đi thi nhưng chưa đạt chứng chỉ',
        desc: 'Đã có trải nghiệm cọ xát với cấu trúc đề thi JLPT/Nat-Test.'
      },
      {
        value: 'has_n5',
        label: 'Đã có chứng chỉ JLPT N5 / Nat-Test 5Q',
        desc: 'Chứng chỉ sơ cấp nhập môn.'
      },
      {
        value: 'has_n4',
        label: 'Đã có chứng chỉ JLPT N4 / Nat-Test 4Q',
        desc: 'Chứng chỉ sơ cấp vững vàng.'
      },
      {
        value: 'has_n3',
        label: 'Đã có chứng chỉ JLPT N3 / Nat-Test 3Q trở lên',
        desc: 'Chứng chỉ trung cấp tiếng Nhật.'
      }
    ]
  },
  goal: {
    id: 'goal',
    title: 'Mục tiêu học tập lớn nhất của bạn cùng KIZUNA là gì?',
    subtitle: 'AI Sensei sẽ định hướng bài tập và chủ đề từ vựng ưu tiên cho mục tiêu của bạn.',
    options: [
      {
        value: 'it_career',
        label: 'Kỹ sư CNTT làm việc tại Nhật Bản (IT BrSE / Dev)',
        desc: 'Tập trung từ vựng công nghệ, văn hóa công sở và giao tiếp dự án.'
      },
      {
        value: 'pass_jlpt',
        label: 'Chinh phục kỳ thi JLPT (N4, N3, N2)',
        desc: 'Tập trung ngữ pháp chuyên sâu, kỹ năng làm bài và mẹo trắc nghiệm.'
      },
      {
        value: 'study_abroad',
        label: 'Du học sinh hoặc kỹ sư đi Nhật làm việc',
        desc: 'Tập trung nghe nói phản xạ và xử lý các tình huống đời sống thường ngày.'
      },
      {
        value: 'hobby',
        label: 'Sở thích cá nhân (Anime, Manga, Du lịch)',
        desc: 'Học tiếng Nhật vui vẻ, tự nhiên thông qua phim ảnh và âm nhạc.'
      }
    ]
  }
};

// 2. Ngân hàng câu hỏi trắc nghiệm chẩn đoán đa tầng (Adaptive Diagnostic Question Bank)
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ================= TẦNG 1: KIỂM TRA N5 (Sơ cấp cơ bản) =================
  {
    id: 'diag_n5_01',
    level: 'N5',
    category: 'alphabet',
    question: 'Chữ Katakana của từ 「あめ」 viết như thế nào?',
    options: [
      { key: 'A', text: 'アメ' },
      { key: 'B', text: 'ウメ' },
      { key: 'C', text: 'マエ' },
      { key: 'D', text: 'イメ' }
    ],
    correctAnswer: 'A',
    explanationVi: 'あ tương ứng với chữ Katakana ア, め tương ứng với メ. Ghép lại là アメ.',
    points: 10
  },
  {
    id: 'diag_n5_02',
    level: 'N5',
    category: 'grammar',
    question: 'Chọn trợ từ thích hợp điền vào chỗ trống:\nわたしは まいにち 7じ（　）おきます。',
    contextJp: 'わたしは まいにち 7じ（　）おきます。',
    options: [
      { key: 'A', text: 'で' },
      { key: 'B', text: 'に' },
      { key: 'C', text: 'を' },
      { key: 'D', text: 'へ' }
    ],
    correctAnswer: 'B',
    explanationVi: 'Trợ từ 「に」 đi sau mốc thời gian cụ thể có con số biểu thị thời điểm thực hiện hành động (7時に起きる).',
    points: 10
  },
  {
    id: 'diag_n5_03',
    level: 'N5',
    category: 'kanji',
    question: 'Từ trong ngoặc đọc là gì:\nきょうは「水曜日」です。',
    contextJp: 'きょうは「水曜日」です。',
    options: [
      { key: 'A', text: 'かようび' },
      { key: 'B', text: 'きんようび' },
      { key: 'C', text: 'すいようび' },
      { key: 'D', text: 'もくようび' }
    ],
    correctAnswer: 'C',
    explanationVi: '「水曜日」 (Thứ Tư) đọc là すいようび (Suiyoubi).',
    points: 10
  },
  {
    id: 'diag_n5_04',
    level: 'N5',
    category: 'vocabulary',
    question: 'Từ nào sau đây mang ý nghĩa là "Thư viện"?',
    options: [
      { key: 'A', text: 'ぎんこう' },
      { key: 'B', text: 'びょういん' },
      { key: 'C', text: 'としょかん' },
      { key: 'D', text: 'ゆうびんきょく' }
    ],
    correctAnswer: 'C',
    explanationVi: '「としょかん」 (図書室/図書館) nghĩa là Thư viện. ぎんこう là ngân hàng, びょういん là bệnh viện, ゆうびんきょく là bưu điện.',
    points: 10
  },

  // ================= TẦNG 2: KIỂM TRA N4 (Sơ cấp vững vàng) =================
  {
    id: 'diag_n4_01',
    level: 'N4',
    category: 'grammar',
    question: 'Chọn đáp án thích hợp:\nあしたは あめが（　）かもしれません。',
    contextJp: 'あしたは あめが（　）かもしれません。',
    options: [
      { key: 'A', text: 'ふり' },
      { key: 'B', text: 'ふる' },
      { key: 'C', text: 'ふって' },
      { key: 'D', text: 'ふった' }
    ],
    correctAnswer: 'B',
    explanationVi: 'Cấu trúc phỏng đoán 「～かもしれません」 (có thể/có lẽ) kết hợp trực tiếp với thể thông thường (V-ru/V-nai). Động từ rơi mưa: ふる (降る).',
    points: 15
  },
  {
    id: 'diag_n4_02',
    level: 'N4',
    category: 'kanji',
    question: 'Từ trong ngoặc đọc là gì:\nきょうは「試験」があります。',
    contextJp: 'きょうは「試験」があります。',
    options: [
      { key: 'A', text: 'じけん' },
      { key: 'B', text: 'しけん' },
      { key: 'C', text: 'たいけん' },
      { key: 'D', text: 'けいけん' }
    ],
    correctAnswer: 'B',
    explanationVi: 'Chữ Hán 「試験」 (Thí nghiệm / Kỳ thi) đọc là 「しけん」 (Shiken).',
    points: 15
  },
  {
    id: 'diag_n4_03',
    level: 'N4',
    category: 'grammar',
    question: 'Chọn đáp án chính xác diễn tả việc "vừa làm A vừa làm B":\nおんがくを（　）べんきょうします。',
    contextJp: 'おんがくを（　）べんきょうします。',
    options: [
      { key: 'A', text: 'ききながら' },
      { key: 'B', text: 'きいて' },
      { key: 'C', text: 'きくまえに' },
      { key: 'D', text: 'きいたあとで' }
    ],
    correctAnswer: 'A',
    explanationVi: 'Cấu trúc V-bỏ-masu + ながら biểu thị 2 hành động diễn ra đồng thời: おんがくを ききながら (Vừa nghe nhạc vừa học bài).',
    points: 15
  },
  {
    id: 'diag_n4_04',
    level: 'N4',
    category: 'vocabulary',
    question: 'Từ trái nghĩa của 「複雑」 là gì?',
    options: [
      { key: 'A', text: 'しんせつ' },
      { key: 'B', text: 'かんたん' },
      { key: 'C', text: 'たいへん' },
      { key: 'D', text: 'べんり' }
    ],
    correctAnswer: 'B',
    explanationVi: '「複雑」 (ふくざつ - phức tạp) đối nghĩa với 「簡単」 (かんたん - đơn giản). しんせつ là thân thiện, たいへん là vất vả, べんり là tiện lợi.',
    points: 15
  },

  // ================= TẦNG 3: KIỂM TRA N3 (Trung cấp đột phá) =================
  {
    id: 'diag_n3_01',
    level: 'N3',
    category: 'grammar',
    question: 'Điền cấu trúc phù hợp biểu thị "vừa mới... thì ngay lập tức":\n彼は 部屋に（　）とたん、倒れてしまった。',
    contextJp: '彼は 部屋に（　）とたん、倒れてしまった。',
    options: [
      { key: 'A', text: '入る' },
      { key: 'B', text: '入った' },
      { key: 'C', text: '入って' },
      { key: 'D', text: '入ろう' }
    ],
    correctAnswer: 'B',
    explanationVi: 'Mẫu ngữ pháp N3 「V-た ＋ とたん（に）」: Vừa mới làm V xong thì bất ngờ một sự việc khác xảy ra ngay lập tức.',
    points: 20
  },
  {
    id: 'diag_n3_02',
    level: 'N3',
    category: 'kanji',
    question: 'Từ trong ngoặc đọc là gì:\n会議の「日程」を変更します。',
    contextJp: '会議の「日程」を変更します。',
    options: [
      { key: 'A', text: 'にちじょう' },
      { key: 'B', text: 'にってい' },
      { key: 'C', text: 'ひづけ' },
      { key: 'D', text: 'にっけい' }
    ],
    correctAnswer: 'B',
    explanationVi: '「日程」 (Nhật trình - Lịch trình dự kiến) có cách đọc chuẩn là 「にってい」 (Nittei).',
    points: 20
  },
  {
    id: 'diag_n3_03',
    level: 'N3',
    category: 'grammar',
    question: 'Chọn dạng kính ngữ thích hợp khi nói với khách hàng về hành động của Giám đốc bên mình:\n「社長は 今 出張中（　）。」',
    contextJp: '「社長は 今 出張中（　）。」',
    options: [
      { key: 'A', text: 'でいらっしゃいます' },
      { key: 'B', text: 'でございます' },
      { key: 'C', text: 'になられます' },
      { key: 'D', text: 'においでになります' }
    ],
    correctAnswer: 'B',
    explanationVi: 'Quy tắc Uchi-Soto trong văn hóa công sở Nhật: Khi nói với đối tác/khách hàng về người trong công ty mình (kể cả Giám đốc), ta dùng Khiêm nhường ngữ / Thể lịch sự 「でございます」, không dùng Tôn kính ngữ.',
    points: 20
  },
  {
    id: 'diag_n3_04',
    level: 'N3',
    category: 'vocabulary',
    question: 'Từ ngữ nào thường dùng trong email với nghĩa "Phản hồi/Hồi đáp"?',
    options: [
      { key: 'A', text: '返信' },
      { key: 'B', text: '予定' },
      { key: 'C', text: '開始' },
      { key: 'D', text: '中止' }
    ],
    correctAnswer: 'A',
    explanationVi: '「返信 (へんしん)」 nghĩa là phản hồi thư / email, cực kỳ phổ biến trong giao tiếp kỹ sư BrSE và dự án. 予定 là dự định, 開始 là bắt đầu, 中止 là hủy bỏ.',
    points: 20
  }
];
