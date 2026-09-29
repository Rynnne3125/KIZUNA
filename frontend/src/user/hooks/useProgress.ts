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
    const streak = user?.currentStreak || 1;
    const points = user?.activePoints || 0;
    const xp = user?.totalXp || 0;
    const level = user?.level || 'N5';

    // Simulated progress metrics based on XP & points
    const completionPercentage = Math.min(100, Math.round((xp / 10000) * 100)) || 18;
    const vocabLearned = Math.min(800, Math.round(xp / 12)) || 56;
    const kanjiLearned = Math.min(300, Math.round(xp / 35)) || 25;
    const grammarLearned = Math.min(120, Math.round(xp / 60)) || 14;
    const examsCompleted = Math.max(1, Math.floor(points / 500));

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
