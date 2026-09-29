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
  milestoneId?: string;
  term: string;
  reading: string;
  sinoVietnamese?: string;
  vietnameseMeaning: string;
  wordType?: string;
  exampleSentenceJp?: string;
  exampleSentenceVi?: string;
  level?: string;
}

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
