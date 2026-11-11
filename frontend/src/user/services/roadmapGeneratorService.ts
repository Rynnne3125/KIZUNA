import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PlacementAssessmentResult } from './placementService';
import { 
  PersonalizedRoadmap, 
  RoadmapGoalType 
} from '../types/roadmapTypes';

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

export const roadmapGeneratorService = {
  /**
   * Tạo duy nhất 1 lộ trình học cá nhân hóa cho học viên sau khi hoàn thành bài test
   * TUYỆT ĐỐI KHÔNG SINH NỘI BỘ - Bắt buộc gọi qua Gemini API từ cấu hình hệ thống (.env)
   */
  async generatePersonalizedRoadmap(
    userId: string,
    placement: PlacementAssessmentResult
  ): Promise<PersonalizedRoadmap> {
    if (!GEMINI_API_KEY) {
      throw new Error('Hệ thống chưa được cấu hình Gemini API Key (VITE_GEMINI_API_KEY trong file .env).');
    }

    const goalType: RoadmapGoalType = placement.screening?.goal || 'it_career';
    const weeklyHours = placement.screening?.weeklyHours === 'more_7h' ? 8 : placement.screening?.weeklyHours === 'less_3h' ? 3 : 5;

    const geminiRoadmap = await this.callGeminiFlashApi(userId, placement, goalType, weeklyHours, GEMINI_API_KEY);
    if (!geminiRoadmap) {
      throw new Error('Gemini API không trả về dữ liệu lộ trình hợp lệ.');
    }

    // Ghi đè lộ trình duy nhất của user sau khi hoàn thành bài test
    await this.saveRoadmap(geminiRoadmap);
    return geminiRoadmap;
  },

  /**
   * Gọi trực tiếp Gemini Flash qua Google Generative Language REST API với JSON Mode
   */
  async callGeminiFlashApi(
    userId: string,
    placement: PlacementAssessmentResult,
    goalType: RoadmapGoalType,
    weeklyHours: number,
    apiKey: string
  ): Promise<PersonalizedRoadmap | null> {
    const prompt = `Bạn là KIZUNA Sensei, chuyên gia thiết kế lộ trình học tiếng Nhật cá nhân hóa.
Dữ liệu học viên vừa hoàn thành bài kiểm tra năng lực đầu vào:
- Trình độ thẩm định: ${placement.assignedLevel} (${placement.levelTitle})
- Điểm số đạt được: ${placement.percentage}% (Đúng ${placement.correctCount}/${placement.answeredCount} câu)
- Mục tiêu học tập: ${goalType} (it_career = Kỹ sư IT / BrSE tại Nhật, study_abroad = Du học & Làm việc tại Nhật, pass_jlpt = Chinh phục kỳ thi JLPT, hobby = Văn hóa Anime/Manga/Du lịch)
- Thời gian học mỗi tuần: ${weeklyHours} giờ/tuần
- Điểm mạnh: ${placement.strengths.join(', ') || 'Chưa xác định'}
- Điểm yếu cần khắc phục: ${placement.weaknesses.join(', ') || 'Cần củng cố từ vựng và ngữ pháp'}
- Vùng bản đồ khởi điểm: ${placement.recommendedRegionName} (${placement.recommendedRegionId})

YÊU CẦU:
Hãy thiết kế lộ trình học tập cá nhân hóa gồm 4 tuần liên tiếp. Mỗi tuần có từ 3 đến 4 nhiệm vụ học tập cụ thể (type chỉ nhận 1 trong các giá trị: "VOCAB", "KANJI", "GRAMMAR", "SCENARIO", "SRS_REVIEW", "EXAM_CHECKPOINT").
Bám sát trình độ ${placement.assignedLevel}, mục tiêu ${goalType} và khắc phục trực tiếp các điểm yếu đã nêu.

Trả về duy nhất định dạng JSON thuần túy theo đúng cấu trúc sau:
{
  "targetLevel": "N4",
  "targetLevelTitle": "Tiến Lên Sơ Cấp Vững Vàng (N4)",
  "goalTitle": "Kỹ Sư CNTT Làm Việc Tại Nhật Bản (IT BrSE)",
  "weeklyPaceHours": ${weeklyHours},
  "estimatedTotalWeeks": 8,
  "aiSenseiSummary": "Nhận xét và định hướng chiến lược học tập cá nhân hóa từ AI Sensei",
  "strategicAdvice": [
    "Lời khuyên chiến lược 1",
    "Lời khuyên chiến lược 2",
    "Lời khuyên chiến lược 3"
  ],
  "weeklyPlans": [
    {
      "weekNumber": 1,
      "title": "Tuần 1: ...",
      "themeVi": "Chủ đề trọng tâm tuần 1",
      "stageId": "${placement.recommendedStageId}",
      "stageTitle": "${placement.recommendedStageTitle}",
      "regionId": "${placement.recommendedRegionId}",
      "regionName": "${placement.recommendedRegionName}",
      "estimatedHours": ${weeklyHours},
      "focusArea": "Trọng tâm kiến thức tuần 1",
      "tasks": [
        {
          "id": "t_w1_1",
          "title": "Tên nhiệm vụ cụ thể",
          "type": "VOCAB",
          "description": "Mô tả chi tiết cách học và mục tiêu cần đạt",
          "targetCount": 30,
          "targetUnit": "từ vựng",
          "recommendedMinutes": 45,
          "isCompleted": false
        }
      ]
    }
  ]
}`;

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3-flash-preview'];
    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3
              }
            })
          }
        );

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          lastError = new Error(`Gemini API (${modelName}) lỗi HTTP ${res.status}: ${errBody || res.statusText}`);
          continue;
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastError = new Error('Gemini API không trả về nội dung văn bản.');
          continue;
        }

        const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleanedJson);

        let totalTasks = 0;
        const weeklyPlans = (parsed.weeklyPlans || []).map((w: any, idx: number) => {
          const tasks = (w.tasks || []).map((t: any, tIdx: number) => ({
            id: t.id || `task_w${idx + 1}_${tIdx + 1}`,
            title: t.title || 'Nhiệm vụ học tập',
            type: t.type || 'VOCAB',
            description: t.description || '',
            targetCount: Number(t.targetCount) || 20,
            targetUnit: t.targetUnit || 'bài',
            recommendedMinutes: Number(t.recommendedMinutes) || 30,
            isCompleted: false
          }));
          totalTasks += tasks.length;
          return {
            weekNumber: Number(w.weekNumber) || idx + 1,
            title: w.title || `Tuần ${idx + 1}`,
            themeVi: w.themeVi || '',
            stageId: w.stageId || placement.recommendedStageId,
            stageTitle: w.stageTitle || placement.recommendedStageTitle,
            regionId: w.regionId || placement.recommendedRegionId,
            regionName: w.regionName || placement.recommendedRegionName,
            estimatedHours: Number(w.estimatedHours) || weeklyHours,
            focusArea: w.focusArea || '',
            status: idx === 0 ? 'CURRENT' : 'UPCOMING',
            tasks
          };
        });

        return {
          roadmapId: `rdm_gemini_${Date.now().toString(36)}`,
          userId,
          currentLevel: placement.assignedLevel,
          targetLevel: parsed.targetLevel || 'N4',
          targetLevelTitle: parsed.targetLevelTitle || 'Tiến Lên Sơ Cấp Vững Vàng (N4)',
          goalType,
          goalTitle: parsed.goalTitle || 'Chinh Phục Nhật Ngữ',
          weeklyPaceHours: weeklyHours,
          estimatedTotalWeeks: Number(parsed.estimatedTotalWeeks) || 8,
          aiSenseiSummary: parsed.aiSenseiSummary || placement.aiSenseiFeedback,
          strategicAdvice: Array.isArray(parsed.strategicAdvice) && parsed.strategicAdvice.length > 0
            ? parsed.strategicAdvice
            : ['Duy trì học đều đặn mỗi ngày', 'Ôn tập lại các câu sai bằng Flashcard'],
          startingRegionId: placement.recommendedRegionId,
          startingRegionName: placement.recommendedRegionName,
          completionRate: 0,
          totalTasksCount: totalTasks,
          completedTasksCount: 0,
          weeklyPlans,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error('Không thể kết nối tới Gemini API.');
  },

  /**
   * Lưu trữ lộ trình duy nhất của học viên vào Firestore và LocalStorage
   */
  async saveRoadmap(roadmap: PersonalizedRoadmap): Promise<void> {
    if (!roadmap.userId) return;

    try {
      localStorage.setItem(`kizuna_roadmap_${roadmap.userId}`, JSON.stringify(roadmap));
    } catch (e) {
      console.warn('[RoadmapService] Lỗi ghi LocalStorage:', e);
    }

    if (db) {
      try {
        const ref = doc(db, 'user_roadmaps', roadmap.userId);
        await setDoc(ref, roadmap);
      } catch (err) {
        console.warn('[RoadmapService] Lỗi ghi Firestore user_roadmaps:', err);
      }
    }
  },

  /**
   * Lấy lộ trình cá nhân của người dùng (Chỉ trả về lộ trình được sinh bởi Gemini API)
   */
  async getUserRoadmap(userId: string): Promise<PersonalizedRoadmap | null> {
    if (!userId) return null;

    try {
      const cached = localStorage.getItem(`kizuna_roadmap_${userId}`);
      if (cached) {
        const parsed: PersonalizedRoadmap = JSON.parse(cached);
        // Xóa bỏ lộ trình sinh nội bộ cũ (nếu có từ phiên trước) để đảm bảo 100% chỉ dùng lộ trình từ Gemini API
        if (parsed.roadmapId && parsed.roadmapId.startsWith('rdm_gemini_')) {
          return parsed;
        } else {
          localStorage.removeItem(`kizuna_roadmap_${userId}`);
        }
      }
    } catch {}

    if (db) {
      try {
        const snap = await getDoc(doc(db, 'user_roadmaps', userId));
        if (snap.exists()) {
          const data = snap.data() as PersonalizedRoadmap;
          if (data.roadmapId && data.roadmapId.startsWith('rdm_gemini_')) {
            try {
              localStorage.setItem(`kizuna_roadmap_${userId}`, JSON.stringify(data));
            } catch {}
            return data;
          }
        }
      } catch (e) {
        console.warn('[RoadmapService] Lỗi đọc Firestore user_roadmaps:', e);
      }
    }

    return null;
  },

  /**
   * Đánh dấu hoàn thành / bỏ hoàn thành một nhiệm vụ học tập
   */
  async toggleTaskCompletion(
    userId: string,
    weekNumber: number,
    taskId: string
  ): Promise<PersonalizedRoadmap | null> {
    const roadmap = await this.getUserRoadmap(userId);
    if (!roadmap) return null;

    let modified = false;
    let completedCount = 0;
    let totalCount = 0;

    roadmap.weeklyPlans.forEach(week => {
      let allWeekCompleted = true;

      week.tasks.forEach(task => {
        totalCount += 1;
        if (week.weekNumber === weekNumber && task.id === taskId) {
          task.isCompleted = !task.isCompleted;
          modified = true;
        }
        if (task.isCompleted) {
          completedCount += 1;
        } else {
          allWeekCompleted = false;
        }
      });

      if (allWeekCompleted && week.tasks.length > 0) {
        week.status = 'COMPLETED';
      }
    });

    if (modified) {
      roadmap.completedTasksCount = completedCount;
      roadmap.totalTasksCount = totalCount;
      roadmap.completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      roadmap.updatedAt = new Date().toISOString();

      await this.saveRoadmap(roadmap);
      return roadmap;
    }

    return roadmap;
  }
};
