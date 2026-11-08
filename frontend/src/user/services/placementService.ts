import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  ScreeningAnswer, 
  DiagnosticQuestion, 
  DIAGNOSTIC_QUESTIONS 
} from '../data/placementQuestionBank';
import { User } from '../types/auth';

export interface PlacementAssessmentResult {
  userId: string;
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

export const placementService = {
  /**
   * Lấy danh sách câu hỏi theo tầng độ khó
   */
  getQuestionsForLevel(level: 'N5' | 'N4' | 'N3'): DiagnosticQuestion[] {
    return DIAGNOSTIC_QUESTIONS.filter(q => q.level === level);
  },

  /**
   * Tính toán kết quả chẩn đoán và tổng hợp nhận xét từ AI Sensei
   */
  async evaluatePlacement(
    userId: string,
    screening: ScreeningAnswer,
    userAnswers: Record<string, string>,
    testedQuestions: DiagnosticQuestion[]
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

    // Nếu người dùng chọn chưa học chữ cái và không làm hoặc làm điểm thấp
    if (screening.studyBackground === 'never' && percentage < 50) {
      assignedLevel = 'Tân binh';
      levelTitle = 'Tân Binh Nhập Môn';
      recommendedRegionId = 'region_n5';
      recommendedRegionName = 'Cửa Ngõ Thần Đạo (Kyushu & Okinawa)';
      recommendedStageId = 'stage_n5_01';
      recommendedStageTitle = 'Bảng Chữ Cái Hiragana & Katakana Căn Bản';
      unlockedRegionIds = ['region_n5'];
    } else if (percentage >= 80 && testedQuestions.some(q => q.level === 'N3')) {
      // Đạt chuẩn N3
      assignedLevel = 'N3';
      levelTitle = 'Trung Cấp Đột Phá (N3)';
      recommendedRegionId = 'region_n3';
      recommendedRegionName = 'Đỉnh Phú Sĩ & Đô Thị (Chubu & Kanto)';
      recommendedStageId = 'stage_n3_01';
      recommendedStageTitle = 'Ngữ Pháp N3 Chuyên Sâu & Kính Ngữ Công Sở';
      unlockedRegionIds = ['region_n5', 'region_n4', 'region_n3'];
    } else if (percentage >= 65 && testedQuestions.some(q => q.level === 'N4')) {
      // Đạt chuẩn N4
      assignedLevel = 'N4';
      levelTitle = 'Sơ Cấp Vững Vàng (N4)';
      recommendedRegionId = 'region_n4';
      recommendedRegionName = 'Cố Đô Tri Thức (Kansai & Chugoku)';
      recommendedStageId = 'stage_n4_01';
      recommendedStageTitle = 'Các Thể Động Từ N4 & Câu Phức Giao Tiếp';
      unlockedRegionIds = ['region_n5', 'region_n4'];
    } else {
      // Sơ cấp N5
      assignedLevel = 'N5';
      levelTitle = 'Sơ Cấp Tiêu Chuẩn (N5)';
      recommendedRegionId = 'region_n5';
      recommendedRegionName = 'Cửa Ngõ Thần Đạo (Kyushu & Okinawa)';
      recommendedStageId = 'stage_n5_01';
      recommendedStageTitle = 'Từ Vựng & Ngữ Pháp N5 25 Bài Minna';
      unlockedRegionIds = ['region_n5'];
    }

    // Nhận xét từ AI Sensei
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

    // 1. Cập nhật Firestore collection 'users'
    if (db) {
      try {
        const userRef = doc(db, 'users', result.userId);
        await updateDoc(userRef, {
          level: result.assignedLevel,
          placementVerified: true,
          placementMethod: 'ADAPTIVE_TEST',
          placementScore: result.percentage,
          placementDetails: {
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
        console.log(`[PlacementService] Đã cập nhật kết quả thẩm định level ${result.assignedLevel} vào Firestore users/${result.userId}`);
      } catch (err) {
        console.warn('[PlacementService] Lỗi updateDoc users:', err);
      }

      // 2. Cập nhật Firestore collection 'user_progress' để mở khóa bản đồ
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
        console.log(`[PlacementService] Đã mở khóa bản đồ các vùng [${result.unlockedRegionIds.join(', ')}] trong user_progress`);
      } catch (err) {
        console.warn('[PlacementService] Lỗi setDoc user_progress:', err);
      }
    }

    // 3. Đồng bộ lại User session trong localStorage
    try {
      const rawUser = localStorage.getItem('kizuna_user');
      if (rawUser) {
        const currentUser: User = JSON.parse(rawUser);
        if (currentUser.id === result.userId) {
          currentUser.level = result.assignedLevel;
          localStorage.setItem('kizuna_user', JSON.stringify(currentUser));
        }
      }
      // Lưu kết quả placement chi tiết
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

    // Kiểm tra cache local
    const local = localStorage.getItem(`kizuna_placement_${userId}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    // Kiểm tra Firestore
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
