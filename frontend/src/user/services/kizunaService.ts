import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';
import { Stage, Milestone, VocabularyItem, VocabularyCatalog, GrammarItem, KanjiItem, Exam } from '../types/kizuna';
import { VOCABULARY_CATALOG } from '../data/vocabularyCatalog';

function getSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, exp } = JSON.parse(raw);
    if (Date.now() > exp) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setSessionCache<T>(key: string, data: T, ttlMs = 30 * 60 * 1000) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, exp: Date.now() + ttlMs }));
  } catch {
    // ignore
  }
}

export const kizunaService = {
  async getStages(): Promise<Stage[]> {
    const cached = getSessionCache<Stage[]>('kizuna_stages_cache');
    if (cached) return cached;

    try {
      const snap = await getDocs(collection(db, 'stages'));
      if (!snap.empty) {
        const stages: Stage[] = [];
        snap.forEach(d => stages.push({ id: d.id, ...d.data() } as Stage));
        stages.sort((a, b) => a.orderIndex - b.orderIndex);
        setSessionCache('kizuna_stages_cache', stages);
        return stages;
      }
    } catch (e) {
      console.warn('Firestore stages fetch error, using default stages:', e);
    }

    const fallback: Stage[] = [
      { id: 'stage_01', orderIndex: 1, title: 'Chặng 1: Bảng Chữ Cái & Phát Âm Cơ Bản', description: 'Làm quen Hiragana, Katakana và các mẫu câu chào hỏi căn bản.' },
      { id: 'stage_02', orderIndex: 2, title: 'Chặng 2: Giao Tiếp Sơ Cấp (N5 - Minna 1-12)', description: 'Tự giới thiệu bản thân, mua sắm, hỏi đường và sinh hoạt thường nhật.' },
      { id: 'stage_03', orderIndex: 3, title: 'Chặng 3: Đời Sống & Công Việc (N5 - Minna 13-25)', description: 'Các thể động từ Te, Nai, Ta và cấu trúc xin phép, cấm đoán.' },
      { id: 'stage_04', orderIndex: 4, title: 'Chặng 4: Nâng Cao & Giao Tiếp Tự Nhiên (N4)', description: 'Thể điều kiện, bị động, sai khiến và kính ngữ thương mại cơ bản.' }
    ];
    setSessionCache('kizuna_stages_cache', fallback);
    return fallback;
  },

  async getMilestones(stageId?: string): Promise<Milestone[]> {
    const cacheKey = `kizuna_milestones_cache_${stageId || 'all'}`;
    const cached = getSessionCache<Milestone[]>(cacheKey);
    if (cached) return cached;

    try {
      let q = collection(db, 'milestones');
      const snap = await getDocs(q);
      if (!snap.empty) {
        const milestones: Milestone[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (!stageId || data.stageId === stageId) {
            milestones.push({ id: d.id, ...data } as Milestone);
          }
        });
        milestones.sort((a, b) => a.orderIndex - b.orderIndex);
        setSessionCache(cacheKey, milestones);
        return milestones;
      }
    } catch (e) {
      console.warn('Firestore milestones fetch error:', e);
    }

    const fallback: Milestone[] = [
      { id: 'ms_01', stageId: 'stage_01', title: 'Hiragana & Âm ghép', nejUnit: 'Bài 1', orderIndex: 1, communicationContext: 'Chào hỏi & Đọc âm', xpReward: 50, activePointsReward: 20, status: 'COMPLETED', vocabCount: 26, kanjiCount: 10, grammarCount: 4 },
      { id: 'ms_02', stageId: 'stage_01', title: 'Katakana & Từ mượn', nejUnit: 'Bài 2', orderIndex: 2, communicationContext: 'Đọc tên nước, món ăn', xpReward: 60, activePointsReward: 25, status: 'COMPLETED', vocabCount: 30, kanjiCount: 15, grammarCount: 5 },
      { id: 'ms_03', stageId: 'stage_01', title: 'Giới thiệu bản thân & Nghề nghiệp', nejUnit: 'Bài 3', orderIndex: 3, communicationContext: 'Gặp gỡ lần đầu', xpReward: 80, activePointsReward: 30, status: 'UNLOCKED', vocabCount: 35, kanjiCount: 20, grammarCount: 6 },
      { id: 'ms_04', stageId: 'stage_02', title: 'Mua sắm & Giá tiền', nejUnit: 'Bài 4', orderIndex: 4, communicationContext: 'Đi siêu thị & cửa hàng tiện lợi', xpReward: 90, activePointsReward: 35, status: 'LOCKED', vocabCount: 40, kanjiCount: 25, grammarCount: 6 },
      { id: 'ms_05', stageId: 'stage_02', title: 'Thời gian & Lịch trình', nejUnit: 'Bài 5', orderIndex: 5, communicationContext: 'Hẹn giờ, xem lịch tàu', xpReward: 100, activePointsReward: 40, status: 'LOCKED', vocabCount: 45, kanjiCount: 25, grammarCount: 7 }
    ];
    setSessionCache(cacheKey, fallback);
    return fallback;
  },

  /**
   * Lấy danh mục 2 bộ sách (Mimi Kara Oboeru & Tango) và các Unit theo từng cấp độ N5 -> N1
   * Tối ưu hóa: 0 Firestore Read (dùng catalog tĩnh & cache)
   */
  async getVocabularyCatalog(): Promise<VocabularyCatalog> {
    return VOCABULARY_CATALOG;
  },

  /**
   * Lấy danh sách từ vựng của 1 Unit cụ thể (~15-25 từ)
   * Tối ưu hóa: Chỉ đọc tối đa 25 documents thay vì 13,000 documents; có cache sessionStorage
   */
  async getVocabularyByUnit(bookId: string, unitId: string): Promise<VocabularyItem[]> {
    const cacheKey = `kizuna_vocab_unit_${unitId}`;
    const cached = getSessionCache<VocabularyItem[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    // 1. Thử lấy từ Firestore (chỉ đọc ~15-25 documents của đúng unit này)
    try {
      if (db) {
        const q = query(
          collection(db, 'vocabulary_items'),
          where('unitId', '==', unitId),
          limit(60)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: VocabularyItem[] = [];
          snap.forEach(d => items.push({ id: d.id, ...d.data() } as VocabularyItem));
          setSessionCache(cacheKey, items);
          return items;
        }
      }
    } catch (err) {
      console.warn(`Firestore unit vocab (${unitId}) quota/network error, fallback to static:`, err);
    }

    // 2. Fallback sang file tĩnh public/data/units (0 Firestore Read, hoạt động mượt mà kể cả khi quota Firestore bị cạn kiệt)
    try {
      const res = await fetch(`/data/units/${unitId}.json`);
      if (res.ok) {
        const items = await res.json();
        setSessionCache(cacheKey, items);
        return items;
      }
    } catch (e) {
      console.warn(`Fallback fetch unit ${unitId} failed:`, e);
    }

    return [];
  },

  async getVocabulary(): Promise<VocabularyItem[]> {
    const cached = getSessionCache<VocabularyItem[]>('kizuna_vocab_cache');
    if (cached) return cached;

    // Lấy thử từ Unit đầu tiên của N5 Tango
    const firstUnit = await this.getVocabularyByUnit('n5-tango', 'n5-tango_u01');
    if (firstUnit.length > 0) {
      setSessionCache('kizuna_vocab_cache', firstUnit);
      return firstUnit;
    }

    return [
      { id: 'v1', term: '私', reading: 'わたし', sinoVietnamese: 'TƯ', vietnameseMeaning: 'Tôi, bản thân tôi', exampleSentenceJp: '私は学生です。', exampleSentenceVi: 'Tôi là học sinh.' },
      { id: 'v2', term: '先生', reading: 'せんせい', sinoVietnamese: 'TIÊN SINH', vietnameseMeaning: 'Thầy, cô giáo', exampleSentenceJp: '田中先生は日本語を教えます。', exampleSentenceVi: 'Thầy Tanaka dạy tiếng Nhật.' },
      { id: 'v3', term: '本', reading: 'ほん', sinoVietnamese: 'BẢN', vietnameseMeaning: 'Quyển sách', exampleSentenceJp: 'これは日本語の本です。', exampleSentenceVi: 'Đây là sách tiếng Nhật.' },
      { id: 'v4', term: '友達', reading: 'ともだち', sinoVietnamese: 'HỮU ĐẠT', vietnameseMeaning: 'Bạn bè', exampleSentenceJp: '友達と勉強します。', exampleSentenceVi: 'Tôi học bài cùng bạn bè.' },
      { id: 'v5', term: '日本', reading: 'にほん', sinoVietnamese: 'NHẬT BẢN', vietnameseMeaning: 'Nước Nhật', exampleSentenceJp: '来年、日本へ行きます。', exampleSentenceVi: 'Năm sau tôi sẽ đi Nhật.' }
    ];
  },

  async getGrammar(): Promise<GrammarItem[]> {
    const cached = getSessionCache<GrammarItem[]>('kizuna_grammar_cache');
    if (cached) return cached;

    try {
      const q = query(collection(db, 'grammar_items'), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items: GrammarItem[] = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() } as GrammarItem));
        setSessionCache('kizuna_grammar_cache', items);
        return items;
      }
    } catch (e) {
      console.warn('Firestore grammar error:', e);
    }

    const fallback: GrammarItem[] = [
      { id: 'g1', pattern: 'A は B です', titleVi: 'A là B (Khẳng định)', explanation: 'Dùng để khẳng định danh từ A có đặc điểm hoặc thân phận là B.', nuanceReason: 'Trang trọng, lịch sự cơ bản trong hội thoại.', masterExampleJp: '私はベトナム人です。', masterExampleVi: 'Tôi là người Việt Nam.' },
      { id: 'g2', pattern: 'A は B ではありません', titleVi: 'A không phải là B (Phủ định)', explanation: 'Thể phủ định lịch sự của です.', nuanceReason: 'Trong văn nói thân mật có thể dùng じゃありません.', masterExampleJp: '田中さんは医者ではありません。', masterExampleVi: 'Anh Tanaka không phải là bác sĩ.' },
      { id: 'g3', pattern: 'S + を + V-ます', titleVi: 'Tác động lên tân ngữ (Trợ từ を)', explanation: 'Biểu thị tân ngữ chịu tác động trực tiếp của hành động.', nuanceReason: 'Đọc là "o", dùng phân biệt với chữ お thông thường.', masterExampleJp: 'ご飯を食べます。', masterExampleVi: 'Tôi ăn cơm.' }
    ];
    setSessionCache('kizuna_grammar_cache', fallback);
    return fallback;
  },

  async getKanji(): Promise<KanjiItem[]> {
    const cached = getSessionCache<KanjiItem[]>('kizuna_kanji_cache');
    if (cached) return cached;

    try {
      const q = query(collection(db, 'kanji_dictionary'), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items: KanjiItem[] = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() } as KanjiItem));
        setSessionCache('kizuna_kanji_cache', items);
        return items;
      }
    } catch (e) {
      console.warn('Firestore kanji error:', e);
    }

    const fallback: KanjiItem[] = [
      { id: 'k1', kanji: '日', strokeCount: 4, sinoVietnamese: 'NHẬT', vietnameseMeaning: 'Mặt trời, ngày', onyomi: 'ニチ, ジツ', kunyomi: 'ひ, -び, -か', mnemonicStory: 'Hình ảnh mặt trời tròn có một vệt sáng ở giữa.' },
      { id: 'k2', kanji: '本', strokeCount: 5, sinoVietnamese: 'BẢN', vietnameseMeaning: 'Gốc, rễ, sách', onyomi: 'ホン', kunyomi: 'もと', mnemonicStory: 'Cái cây (木) có thêm nét gạch ngang ở gốc để chỉ phần rễ/gốc rễ.' },
      { id: 'k3', kanji: '人', strokeCount: 2, sinoVietnamese: 'NHÂN', vietnameseMeaning: 'Người', onyomi: 'ジン, ニン', kunyomi: 'ひと', mnemonicStory: 'Hình ảnh hai chân người đang bước đi tựa vào nhau.' }
    ];
    setSessionCache('kizuna_kanji_cache', fallback);
    return fallback;
  },

  async getExamCatalog(levelFilter = 'ALL'): Promise<Exam[]> {
    try {
      const snap = await getDocs(collection(db, 'jlpt_exam_catalog'));
      if (!snap.empty) {
        const exams: Exam[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Exam;
          if (levelFilter === 'ALL' || item.level.toUpperCase() === levelFilter.toUpperCase()) {
            exams.push(item);
          }
        });
        exams.sort((a, b) => {
          if (a.year && b.year && a.year !== b.year) return b.year - a.year;
          return (b.month || 0) - (a.month || 0);
        });
        return exams;
      }
    } catch (e) {
      console.warn('Firestore exam catalog error:', e);
    }

    return [
      { id: 'ex_n3_2024_07', label: 'JLPT-N3 07 2024', level: 'N3', type: 'jlpt-n3', year: 2024, month: 7, durationMinutes: 140, totalQuestions: 101, actualQuestionCount: 101, audioUrl: 'https://firebasestorage.googleapis.com/...', explanationCount: 68 },
      { id: 'ex_n2_2024_07', label: 'JLPT-N2 07 2024', level: 'N2', type: 'jlpt-n2', year: 2024, month: 7, durationMinutes: 155, totalQuestions: 101, actualQuestionCount: 101, audioUrl: 'https://firebasestorage.googleapis.com/...', explanationCount: 64 },
      { id: 'ex_n1_2024_07', label: 'JLPT-N1 07 2024', level: 'N1', type: 'jlpt-n1', year: 2024, month: 7, durationMinutes: 170, totalQuestions: 96, actualQuestionCount: 96, audioUrl: 'https://firebasestorage.googleapis.com/...', explanationCount: 61 },
      { id: 'ex_n4_de_1', label: 'JLPT N4 Đề 1', level: 'N4', type: 'jlpt-n4', durationMinutes: 125, totalQuestions: 68, actualQuestionCount: 68 },
      { id: 'ex_n5_ontap_1', label: 'JLPT N5 Ôn tập 1', level: 'N5', type: 'jlpt-n5', durationMinutes: 105, totalQuestions: 35, actualQuestionCount: 35 }
    ];
  },

  async getExamById(id: string): Promise<Exam | null> {
    try {
      const snap = await getDoc(doc(db, 'jlpt_exams', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Exam;
      }
    } catch (e) {
      console.warn(`Error fetching full exam ${id}:`, e);
    }
    return null;
  },

  /**
   * Lấy số liệu tài nguyên tổng thể của ứng dụng (Từ vựng, Ngữ pháp, Kanji, Bộ đề)
   * TỐI ƯU HÓA: Dùng cache localStorage, TUYỆT ĐỐI KHÔNG quét getDocs trên toàn bộ collection để tránh ngốn quota
   */
  async getAppCatalogStats() {
    const DEFAULT_STATS = {
      vocabCount: 13096,
      grammarCount: 605,
      kanjiCount: 2216,
      examsCount: 85
    };
    const CACHE_KEY = 'kizuna_app_catalog_stats_v2';
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore storage error
    }

    try {
      if (db) {
        // Chỉ đọc đúng 1 document cấu hình nếu có (chi phí đúng 1 read duy nhất)
        const statsDoc = await getDoc(doc(db, 'system_config', 'stats'));
        if (statsDoc.exists()) {
          const data = statsDoc.data();
          const result = {
            vocabCount: data.vocabCount || DEFAULT_STATS.vocabCount,
            grammarCount: data.grammarCount || DEFAULT_STATS.grammarCount,
            kanjiCount: data.kanjiCount || DEFAULT_STATS.kanjiCount,
            examsCount: data.examsCount || DEFAULT_STATS.examsCount
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(result));
          return result;
        }
      }
    } catch {
      // Dùng số liệu mặc định khi Firestore bị quota-exceeded hoặc lỗi mạng
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(DEFAULT_STATS));
    } catch {
      // ignore
    }
    return DEFAULT_STATS;
  }
};
