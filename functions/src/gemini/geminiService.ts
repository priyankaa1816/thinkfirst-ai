// geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// ========== TYPES ==========
export interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: string; text: string }>;
  attemptNumber: number;
}

export interface ChatResponse {
  text: string;
  mode: string;
  isHint: boolean;
  isSolution: boolean;
}

interface ClassificationResult {
  questionType: 'conceptual' | 'practice' | 'homework' | 'exam';
  effortScore: number;
  mode: 'REFUSE_WITH_HINT' | 'GIVE_SOLUTION';
}

// ========== SYSTEM PROMPTS ==========
const CLASSIFICATION_SYSTEM_PROMPT = `
You are an expert educational classifier. Analyze the user's practice question and their attempt to solve it.

Evaluate:
1) questionType: one of "conceptual", "practice", "homework", or "exam".
2) effortScore: an integer from 0 to 10.

Effort scoring guide:
- 0: No attempt, just asking for the answer.
- 1-3: Minimal attempt.
- 4-7: Genuine attempt with some logic, partial reasoning, or some code.
- 8-10: Detailed reasoning, clear multi-step logic or substantial code.

Decision mode:
- If (questionType is "practice" or "homework")
  AND effortScore <= 3
  AND previousAttemptsCount < 2
  => mode = "REFUSE_WITH_HINT"
- Otherwise => mode = "GIVE_SOLUTION"

Return ONLY a JSON object with fields:
- questionType
- effortScore
- mode
`;

const HINT_SYSTEM_PROMPT = `
You are a Socratic tutor for Math and Data Structures & Algorithms.
The student is stuck on a question. Your goal is to guide them WITHOUT giving the final answer or full code.

Rules:
- Do NOT reveal the final numerical answer or full solution/code.
- Ask one leading question OR point out one specific issue in their thinking.
- Be encouraging but firm about not revealing the solution yet.
- Response should be 1–3 concise sentences.
`;

const SOLUTION_SYSTEM_PROMPT = `
You are a clear, step-by-step tutor.
The student has shown sufficient effort or met the unlock criteria.

Provide a complete solution:
- Briefly restate the goal.
- Give 3–6 numbered steps explaining the reasoning.
- For DSA, describe the algorithm; add code only if it genuinely helps.
- For math, show key calculations.
- Congratulate them briefly on their persistence.
`;

// ========== HELPER FUNCTIONS ==========
function safeParseClassification(text: string): ClassificationResult {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? match[0] : text;
    const parsed = JSON.parse(json) as Partial<ClassificationResult>;
    
    const questionType = (parsed.questionType as ClassificationResult['questionType']) ?? 'practice';
    const effortScore = typeof parsed.effortScore === 'number' ? parsed.effortScore : 1;
    const mode = (parsed.mode as ClassificationResult['mode']) ?? 'REFUSE_WITH_HINT';
    
    return { questionType, effortScore, mode };
  } catch (err) {
    console.error('Failed to parse classification JSON:', err, text);
    return {
      questionType: 'practice',
      effortScore: 1,
      mode: 'REFUSE_WITH_HINT',
    };
  }
}

// ========== MAIN SERVICE ==========
export const createGeminiService = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);

  const classifyAttempt = async (
    questionText: string,
    latestMessage: string,
    attemptCount: number
  ): Promise<ClassificationResult> => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: CLASSIFICATION_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'text/plain',
      },
    });

    const prompt = `
Question: ${questionText}
Student's Latest Attempt: ${latestMessage}
Total Previous Attempts: ${attemptCount}

Return ONLY a JSON object with:
{
  "questionType": "...",
  "effortScore": 0-10,
  "mode": "REFUSE_WITH_HINT" or "GIVE_SOLUTION"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('[classifyAttempt] Raw response:', text);
    
    const base = safeParseClassification(text || '');

    // Custom override rule
    const isHomeworkOrPractice = ['practice', 'homework'].includes(base.questionType);
    if (isHomeworkOrPractice && base.effortScore <= 3 && attemptCount < 2) {
      base.mode = 'REFUSE_WITH_HINT';
    } else if (attemptCount >= 2) {
      base.mode = 'GIVE_SOLUTION';
    }

    return base;
  };

  const generateHint = async (
    questionText: string,
    latestMessage: string,
    history: string[]
  ): Promise<string> => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: HINT_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.7 },
    });

    const prompt = `
Original Question:
${questionText}

Student's Attempt:
${latestMessage}

Previous Conversation:
${history.join('\n')}

Give a short, helpful hint or ask a Socratic question.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('[generateHint] Raw response:', text);
    
    return text || 'Try thinking about the core constraints of the problem.';
  };

  const generateSolution = async (
    questionText: string,
    latestMessage: string
  ): Promise<string> => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SOLUTION_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.4 },
    });

    const prompt = `
Question:
${questionText}

Student's Final Effort:
${latestMessage}

Provide the full step-by-step solution.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('[generateSolution] Raw response:', text);
    
    return text || 'Here is the solution to your problem...';
  };

  // ========== PUBLIC API ==========
  return {
    processChat: async (request: ChatRequest): Promise<ChatResponse> => {
      const { message, conversationHistory, attemptNumber } = request;

      // Extract question from first message or use current message
      const questionText = conversationHistory.length > 0 
        ? conversationHistory[0].text 
        : message;

      // Classify attempt
      const classification = await classifyAttempt(questionText, message, attemptNumber);

      let responseText: string;
      let isHint = false;
      let isSolution = false;

      if (classification.mode === 'REFUSE_WITH_HINT' && attemptNumber < 2) {
        responseText = await generateHint(
          questionText,
          message,
          conversationHistory.map(m => `${m.role}: ${m.text}`)
        );
        isHint = true;
      } else {
        responseText = await generateSolution(questionText, message);
        isSolution = true;
      }

      return {
        text: responseText,
        mode: classification.mode,
        isHint,
        isSolution,
      };
    },
  };
};
