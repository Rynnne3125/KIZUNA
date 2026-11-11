import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  ScreeningAnswer, 
  DiagnosticQuestion, 
  DIAGNOSTIC_QUESTION_SETS 
} from '../data/placementQuestionBank';
import { kizunaService } from './kizunaService';
import { User } from '../types/auth';

export interface PlacementAssessmentResult {
  userId: string;
  questionSetId?: number;
  screening: ScreeningAnswer;
  assignedLevel: 'N5' | 'N4' | 'N3' | 'Tân binh';
  levelTitle: string;
  recommendedRegionId: 'region_n5' | 'region_n4' | 'region_n3';
  recommendedRegionName: string;
  recommendedStageId: string;
  recommendedStageTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  aiSenseiFeedback: string;
  strengths: string[];
  weaknesses: string[];
  unlockedRegionIds: string[];
  testedAt: string;
}

const OPTION_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

/**
 * Xáo trộn vị trí 4 đáp án A, B, C, D của một câu hỏi để tránh học vẹt vị trí
 */
function shuffleQuestionOptions(q: DiagnosticQuestion): DiagnosticQuestion {
  const originalCorrectText = q.options.find(o => o.key === q.correctAnswer)?.text;
  const shuffledTexts = [...q.options].sort(() => Math.random() - 0.5);

  let newCorrectKey: 'A' | 'B' | 'C' | 'D' = 'A';
  const newOptions = shuffledTexts.map((opt, idx) => {
    const key = OPTION_KEYS[idx] || 'A';
    if (opt.text === originalCorrectText) {
      newCorrectKey = key;
    }
    return {
      key,
      text: opt.text,
      subtext: opt.subtext
    };
  });

  return {
    ...q,
    options: newOptions,
    correctAnswer: newCorrectKey
  };
}

export const placementService = {
  /**
   * Chọn ngẫu nhiên 1 bộ đề trong 10 bộ đề (Không trùng với bộ đề vừa làm lần trước)
   */
  pickRandomSetId(): number {
    const lastSetRaw = localStorage.getItem('kizuna_last_placement_set_id');
    const lastSetId = lastSetRaw ? parseInt(lastSetRaw, 10) : -1;

    const allSetIds = DIAGNOSTIC_QUESTION_SETS.map(s => s.setId);
    const availableIds = allSetIds.filter(id => id !== lastSetId);
    const pool = availableIds.length > 0 ? availableIds : allSetIds;

    const chosenId = pool[Math.floor(Math.random() * pool.length)];
    try {
      localStorage.setItem('kizuna_last_placement_set_id', String(chosenId));
    } catch {}
    return chosenId;
  },

  /**
   * Lấy câu hỏi theo tầng độ khó từ Bộ đề được chọn (1 trong 10 bộ) + đảo vị trí đáp án
   */
  getQuestionsForLevel(level: 'N5' | 'N4' | 'N3', setId?: number): DiagnosticQuestion[] {
    const targetSetId = setId || this.pickRandomSetId();
    const foundSet = DIAGNOSTIC_QUESTION_SETS.find(s => s.setId === targetSetId) || DIAGNOSTIC_QUESTION_SETS[0];
    const levelQuestions = foundSet.questions.filter(q => q.level === level);
    return levelQuestions.map(q => shuffleQuestionOptions(q));
  },

  /**
   * Sinh câu hỏi động trực tiếp từ CSDL (vocabulary_items & kanji_dictionary) kết hợp với Bộ đề ngẫu nhiên
   */
  async getDynamicQuestionsForLevel(level: 'N5' | 'N4' | 'N3', setId?: number): Promise<DiagnosticQuestion[]> {
    const baseQuestions = this.getQuestionsForLevel(level, setId);

    try {
      // Thử lấy dữ liệu từ vựng trong CSDL theo đúng cấp độ
      const unitMap: Record<'N5' | 'N4' | 'N3', { book: string; units: string[] }> = {
        N5: { book: 'n5-mimikara', units: ['n5-mimikara_b01', 'n5-mimikara_b04', 'n5-mimikara_b06', 'n5-mimikara_b08'] },
        N4: { book: 'n4-mimikara', units: ['n4-mimikara_b01', 'n4-mimikara_b02', 'n4-mimikara_b03', 'n4-mimikara_b05'] },
        N3: { book: 'n3-mimikara', units: ['n3-mimikara_u01', 'n3-mimikara_u02', 'n3-mimikara_u03', 'n3-mimikara_u04'] }
      };

      const cfg = unitMap[level];
      const randomUnitId = cfg.units[Math.floor(Math.random() * cfg.units.length)];
      const vocabItems = await kizunaService.getVocabularyByUnit(cfg.book, randomUnitId);

      // Lọc các từ có chữ Hán (term khác reading) và có nghĩa tiếng Việt rõ ràng
      const validVocab = vocabItems.filter(
        v => v.term && v.reading && v.vietnameseMeaning && v.term !== v.reading
      );

      if (validVocab.length >= 8) {
        const shuffledVocab = [...validVocab].sort(() => Math.random() - 0.5);
        const targetKanjiWord = shuffledVocab[0];
        const kanjiDistractors = shuffledVocab.slice(1, 4);

        const targetVocabWord = shuffledVocab[4];
        const vocabDistractors = shuffledVocab.slice(5, 8);

        const points = level === 'N5' ? 10 : level === 'N4' ? 15 : 20;

        // 1. Câu hỏi Kanji sinh động từ CSDL
        const dbKanjiQ: DiagnosticQuestion = shuffleQuestionOptions({
          id: `db_kanji_${level}_${targetKanjiWord.id}_${Date.now()}`,
          setId,
          level,
          category: 'kanji',
          question: `Từ trong ngoặc đọc là gì:\n「${targetKanjiWord.term}」`,
          contextJp: `「${targetKanjiWord.term}」`,
          options: [
            { key: 'A', text: targetKanjiWord.reading },
            { key: 'B', text: kanjiDistractors[0].reading },
            { key: 'C', text: kanjiDistractors[1].reading },
            { key: 'D', text: kanjiDistractors[2].reading }
          ],
          correctAnswer: 'A',
          explanationVi: `Từ 「${targetKanjiWord.term}」 (${targetKanjiWord.vietnameseMeaning}) có cách đọc chuẩn là 「${targetKanjiWord.reading}」.`,
          points
        });

        // 2. Câu hỏi Từ vựng / Chữ Hán sinh động từ CSDL (Không chứa nghĩa tiếng Việt trên câu hỏi và đáp án)
        const hasExampleWithTerm =
          targetVocabWord.exampleSentenceJp &&
          targetVocabWord.exampleSentenceJp.includes(targetVocabWord.term);

        const vocabPrompt = hasExampleWithTerm
          ? `Chọn từ thích hợp điền vào chỗ trống:\n${targetVocabWord.exampleSentenceJp!.replace(targetVocabWord.term, '（　）')}`
          : `Từ trong ngoặc viết bằng chữ Hán như thế nào:\n「${targetVocabWord.reading}」`;

        const dbVocabQ: DiagnosticQuestion = shuffleQuestionOptions({
          id: `db_vocab_${level}_${targetVocabWord.id}_${Date.now()}`,
          setId,
          level,
          category: 'vocabulary',
          question: vocabPrompt,
          options: [
            { key: 'A', text: targetVocabWord.term },
            { key: 'B', text: vocabDistractors[0].term },
            { key: 'C', text: vocabDistractors[1].term },
            { key: 'D', text: vocabDistractors[2].term }
          ],
          correctAnswer: 'A',
          explanationVi: `「${targetVocabWord.term}」 (${targetVocabWord.reading}) mang nghĩa là "${targetVocabWord.vietnameseMeaning}".`,
          points
        });

        // Thay thế 2 câu kanji & vocabulary trong bộ đề bằng 2 câu sinh trực tiếp từ CSDL
        const grammarAndAlphabet = baseQuestions.filter(q => q.category !== 'kanji' && q.category !== 'vocabulary');
        if (grammarAndAlphabet.length >= 2) {
          return [grammarAndAlphabet[0], grammarAndAlphabet[1], dbKanjiQ, dbVocabQ];
        }
      }
    } catch (err) {
      console.warn('[PlacementService] Không thể lấy câu hỏi động từ CSDL, dùng bộ đề ngẫu nhiên:', err);
    }

    return baseQuestions;
  },

  /**
   * Tính toán kết quả chẩn đoán và tổng hợp nhận xét từ AI Sensei
   */
  async evaluatePlacement(
    userId: string,
    screening: ScreeningAnswer,
    userAnswers: Record<string, string>,
    testedQuestions: DiagnosticQuestion[],
    questionSetId?: number
  ): Promise<PlacementAssessmentResult> {
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;

    const categoryStats: Record<string, { correct: number; total: number }> = {
      alphabet: { correct: 0, total: 0 },
      vocabulary: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      kanji: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 }
    };

    testedQuestions.forEach(q => {
      maxScore += q.points;
      const cat = q.category || 'grammar';
      if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, total: 0 };
      categoryStats[cat].total += 1;

      const userAns = userAnswers[q.id];
      if (userAns && userAns === q.correctAnswer) {
        score += q.points;
        correctCount += 1;
        categoryStats[cat].correct += 1;
      } else {
        wrongCount += 1;
      }
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Phân tích điểm mạnh & điểm yếu
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (categoryStats.kanji.total > 0) {
      if (categoryStats.kanji.correct / categoryStats.kanji.total >= 0.75) {
        strengths.push('Trí nhớ thị giác chữ Hán (Kanji) rất tốt');
      } else {
        weaknesses.push('Cần củng cố thêm cách đọc On/Kun của Kanji cơ bản');
      }
    }

    if (categoryStats.grammar.total > 0) {
      if (categoryStats.grammar.correct / categoryStats.grammar.total >= 0.75) {
        strengths.push('Nắm chắc quy tắc chia thể động từ và vị trí trợ từ');
      } else {
        weaknesses.push('Còn phân vân khi ghép nối trợ từ và kính ngữ');
      }
    }

    if (categoryStats.vocabulary.total > 0) {
      if (categoryStats.vocabulary.correct / categoryStats.vocabulary.total >= 0.75) {
        strengths.push('Vốn từ vựng phản xạ đời sống và công sở tốt');
      } else {
        weaknesses.push('Nên bổ sung thêm từ vựng chuyên ngành và giao tiếp');
      }
    }

    // Xác định Trình độ & Lộ trình đích
    let assignedLevel: 'N5' | 'N4' | 'N3' | 'Tân binh' = 'N5';
    let levelTitle = 'Sơ Cấp Khởi Đầu (N5)';
    let recommendedRegionId: 'region_n5' | 'region_n4' | 'region_n3' = 'region_n5';
    let recommendedRegionName = 'Cửa Ngõ Thần Đạo (Kyushu & Okinawa)';
    let recommendedStageId = 'stage_n5_01';
    let recommendedStageTitle = 'Bảng Chữ Cái & Câu Chào Hỏi Minna 1';
    let unlockedRegionIds = ['region_n5'];

    if (screening.studyBackground === 'never' && percentage < 50) {
      assignedLevel = 'Tân binh';
      levelTitle = 'Tân Binh Nhập Môn';
      recommendedRegionId = 'region_n5';
      recommendedRegionName = 'Cửa Ngõ Thần Đạo (Kyushu & Okinawa)';
      recommendedStageId = 'stage_n5_01';
      recommendedStageTitle = 'Bảng Chữ Cái Hiragana & Katakana Căn Bản';
      unlockedRegionIds = ['region_n5'];
    } else if (percentage >= 80 && testedQuestions.some(q => q.level === 'N3')) {
      assignedLevel = 'N3';
      levelTitle = 'Trung Cấp Đột Phá (N3)';
      recommendedRegionId = 'region_n3';
      recommendedRegionName = 'Đỉnh Phú Sĩ & Đô Thị (Chubu & Kanto)';
      recommendedStageId = 'stage_n3_01';
      recommendedStageTitle = 'Ngữ Pháp N3 Chuyên Sâu & Kính Ngữ Công Sở';
      unlockedRegionIds = ['region_n5', 'region_n4', 'region_n3'];
    } else if (percentage >= 65 && testedQuestions.some(q => q.level === 'N4')) {
      assignedLevel = 'N4';
      levelTitle = 'Sơ Cấp Vững Vàng (N4)';
      recommendedRegionId = 'region_n4';
      recommendedRegionName = 'Cố Đô Tri Thức (Kansai & Chugoku)';
      recommendedStageId = 'stage_n4_01';
      recommendedStageTitle = 'Các Thể Động Từ N4 & Câu Phức Giao Tiếp';
      unlockedRegionIds = ['region_n5', 'region_n4'];
    } else {
      assignedLevel = 'N5';
      levelTitle = 'Sơ Cấp Tiêu Chuẩn (N5)';
      recommendedRegionId = 'region_n5';
      recommendedRegionName = 'Cửa Ngõ Thần Đạo (Kyushu & Okinawa)';
      recommendedStageId = 'stage_n5_01';
      recommendedStageTitle = 'Từ Vựng & Ngữ Pháp N5 25 Bài Minna';
      unlockedRegionIds = ['region_n5'];
    }

    let aiSenseiFeedback = '';
    const goalText = screening.goal === 'it_career' 
      ? 'Kỹ sư IT làm việc tại Nhật Bản' 
      : screening.goal === 'study_abroad' ? 'Du học & Định cư' : 'Chinh phục JLPT';

    if (assignedLevel === 'N3') {
      aiSenseiFeedback = `Konnichiwa! AI Sensei rất ấn tượng với năng lực của bạn. Bạn đã vượt qua các câu hỏi trung cấp N3 với tỉ lệ chính xác ${percentage}%. Bạn có thể bỏ qua phần sơ cấp và tiến thẳng vào bản đồ Kanto (Tokyo) để luyện các mẫu câu hội thoại chuyên sâu cho mục tiêu ${goalText}!`;
    } else if (assignedLevel === 'N4') {
      aiSenseiFeedback = `Tuyệt vời! Bạn đã có nền tảng sơ cấp rất vững vàng (Đạt ${percentage}%). Toàn bộ vùng Kyushu (N5) đã được mở khóa, Sensei đã đưa bạn thẳng tới Cố Đô Kyoto & Osaka (N4) để chinh phục các thể động từ nâng cao.`;
    } else if (assignedLevel === 'N5') {
      aiSenseiFeedback = `Chào bạn! Bạn đã nắm được một số từ vựng và bảng chữ cái cơ bản. Bắt đầu từ Vùng Cửa Ngõ Thần Đạo (Kyushu) sẽ giúp bạn lấp đầy các lỗ hổng trợ từ và tích lũy phản xạ tự nhiên nhất.`;
    } else {
      aiSenseiFeedback = `Chào mừng bạn đến với KIZUNA! Đừng lo lắng nếu tiếng Nhật là một ngôn ngữ mới lạ. Hệ thống đã thiết lập lộ trình từ bảng chữ cái Hiragana/Katakana với hình ảnh flashcard sinh động nhất dành riêng cho bạn. Cùng cố gắng nhé! (Ganbatte!)`;
    }

    return {
      userId,
      questionSetId,
      screening,
      assignedLevel,
      levelTitle,
      recommendedRegionId,
      recommendedRegionName,
      recommendedStageId,
      recommendedStageTitle,
      score,
      maxScore,
      percentage,
      correctCount,
      wrongCount,
      answeredCount: testedQuestions.length,
      aiSenseiFeedback,
      strengths,
      weaknesses,
      unlockedRegionIds,
      testedAt: new Date().toISOString()
    };
  },

  /**
   * Lưu kết quả thẩm định vào Firestore và đồng bộ LocalStorage
   */
  async savePlacementResult(result: PlacementAssessmentResult): Promise<void> {
    if (!result.userId) return;

    if (db) {
      try {
        const userRef = doc(db, 'users', result.userId);
        await updateDoc(userRef, {
          level: result.assignedLevel,
          placementVerified: true,
          placementMethod: 'ADAPTIVE_TEST',
          placementScore: result.percentage,
          placementDetails: {
            questionSetId: result.questionSetId || 1,
            assignedLevel: result.assignedLevel,
            score: result.score,
            maxScore: result.maxScore,
            percentage: result.percentage,
            correctCount: result.correctCount,
            wrongCount: result.wrongCount,
            testedAt: result.testedAt,
            screening: result.screening
          },
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[PlacementService] Lỗi updateDoc users:', err);
      }

      try {
        const progressRef = doc(db, 'user_progress', result.userId);
        await setDoc(progressRef, {
          userId: result.userId,
          currentRegionId: result.recommendedRegionId,
          currentStageId: result.recommendedStageId,
          currentStageTitle: result.recommendedStageTitle,
          unlockedRegions: result.unlockedRegionIds,
          lastPlacementAt: result.testedAt,
          lastStudiedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('[PlacementService] Lỗi setDoc user_progress:', err);
      }
    }

    try {
      const rawUser = localStorage.getItem('kizuna_user');
      if (rawUser) {
        const currentUser: User = JSON.parse(rawUser);
        if (currentUser.id === result.userId) {
          currentUser.level = result.assignedLevel;
          localStorage.setItem('kizuna_user', JSON.stringify(currentUser));
        }
      }
      localStorage.setItem(`kizuna_placement_${result.userId}`, JSON.stringify(result));
    } catch (e) {
      console.warn('[PlacementService] Lỗi đồng bộ localStorage:', e);
    }
  },

  /**
   * Kiểm tra xem user hiện tại đã làm bài test thẩm định chưa
   */
  async checkUserPlacementStatus(userId: string): Promise<PlacementAssessmentResult | null> {
    if (!userId) return null;

    const local = localStorage.getItem(`kizuna_placement_${userId}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.placementVerified && data.placementDetails) {
            return data.placementDetails as PlacementAssessmentResult;
          }
        }
      } catch (e) {
        console.warn('[PlacementService] Lỗi kiểm tra status từ Firestore:', e);
      }
    }

    return null;
  }
};
