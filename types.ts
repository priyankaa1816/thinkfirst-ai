
export type QuestionType = 'conceptual' | 'practice' | 'homework' | 'exam';

export type EffortLevel = 'Low' | 'Medium' | 'High';

export interface Attempt {
  text: string;
  effortScore: number;
  timestamp: number;
}

export interface Session {
  id: string;
  userId: string;
  questionText: string;
  createdAt: number;
  unlocked: boolean;
  unlockedAt?: number;
  questionType?: QuestionType;
  attemptsCount: number;
  lastEffortScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  replyType?: 'HINT' | 'SOLUTION';
  effortScore?: number;
}

export enum GeminiMode {
  REFUSE_WITH_HINT = 'REFUSE_WITH_HINT',
  GIVE_SOLUTION = 'GIVE_SOLUTION'
}

export interface ClassificationResult {
  questionType: QuestionType;
  effortScore: number;
  mode: GeminiMode;
}
