export interface Stage {
  id: string;
  title: string;
  orderIndex: number;
  description: string;
  themeColor?: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  stageId: string;
  title: string;
  nejUnit: string;
  orderIndex: number;
  communicationContext: string;
  xpReward: number;
  activePointsReward: number;
  status?: 'COMPLETED' | 'UNLOCKED' | 'LOCKED';
  vocabCount?: number;
  kanjiCount?: number;
  grammarCount?: number;
}

export interface VocabularyItem {
  id: string;
  term: string;
  kanji?: string;
  reading: string;
  hiragana?: string;
  sinoVietnamese?: string;
  vietnameseMeaning: string;
  meaning_vi?: string;
  meaningEn?: string;
  wordType?: string;
  part_of_speech?: string;
  jlptLevel?: string;
  level?: string;
  bookId?: string;
  bookName?: string;
  chapterTitle?: string;
  unitId?: string;
  unitTitle?: string;
  unitOrder?: number;
  exampleSentenceJp?: string;
  exampleSentenceVi?: string;
  nejSource?: string;
  milestoneId?: string;
}

export interface VocabularyUnit {
  unitId: string;
  unitTitle: string;
  chapterTitle?: string;
  wordCount: number;
}

export interface VocabularyBook {
  bookId: string;
  bookName: string;
  description: string;
  totalWords: number;
  units: VocabularyUnit[];
}

export type VocabularyCatalog = Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', VocabularyBook[]>;

export interface GrammarItem {
  id: string;
  milestoneId?: string;
  pattern: string;
  titleVi: string;
  explanation: string;
  nuanceReason?: string;
  masterExampleJp: string;
  masterExampleVi: string;
  level?: string;
}

export interface KanjiItem {
  id: string;
  milestoneId?: string;
  kanji: string;
  strokeCount: number;
  radicals?: string;
  onyomi?: string;
  kunyomi?: string;
  sinoVietnamese: string;
  vietnameseMeaning: string;
  mnemonicStory?: string;
  exampleCompounds?: Array<{ compound: string; reading: string; meaning: string }>;
  level?: string;
}

export interface ExamOption {
  id: string;
  value: string;
}

export interface ExamQuestion {
  id: string;
  index: number;
  question: string;
  content?: string;
  options: ExamOption[];
  correctAnswer: string;
  explanation?: string;
  script?: string;
  score?: number;
}

export interface QuestionSet {
  id: string;
  index: number;
  title: string;
  part: number; // 1: Knowledge/Reading, 2: Listening
  audioUrl?: string;
  content?: string;
  questionCount?: number;
  questions: ExamQuestion[];
}

export interface Exam {
  id: string;
  label: string;
  level: string;
  type: string;
  year?: number;
  month?: number;
  testNumber?: number;
  durationMinutes: number;
  totalQuestions: number;
  actualQuestionCount?: number;
  parts?: number;
  audioUrl?: string;
  questionSetCount?: number;
  explanationCount?: number;
  scriptCount?: number;
  createdAt?: string;
  questionSets?: QuestionSet[];
}
