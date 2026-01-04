export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  mode: 'learning' | 'chat';
  participants: string[];
  lastMessage?: ChatMessage;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  topicTracker?: { [key: string]: any }; 
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
    topic?: string; 
    isSolutionExplanation?: boolean;
  };
  mode?: 'learning' | 'chat';
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
  progress: UserProgress; 
}

export interface UserProgress {
  questionsAsked: number;
  hintsUsed: number;
  solutionsUnlocked: number;
  totalSessions: number;
  problemsTriedBeforeSolution: number;  
  hintsUsedThisWeek: number;            
  solutionsAfterEffort: number;         
  lastWeekReset: number;                
  effortScore: number;
}

export interface EffortStats {
  problemsTriedBeforeSolution: number;
  hintsUsedThisWeek: number;
  solutionsAfterEffort: number;
  effortScore: number;
  averageEffortPerSolution: number;     
}

