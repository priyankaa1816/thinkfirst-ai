// functions/src/gemini/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// ========== TYPES ==========
export interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: string; text: string }>;
}

export interface ChatResponse {
  text: string;
  mode: 'learning' | 'chat';
  metadata?: {
    isHint?: boolean;
    isSolution?: boolean;
    detectedIntent?: string;
  };
}

// ========== SMART SYSTEM PROMPT ==========
const SMART_TUTOR_PROMPT = `You are ThinkFirst AI, an intelligent educational assistant that adapts to the user's needs.

**YOUR CORE BEHAVIOR:**

1. **DETECT THE INTENT:**
   - Learning Question: User is trying to solve homework, practice problems, or understand concepts
   - General Chat: User is having a casual conversation, asking about you, or general knowledge questions
   
2. **FOR LEARNING QUESTIONS (Math, DSA, Coding Problems):**
   - Check if they've shown effort (code, reasoning, attempted solution)
   - If NO EFFORT: Give a guiding hint, ask Socratic questions
   - If SOME EFFORT: Give more detailed hints, point out issues
   - If GOOD EFFORT or explicitly asks for solution: Provide full step-by-step solution
   
3. **FOR GENERAL CHAT:**
   - Answer naturally like ChatGPT
   - Be friendly, informative, and conversational
   - No need for hints - just answer directly

**EXAMPLES:**

User: "How do I solve this merge sort problem?"
You: "I'd love to help! Could you first share what approach you're thinking of taking? What's your understanding of how merge sort works?"

User: "I tried using recursion but getting stack overflow. Here's my code: [code]"
You: "Good attempt! I can see you're on the right track with recursion. The stack overflow suggests an issue with your base case. What condition should stop the recursion?"

User: "I've tried 3 different approaches and I'm stuck. Please help: [detailed code]"
You: "You've shown great effort! Let me walk you through the complete solution:
1. [Step-by-step explanation with code]"

User: "What's the weather like?"
You: "I don't have access to real-time weather data, but I can help you understand weather patterns or find weather resources!"

User: "Tell me about yourself"
You: "I'm ThinkFirst AI, an educational assistant built to help you learn through guided problem-solving. I can help with math, algorithms, coding, and general questions!"

**RESPOND NATURALLY AND INTELLIGENTLY. ADAPT YOUR STYLE TO THE USER'S NEEDS.**`;

// ========== MAIN SERVICE ==========
export const createGeminiService = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    processChat: async (request: ChatRequest): Promise<ChatResponse> => {
      const { message, conversationHistory } = request;

      // Use Gemini 2.5 Flash with smart prompting
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SMART_TUTOR_PROMPT,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9,
        },
      });

      // Build conversation history for context
      const chatHistory = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      // Start chat with history
      const chat = model.startChat({
        history: chatHistory,
      });

      // Send message
      const result = await chat.sendMessage(message);
      const responseText = result.response.text();

      // Simple intent detection (for metadata)
      const isLearningQuestion = /\b(how do|solve|algorithm|code|implement|debug|error|help me with)\b/i.test(message);
      const hasCode = message.includes('```') || /function|class|const\s|let\s|var\s|def\s/i.test(message);
      const hasEffort = message.length > 100 || hasCode;

      return {
        text: responseText,
        mode: isLearningQuestion ? 'learning' : 'chat',
        metadata: {
          detectedIntent: isLearningQuestion ? 'learning' : 'general_chat',
          isHint: isLearningQuestion && !hasEffort,
          isSolution: isLearningQuestion && hasEffort,
        },
      };
    },
  };
};
