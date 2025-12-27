// src/types/index.ts

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  questionText?: string;
  createdAt: number;
  updatedAt: number;
  mode?: 'learning' | 'general';
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  createdAt: number;
  senderId: string;  // ← ADD THIS LINE
  metadata?: {
    isHint?: boolean;
    isSolution?: boolean;
  };
  mode?: 'learning' | 'general';
}

export interface UserProgress {
  totalQuestions: number;
  hintsUsed: number;
  solutionsUnlocked: number;
  currentStreak: number;
}
