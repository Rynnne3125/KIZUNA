import { useMemo } from 'react';
import { User } from '../types/auth';

export interface ProgressSummary {
  completionPercentage: number;
  streak: number;
  points: number;
  xp: number;
  level: string;
  vocabLearned: number;
  kanjiLearned: number;
  grammarLearned: number;
  examsCompleted: number;
}

export function useProgress(user: User | null): ProgressSummary {
  return useMemo(() => {
    const streak = user?.currentStreak || 0;
    const points = user?.activePoints || 0;
    const xp = user?.totalXp || 0;
    const level = user?.level || 'Tân binh';

    // Tính toán tiến độ dựa trên XP thực tế, không dùng mock số ảo khi XP = 0
    const completionPercentage = xp > 0 ? Math.min(100, Math.round((xp / 10000) * 100)) : 0;
    const vocabLearned = xp > 0 ? Math.min(800, Math.round(xp / 12)) : 0;
    const kanjiLearned = xp > 0 ? Math.min(300, Math.round(xp / 35)) : 0;
    const grammarLearned = xp > 0 ? Math.min(120, Math.round(xp / 60)) : 0;
    const examsCompleted = points > 0 ? Math.floor(points / 500) : 0;

    return {
      completionPercentage,
      streak,
      points,
      xp,
      level,
      vocabLearned,
      kanjiLearned,
      grammarLearned,
      examsCompleted
    };
  }, [user]);
}
