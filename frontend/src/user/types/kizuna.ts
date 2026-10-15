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

export interface GrammarExample {
  sentence: string;
  translation: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  translation: string;
}

export interface GrammarDialogue {
  title?: string;
  lines: DialogueLine[];
}

export interface GrammarItem {
  id: string;
  grammar_id?: string;
  milestoneId?: string;
  stageId?: string;
  jlptLevel?: string;
  level?: string;
  lessonNumber?: number;
  pattern: string;
  titleVi: string;
  structure?: string;
  explanation: string;
  nuanceReason?: string;
  commonMistake?: string;
  kitsuPrompt?: string;
  masterExampleJp: string;
  masterExampleVi: string;
  examples?: GrammarExample[];
  dialogue?: GrammarDialogue;
  sourceBook?: string;
  sourceUrl?: string;
}

export interface GrammarUnit {
  unitId: string;
  unitTitle: string;
  subTitle?: string;
  lessonNumber?: number;
  itemCount: number;
}

export interface GrammarBook {
  bookId: string;
  bookName: string;
  description: string;
  totalItems: number;
  units: GrammarUnit[];
}

export type GrammarCatalog = Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', GrammarBook[]>;

export interface KanjiCompound {
  word?: string;
  compound?: string;
  reading: string;
  meaning: string;
  type?: string;
  level?: string;
  lesson?: number;
}

export interface KanjiItem {
  id: string;
  kanji_id?: string;
  milestoneId?: string;
  stageId?: string;
  lessonNumber?: number;
  kanjiNumber?: number;
  kanji: string;
  character?: string;
  jlptLevel?: string;
  level?: string;
  strokeCount: number;
  radicals?: string;
  onyomi?: string;
  kunyomi?: string;
  sinoVietnamese: string;
  vietnameseMeaning: string;
  meaning_vi?: string;
  mnemonicStory?: string;
  exampleCompounds?: KanjiCompound[];
  sourceUrl?: string;
}

export interface KanjiUnit {
  unitId: string;
  unitTitle: string;
  subTitle?: string;
  lessonNumber?: number;
  itemCount: number;
  kanjiPreview?: Array<{ kanji: string; sino: string }>;
}

export interface KanjiBook {
  bookId: string;
  bookName: string;
  description: string;
  totalItems: number;
  units: KanjiUnit[];
}

export type KanjiCatalog = Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', KanjiBook[]>;

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

export interface VideoLesson {
  id: string;
  video_id?: string;
  originalId?: number;
  title: string;
  titleEn?: string;
  jlptLevel: string;
  category: string;
  channelName: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  segmentCount?: number;
  createdAt?: string;
}

export interface ChoukaiAudioItem {
  id: string;
  label: string;
  level: string;
  year?: number;
  month?: number;
  audioUrl: string;
  durationMinutes: number;
  totalQuestions?: number;
  actualQuestionCount?: number;
  listeningSetsCount?: number;
  questionSets?: QuestionSet[];
}
