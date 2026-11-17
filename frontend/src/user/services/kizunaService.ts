import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';
import { Stage, Milestone, VocabularyItem, VocabularyCatalog, GrammarItem, GrammarCatalog, KanjiItem, KanjiCatalog, Exam, VideoLesson, ChoukaiAudioItem } from '../types/kizuna';
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

  async getStagesByLevel(level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'): Promise<Stage[]> {
    const allStages = await this.getStages();
    const filtered = allStages.filter(s => s.jlptLevel === level || (!s.jlptLevel && level === 'N5'));
    return filtered.sort((a, b) => a.orderIndex - b.orderIndex);
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

  async getMilestoneQuests(milestoneId: string): Promise<any[]> {
    const cacheKey = `kizuna_quests_${milestoneId}`;
    const cached = getSessionCache<any[]>(cacheKey);
    if (cached) return cached;

    try {
      if (db) {
        const q = query(collection(db, 'milestone_quests'), where('milestoneId', '==', milestoneId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const quests: any[] = [];
          snap.forEach(d => quests.push({ id: d.id, ...d.data() }));
          quests.sort((a, b) => a.stepIndex - b.stepIndex);
          setSessionCache(cacheKey, quests);
          return quests;
        }
      }
    } catch (e) {
      console.warn('Firestore quests error:', e);
    }
    return [];
  },

  /**
   * Lấy danh sách từ vựng của Mốc từ Firestore collection 'vocabulary_items'
   */
  async getVocabularyByMilestone(milestoneId: string): Promise<any[]> {
    if (!milestoneId) return [];
    const cacheKey = `kizuna_vocab_ms_${milestoneId}`;
    const cached = getSessionCache<any[]>(cacheKey);
    if (cached) return cached;

    try {
      if (db) {
        const q = query(collection(db, 'vocabulary_items'), where('milestoneId', '==', milestoneId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: any[] = [];
          snap.forEach(d => items.push({ id: d.id, ...d.data() }));
          setSessionCache(cacheKey, items);
          return items;
        }
      }
    } catch (e) {
      console.warn('Firestore vocab by milestone error:', e);
    }
    return [];
  },

  /**
   * Lấy danh sách ngữ pháp của Mốc từ Firestore collection 'grammar_items'
   */
  async getGrammarByMilestone(milestoneId: string): Promise<any[]> {
    if (!milestoneId) return [];
    const cacheKey = `kizuna_grammar_ms_${milestoneId}`;
    const cached = getSessionCache<any[]>(cacheKey);
    if (cached) return cached;

    try {
      if (db) {
        const q = query(collection(db, 'grammar_items'), where('milestoneId', '==', milestoneId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: any[] = [];
          snap.forEach(d => items.push({ id: d.id, ...d.data() }));
          setSessionCache(cacheKey, items);
          return items;
        }
      }
    } catch (e) {
      console.warn('Firestore grammar by milestone error:', e);
    }
    return [];
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
      console.warn(`Firestore unit vocab (${unitId}) quota/network error:`, err);
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

  /**
   * Lấy danh mục ngữ pháp phân cấp theo cấp độ N5 -> N1 và các bài học
   * 0 Firestore read (tải từ static JSON cache)
   */
  async getGrammarCatalog(): Promise<GrammarCatalog | null> {
    return null;
  },

  /**
   * Lấy danh sách mẫu câu ngữ pháp theo bài học (Unit) cụ thể trực tiếp từ Firestore
   */
  async getGrammarByUnit(unitId: string): Promise<GrammarItem[]> {
    const cacheKey = `kizuna_grammar_unit_${unitId}`;
    const cached = getSessionCache<GrammarItem[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      if (db) {
        const q = query(
          collection(db, 'grammar_items'),
          where('milestoneId', '==', unitId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: GrammarItem[] = [];
          snap.forEach(d => items.push({ id: d.id, ...d.data() } as GrammarItem));
          setSessionCache(cacheKey, items);
          return items;
        }
      }
    } catch (e) {
      console.warn(`Firestore grammar unit ${unitId} failed:`, e);
    }

    return [];
  },

  async getGrammar(): Promise<GrammarItem[]> {
    const cached = getSessionCache<GrammarItem[]>('kizuna_grammar_cache');
    if (cached) return cached;

    // Lấy thử từ Unit đầu tiên của N5
    const firstUnit = await this.getGrammarByUnit('ms_minna_b01');
    if (firstUnit.length > 0) {
      setSessionCache('kizuna_grammar_cache', firstUnit);
      return firstUnit;
    }

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

  /**
   * Lấy danh mục chữ Hán phân cấp theo cấp độ N5 -> N1 và các bài học
   * 0 Firestore read (tải từ static JSON cache)
   */
  async getKanjiCatalog(): Promise<KanjiCatalog | null> {
    return null;
  },

  /**
   * Lấy danh sách chữ Hán theo bài học (Unit) cụ thể trực tiếp từ Firestore
   */
  async getKanjiByUnit(unitId: string): Promise<KanjiItem[]> {
    const cacheKey = `kizuna_kanji_unit_${unitId}`;
    const cached = getSessionCache<KanjiItem[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      if (db) {
        const q = query(
          collection(db, 'kanji_dictionary'),
          where('milestoneId', '==', unitId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: KanjiItem[] = [];
          snap.forEach(d => {
            const data = d.data();
            items.push({
              id: d.id,
              kanji_id: data.kanji_id || d.id,
              kanji: data.kanji || data.character || '',
              character: data.character || data.kanji || '',
              strokeCount: data.strokeCount || 8,
              radicals: data.radicals || data.kanji || '',
              onyomi: data.onyomi || '',
              kunyomi: data.kunyomi || '',
              sinoVietnamese: data.sinoVietnamese || '',
              vietnameseMeaning: data.vietnameseMeaning || data.meaning_vi || '',
              meaning_vi: data.meaning_vi || data.vietnameseMeaning || '',
              mnemonicStory: data.mnemonicStory || '',
              exampleCompounds: data.exampleCompounds || [],
              jlptLevel: data.jlptLevel || data.jlpt_level || 'N5',
              jlpt_level: data.jlpt_level || data.jlptLevel || 'N5',
              lessonNumber: data.lessonNumber,
              kanjiNumber: data.kanjiNumber ?? 0,
              milestoneId: data.milestoneId || data.milestone_id,
              stageId: data.stageId || data.stage_id,
              sourceUrl: data.sourceUrl || ''
            } as KanjiItem);
          });
          items.sort((a, b) => (a.kanjiNumber ?? 0) - (b.kanjiNumber ?? 0));
          setSessionCache(cacheKey, items);
          return items;
        }
      }
    } catch (e) {
      console.warn(`Firestore kanji unit ${unitId} failed:`, e);
    }

    return [];
  },

  /**
   * Lấy danh sách toàn bộ chữ Hán trực tiếp từ Firestore collection 'kanji_dictionary'
   * theo cấp độ JLPT (N5 -> N1), kèm lưu cache sessionStorage và fallback an toàn
   */
  async getKanjiByLevel(level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'): Promise<KanjiItem[]> {
    const lvlKey = level.toLowerCase();
    const cacheKey = `kizuna_kanji_level_${lvlKey}`;
    const cached = getSessionCache<KanjiItem[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    // 1. Truy vấn trực tiếp từ Firestore collection 'kanji_dictionary'
    try {
      if (db) {
        const q = query(
          collection(db, 'kanji_dictionary'),
          where('jlptLevel', '==', level)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const items: KanjiItem[] = [];
          snap.forEach(d => {
            const data = d.data();
            items.push({
              id: d.id,
              kanji_id: data.kanji_id || d.id,
              kanji: data.kanji || data.character || '',
              character: data.character || data.kanji || '',
              strokeCount: data.strokeCount || 8,
              radicals: data.radicals || data.kanji || '',
              onyomi: data.onyomi || '',
              kunyomi: data.kunyomi || '',
              sinoVietnamese: data.sinoVietnamese || '',
              vietnameseMeaning: data.vietnameseMeaning || data.meaning_vi || '',
              meaning_vi: data.meaning_vi || data.vietnameseMeaning || '',
              mnemonicStory: data.mnemonicStory || '',
              exampleCompounds: data.exampleCompounds || [],
              jlptLevel: data.jlptLevel || data.jlpt_level || level,
              jlpt_level: data.jlpt_level || data.jlptLevel || level,
              lessonNumber: data.lessonNumber,
              kanjiNumber: data.kanjiNumber ?? 0,
              milestoneId: data.milestoneId || data.milestone_id,
              stageId: data.stageId || data.stage_id,
              sourceUrl: data.sourceUrl || ''
            } as KanjiItem);
          });

          // Sắp xếp chuẩn theo kanjiNumber / lessonNumber
          items.sort((a, b) => {
            if (a.kanjiNumber !== undefined && b.kanjiNumber !== undefined && a.kanjiNumber !== b.kanjiNumber) {
              return a.kanjiNumber - b.kanjiNumber;
            }
            if (a.lessonNumber !== undefined && b.lessonNumber !== undefined && a.lessonNumber !== b.lessonNumber) {
              return a.lessonNumber - b.lessonNumber;
            }
            return (a.id || '').localeCompare(b.id || '');
          });

          if (items.length > 0) {
            setSessionCache(cacheKey, items);
            return items;
          }
        }
      }
    } catch (e) {
      console.warn(`Firestore kanji_dictionary query for level ${level} failed:`, e);
    }

    // 3. Dự phòng tầng 3: Bộ chữ Hán N5 khởi tạo đảm bảo không bao giờ bị trắng trang
    if (level === 'N5') {
      const defaultN5: KanjiItem[] = [
        { id: 'kanji_n5_0001', kanji: '一', strokeCount: 1, sinoVietnamese: 'NHẤT', vietnameseMeaning: 'Một', onyomi: 'イチ, イツ', kunyomi: 'ひと, ひと.つ', mnemonicStory: 'Một nét ngang đơn giản tượng trưng cho con số 1.', exampleCompounds: [{ word: '一人', reading: 'ひとり', meaning: 'một mình', level: 'N5' }, { word: '一番', reading: 'いちばん', meaning: 'nhất, số 1', level: 'N5' }] },
        { id: 'kanji_n5_0002', kanji: '二', strokeCount: 2, sinoVietnamese: 'NHỊ', vietnameseMeaning: 'Hai', onyomi: 'ニ, ジ', kunyomi: 'ふた, ふた.つ', mnemonicStory: 'Hai nét ngang song song tượng trưng cho con số 2.', exampleCompounds: [{ word: '二人', reading: 'ふたり', meaning: 'hai người', level: 'N5' }, { word: '二月', reading: 'にがつ', meaning: 'tháng 2', level: 'N5' }] },
        { id: 'kanji_n5_0003', kanji: '三', strokeCount: 3, sinoVietnamese: 'TAM', vietnameseMeaning: 'Ba', onyomi: 'サン', kunyomi: 'み, み.つ', mnemonicStory: 'Ba nét ngang tượng trưng cho con số 3.', exampleCompounds: [{ word: '三人', reading: 'さんにん', meaning: 'ba người', level: 'N5' }, { word: '三日', reading: 'みっか', meaning: 'ngày 3', level: 'N5' }] },
        { id: 'kanji_n5_0004', kanji: '四', strokeCount: 5, sinoVietnamese: 'TỨ', vietnameseMeaning: 'Bốn', onyomi: 'シ', kunyomi: 'よ, よ.つ, よん', mnemonicStory: 'Hình ảnh khung rèm cửa có 4 cạnh.', exampleCompounds: [{ word: '四月', reading: 'しがつ', meaning: 'tháng 4', level: 'N5' }, { word: '四季', reading: 'しき', meaning: 'bốn mùa', level: 'N5' }] },
        { id: 'kanji_n5_0005', kanji: '五', strokeCount: 4, sinoVietnamese: 'NGŨ', vietnameseMeaning: 'Năm', onyomi: 'ゴ', kunyomi: 'いつ, いつ.つ', mnemonicStory: 'Con số 5 tượng trưng cho ngũ hành.', exampleCompounds: [{ word: '五月', reading: 'ごがつ', meaning: 'tháng 5', level: 'N5' }, { word: '五日', reading: 'いつか', meaning: 'ngày 5', level: 'N5' }] },
        { id: 'kanji_n5_0006', kanji: '六', strokeCount: 4, sinoVietnamese: 'LỤC', vietnameseMeaning: 'Sáu', onyomi: 'ロク', kunyomi: 'む, む.つ', mnemonicStory: 'Hình ảnh một ngôi nhà có 6 góc.', exampleCompounds: [{ word: '六月', reading: 'ろくがつ', meaning: 'tháng 6', level: 'N5' }] },
        { id: 'kanji_n5_0007', kanji: '七', strokeCount: 2, sinoVietnamese: 'THẤT', vietnameseMeaning: 'Bảy', onyomi: 'シチ', kunyomi: 'なな, なな.つ', mnemonicStory: 'Một đường cắt ngang tượng trưng cho số 7.', exampleCompounds: [{ word: '七月', reading: 'しちがつ', meaning: 'tháng 7', level: 'N5' }] },
        { id: 'kanji_n5_0008', kanji: '八', strokeCount: 2, sinoVietnamese: 'BÁT', vietnameseMeaning: 'Tám', onyomi: 'ハチ', kunyomi: 'や, や.つ', mnemonicStory: 'Hai nét mở rộng ra tượng trưng cho số 8 phát tài.', exampleCompounds: [{ word: '八月', reading: 'はちがつ', meaning: 'tháng 8', level: 'N5' }] },
        { id: 'kanji_n5_0009', kanji: '九', strokeCount: 2, sinoVietnamese: 'CỬU', vietnameseMeaning: 'Chín', onyomi: 'キュウ, ク', kunyomi: 'ここの, ここの.つ', mnemonicStory: 'Con số 9 uốn lượn tượng trưng cho sự trường cửu.', exampleCompounds: [{ word: '九月', reading: 'くがつ', meaning: 'tháng 9', level: 'N5' }] },
        { id: 'kanji_n5_0010', kanji: '十', strokeCount: 2, sinoVietnamese: 'THẬP', vietnameseMeaning: 'Mười', onyomi: 'ジュウ', kunyomi: 'とお, と', mnemonicStory: 'Hình dấu cộng hoàn hảo tượng trưng cho số 10 thập toàn thập mỹ.', exampleCompounds: [{ word: '十月', reading: 'じゅうがつ', meaning: 'tháng 10', level: 'N5' }] },
        { id: 'kanji_n5_0011', kanji: '日', strokeCount: 4, sinoVietnamese: 'NHẬT', vietnameseMeaning: 'Mặt trời, ngày', onyomi: 'ニチ, ジツ', kunyomi: 'ひ, -び, -か', mnemonicStory: 'Hình ảnh mặt trời tròn có một vệt sáng ở giữa.', exampleCompounds: [{ word: '日本', reading: 'にほん', meaning: 'Nhật Bản', level: 'N5' }, { word: '毎日', reading: 'まいにち', meaning: 'mỗi ngày', level: 'N5' }] },
        { id: 'kanji_n5_0012', kanji: '本', strokeCount: 5, sinoVietnamese: 'BẢN', vietnameseMeaning: 'Gốc, sách', onyomi: 'ホン', kunyomi: 'もと', mnemonicStory: 'Cái cây (木) có thêm nét gạch ngang ở gốc để chỉ phần rễ/gốc rễ.', exampleCompounds: [{ word: '本', reading: 'ほん', meaning: 'sách', level: 'N5' }] },
        { id: 'kanji_n5_0013', kanji: '人', strokeCount: 2, sinoVietnamese: 'NHÂN', vietnameseMeaning: 'Người', onyomi: 'ジン, ニン', kunyomi: 'ひと', mnemonicStory: 'Hình ảnh hai chân người đang bước đi tựa vào nhau.', exampleCompounds: [{ word: '日本人', reading: 'にほんじん', meaning: 'người Nhật', level: 'N5' }] },
        { id: 'kanji_n5_0014', kanji: '月', strokeCount: 4, sinoVietnamese: 'NGUYỆT', vietnameseMeaning: 'Mặt trăng, tháng', onyomi: 'ゲツ, ガツ', kunyomi: 'つき', mnemonicStory: 'Hình ảnh vầng trăng khuyết trên bầu trời đêm.', exampleCompounds: [{ word: '今月', reading: 'こんげつ', meaning: 'tháng này', level: 'N5' }] },
        { id: 'kanji_n5_0015', kanji: '火', strokeCount: 4, sinoVietnamese: 'HỎA', vietnameseMeaning: 'Lửa', onyomi: 'カ', kunyomi: 'ひ', mnemonicStory: 'Hình ảnh ngọn lửa đang bùng cháy với những tia lửa bắn ra hai bên.', exampleCompounds: [{ word: '火曜日', reading: 'かようび', meaning: 'thứ Ba', level: 'N5' }] }
      ];
      return defaultN5;
    }

    return [];
  },

  async getKanji(): Promise<KanjiItem[]> {
    const cached = getSessionCache<KanjiItem[]>('kizuna_kanji_cache');
    if (cached) return cached;

    // Lấy thử từ Unit đầu tiên của N5
    const firstUnit = await this.getKanjiByUnit('ms_minna_b01');
    if (firstUnit.length > 0) {
      setSessionCache('kizuna_kanji_cache', firstUnit);
      return firstUnit;
    }

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
      if (db) {
        const snap = await getDoc(doc(db, 'jlpt_exams', id));
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() } as Exam;
        }
      }
    } catch (e) {
      console.warn(`Error fetching full exam ${id} from Firestore:`, e);
    }

    // Fallback nếu Firestore không có hoặc lỗi: Tìm trong choukai_audio.json
    try {
      const choukai = await this.getChoukaiExamDetail(id);
      if (choukai) {
        return {
          id: choukai.id,
          label: choukai.label,
          level: choukai.level,
          type: `jlpt-${choukai.level.toLowerCase()}`,
          year: choukai.year,
          month: choukai.month,
          durationMinutes: choukai.durationMinutes || 40,
          totalQuestions: choukai.totalQuestions || choukai.actualQuestionCount || 30,
          actualQuestionCount: choukai.actualQuestionCount || choukai.totalQuestions || 30,
          audioUrl: choukai.audioUrl,
          questionSets: choukai.questionSets
        };
      }
    } catch (e) {
      console.warn('Fallback getExamById failed:', e);
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
  },

  /**
   * Lấy danh sách video shadowing / podcast tiếng Nhật trực tiếp từ Firestore
   */
  async getVideoLessons(level = 'ALL', category = 'ALL'): Promise<VideoLesson[]> {
    const cacheKey = `kizuna_videos_cache_${level}_${category}`;
    const cached = getSessionCache<VideoLesson[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    let allVideos: VideoLesson[] = [];

    // 1. Lấy từ Firestore collection 'video_lessons'
    try {
      if (db) {
        const q = query(collection(db, 'video_lessons'), limit(250));
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.forEach(d => {
            allVideos.push({ id: d.id, ...d.data() } as VideoLesson);
          });
        }
      }
    } catch (e) {
      console.warn('Firestore video_lessons fetch failed:', e);
    }

    // 2. Lọc theo cấp độ & danh mục
    let filtered = allVideos;
    if (level !== 'ALL') {
      filtered = filtered.filter(v => v.jlptLevel?.toUpperCase() === level.toUpperCase());
    }
    if (category !== 'ALL') {
      filtered = filtered.filter(v => v.category?.toLowerCase() === category.toLowerCase());
    }

    if (filtered.length > 0) {
      setSessionCache(cacheKey, filtered, 15 * 60 * 1000);
    }
    return filtered;
  },

  /**
   * Lấy danh sách bài nghe Choukai từ Firestore jlpt_exam_catalog
   */
  async getChoukaiAudioList(level = 'ALL'): Promise<ChoukaiAudioItem[]> {
    const cacheKey = `kizuna_choukai_audio_cache_${level}`;
    const cached = getSessionCache<ChoukaiAudioItem[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    let items: ChoukaiAudioItem[] = [];

    // 1. Lấy từ Firestore collection jlpt_exam_catalog
    try {
      if (db) {
        const snap = await getDocs(collection(db, 'jlpt_exam_catalog'));
        if (!snap.empty) {
          snap.forEach(d => {
            const data = d.data();
            if (data.audioUrl) {
              items.push({
                id: d.id,
                label: data.label || '',
                level: data.level || 'N3',
                year: data.year,
                month: data.month,
                audioUrl: data.audioUrl,
                durationMinutes: data.durationMinutes || 40,
                totalQuestions: data.totalQuestions,
                actualQuestionCount: data.actualQuestionCount,
                listeningSetsCount: data.questionSetCount || 5
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Firestore choukai catalog fetch failed:', e);
    }

    // 2. Sắp xếp đề mới nhất lên trước
    items.sort((a, b) => {
      if (a.year && b.year && a.year !== b.year) return b.year - a.year;
      return (b.month || 0) - (a.month || 0);
    });

    if (level !== 'ALL') {
      items = items.filter(x => x.level.toUpperCase() === level.toUpperCase());
    }

    if (items.length > 0) {
      setSessionCache(cacheKey, items, 30 * 60 * 1000);
    }
    return items;
  },

  /**
   * Lấy chi tiết bài thi Choukai kèm 5 Mondai câu hỏi & kịch bản nghe từ Firestore
   */
  async getChoukaiExamDetail(id: string): Promise<ChoukaiAudioItem | null> {
    const cacheKey = `kizuna_choukai_detail_${id}`;
    const cached = getSessionCache<ChoukaiAudioItem>(cacheKey);
    if (cached) return cached;

    // Lấy trực tiếp từ Firestore jlpt_exams
    try {
      if (db) {
        const snap = await getDoc(doc(db, 'jlpt_exams', id));
        if (snap.exists()) {
          const full = { id: snap.id, ...snap.data() } as Exam;
          const item: ChoukaiAudioItem = {
            id: full.id,
            label: full.label,
            level: full.level,
            year: full.year,
            month: full.month,
            audioUrl: full.audioUrl || '',
            durationMinutes: full.durationMinutes || 40,
            totalQuestions: full.totalQuestions,
            actualQuestionCount: full.actualQuestionCount,
            listeningSetsCount: (full.questionSets || []).filter(s => s.part === 2).length,
            questionSets: (full.questionSets || []).filter(s => s.part === 2)
          };
          setSessionCache(cacheKey, item);
          return item;
        }
      }
    } catch (e) {
      console.warn('Fetch Firestore choukai error:', e);
    }

    return null;
  }
};
