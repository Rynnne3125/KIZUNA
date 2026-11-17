export interface ScreeningAnswer {
  studyBackground: 'never' | 'basic_alphabet' | 'finished_n5' | 'intermediate_or_higher';
  certificate: 'none' | 'failed_before' | 'has_n5' | 'has_n4' | 'has_n3' | 'other_cert';
  goal: 'it_career' | 'study_abroad' | 'pass_jlpt' | 'hobby';
  weeklyHours: 'less_3h' | '3_to_7h' | 'more_7h';
}

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
export type PlacementLevel = typeof JLPT_LEVELS[number];
export const PLACEMENT_PASS_RATE = 0.75;

export interface DiagnosticQuestion {
  id: string;
  setId?: number;
  level: PlacementLevel;
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

export interface DiagnosticQuestionSet {
  setId: number;
  title: string;
  questions: DiagnosticQuestion[];
}

export const ADVANCED_PLACEMENT_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'placement_n2_kanji', level: 'N2', category: 'kanji',
    question: 'Chọn cách đọc của từ trong ngoặc.', contextJp: '工事の進み具合を【把握】する。',
    options: [{ key: 'A', text: 'はあく' }, { key: 'B', text: 'はかく' }, { key: 'C', text: 'はわく' }, { key: 'D', text: 'はがく' }],
    correctAnswer: 'A', explanationVi: '把握（はあく）する nghĩa là nắm rõ.', points: 25
  },
  {
    id: 'placement_n2_vocab', level: 'N2', category: 'vocabulary',
    question: 'Chọn từ phù hợp với ngữ cảnh.', contextJp: '予算が足りないため、計画の（　）を迫られた。',
    options: [{ key: 'A', text: '見直し' }, { key: 'B', text: '見栄え' }, { key: 'C', text: '見落とし' }, { key: 'D', text: '見晴らし' }],
    correctAnswer: 'A', explanationVi: '計画の見直し là xem xét và điều chỉnh lại kế hoạch.', points: 25
  },
  {
    id: 'placement_n2_grammar', level: 'N2', category: 'grammar',
    question: 'Chọn mẫu ngữ pháp phù hợp.', contextJp: 'この美術館は、年齢（　）誰でも無料で入館できます。',
    options: [{ key: 'A', text: 'を問わず' }, { key: 'B', text: 'に先立って' }, { key: 'C', text: 'に沿って' }, { key: 'D', text: 'を通じて' }],
    correctAnswer: 'A', explanationVi: '年齢を問わず nghĩa là không phân biệt tuổi tác.', points: 25
  },
  {
    id: 'placement_n2_reading', level: 'N2', category: 'reading',
    question: 'Ai cần đăng ký trước?', contextJp: '講演は誰でも聞けるが、終了後の見学会に参加する場合は、前日までに申し込みが必要だ。',
    options: [{ key: 'A', text: 'Người tham gia buổi tham quan.' }, { key: 'B', text: 'Người chỉ nghe buổi thuyết trình.' }, { key: 'C', text: 'Tất cả người đến.' }, { key: 'D', text: 'Người đến trước giờ khai mạc.' }],
    correctAnswer: 'A', explanationVi: 'Yêu cầu đăng ký trước chỉ áp dụng cho buổi tham quan sau thuyết trình.', points: 25
  },
  {
    id: 'placement_n1_kanji', level: 'N1', category: 'kanji',
    question: 'Chọn cách đọc của từ trong ngoặc.', contextJp: '制度の不備を【是正】する。',
    options: [{ key: 'A', text: 'ぜせい' }, { key: 'B', text: 'しせい' }, { key: 'C', text: 'ぜしょう' }, { key: 'D', text: 'じせい' }],
    correctAnswer: 'A', explanationVi: '是正（ぜせい）する nghĩa là chấn chỉnh hoặc khắc phục sai sót.', points: 30
  },
  {
    id: 'placement_n1_vocab', level: 'N1', category: 'vocabulary',
    question: 'Chọn từ phù hợp với ngữ cảnh.', contextJp: 'その発言は事実に即しておらず、批判を（　）する結果となった。',
    options: [{ key: 'A', text: '招来' }, { key: 'B', text: '援用' }, { key: 'C', text: '踏襲' }, { key: 'D', text: '是認' }],
    correctAnswer: 'A', explanationVi: '招来する nghĩa là dẫn đến hoặc gây ra một hệ quả.', points: 30
  },
  {
    id: 'placement_n1_grammar', level: 'N1', category: 'grammar',
    question: 'Chọn mẫu ngữ pháp phù hợp.', contextJp: '専門家（　）、この資料だけで原因を特定するのは難しい。',
    options: [{ key: 'A', text: 'といえども' }, { key: 'B', text: 'に即して' }, { key: 'C', text: 'にひきかえ' }, { key: 'D', text: 'をもって' }],
    correctAnswer: 'A', explanationVi: 'といえども có nghĩa là ngay cả khi, nhấn mạnh rằng chuyên gia cũng khó xác định nguyên nhân.', points: 30
  },
  {
    id: 'placement_n1_reading', level: 'N1', category: 'reading',
    question: 'Tác giả nhấn mạnh điều gì?', contextJp: '指標の数値が改善したからといって、施策が功を奏したとは限らない。数値に影響し得る要因を洗い出した上で、施策の寄与を検討すべきだ。',
    options: [{ key: 'A', text: 'Cần xem xét các yếu tố ảnh hưởng trước khi kết luận về hiệu quả của biện pháp.' }, { key: 'B', text: 'Chỉ số tăng đủ để chứng minh biện pháp có hiệu quả.' }, { key: 'C', text: 'Cần bỏ chỉ số khi đánh giá biện pháp.' }, { key: 'D', text: 'Chỉ cần đánh giá biện pháp khi chỉ số giảm.' }],
    correctAnswer: 'A', explanationVi: 'Tác giả yêu cầu xác định các yếu tố có thể ảnh hưởng đến chỉ số trước khi đánh giá đóng góp của biện pháp.', points: 30
  }
];

// 1. Câu hỏi khảo sát nền tảng và bằng cấp trước khi vào bài test
export const SCREENING_QUESTIONS = {
  background: {
    id: 'studyBackground',
    title: 'Bạn đã từng tiếp xúc hoặc học tiếng Nhật chưa?',
    subtitle: 'Bài kiểm tra bắt đầu từ N5. Nếu chưa từng học, bạn có thể chọn lộ trình nhập môn ngay.',
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
    subtitle: 'Chọn một mục tiêu để lưu cùng lộ trình học của bạn.',
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
} as const;

// ============================================================================
// 2. NGÂN HÀNG 10 BỘ ĐỀ TRẮC NGHIỆM THÍCH ỨNG (10 BỘ x 12 CÂU = 120 CÂU)
// Mỗi bộ gồm 4 câu N5, 4 câu N4, 4 câu N3 (Không chứa gợi ý nghĩa tiếng Việt)
// ============================================================================
export const DIAGNOSTIC_QUESTION_SETS: DiagnosticQuestionSet[] = [
  // ================= BỘ ĐỀ SỐ 1 =================
  {
    setId: 1,
    title: 'Bộ đề chuẩn đoán #01',
    questions: [
      {
        id: 's1_n5_01', setId: 1, level: 'N5', category: 'alphabet',
        question: 'Chữ Katakana của từ trong ngoặc viết như thế nào:\n「あめ」',
        options: [{ key: 'A', text: 'アメ' }, { key: 'B', text: 'ウメ' }, { key: 'C', text: 'マエ' }, { key: 'D', text: 'イメ' }],
        correctAnswer: 'A', explanationVi: 'あ tương ứng với ア, め tương ứng với メ. Ghép lại là アメ.', points: 10
      },
      {
        id: 's1_n5_02', setId: 1, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nわたしは まいにち 7じ（　）おきます。',
        options: [{ key: 'A', text: 'で' }, { key: 'B', text: 'に' }, { key: 'C', text: 'を' }, { key: 'D', text: 'へ' }],
        correctAnswer: 'B', explanationVi: 'Trợ từ 「に」 đi sau mốc thời gian cụ thể có con số (7じにおきます).', points: 10
      },
      {
        id: 's1_n5_03', setId: 1, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nきょうは「水曜日」です。',
        options: [{ key: 'A', text: 'かようび' }, { key: 'B', text: 'きんようび' }, { key: 'C', text: 'すいようび' }, { key: 'D', text: 'もくようび' }],
        correctAnswer: 'C', explanationVi: '「水曜日」 (Thứ Tư) đọc là すいようび.', points: 10
      },
      {
        id: 's1_n5_04', setId: 1, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nほんを かりに（　）へ いきます。',
        options: [{ key: 'A', text: 'ぎんこう' }, { key: 'B', text: 'びょういん' }, { key: 'C', text: 'としょかん' }, { key: 'D', text: 'ゆうびんきょく' }],
        correctAnswer: 'C', explanationVi: '「としょかん」 (図書館 - Thư viện) là nơi đến để mượn sách (ほんをかりに).', points: 10
      },
      {
        id: 's1_n4_01', setId: 1, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nあしたは あめが（　）かもしれません。',
        options: [{ key: 'A', text: 'ふり' }, { key: 'B', text: 'ふる' }, { key: 'C', text: 'ふって' }, { key: 'D', text: 'ふった' }],
        correctAnswer: 'B', explanationVi: 'Mẫu 「～かもしれません」 đi với thể thông thường (ふる).', points: 15
      },
      {
        id: 's1_n4_02', setId: 1, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nきょうは「試験」があります。',
        options: [{ key: 'A', text: 'じけん' }, { key: 'B', text: 'しけん' }, { key: 'C', text: 'たいけん' }, { key: 'D', text: 'けいけん' }],
        correctAnswer: 'B', explanationVi: '「試験」 (Kỳ thi) đọc là しけん.', points: 15
      },
      {
        id: 's1_n4_03', setId: 1, level: 'N4', category: 'grammar',
        question: 'Chọn mẫu diễn tả hai hành động diễn ra cùng lúc.\nおんがくを（　）べんきょうします。',
        options: [{ key: 'A', text: 'ききながら' }, { key: 'B', text: 'きいて' }, { key: 'C', text: 'きくまえに' }, { key: 'D', text: 'きいたあとで' }],
        correctAnswer: 'A', explanationVi: '聞きながら勉強します nghĩa là vừa nghe nhạc vừa học. Dùng thân động từ 聞き + ながら.', points: 15
      },
      {
        id: 's1_n4_04', setId: 1, level: 'N4', category: 'vocabulary',
        question: 'Từ trái nghĩa của từ trong ngoặc là gì:\n「複雑」',
        options: [{ key: 'A', text: 'しんせつ' }, { key: 'B', text: 'かんたん' }, { key: 'C', text: 'たいへん' }, { key: 'D', text: 'べんり' }],
        correctAnswer: 'B', explanationVi: '「複雑」 (phức tạp) trái nghĩa với 「かんたん」 (đơn giản).', points: 15
      },
      {
        id: 's1_n3_01', setId: 1, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n彼は 部屋に（　）とたん、倒れてしまった。',
        options: [{ key: 'A', text: '入る' }, { key: 'B', text: '入った' }, { key: 'C', text: '入って' }, { key: 'D', text: '入ろう' }],
        correctAnswer: 'B', explanationVi: 'Cấu trúc 「V-た + とたん」: Vừa mới làm V thì sự việc khác xảy ra ngay.', points: 20
      },
      {
        id: 's1_n3_02', setId: 1, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n会議の「日程」を変更します。',
        options: [{ key: 'A', text: 'にちじょう' }, { key: 'B', text: 'にってい' }, { key: 'C', text: 'ひづけ' }, { key: 'D', text: 'にっけい' }],
        correctAnswer: 'B', explanationVi: '「日程」 (Lịch trình) đọc là にってい.', points: 20
      },
      {
        id: 's1_n3_03', setId: 1, level: 'N3', category: 'grammar',
        question: 'Chọn kính ngữ phù hợp khi hỏi đồng nghiệp về giám đốc.\n社長は今、会議室に（　）か。',
        options: [{ key: 'A', text: 'いらっしゃいます' }, { key: 'B', text: 'まいります' }, { key: 'C', text: 'うかがいます' }, { key: 'D', text: 'ごらんになります' }],
        correctAnswer: 'A', explanationVi: 'いらっしゃいます là kính ngữ của います. Câu này hỏi giám đốc hiện có ở phòng họp hay không.', points: 20
      },
      {
        id: 's1_n3_04', setId: 1, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\nエラーが何度も出るので、その（　）を調べています。',
        options: [{ key: 'A', text: '原因' }, { key: 'B', text: '結果' }, { key: 'C', text: '目的' }, { key: 'D', text: '手順' }],
        correctAnswer: 'A', explanationVi: '原因を調べる nghĩa là tìm nguyên nhân. Vì lỗi xuất hiện nhiều lần nên người nói đang tìm nguyên nhân gây lỗi.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 2 =================
  {
    setId: 2,
    title: 'Bộ đề chuẩn đoán #02',
    questions: [
      {
        id: 's2_n5_01', setId: 2, level: 'N5', category: 'alphabet',
        question: 'Chữ Hiragana của từ trong ngoặc viết như thế nào:\n「カメラ」',
        options: [{ key: 'A', text: 'かめら' }, { key: 'B', text: 'かなら' }, { key: 'C', text: 'かめろ' }, { key: 'D', text: 'がめら' }],
        correctAnswer: 'A', explanationVi: 'カメラ chuyển sang Hiragana là かめら (máy ảnh).', points: 10
      },
      {
        id: 's2_n5_02', setId: 2, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nわたしは バス（　）かいしゃへ いきます。',
        options: [{ key: 'A', text: 'を' }, { key: 'B', text: 'に' }, { key: 'C', text: 'で' }, { key: 'D', text: 'と' }],
        correctAnswer: 'C', explanationVi: 'Trợ từ 「で」 chỉ phương tiện di chuyển (バスでいきます).', points: 10
      },
      {
        id: 's2_n5_03', setId: 2, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nあの「先生」は だれですか。',
        options: [{ key: 'A', text: 'せんせい' }, { key: 'B', text: 'がくせい' }, { key: 'C', text: 'せんげつ' }, { key: 'D', text: 'せんしゅう' }],
        correctAnswer: 'A', explanationVi: '「先生」 (Giáo viên) đọc là せんせい.', points: 10
      },
      {
        id: 's2_n5_04', setId: 2, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nきのうの よるは、ふとんに はいって すぐ（　）ました。',
        options: [{ key: 'A', text: 'ね' }, { key: 'B', text: 'のり' }, { key: 'C', text: 'かえり' }, { key: 'D', text: 'はしり' }],
        correctAnswer: 'A', explanationVi: 'ふとんに入ってすぐ寝ました nghĩa là vừa chui vào chăn thì ngủ ngay.', points: 10
      },
      {
        id: 's2_n4_01', setId: 2, level: 'N4', category: 'grammar',
        question: 'Chọn dạng diễn tả trạng thái của cửa sổ.\nまどが（　）いますよ。',
        options: [{ key: 'A', text: 'あけて' }, { key: 'B', text: 'あいて' }, { key: 'C', text: 'あける' }, { key: 'D', text: 'あいた' }],
        correctAnswer: 'B', explanationVi: '窓が開いています nghĩa là cửa sổ đang mở. 開く là tự động từ và 開いて là thể て.', points: 15
      },
      {
        id: 's2_n4_02', setId: 2, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「都合」が悪くて行けません。',
        options: [{ key: 'A', text: 'とかい' }, { key: 'B', text: 'つごう' }, { key: 'C', text: 'としょ' }, { key: 'D', text: 'ばあい' }],
        correctAnswer: 'B', explanationVi: '「都合」 (Sự thuận tiện / hoàn cảnh) đọc là つごう.', points: 15
      },
      {
        id: 's2_n4_03', setId: 2, level: 'N4', category: 'grammar',
        question: 'Chọn dạng động từ diễn tả khả năng mới có được.\nにほんごが（　）ようになりました。',
        options: [{ key: 'A', text: 'はなす' }, { key: 'B', text: 'はなせる' }, { key: 'C', text: 'はなした' }, { key: 'D', text: 'はなして' }],
        correctAnswer: 'B', explanationVi: '話せる là thể khả năng của 話す. 話せるようになりました nghĩa là đã có thể nói được.', points: 15
      },
      {
        id: 's2_n4_04', setId: 2, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\n約束の時間に（　）しまいました。',
        options: [{ key: 'A', text: 'おくれて' }, { key: 'B', text: 'わすれて' }, { key: 'C', text: 'こわれて' }, { key: 'D', text: 'よごれて' }],
        correctAnswer: 'A', explanationVi: '時間に遅れる (おくれる): Trễ giờ hẹn.', points: 15
      },
      {
        id: 's2_n3_01', setId: 2, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n忙しい（　）、わざわざ来てくれてありがとう。',
        options: [{ key: 'A', text: 'うちに' }, { key: 'B', text: '最中に' }, { key: 'C', text: 'ところを' }, { key: 'D', text: 'ばかりに' }],
        correctAnswer: 'C', explanationVi: 'Cấu trúc 「忙しいところを」 dùng khi cảm ơn hoặc xin lỗi vì đã làm phiền lúc đối phương bận rộn.', points: 20
      },
      {
        id: 's2_n3_02', setId: 2, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「納期」を守ることは大切です。',
        options: [{ key: 'A', text: 'のうき' }, { key: 'B', text: 'なっき' }, { key: 'C', text: 'のうご' }, { key: 'D', text: 'ないき' }],
        correctAnswer: 'A', explanationVi: '「納期」 (Thời hạn bàn giao sản phẩm) đọc là のうき.', points: 20
      },
      {
        id: 's2_n3_03', setId: 2, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nこの映画は何度見ても面白い。（　）名作だ。',
        options: [{ key: 'A', text: 'たとえ' }, { key: 'B', text: 'まさに' }, { key: 'C', text: 'せめて' }, { key: 'D', text: 'かりに' }],
        correctAnswer: 'B', explanationVi: '「まさに」: Quả đúng là / đích thực là (một kiệt tác).', points: 20
      },
      {
        id: 's2_n3_04', setId: 2, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nデータを誤って（　）してしまった。',
        options: [{ key: 'A', text: '削除' }, { key: 'B', text: '掃除' }, { key: 'C', text: '控除' }, { key: 'D', text: '解除' }],
        correctAnswer: 'A', explanationVi: '「削除」 (さくじょ): Xóa dữ liệu.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 3 =================
  {
    setId: 3,
    title: 'Bộ đề chuẩn đoán #03',
    questions: [
      {
        id: 's3_n5_01', setId: 3, level: 'N5', category: 'alphabet',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nてがみに（　）を はります。',
        options: [{ key: 'A', text: 'きって' }, { key: 'B', text: 'きて' }, { key: 'C', text: 'きいて' }, { key: 'D', text: 'きゆ' }],
        correctAnswer: 'A', explanationVi: '「きって」 (Tem thư) có chữ つ nhỏ biểu thị âm ngắt.', points: 10
      },
      {
        id: 's3_n5_02', setId: 3, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nへやに つくえ（　）いすが あります。',
        options: [{ key: 'A', text: 'と' }, { key: 'B', text: 'へ' }, { key: 'C', text: 'を' }, { key: 'D', text: 'で' }],
        correctAnswer: 'A', explanationVi: 'Trợ từ 「と」 dùng để nối hai danh từ liệt kê đầy đủ (bàn và ghế).', points: 10
      },
      {
        id: 's3_n5_03', setId: 3, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「来週」また あいましょう。',
        options: [{ key: 'A', text: 'せんしゅう' }, { key: 'B', text: 'こんしゅう' }, { key: 'C', text: 'らいしゅう' }, { key: 'D', text: 'らいげつ' }],
        correctAnswer: 'C', explanationVi: '「来週」 (Tuần sau) đọc là らいしゅう.', points: 10
      },
      {
        id: 's3_n5_04', setId: 3, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\nこの コーヒーは（　）です。こおりを いれて のみます。',
        options: [{ key: 'A', text: 'あつい' }, { key: 'B', text: 'やすい' }, { key: 'C', text: 'ながい' }, { key: 'D', text: 'ひろい' }],
        correctAnswer: 'A', explanationVi: 'あつい nghĩa là nóng. Người nói cho đá vào cà phê rồi uống.', points: 10
      },
      {
        id: 's3_n4_01', setId: 3, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n先生に この本を（　）いただきました。',
        options: [{ key: 'A', text: 'かして' }, { key: 'B', text: 'かりて' }, { key: 'C', text: 'かす' }, { key: 'D', text: 'かした' }],
        correctAnswer: 'A', explanationVi: 'Cấu trúc 「V-ていただく」: Nhận được hành động cho mượn (かしていただきました) từ thầy giáo.', points: 15
      },
      {
        id: 's3_n4_02', setId: 3, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n駅の「案内」を見ます。',
        options: [{ key: 'A', text: 'あんない' }, { key: 'B', text: 'かない' }, { key: 'C', text: 'しつない' }, { key: 'D', text: 'あんぜん' }],
        correctAnswer: 'A', explanationVi: '「案内」 (Hướng dẫn / Bảng chỉ dẫn) đọc là あんない.', points: 15
      },
      {
        id: 's3_n4_03', setId: 3, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nくすりを（　）から、ねてください。',
        options: [{ key: 'A', text: 'のむ' }, { key: 'B', text: 'のんで' }, { key: 'C', text: 'のんだ' }, { key: 'D', text: 'のみ' }],
        correctAnswer: 'B', explanationVi: '「V-てから」: Sau khi làm V (sau khi uống thuốc hãy đi ngủ).', points: 15
      },
      {
        id: 's3_n4_04', setId: 3, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\n川に ごみを（　）はいけません。',
        options: [{ key: 'A', text: 'すてて' }, { key: 'B', text: 'ひろって' }, { key: 'C', text: 'かえて' }, { key: 'D', text: 'たべて' }],
        correctAnswer: 'A', explanationVi: '川にごみを捨ててはいけません nghĩa là không được vứt rác xuống sông.', points: 15
      },
      {
        id: 's3_n3_01', setId: 3, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n雨が降っている（　）、試合は中止になった。',
        options: [{ key: 'A', text: 'おかげで' }, { key: 'B', text: 'せいで' }, { key: 'C', text: 'くせに' }, { key: 'D', text: 'わりに' }],
        correctAnswer: 'B', explanationVi: '「せいで」 chỉ nguyên nhân dẫn đến kết quả tiêu cực (vì mưa nên trận đấu bị hủy).', points: 20
      },
      {
        id: 's3_n3_02', setId: 3, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n書類を「確認」してください。',
        options: [{ key: 'A', text: 'かくにん' }, { key: 'B', text: 'かくてい' }, { key: 'C', text: 'しんにん' }, { key: 'D', text: 'かくしん' }],
        correctAnswer: 'A', explanationVi: '「確認」 (Xác nhận) đọc là かくにん.', points: 20
      },
      {
        id: 's3_n3_03', setId: 3, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n日本へ（　）からというもの、毎日日本語を使っている。',
        options: [{ key: 'A', text: '来る' }, { key: 'B', text: '来て' }, { key: 'C', text: '来た' }, { key: 'D', text: '来よう' }],
        correctAnswer: 'B', explanationVi: 'Cấu trúc 「V-てからというもの」: Kể từ sau khi V thì liên tục diễn ra một thay đổi lớn.', points: 20
      },
      {
        id: 's3_n3_04', setId: 3, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\n審査の結果、予算案が正式に（　）された。',
        options: [{ key: 'A', text: '承認' }, { key: 'B', text: '承知' }, { key: 'C', text: '継承' }, { key: 'D', text: '達成' }],
        correctAnswer: 'A', explanationVi: '予算案が承認された nghĩa là đề xuất ngân sách đã được phê duyệt.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 4 =================
  {
    setId: 4,
    title: 'Bộ đề chuẩn đoán #04',
    questions: [
      {
        id: 's4_n5_01', setId: 4, level: 'N5', category: 'alphabet',
        question: 'Chữ Katakana của từ trong ngoặc viết như thế nào:\n「てれび」',
        options: [{ key: 'A', text: 'テレビ' }, { key: 'B', text: 'テビレ' }, { key: 'C', text: 'ラレビ' }, { key: 'D', text: 'チレビ' }],
        correctAnswer: 'A', explanationVi: '「てれび」 viết bằng chữ Katakana là 「テレビ」.', points: 10
      },
      {
        id: 's4_n5_02', setId: 4, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nとしょかん（　）ほんを かります。',
        options: [{ key: 'A', text: 'に' }, { key: 'B', text: 'で' }, { key: 'C', text: 'へ' }, { key: 'D', text: 'を' }],
        correctAnswer: 'B', explanationVi: 'Trợ từ 「で」 chỉ nơi diễn ra hành động (mượn sách ở thư viện).', points: 10
      },
      {
        id: 's4_n5_03', setId: 4, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「友だち」と ごはんを たべます。',
        options: [{ key: 'A', text: 'ともだち' }, { key: 'B', text: 'ちちおや' }, { key: 'C', text: 'きょうだい' }, { key: 'D', text: 'かぞく' }],
        correctAnswer: 'A', explanationVi: '「友だち」 (Bạn bè) đọc là ともだち.', points: 10
      },
      {
        id: 's4_n5_04', setId: 4, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nまいあさ、しんぶんを（　）ます。',
        options: [{ key: 'A', text: 'よみ' }, { key: 'B', text: 'のみ' }, { key: 'C', text: 'すみ' }, { key: 'D', text: 'やすみ' }],
        correctAnswer: 'A', explanationVi: 'しんぶんをよみます (Đọc báo).', points: 10
      },
      {
        id: 's4_n4_01', setId: 4, level: 'N4', category: 'grammar',
        question: 'Chọn mẫu dùng để thuật lại thông tin nghe được.\nともだちの はなしでは、かれは らいねん けっこんする（　）です。',
        options: [{ key: 'A', text: 'そう' }, { key: 'B', text: 'すぎ' }, { key: 'C', text: 'かた' }, { key: 'D', text: 'やすい' }],
        correctAnswer: 'A', explanationVi: 'Động từ thể thông thường + そうです dùng khi thuật lại thông tin. Ở đây người nói nghe bạn kể rằng anh ấy sẽ kết hôn vào năm sau.', points: 15
      },
      {
        id: 's4_n4_02', setId: 4, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「経験」が あります。',
        options: [{ key: 'A', text: 'けいけん' }, { key: 'B', text: 'じっけん' }, { key: 'C', text: 'しけん' }, { key: 'D', text: 'きけん' }],
        correctAnswer: 'A', explanationVi: '「経験」 (Kinh nghiệm) đọc là けいけん.', points: 15
      },
      {
        id: 's4_n4_03', setId: 4, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n母は わたしに やさいを（　）。',
        options: [{ key: 'A', text: 'たべさせました' }, { key: 'B', text: 'たべられました' }, { key: 'C', text: 'たべました' }, { key: 'D', text: 'たべたいです' }],
        correctAnswer: 'A', explanationVi: 'Thể sai khiến 「たべさせました」: Mẹ bắt/cho tôi ăn rau.', points: 15
      },
      {
        id: 's4_n4_04', setId: 4, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nパソコンが（　）しまいました。',
        options: [{ key: 'A', text: 'こわれて' }, { key: 'B', text: 'やぶれて' }, { key: 'C', text: 'おれて' }, { key: 'D', text: 'われて' }],
        correctAnswer: 'A', explanationVi: 'Máy tính, máy móc bị hỏng dùng tự động từ 「こわれる」 (壊れる).', points: 15
      },
      {
        id: 's4_n3_01', setId: 4, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n値段が高い（　）、品質はとてもいい。',
        options: [{ key: 'A', text: 'だけあって' }, { key: 'B', text: 'ばかりに' }, { key: 'C', text: 'っこない' }, { key: 'D', text: 'どころか' }],
        correctAnswer: 'A', explanationVi: '「だけあって」: Quả tương xứng với (đắt sắt ra miếng, chất lượng rất tốt).', points: 20
      },
      {
        id: 's4_n3_02', setId: 4, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「進捗」を報告します。',
        options: [{ key: 'A', text: 'しんちょく' }, { key: 'B', text: 'しんぽ' }, { key: 'C', text: 'しんこう' }, { key: 'D', text: 'しんたく' }],
        correctAnswer: 'A', explanationVi: '「進捗」 (Tiến độ công việc) đọc là しんちょく.', points: 20
      },
      {
        id: 's4_n3_03', setId: 4, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nどんなに（　）ても、あきらめないでください。',
        options: [{ key: 'A', text: 'むずかしい' }, { key: 'B', text: 'むずかしく' }, { key: 'C', text: 'むずかしくて' }, { key: 'D', text: 'むずかしかった' }],
        correctAnswer: 'B', explanationVi: 'Tính từ đuôi い chia sang thể て là 「～くても」 (むずかしくても).', points: 20
      },
      {
        id: 's4_n3_04', setId: 4, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\nログインできないというシステムの（　）を修正した。',
        options: [{ key: 'A', text: '不具合' }, { key: 'B', text: '都合' }, { key: 'C', text: '不思議' }, { key: 'D', text: '不自由' }],
        correctAnswer: 'A', explanationVi: '不具合 là lỗi hoặc sự cố khiến thiết bị hay hệ thống hoạt động sai. Ở đây là lỗi không đăng nhập được.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 5 =================
  {
    setId: 5,
    title: 'Bộ đề chuẩn đoán #05',
    questions: [
      {
        id: 's5_n5_01', setId: 5, level: 'N5', category: 'alphabet',
        question: 'Chọn cách viết katakana tương ứng.\nびょういん',
        options: [{ key: 'A', text: 'ビョウイン' }, { key: 'B', text: 'ビヨウイン' }, { key: 'C', text: 'ビョイン' }, { key: 'D', text: 'ピョウイン' }],
        correctAnswer: 'A', explanationVi: 'びょ tương ứng với ビョ. Trường âm う và phần いん được viết là ウイン.', points: 10
      },
      {
        id: 's5_n5_02', setId: 5, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nにほんご（　）てがみを かきます。',
        options: [{ key: 'A', text: 'で' }, { key: 'B', text: 'に' }, { key: 'C', text: 'へ' }, { key: 'D', text: 'と' }],
        correctAnswer: 'A', explanationVi: 'Trợ từ 「で」 chỉ công cụ / ngôn ngữ sử dụng (viết thư bằng tiếng Nhật).', points: 10
      },
      {
        id: 's5_n5_03', setId: 5, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「毎日」日本語を勉強します。',
        options: [{ key: 'A', text: 'まいにち' }, { key: 'B', text: 'まいしゅう' }, { key: 'C', text: 'まいつき' }, { key: 'D', text: 'まいとし' }],
        correctAnswer: 'A', explanationVi: '「毎日」 (Mỗi ngày) đọc là まいにち.', points: 10
      },
      {
        id: 's5_n5_04', setId: 5, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nおかねを おろしに（　）へ いきます。',
        options: [{ key: 'A', text: 'ぎんこう' }, { key: 'B', text: 'がっこう' }, { key: 'C', text: 'こうえん' }, { key: 'D', text: 'えき' }],
        correctAnswer: 'A', explanationVi: '「ぎんこう」 (銀行 - Ngân hàng) là nơi đến để rút tiền (おかねをおろしに).', points: 10
      },
      {
        id: 's5_n4_01', setId: 5, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nあめが（　）ば、ハイキングに いきます。',
        options: [{ key: 'A', text: 'ふらなけれ' }, { key: 'B', text: 'ふらない' }, { key: 'C', text: 'ふらなく' }, { key: 'D', text: 'ふらないなら' }],
        correctAnswer: 'A', explanationVi: 'Thể điều kiện ば ở dạng phủ định: V-なければ (ふらなければ).', points: 15
      },
      {
        id: 's5_n4_02', setId: 5, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n会議の「準備」をします。',
        options: [{ key: 'A', text: 'じゅんび' }, { key: 'B', text: 'ようい' }, { key: 'C', text: 'せいび' }, { key: 'D', text: 'じゅんばん' }],
        correctAnswer: 'A', explanationVi: '「準備」 (Chuẩn bị) đọc là じゅんび.', points: 15
      },
      {
        id: 's5_n4_03', setId: 5, level: 'N4', category: 'grammar',
        question: 'Chọn mẫu thích hợp để nêu mục đích.\nわすれない（　）、メモをしておきます。',
        options: [{ key: 'A', text: 'ように' }, { key: 'B', text: 'のに' }, { key: 'C', text: 'そうに' }, { key: 'D', text: 'みたいに' }],
        correctAnswer: 'A', explanationVi: '忘れないようにメモをしておきます nghĩa là ghi chú lại để khỏi quên.', points: 15
      },
      {
        id: 's5_n4_04', setId: 5, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nへやを（　）から でかけます。',
        options: [{ key: 'A', text: 'かたづけて' }, { key: 'B', text: 'みつけて' }, { key: 'C', text: 'つづけて' }, { key: 'D', text: 'くらべて' }],
        correctAnswer: 'A', explanationVi: '「かたづける」 (片付ける): Dọn dẹp gọn gàng.', points: 15
      },
      {
        id: 's5_n3_01', setId: 5, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n風邪をひいた（　）、頭が痛い。',
        options: [{ key: 'A', text: 'せいか' }, { key: 'B', text: 'おかげか' }, { key: 'C', text: 'どころか' }, { key: 'D', text: 'ついでに' }],
        correctAnswer: 'A', explanationVi: '「せいか」: Không biết có phải tại vì... hay không mà (kết quả xấu).', points: 20
      },
      {
        id: 's5_n3_02', setId: 5, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「仕様」書を作成しています。',
        options: [{ key: 'A', text: 'しよう' }, { key: 'B', text: 'しかた' }, { key: 'C', text: 'しごと' }, { key: 'D', text: 'さぎょう' }],
        correctAnswer: 'A', explanationVi: '「仕様」 (Đặc tả kỹ thuật / Specification) đọc là しよう.', points: 20
      },
      {
        id: 's5_n3_03', setId: 5, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n買い物に行く（　）、手紙を出してきた。',
        options: [{ key: 'A', text: 'ついでに' }, { key: 'B', text: 'とたんに' }, { key: 'C', text: '最中に' }, { key: 'D', text: 'たびに' }],
        correctAnswer: 'A', explanationVi: '「ついでに」: Nhân tiện / tiện thể khi làm việc A thì làm luôn việc B.', points: 20
      },
      {
        id: 's5_n3_04', setId: 5, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nプロジェクトの予算を（　）する。',
        options: [{ key: 'A', text: '削減' }, { key: 'B', text: '減少' }, { key: 'C', text: '省略' }, { key: 'D', text: '短縮' }],
        correctAnswer: 'A', explanationVi: '予算を削減する (さくげん): Cắt giảm ngân sách.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 6 =================
  {
    setId: 6,
    title: 'Bộ đề chuẩn đoán #06',
    questions: [
      {
        id: 's6_n5_01', setId: 6, level: 'N5', category: 'alphabet',
        question: 'Chọn chữ katakana tương ứng.\nの',
        options: [{ key: 'A', text: 'ノ' }, { key: 'B', text: 'メ' }, { key: 'C', text: 'ナ' }, { key: 'D', text: 'ヌ' }],
        correctAnswer: 'A', explanationVi: 'Hiragana の và katakana ノ đều biểu thị âm no.', points: 10
      },
      {
        id: 's6_n5_02', setId: 6, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nわたしは りんご（　）すきです。',
        options: [{ key: 'A', text: 'が' }, { key: 'B', text: 'を' }, { key: 'C', text: 'に' }, { key: 'D', text: 'で' }],
        correctAnswer: 'A', explanationVi: 'Tính từ chỉ sở thích 「すき」 đi với trợ từ 「が」.', points: 10
      },
      {
        id: 's6_n5_03', setId: 6, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「会社」は 9じから です。',
        options: [{ key: 'A', text: 'かいしゃ' }, { key: 'B', text: 'しゃかい' }, { key: 'C', text: 'かいわ' }, { key: 'D', text: 'じんじゃ' }],
        correctAnswer: 'A', explanationVi: '「会社」 (Công ty) đọc là かいしゃ.', points: 10
      },
      {
        id: 's6_n5_04', setId: 6, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nここで しゃしんを（　）も いいですか。',
        options: [{ key: 'A', text: 'とって' }, { key: 'B', text: 'つくって' }, { key: 'C', text: 'のって' }, { key: 'D', text: 'かって' }],
        correctAnswer: 'A', explanationVi: 'Cụm cố định: しゃしんをとる (Chụp ảnh).', points: 10
      },
      {
        id: 's6_n4_01', setId: 6, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nあそこに（　）そうに している こどもが います。',
        options: [{ key: 'A', text: 'さびし' }, { key: 'B', text: 'さびしい' }, { key: 'C', text: 'さびしく' }, { key: 'D', text: 'さびしさ' }],
        correctAnswer: 'A', explanationVi: 'Tính từ đuôi い bỏ い + そうに (さびしそうに - trông có vẻ buồn).', points: 15
      },
      {
        id: 's6_n4_02', setId: 6, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「連絡」してください。',
        options: [{ key: 'A', text: 'れんらく' }, { key: 'B', text: 'れんしゅう' }, { key: 'C', text: 'うんてん' }, { key: 'D', text: 'そうだん' }],
        correctAnswer: 'A', explanationVi: '「連絡」 (Liên lạc) đọc là れんらく.', points: 15
      },
      {
        id: 's6_n4_03', setId: 6, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n犬に 手を（　）ました。',
        options: [{ key: 'A', text: 'かまれ' }, { key: 'B', text: 'かみ' }, { key: 'C', text: 'かませ' }, { key: 'D', text: 'かめ' }],
        correctAnswer: 'A', explanationVi: 'Câu bị động: 犬に手をかまれました (Bị chó cắn vào tay).', points: 15
      },
      {
        id: 's6_n4_04', setId: 6, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\n会議の資料を（　）します。',
        options: [{ key: 'A', text: 'コピー' }, { key: 'B', text: 'ガイド' }, { key: 'C', text: 'ルール' }, { key: 'D', text: 'レジ' }],
        correctAnswer: 'A', explanationVi: '資料をコピーします: Photo / sao chép tài liệu cuộc họp.', points: 15
      },
      {
        id: 's6_n3_01', setId: 6, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nこの本を（　）たびに、学生時代を思い出す。',
        options: [{ key: 'A', text: '読む' }, { key: 'B', text: '読んだ' }, { key: 'C', text: '読んで' }, { key: 'D', text: '読み' }],
        correctAnswer: 'A', explanationVi: 'Cấu trúc 「V-る + たびに」: Cứ mỗi lần làm V.', points: 20
      },
      {
        id: 's6_n3_02', setId: 6, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nデータの「分析」を行います。',
        options: [{ key: 'A', text: 'ぶんせき' }, { key: 'B', text: 'ぶんるい' }, { key: 'C', text: 'ぶんぱい' }, { key: 'D', text: 'ぶんかい' }],
        correctAnswer: 'A', explanationVi: '「分析」 (Phân tích) đọc là ぶんせき.', points: 20
      },
      {
        id: 's6_n3_03', setId: 6, level: 'N3', category: 'grammar',
        question: 'Chọn mẫu có nghĩa là “đến cả … cũng không”.\n声がかれて、歌うこと（　）、話すことさえできなかった。',
        options: [{ key: 'A', text: 'はおろか' }, { key: 'B', text: 'にしろ' }, { key: 'C', text: 'ばかりに' }, { key: 'D', text: 'からには' }],
        correctAnswer: 'A', explanationVi: 'Vì khàn giọng nên nói còn không được, huống chi là hát. はおろか nhấn mạnh rằng ngay cả việc đơn giản hơn cũng không làm được.', points: 20
      },
      {
        id: 's6_n3_04', setId: 6, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nパスワードを定期的に（　）する。',
        options: [{ key: 'A', text: '更新' }, { key: 'B', text: '交換' }, { key: 'C', text: '交替' }, { key: 'D', text: '改革' }],
        correctAnswer: 'A', explanationVi: '「更新」 (こうしん): Cập nhật / làm mới định kỳ.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 7 =================
  {
    setId: 7,
    title: 'Bộ đề chuẩn đoán #07',
    questions: [
      {
        id: 's7_n5_01', setId: 7, level: 'N5', category: 'alphabet',
        question: 'Chữ Katakana của chữ trong ngoặc viết như thế nào:\n「ち」',
        options: [{ key: 'A', text: 'チ' }, { key: 'B', text: 'テ' }, { key: 'C', text: 'ナ' }, { key: 'D', text: 'ラ' }],
        correctAnswer: 'A', explanationVi: 'Chữ 「ち」 (chi) trong Katakana là 「チ」.', points: 10
      },
      {
        id: 's7_n5_02', setId: 7, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ để nói chiếc túi này lớn hơn chiếc túi kia.\nこの かばんは あの かばん（　）おおきいです。',
        options: [{ key: 'A', text: 'より' }, { key: 'B', text: 'ほど' }, { key: 'C', text: 'から' }, { key: 'D', text: 'まで' }],
        correctAnswer: 'A', explanationVi: 'Dùng より sau đối tượng làm mốc so sánh. このかばんはあのかばんより大きいです nghĩa là chiếc túi này lớn hơn chiếc túi kia.', points: 10
      },
      {
        id: 's7_n5_03', setId: 7, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「天気」が いいですね。',
        options: [{ key: 'A', text: 'てんき' }, { key: 'B', text: 'でんき' }, { key: 'C', text: 'げんき' }, { key: 'D', text: 'にんき' }],
        correctAnswer: 'A', explanationVi: '「天気」 (Thời tiết) đọc là てんき.', points: 10
      },
      {
        id: 's7_n5_04', setId: 7, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nへやが くらいですから、でんきを（　）ください。',
        options: [{ key: 'A', text: 'つけて' }, { key: 'B', text: 'けして' }, { key: 'C', text: 'しめて' }, { key: 'D', text: 'とめて' }],
        correctAnswer: 'A', explanationVi: 'でんきをつける: Bật điện.', points: 10
      },
      {
        id: 's7_n4_01', setId: 7, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nもっと べんきょう（　）ば よかった。',
        options: [{ key: 'A', text: 'すれ' }, { key: 'B', text: 'しれ' }, { key: 'C', text: 'する' }, { key: 'D', text: 'した' }],
        correctAnswer: 'A', explanationVi: 'Động từ する chia sang thể điều kiện ば là 「すれば」 (すればよかった: giá mà học nhiều hơn).', points: 15
      },
      {
        id: 's7_n4_02', setId: 7, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n新しい規則を「説明」します。',
        options: [{ key: 'A', text: 'せつめい' }, { key: 'B', text: 'しょうめい' }, { key: 'C', text: 'はつめい' }, { key: 'D', text: 'ぶんめい' }],
        correctAnswer: 'A', explanationVi: '「説明」 (Giải thích) đọc là せつめい.', points: 15
      },
      {
        id: 's7_n4_03', setId: 7, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n時間が ありませんから、（　）いきましょう。',
        options: [{ key: 'A', text: 'はしって' }, { key: 'B', text: 'はしり' }, { key: 'C', text: 'はしる' }, { key: 'D', text: 'はしった' }],
        correctAnswer: 'A', explanationVi: 'V-ていきます chỉ phương thức thực hiện hành động (chạy đi).', points: 15
      },
      {
        id: 's7_n4_04', setId: 7, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\n電車が（　）います。',
        options: [{ key: 'A', text: 'こんで' }, { key: 'B', text: 'すんで' }, { key: 'C', text: 'よんで' }, { key: 'D', text: 'のんで' }],
        correctAnswer: 'A', explanationVi: '電車が混んでいる (こんでいる): Tàu điện đang đông đúc.', points: 15
      },
      {
        id: 's7_n3_01', setId: 7, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n引き受けた（　）、最後まで責任を持ってやり抜くべきだ。',
        options: [{ key: 'A', text: 'からには' }, { key: 'B', text: 'わりに' }, { key: 'C', text: '最中に' }, { key: 'D', text: 'どころか' }],
        correctAnswer: 'A', explanationVi: '「からには」: Một khi đã... thì đương nhiên phải...', points: 20
      },
      {
        id: 's7_n3_02', setId: 7, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n新しい機能を「実装」する。',
        options: [{ key: 'A', text: 'じっそう' }, { key: 'B', text: 'じっこう' }, { key: 'C', text: 'じっさい' }, { key: 'D', text: 'じつげん' }],
        correctAnswer: 'A', explanationVi: '「実装」 (Implement / Triển khai tính năng) đọc là じっそう.', points: 20
      },
      {
        id: 's7_n3_03', setId: 7, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n彼は忙しすぎて、昼ご飯を（　）時間もない。',
        options: [{ key: 'A', text: '食べる' }, { key: 'B', text: '食べた' }, { key: 'C', text: '食べて' }, { key: 'D', text: '食べよう' }],
        correctAnswer: 'A', explanationVi: 'Động từ nguyên mẫu bổ nghĩa cho danh từ 時間: 食べる時間もない (không có cả thời gian ăn).', points: 20
      },
      {
        id: 's7_n3_04', setId: 7, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\nお客様の（　）に応えて、営業時間を延長しました。',
        options: [{ key: 'A', text: '要望' }, { key: 'B', text: '回答' }, { key: 'C', text: '絶望' }, { key: 'D', text: '展望' }],
        correctAnswer: 'A', explanationVi: '要望に応える nghĩa là đáp ứng yêu cầu. Cửa hàng kéo dài giờ mở cửa theo đề nghị của khách.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 8 =================
  {
    setId: 8,
    title: 'Bộ đề chuẩn đoán #08',
    questions: [
      {
        id: 's8_n5_01', setId: 8, level: 'N5', category: 'alphabet',
        question: 'Chữ Katakana của từ trong ngoặc viết như thế nào:\n「ぱん」',
        options: [{ key: 'A', text: 'パン' }, { key: 'B', text: 'バン' }, { key: 'C', text: 'ハン' }, { key: 'D', text: 'ペン' }],
        correctAnswer: 'A', explanationVi: '「ぱん」 viết bằng chữ Katakana là 「パン」.', points: 10
      },
      {
        id: 's8_n5_02', setId: 8, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\n9じ（　）5じまで はたらきます。',
        options: [{ key: 'A', text: 'から' }, { key: 'B', text: 'に' }, { key: 'C', text: 'で' }, { key: 'D', text: 'を' }],
        correctAnswer: 'A', explanationVi: 'Cấu trúc 「～から～まで」: Từ 9 giờ đến 5 giờ.', points: 10
      },
      {
        id: 's8_n5_03', setId: 8, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nこの「電車」は はやいです。',
        options: [{ key: 'A', text: 'でんしゃ' }, { key: 'B', text: 'じてんしゃ' }, { key: 'C', text: 'じどうしゃ' }, { key: 'D', text: 'でんわ' }],
        correctAnswer: 'A', explanationVi: '「電車」 (Tàu điện) đọc là でんしゃ.', points: 10
      },
      {
        id: 's8_n5_04', setId: 8, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\nあしたは にほんごの テストです。こんやは うちで にほんごを（　）します。',
        options: [{ key: 'A', text: 'べんきょう' }, { key: 'B', text: 'さんぽ' }, { key: 'C', text: 'かいもの' }, { key: 'D', text: 'りょこう' }],
        correctAnswer: 'A', explanationVi: '日本語を勉強します nghĩa là học tiếng Nhật. Câu này nói tối nay sẽ học ở nhà vì ngày mai có bài kiểm tra.', points: 10
      },
      {
        id: 's8_n4_01', setId: 8, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nコーヒーに さとうを いれ（　）ました。',
        options: [{ key: 'A', text: 'すぎ' }, { key: 'B', text: 'やす' }, { key: 'C', text: 'にく' }, { key: 'D', text: 'かた' }],
        correctAnswer: 'A', explanationVi: 'V-ます(bỏ ます) + すぎる: Làm gì đó quá mức (cho quá nhiều đường).', points: 15
      },
      {
        id: 's8_n4_02', setId: 8, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nバスが「出発」します。',
        options: [{ key: 'A', text: 'しゅっぱつ' }, { key: 'B', text: 'しゅっせき' }, { key: 'C', text: 'はっぴょう' }, { key: 'D', text: 'はっけん' }],
        correctAnswer: 'A', explanationVi: '「出発」 (Xuất phát / Khởi hành) đọc là しゅっぱつ.', points: 15
      },
      {
        id: 's8_n4_03', setId: 8, level: 'N4', category: 'grammar',
        question: 'Chọn dạng thích hợp để hỏi nơi đã mua chiếc túi.\nその かばんを どこで（　）か、おしえてください。',
        options: [{ key: 'A', text: 'かった' }, { key: 'B', text: 'かいました' }, { key: 'C', text: 'かって' }, { key: 'D', text: 'かい' }],
        correctAnswer: 'A', explanationVi: 'どこで買ったか教えてください nghĩa là hãy cho tôi biết bạn đã mua ở đâu. Câu hỏi gián tiếp dùng 買った + か.', points: 15
      },
      {
        id: 's8_n4_04', setId: 8, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nかぎを（　）しまいました。',
        options: [{ key: 'A', text: 'なくして' }, { key: 'B', text: 'なおして' }, { key: 'C', text: 'のこして' }, { key: 'D', text: 'ならべて' }],
        correctAnswer: 'A', explanationVi: 'かぎをなくす: Làm mất chìa khóa.', points: 15
      },
      {
        id: 's8_n3_01', setId: 8, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n彼は若い（　）、しっかりしている。',
        options: [{ key: 'A', text: 'わりに' }, { key: 'B', text: 'せいで' }, { key: 'C', text: 'たびに' }, { key: 'D', text: 'うちに' }],
        correctAnswer: 'A', explanationVi: '「わりに」: Tuy... nhưng so với mức đó thì... (Tuy còn trẻ nhưng rất chững chạc).', points: 20
      },
      {
        id: 's8_n3_02', setId: 8, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「効率」よく作業を進める。',
        options: [{ key: 'A', text: 'こうりつ' }, { key: 'B', text: 'かくりつ' }, { key: 'C', text: 'ひりつ' }, { key: 'D', text: 'のうりつ' }],
        correctAnswer: 'A', explanationVi: '「効率」 (Hiệu suất) đọc là こうりつ.', points: 20
      },
      {
        id: 's8_n3_03', setId: 8, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n温かい（　）、どうぞ召し上がってください。',
        options: [{ key: 'A', text: 'うちに' }, { key: 'B', text: 'あいだ' }, { key: 'C', text: '最中に' }, { key: 'D', text: 'とたんに' }],
        correctAnswer: 'A', explanationVi: '「うちに」: Nhân lúc vẫn còn (nhân lúc đồ ăn còn nóng hãy dùng ngay).', points: 20
      },
      {
        id: 's8_n3_04', setId: 8, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nサーバーの（　）が原因でアクセスできない。',
        options: [{ key: 'A', text: '障害' }, { key: 'B', text: '被害' }, { key: 'C', text: '災害' }, { key: 'D', text: '妨害' }],
        correctAnswer: 'A', explanationVi: 'サーバーの障害 (しょうがい): Sự cố máy chủ (Server outage).', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 9 =================
  {
    setId: 9,
    title: 'Bộ đề chuẩn đoán #09',
    questions: [
      {
        id: 's9_n5_01', setId: 9, level: 'N5', category: 'alphabet',
        question: 'Cách đọc Romaji của chữ trong ngoặc là gì:\n「ぬ」',
        options: [{ key: 'A', text: 'nu' }, { key: 'B', text: 'me' }, { key: 'C', text: 'ne' }, { key: 'D', text: 're' }],
        correctAnswer: 'A', explanationVi: '「ぬ」 đọc là nu.', points: 10
      },
      {
        id: 's9_n5_02', setId: 9, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nあした ともだち（　）えいがを みます。',
        options: [{ key: 'A', text: 'と' }, { key: 'B', text: 'を' }, { key: 'C', text: 'へ' }, { key: 'D', text: 'が' }],
        correctAnswer: 'A', explanationVi: 'Trợ từ 「と」 chỉ người cùng thực hiện hành động (xem phim cùng với bạn).', points: 10
      },
      {
        id: 's9_n5_03', setId: 9, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「銀行」は あそこです。',
        options: [{ key: 'A', text: 'ぎんこう' }, { key: 'B', text: 'りょこう' }, { key: 'C', text: 'がっこう' }, { key: 'D', text: 'くうこう' }],
        correctAnswer: 'A', explanationVi: '「銀行」 (Ngân hàng) đọc là ぎんこう.', points: 10
      },
      {
        id: 's9_n5_04', setId: 9, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nてを（　）から、ごはんを たべます。',
        options: [{ key: 'A', text: 'あらって' }, { key: 'B', text: 'みがいて' }, { key: 'C', text: 'うたって' }, { key: 'D', text: 'かぶって' }],
        correctAnswer: 'A', explanationVi: 'てをあらう (Rửa tay).', points: 10
      },
      {
        id: 's9_n4_01', setId: 9, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nこの ペンは とても（　）やすいです。',
        options: [{ key: 'A', text: 'かき' }, { key: 'B', text: 'かく' }, { key: 'C', text: 'かいて' }, { key: 'D', text: 'かいた' }],
        correctAnswer: 'A', explanationVi: 'V-ます(bỏ ます) + やすい: Dễ làm gì đó (かきやすい: dễ viết).', points: 15
      },
      {
        id: 's9_n4_02', setId: 9, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n日本の「文化」に興味があります。',
        options: [{ key: 'A', text: 'ぶんか' }, { key: 'B', text: 'ぶんがく' }, { key: 'C', text: 'ぶんぽう' }, { key: 'D', text: 'ぶんしょう' }],
        correctAnswer: 'A', explanationVi: '「文化」 (Văn hóa) đọc là ぶんか.', points: 15
      },
      {
        id: 's9_n4_03', setId: 9, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n健康の（　）、まいにち うんどうしています。',
        options: [{ key: 'A', text: 'ために' }, { key: 'B', text: 'ように' }, { key: 'C', text: 'そうに' }, { key: 'D', text: 'ことに' }],
        correctAnswer: 'A', explanationVi: 'Danh từ + の + ために: Vì lợi ích / mục đích (Vì sức khỏe).', points: 15
      },
      {
        id: 's9_n4_04', setId: 9, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\n予約を（　）したいのですが。',
        options: [{ key: 'A', text: 'キャンセル' }, { key: 'B', text: 'スタート' }, { key: 'C', text: 'プレゼント' }, { key: 'D', text: 'アドバイス' }],
        correctAnswer: 'A', explanationVi: '予約をキャンセルする: Hủy đặt chỗ.', points: 15
      },
      {
        id: 's9_n3_01', setId: 9, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n会議の（　）、携帯電話が鳴ってしまった。',
        options: [{ key: 'A', text: '最中に' }, { key: 'B', text: 'うちに' }, { key: 'C', text: 'とたんに' }, { key: 'D', text: 'ついでに' }],
        correctAnswer: 'A', explanationVi: '「最中に」: Đúng vào lúc đang cao trào / đang giữa cuộc họp.', points: 20
      },
      {
        id: 's9_n3_02', setId: 9, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「見積もり」を提出します。',
        options: [{ key: 'A', text: 'みつもり' }, { key: 'B', text: 'みこみ' }, { key: 'C', text: 'みなおし' }, { key: 'D', text: 'みとおし' }],
        correctAnswer: 'A', explanationVi: '「見積もり」 (Báo giá / Ước lượng chi phí) đọc là みつもり.', points: 20
      },
      {
        id: 's9_n3_03', setId: 9, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n貯金する（　）、毎月赤字で困っている。',
        options: [{ key: 'A', text: 'どころか' }, { key: 'B', text: 'ばかりか' }, { key: 'C', text: 'おかげで' }, { key: 'D', text: 'ものなら' }],
        correctAnswer: 'A', explanationVi: '「どころか」: Đừng nói đến chuyện... mà trái lại còn... (Đừng nói đến tiết kiệm, tháng nào cũng âm tiền).', points: 20
      },
      {
        id: 's9_n3_04', setId: 9, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\n重要なファイルを（　）する。',
        options: [{ key: 'A', text: '共有' }, { key: 'B', text: '共通' }, { key: 'C', text: '共同' }, { key: 'D', text: '共感' }],
        correctAnswer: 'A', explanationVi: 'ファイルを共有する (きょうゆう): Chia sẻ tệp tin.', points: 20
      }
    ]
  },

  // ================= BỘ ĐỀ SỐ 10 =================
  {
    setId: 10,
    title: 'Bộ đề chuẩn đoán #10',
    questions: [
      {
        id: 's10_n5_01', setId: 10, level: 'N5', category: 'alphabet',
        question: 'Cách đọc Romaji của chữ trong ngoặc là gì:\n「ソ」',
        options: [{ key: 'A', text: 'so' }, { key: 'B', text: 'n' }, { key: 'C', text: 'shi' }, { key: 'D', text: 'tsu' }],
        correctAnswer: 'A', explanationVi: '「ソ」 đọc là so.', points: 10
      },
      {
        id: 's10_n5_02', setId: 10, level: 'N5', category: 'grammar',
        question: 'Chọn trợ từ phù hợp để điền vào chỗ trống.\nつくえの うえ（　）ねこが います。',
        options: [{ key: 'A', text: 'に' }, { key: 'B', text: 'で' }, { key: 'C', text: 'を' }, { key: 'D', text: 'へ' }],
        correctAnswer: 'A', explanationVi: 'Trợ từ 「に」 chỉ vị trí tồn tại đi với います / あります.', points: 10
      },
      {
        id: 's10_n5_03', setId: 10, level: 'N5', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「日曜日」は やすみです。',
        options: [{ key: 'A', text: 'にちようび' }, { key: 'B', text: 'げつようび' }, { key: 'C', text: 'どようび' }, { key: 'D', text: 'かようび' }],
        correctAnswer: 'A', explanationVi: '「日曜日」 (Chủ nhật) đọc là にちようび.', points: 10
      },
      {
        id: 's10_n5_04', setId: 10, level: 'N5', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nきのうの えいがは とても（　）かったです。',
        options: [{ key: 'A', text: 'おもしろ' }, { key: 'B', text: 'しずか' }, { key: 'C', text: 'ゆうめい' }, { key: 'D', text: 'きれい' }],
        correctAnswer: 'A', explanationVi: 'Tính từ đuôi い chia quá khứ: おもしろかったです (đã rất thú vị).', points: 10
      },
      {
        id: 's10_n4_01', setId: 10, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nあしたは はやく（　）なければ なりません。',
        options: [{ key: 'A', text: 'おき' }, { key: 'B', text: 'おきる' }, { key: 'C', text: 'おきて' }, { key: 'D', text: 'おきた' }],
        correctAnswer: 'A', explanationVi: 'おきなければなりません: Phải thức dậy sớm.', points: 15
      },
      {
        id: 's10_n4_02', setId: 10, level: 'N4', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\n「約束」の時間を守ります。',
        options: [{ key: 'A', text: 'やくそく' }, { key: 'B', text: 'よやく' }, { key: 'C', text: 'けいやく' }, { key: 'D', text: 'せつやく' }],
        correctAnswer: 'A', explanationVi: '「約束」 (Lời hứa / Cuộc hẹn) đọc là やくそく.', points: 15
      },
      {
        id: 's10_n4_03', setId: 10, level: 'N4', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\nらいげつ、とうきょうへ（　）つもりです。',
        options: [{ key: 'A', text: 'いく' }, { key: 'B', text: 'いって' }, { key: 'C', text: 'いった' }, { key: 'D', text: 'いき' }],
        correctAnswer: 'A', explanationVi: 'Cấu trúc 「V-る + つもりです」 diễn tả dự định cá nhân.', points: 15
      },
      {
        id: 's10_n4_04', setId: 10, level: 'N4', category: 'vocabulary',
        question: 'Chọn từ phù hợp với ngữ cảnh.\nわからない ことばの いみを じしょで（　）。',
        options: [{ key: 'A', text: 'しらべます' }, { key: 'B', text: 'わすれます' }, { key: 'C', text: 'あつめます' }, { key: 'D', text: 'おしえます' }],
        correctAnswer: 'A', explanationVi: '辞書で意味を調べる nghĩa là tra nghĩa trong từ điển.', points: 15
      },
      {
        id: 's10_n3_01', setId: 10, level: 'N3', category: 'grammar',
        question: 'Chọn đáp án phù hợp để điền vào chỗ trống.\n練習すればする（　）、上手になります。',
        options: [{ key: 'A', text: 'ほど' }, { key: 'B', text: 'くらい' }, { key: 'C', text: 'だけ' }, { key: 'D', text: 'ばかり' }],
        correctAnswer: 'A', explanationVi: 'Cấu trúc 「V-ば V-るほど」: Càng... càng... (Càng luyện tập càng giỏi).', points: 20
      },
      {
        id: 's10_n3_02', setId: 10, level: 'N3', category: 'kanji',
        question: 'Chọn cách đọc của từ trong ngoặc.\nシステムを「開発」しています。',
        options: [{ key: 'A', text: 'かいはつ' }, { key: 'B', text: 'かいさつ' }, { key: 'C', text: 'かいけつ' }, { key: 'D', text: 'かいせつ' }],
        correctAnswer: 'A', explanationVi: '「開発」 (Phát triển / Development) đọc là かいはつ.', points: 20
      },
      {
        id: 's10_n3_03', setId: 10, level: 'N3', category: 'grammar',
        question: 'Chọn mẫu diễn tả rằng tình huống khiến người nói khó từ chối.\n部長の命令と（　）、断るわけにはいかない。',
        options: [{ key: 'A', text: 'あっては' }, { key: 'B', text: 'ままでは' }, { key: 'C', text: 'きっかけに' }, { key: 'D', text: 'ものの' }],
        correctAnswer: 'A', explanationVi: '部長の命令とあっては nghĩa là trong tình huống đây là lệnh của trưởng phòng. Vì thế người nói khó từ chối.', points: 20
      },
      {
        id: 's10_n3_04', setId: 10, level: 'N3', category: 'vocabulary',
        question: 'Chọn từ phù hợp để điền vào chỗ trống.\nトラブルの（　）を最優先で行う。',
        options: [{ key: 'A', text: '対応' }, { key: 'B', text: '対抗' }, { key: 'C', text: '対照' }, { key: 'D', text: '対立' }],
        correctAnswer: 'A', explanationVi: 'トラブルの対応 (たいおう): Xử lý / ứng phó sự cố.', points: 20
      }
    ]
  }
];

// Xuất mảng phẳng tổng hợp toàn bộ 120 câu hỏi để tương thích ngược
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = DIAGNOSTIC_QUESTION_SETS.flatMap(s => s.questions);
