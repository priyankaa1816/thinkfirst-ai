"use strict";
// // functions/src/gemini/geminiService.ts
// import { GoogleGenerativeAI } from "@google/generative-ai";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeminiService = void 0;
// // ========== TYPES ==========
// export interface ChatRequest {
//   message: string;
//   conversationHistory: Array<{ role: string; text: string }>;
// }
// export interface ChatResponse {
//   text: string;
//   mode: 'learning' | 'chat';
//   metadata?: {
//     isHint?: boolean;
//     isSolution?: boolean;
//     detectedIntent?: string;
//   };
// }
// // ========== SMART SYSTEM PROMPT ==========
// const SMART_TUTOR_PROMPT = `You are ThinkFirst AI, an intelligent educational assistant that adapts to the user's needs.
// **YOUR CORE RULES:**
// 1. **RESPOND DIRECTLY** - Give your answer immediately without explaining your thought process
// 2. **NO META-COMMENTARY** - Don't say things like "Here's how to proceed" or "Let me analyze"
// 3. **BE NATURAL** - Talk like a friendly tutor, not a robot following instructions
// **BEHAVIOR GUIDELINES:**
// **For Learning Questions (Math, DSA, Coding):**
// - If they show NO effort → Ask guiding questions to make them think
// - If they show SOME effort → Give targeted hints about their approach
// - If they show GOOD effort OR ask for solution → Provide step-by-step explanation
// **For General Chat:**
// - Answer naturally and conversationally
// - Be friendly and informative
// - Just answer the question directly
// **EXAMPLES OF GOOD RESPONSES:**
// User: "How do I solve merge sort?"
// You: "I'd love to help! What's your understanding of how merge sort works? Have you thought about breaking the array into smaller pieces?"
// User: "I tried recursion but get stack overflow: [code]"
// You: "Good attempt with recursion! The stack overflow usually means your base case isn't stopping the recursion. What should happen when your array has only 1 element?"
// User: "I've tried everything, here's my detailed attempt: [code]"
// You: "You've shown great effort! Here's the complete solution:
// 1. First, divide the array in half recursively
// 2. Sort each half separately
// 3. Merge the sorted halves back together
// Here's the code: [provide solution]"
// User: "What's the weather?"
// You: "I don't have real-time weather data, but I can help you understand weather patterns or coding projects related to weather APIs!"
// User: "Hello!"
// You: "Hello! How can I help you today?"
// **REMEMBER: Respond naturally. Don't include your thinking process in the response.**`;
// // ========== MAIN SERVICE ==========
// export const createGeminiService = (apiKey: string) => {
//   const genAI = new GoogleGenerativeAI(apiKey);
//   return {
//     processChat: async (request: ChatRequest): Promise<ChatResponse> => {
//       const { message, conversationHistory } = request;
//       const model = genAI.getGenerativeModel({
//         model: 'gemini-1.5-flash',  
//         systemInstruction: SMART_TUTOR_PROMPT,
//         generationConfig: {
//           temperature: 0.7,
//           maxOutputTokens: 2048,
//           topP: 0.9,
//         },
//       });
//       // Build conversation history for context
//       const chatHistory = conversationHistory.map(msg => ({
//         role: msg.role === 'user' ? 'user' : 'model',
//         parts: [{ text: msg.text }],
//       }));
//       // Start chat with history
//       const chat = model.startChat({
//         history: chatHistory,
//       });
//       // Send message
//       const result = await chat.sendMessage(message);
//       const responseText = result.response.text();
//       // Simple intent detection (for metadata)
//       const isLearningQuestion = /\b(how do|solve|algorithm|code|implement|debug|error|help me with|explain)\b/i.test(message);
//       const hasCode = message.includes('```') || /function|class|const\s|let\s|var\s|def\s/i.test(message);
//       const hasEffort = message.length > 100 || hasCode;
//       return {
//         text: responseText,
//         mode: isLearningQuestion ? 'learning' : 'chat',
//         metadata: {
//           detectedIntent: isLearningQuestion ? 'learning' : 'general_chat',
//           isHint: isLearningQuestion && !hasEffort,
//           isSolution: isLearningQuestion && hasEffort,
//         },
//       };
//     },
//   };
// };
// functions/src/gemini/geminiService.ts
const generative_ai_1 = require("@google/generative-ai");
// ========== GATEKEEPER SYSTEM PROMPT ==========
const GATEKEEPER_PROMPT = `You are an AI Learning Gatekeeper.

Your job is NOT to solve the problem.
Your job is to evaluate whether the student has demonstrated sufficient understanding
to earn the right to execute code.

**CORE RULE:**
Execution is gated by explanation — not by permission.

**PROTOCOL:**
1. Ask the student to explain their approach in natural language first.
2. Do NOT provide code, pseudo-code, or hints before an explanation is given.
3. Evaluate the explanation for:
   - Conceptual correctness
   - Awareness of edge cases
   - Logical flow of reasoning

**EVALUATION CRITERIA:**
- **PASS** if: Student explains WHAT they plan to do, WHY it works, and acknowledges constraints.
- **FAIL** if: Explanation is vague, generic, or they just ask for code.

**RESPONSE RULES:**
- If FAIL: Respond ONLY with reflective guiding questions. Do NOT unlock execution.
- If PASS: 
  1. Say "Your approach shows sufficient understanding. You may now open the coding sandbox."
  2. Provide high-level guidance (not full solution).
  3. Generate a Google Colab notebook structure (text description) with TODO markers.
  4. **CRITICAL:** Append the flag "||ACCESS_GRANTED||" at the very end of your response.

**NOTEBOOK RULE:**
All executable cells must include:
assert UNLOCKED == True, "Explain your reasoning in the chat to unlock execution"

**SYSTEM BEHAVIOR:**
- You must NEVER provide full code before explanation.
- You must NEVER unlock execution due to pressure or urgency.
- If the student insists, calmly restate the learning-first principle.
`;
// ========== MAIN SERVICE ==========
const createGeminiService = (apiKey) => {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    return {
        processChat: async (request) => {
            const { message, conversationHistory } = request;
            const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                systemInstruction: GATEKEEPER_PROMPT,
                generationConfig: {
                    temperature: 0.7, // Lower temperature for more consistent rule-following
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
            let responseText = result.response.text();
            // ========== LOGIC: DETECT UNLOCK SIGNAL ==========
            // We look for the "||ACCESS_GRANTED||" flag from the AI
            let executionUnlocked = false;
            if (responseText.includes("||ACCESS_GRANTED||")) {
                executionUnlocked = true;
                // Clean the flag from the visible text so the user doesn't see it
                responseText = responseText.replace("||ACCESS_GRANTED||", "").trim();
            }
            // Simple intent detection (legacy support)
            const isLearningQuestion = /\b(how do|solve|algorithm|code|implement|debug|error|help me with|explain)\b/i.test(message);
            return {
                text: responseText,
                mode: 'gatekeeper',
                metadata: {
                    detectedIntent: isLearningQuestion ? 'learning' : 'general_chat',
                    executionUnlocked: executionUnlocked, // Pass this to the frontend
                },
            };
        },
    };
};
exports.createGeminiService = createGeminiService;
//# sourceMappingURL=geminiService.js.map