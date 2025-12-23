// ai.ts

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ClassificationResult, GeminiMode, QuestionType } from "./types";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("Missing API_KEY in environment");
}

const genAI = new GoogleGenerativeAI(apiKey);

// ---------- System prompts ----------

const CLASSIFICATION_SYSTEM_PROMPT = `
You are an expert educational classifier. Analyze the user's practice question and their attempt to solve it.
Evaluate:

1) questionType: one of 'conceptual', 'practice', 'homework', or 'exam'.
2) effortScore: an integer from 0 to 10.

Effort scoring guide:
- 0: No attempt, just asking for the answer (e.g. "give solution", "just code").
- 1-3: Minimal attempt, very short text, vague "how to do this", or just restating the question.
- 4-7: Genuine attempt with some logic, partial reasoning, or some code/steps but stuck.
- 8-10: Detailed reasoning, clear multi-step logic or substantial code, deep thinking.

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
- For DSA, describe the algorithm; add code in a popular language (Python/Java/C++) only if it genuinely helps.
- For math, show key calculations.
- Congratulate them briefly on their persistence.
`;

// ---------- Classification ----------

export const classifyAttempt = async (
  questionText: string,
  latestMessage: string,
  attemptCount: number
): Promise<ClassificationResult> => {
  const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite", // or whatever worked in your test
  systemInstruction: CLASSIFICATION_SYSTEM_PROMPT,
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        questionType: {
          type: SchemaType.STRING,
          // Remove enum here if it causes TS2322
        },
        effortScore: { type: SchemaType.INTEGER },
        mode: { type: SchemaType.STRING },
      },
      required: ["questionType", "effortScore", "mode"],
    },
  },
});

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Question: ${questionText}
Student's Latest Attempt: ${latestMessage}
Total Previous Attempts: ${attemptCount}

Classify the question type and effort.
`,
          },
        ],
      },
    ],
  });

  const text = result.response.text();
  const rawJson = JSON.parse(text || "{}") as ClassificationResult;

  // Safety: ensure questionType is typed correctly
  const qType = rawJson.questionType as QuestionType;
  rawJson.questionType = qType;

  // Custom override rule:
  const isHomeworkOrPractice = ["practice", "homework"].includes(qType);
  if (isHomeworkOrPractice && rawJson.effortScore <= 3 && attemptCount < 2) {
    rawJson.mode = GeminiMode.REFUSE_WITH_HINT;
  } else if (attemptCount >= 2) {
    // Force unlock after 2 attempts to avoid frustration
    rawJson.mode = GeminiMode.GIVE_SOLUTION;
  }

  return rawJson;
};

// ---------- Hint generation ----------

export const generateHint = async (
  questionText: string,
  latestMessage: string,
  history: string[]
): Promise<string> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: HINT_SYSTEM_PROMPT,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Original Question:
${questionText}

Student's Attempt:
${latestMessage}

Previous Conversation:
${history.join("\n")}

Give a short, helpful hint or ask a Socratic question.
`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.7 },
  });

  return result.response.text() || "Try thinking about the core constraints of the problem.";
};

// ---------- Full solution generation ----------

export const generateSolution = async (
  questionText: string,
  latestMessage: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: SOLUTION_SYSTEM_PROMPT,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Question:
${questionText}

Student's Final Effort:
${latestMessage}

Provide the full step-by-step solution.
`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.4 },
  });

  return result.response.text() || "Here is the solution to your problem...";
};
