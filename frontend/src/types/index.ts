export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface KanjiExample {
  word: string;
  reading: string;
  meaning: string;
}

export interface Kanji {
  id: string;
  character: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  jlptLevel: string;
  radicals: string[];
  examples: KanjiExample[];
}

export interface Vocabulary {
  id: string;
  term: string;
  reading: string;
  romaji?: string;
  meanings: string[];
  wordType?: string;
  jlptLevel: string;
  audioUrl?: string;
  exampleSentenceJa?: string;
  exampleSentenceVi?: string;
  lessonId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  targetJlptLevel: string;
  dailyStreak: number;
  totalXp: number;
  role: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'KANJI' | 'VOCABULARY';
  status: 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate?: string;
  lastReviewedDate?: string;
  correctStreak: number;
  bookmarked: boolean;
}

export interface ProgressSummary {
  totalStudied: number;
  dueForReviewToday: number;
  masteredCount: number;
  learningCount: number;
  dailyStreak: number;
  totalXp: number;
}
