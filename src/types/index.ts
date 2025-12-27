// src/types.ts
export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  mode: 'learning' | 'chat';
  participants: string[];
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;  // ← ADD THIS
  messageCount: number;  // ← ADD THIS
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  role: 'user' | 'ai';
  timestamp: number;
  createdAt: number;
  metadata?: {
    isHint?: boolean;
    isSolution?: boolean;
    detectedIntent?: string;
  };
  mode?: 'learning' | 'chat';
}
