import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";

admin.initializeApp();

const getApiKey = (): string => {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) {
    console.log('✅ Using Gemini API key from .env');
    return envKey;
  }
  
  const configKey = functions.config().gemini?.api_key;
  if (!configKey) {
    throw new Error('GEMINI_API_KEY not configured in .env or Firebase config');
  }
  
  console.log('✅ Using Gemini API key from Firebase config');
  return configKey;
};

// ==================== REAL-TIME DATA FUNCTIONS ====================

async function fetchWeather(city: string, country: string = "IN"): Promise<any> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY || functions.config().weather?.api_key;
    if (!apiKey) {
      console.warn('⚠️ Weather API key not configured');
      return { error: "Weather API not configured" };
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=metric`;
    console.log('🌤️ Fetching weather for:', city);
    const response = await axios.get(url);
    
    return {
      temperature: response.data.main.temp,
      feelsLike: response.data.main.feels_like,
      condition: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      city: response.data.name,
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return { error: "Unable to fetch weather data" };
  }
}

async function fetchNews(query: string): Promise<any> {
  try {
    const apiKey = process.env.NEWS_API_KEY || functions.config().news?.api_key;
    if (!apiKey) {
      console.warn('⚠️ News API key not configured');
      return { error: "News API not configured" };
    }
    
    const url = `https://newsapi.org/v2/top-headlines?q=${query}&apiKey=${apiKey}`;
    console.log('📰 Fetching news for:', query);
    const response = await axios.get(url);
    
    const headlines = response.data.articles.slice(0, 3).map((article: any) => ({
      title: article.title,
      description: article.description,
    }));
    
    return { headlines };
  } catch (error) {
    console.error('News API error:', error);
    return { error: "Unable to fetch news data" };
  }
}

// ==================== ATTEMPT TRACKING ====================

interface ConversationContext {
  currentTopic: string | null;
  attemptCount: number;
  isLearningMode: boolean;
}

function analyzeContext(
  message: string,
  conversationHistory: any[],
  previousContext?: ConversationContext
): ConversationContext {
  const msgLower = message.toLowerCase().trim();
  
  // ============ PRIORITY CHECK: REAL-TIME DATA REQUESTS ============
  // CHANGE 1: Check for real-time data requests FIRST (before learning mode)
  const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
  const newsPatterns = ["news", "today's news", "latest news", "current events", "headlines", "what's happening", "news update"];
  
  const isWeatherRequest = weatherPatterns.some(p => msgLower.includes(p));
  const isNewsRequest = newsPatterns.some(p => msgLower.includes(p));
  
  if (isWeatherRequest || isNewsRequest) {
    console.log('🌐 Real-time data request detected - staying in chat mode');
    return { 
      currentTopic: null, 
      attemptCount: 0, 
      isLearningMode: false  // Force chat mode for real-time requests
    };
  }
  // ============ END PRIORITY CHECK ============
  
  // Phrases that indicate user wants solution directly (NOT an attempt)
  const solutionRequestPhrases = [
    "give me the answer",
    "give the answer",
    "just give me",
    "give me solution",
    "give the solution",
    "show me the answer",
    "show the solution",
    "what is the solution",
    "what's the solution",
    "tell me the solution",
    "just show me",
    "just tell me"
  ];
  const isAskingForSolution = solutionRequestPhrases.some(phrase => msgLower.includes(phrase));
  
  // Phrases indicating genuine attempt/confusion (should increment)
  const attemptPhrases = [
    "i tried",
    "i think",
    "maybe",
    "is it",
    "would it be",
    "should i",
    "idk",
    "i don't know",
    "not sure",
    "i'm stuck",
    "can't figure"
  ];
  const isGenuineAttempt = attemptPhrases.some(phrase => msgLower.includes(phrase));
  
  // Phrases indicating returning to previous topic
  const backToPreviousPhrases = [
    "back to",
    "return to",
    "again about",
    "still don't get"
  ];
  const isReturningToPrevious = backToPreviousPhrases.some(phrase => msgLower.includes(phrase));
  
  // Learning keywords indicate NEW question
  const learningKeywords = [
    "how do i",
    "how to",
    "how about",
    "what about",
    "explain",
    "solve",
    "algorithm for",
    "solution for",
    "implement"
  ];
  const isNewLearningQuestion = learningKeywords.some(kw => msgLower.includes(kw));
  
  // Follow-up keywords indicate question about SAME topic (not attempt)
  const followUpKeywords = [
    "time complexity",
    "space complexity",
    "complexity",
    "why does this",
    "why is",
    "can you explain more",
    "what do you mean",
    "how does that",
    "give me a hint",
    "give hint",
    "another hint"
  ];
  const isFollowUp = followUpKeywords.some(kw => msgLower.includes(kw));
  
  // General chat patterns
  const chatKeywords = ["hello", "hi", "hey", "thanks", "thank you", "okay", "ok", "got it", "cool"];
  const isGeneralChat = chatKeywords.some(kw => msgLower === kw || msgLower.startsWith(kw + " ") || msgLower.startsWith(kw + "!"));
  
  // Extract topic from message
  const extractTopic = (msg: string): string => {
    const words = msg.toLowerCase().split(" ");
    const stopWords = ["how", "to", "the", "a", "an", "what", "is", "explain", "can", "you", "i", "do", "about", "for"];
    const meaningful = words.filter(w => !stopWords.includes(w) && w.length > 3);
    return meaningful.slice(0, 3).join(" ");
  };
  
  // DECISION LOGIC
  
  // 1. General chat - reset everything
  if (isGeneralChat && !isNewLearningQuestion) {
    console.log('💬 Detected: General chat');
    return { currentTopic: null, attemptCount: 0, isLearningMode: false };
  }
  
  // 2. New learning question - reset topic and attempts
  if (isNewLearningQuestion && !isReturningToPrevious) {
    const newTopic = extractTopic(message);
    console.log('📚 Detected: New learning question -', newTopic);
    return {
      currentTopic: newTopic,
      attemptCount: 0,
      isLearningMode: true,
    };
  }
  
  // 3. Returning to previous topic mentioned in history
  if (isReturningToPrevious && conversationHistory.length > 0) {
    // Try to find the previous topic from history
    const previousTopics = conversationHistory
      .filter((msg: any) => msg.role === 'user')
      .map((msg: any) => extractTopic(msg.text))
      .filter((topic: string) => topic.length > 0);
    
    if (previousTopics.length > 0) {
      // Get the most relevant previous topic
      const relevantTopic = previousTopics.find((topic: string) => 
        msgLower.includes(topic.split(' ')[0])
      ) || previousTopics[previousTopics.length - 2]; // Second to last topic
      
      console.log('🔄 Detected: Returning to previous topic -', relevantTopic);
      return {
        currentTopic: relevantTopic,
        attemptCount: 0, // Reset attempts when returning
        isLearningMode: true,
      };
    }
  }
  
  // 4. Follow-up question or hint request - SAME topic, SAME attempt count
  if (isFollowUp && previousContext?.currentTopic) {
    console.log('❓ Detected: Follow-up question (no increment)');
    return {
      currentTopic: previousContext.currentTopic,
      attemptCount: previousContext.attemptCount, // Don't increment
      isLearningMode: true,
    };
  }
  
  // 5. Asking for solution directly - increment ONLY once, then give solution
  if (isAskingForSolution && previousContext?.isLearningMode) {
    console.log('🎯 Detected: Direct solution request');
    // Set attempt to 3 to trigger full solution
    return {
      currentTopic: previousContext.currentTopic,
      attemptCount: Math.max(previousContext.attemptCount, 3), // Jump to solution
      isLearningMode: true,
    };
  }
  
  // 6. Genuine attempt at solving - increment attempts
  if (isGenuineAttempt && previousContext?.isLearningMode && previousContext?.currentTopic) {
    console.log('✍️ Detected: Genuine attempt (increment)');
    return {
      currentTopic: previousContext.currentTopic,
      attemptCount: previousContext.attemptCount + 1,
      isLearningMode: true,
    };
  }
  
  // 7. User providing a substantive answer (longer than 10 chars, in learning mode)
  if (previousContext?.isLearningMode && 
      previousContext?.currentTopic && 
      !isFollowUp && 
      !isAskingForSolution &&
      message.length > 10) {
    console.log('📝 Detected: Substantive response (increment)');
    return {
      currentTopic: previousContext.currentTopic,
      attemptCount: previousContext.attemptCount + 1,
      isLearningMode: true,
    };
  }
  
  // 8. Default: maintain context
  console.log('🔄 Maintaining previous context');
  return previousContext || { currentTopic: null, attemptCount: 0, isLearningMode: false };
}

// ==================== MAIN FUNCTION ====================

export const chat = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  
  try {
    const { message, conversationHistory, conversationContext } = req.body;
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Invalid message' });
      return;
    }
    
    if (!Array.isArray(conversationHistory)) {
      res.status(400).json({ error: 'Invalid conversation history' });
      return;
    }
    
    // Analyze conversation context
    const currentContext = analyzeContext(message, conversationHistory, conversationContext);
    
    console.log('📊 Context Analysis:', {
      message: message.substring(0, 50),
      currentTopic: currentContext.currentTopic,
      attemptCount: currentContext.attemptCount,
      isLearningMode: currentContext.isLearningMode
    });
    
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    // ==================== ENHANCED REAL-TIME DATA DETECTION ====================
    let realTimeData = "";
    const msgLower = message.toLowerCase();
    
    // Weather detection (more patterns)
    const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
    if (weatherPatterns.some(pattern => msgLower.includes(pattern))) {
      console.log('🌤️ Weather request detected');
      
      // Extract city from message (improved)
      let city = "Delhi"; // default
      const cityMatch = message.match(/in\s+([A-Za-z]+)/i) || 
                        message.match(/at\s+([A-Za-z]+)/i) ||
                        message.match(/weather\s+([A-Za-z]+)/i) ||
                        message.match(/([A-Z][a-z]+)\s+weather/i);
      
      if (cityMatch) {
        city = cityMatch[1];
      }
      
      const weatherData = await fetchWeather(city);
      console.log('🌤️ Weather data:', weatherData);
      
      if (!weatherData.error) {
        realTimeData = `\n\n[REAL-TIME WEATHER DATA - USE THIS IN YOUR RESPONSE]
Current weather in ${weatherData.city}: 
- Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feelsLike}°C)
- Condition: ${weatherData.condition}
- Humidity: ${weatherData.humidity}%

Respond naturally using this information. Don't say you don't have access to real-time data!`;
      } else {
        console.error('Weather API failed:', weatherData.error);
      }
    }
    
    // News detection (more patterns)
    const newsPatterns = ["news", "latest", "current events", "happening", "today's", "recent"];
    if (newsPatterns.some(pattern => msgLower.includes(pattern)) && !msgLower.includes("weather")) {
      console.log('📰 News request detected');
      
      const query = message.replace(/news|latest|about|what's|today's|recent/gi, "").trim() || "technology";
      const newsData = await fetchNews(query);
      console.log('📰 News data:', newsData);
      
      if (!newsData.error && newsData.headlines && newsData.headlines.length > 0) {
        const headlinesList = newsData.headlines
          .map((h: any, i: number) => `${i + 1}. ${h.title}`)
          .join('\n');
        
        realTimeData = `\n\n[REAL-TIME NEWS DATA - USE THIS IN YOUR RESPONSE]
Latest news headlines:
${headlinesList}

Respond naturally using these headlines. Don't say you don't have access to real-time data!`;
      } else {
        console.error('News API failed:', newsData.error);
      }
    }
    
    // Build enhanced system prompt
    let systemPrompt = `You are ThinkFirst AI, an intelligent educational assistant that adapts to the user's needs.

**YOUR CORE RULES:**
1. **RESPOND DIRECTLY** - Give your answer immediately without explaining your thought process
2. **NO META-COMMENTARY** - Don't say things like "Here's how to proceed"
3. **BE NATURAL** - Talk like a friendly tutor, not a robot
4. **USE REAL-TIME DATA** - When real-time data is provided in [REAL-TIME DATA] sections, YOU MUST use it naturally in your response. NEVER say "I don't have access to real-time data" when data is provided.

**BEHAVIOR:**

**For General Chat:**
- Answer naturally and conversationally
- Be friendly and helpful`;
    
    if (currentContext.isLearningMode) {
      const { attemptCount, currentTopic } = currentContext;
      
      systemPrompt += `

**CURRENT MODE: LEARNING MODE**
Topic: "${currentTopic}"
Attempt: ${attemptCount}

**PROGRESSIVE GUIDANCE:**
`;
      
      if (attemptCount === 0) {
        systemPrompt += `- This is the FIRST interaction with this topic
- Give a conceptual hint that makes them think
- Ask guiding questions to assess their understanding
- Set isHint: true, isSolution: false, mode: "learning"`;
      } else if (attemptCount === 1) {
        systemPrompt += `- This is attempt ${attemptCount} (SECOND attempt)
- Provide stronger hints with techniques or approaches
- Point toward relevant concepts/algorithms
- Set isHint: true, isSolution: false, mode: "learning"`;
      } else if (attemptCount === 2) {
        systemPrompt += `- This is attempt ${attemptCount} (THIRD attempt)
- Give pseudocode or step-by-step roadmap
- Be explicit about the approach
- Set isHint: true, isSolution: false, mode: "learning"`;
      } else {
        systemPrompt += `- This is attempt ${attemptCount} (FOURTH+ attempt or direct solution request)
- Provide COMPLETE solution with detailed explanation
- Include code examples with proper syntax
- Explain WHY each step works
- Set isHint: false, isSolution: true, mode: "learning"`;
      }
      
      systemPrompt += `

**IMPORTANT:** If user asks a follow-up question about complexity or clarification, answer directly without treating it as a new attempt.`;
    }
    
    // Build conversation history
    const historyString = conversationHistory
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`)
      .join('\n');
    
    const prompt = historyString
      ? `${historyString}\n\nUser: ${message}${realTimeData}`
      : `User: ${message}${realTimeData}`;
    
    console.log('📝 Has real-time data:', realTimeData.length > 0);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            mode: { type: Type.STRING, enum: ['learning', 'chat'] },
            isHint: { type: Type.BOOLEAN },
            isSolution: { type: Type.BOOLEAN }
          },
          required: ["text", "mode", "isHint", "isSolution"]
        }
      }
    });
    
    const result = JSON.parse(response.text || '{}');
    
    // Return response with updated context
    res.status(200).json({
      ...result,
      conversationContext: currentContext,
    });
    
  } catch (error: any) {
    functions.logger.error("Chat Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message || "Unknown error"
    });
  }
});


// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
// import { GoogleGenAI, Type } from "@google/genai";
// import axios from "axios";

// admin.initializeApp();

// const getApiKey = (): string => {
//   const envKey = process.env.GEMINI_API_KEY;
//   if (envKey) {
//     console.log('✅ Using Gemini API key from .env');
//     return envKey;
//   }
  
//   const configKey = functions.config().gemini?.api_key;
//   if (!configKey) {
//     throw new Error('GEMINI_API_KEY not configured in .env or Firebase config');
//   }
  
//   console.log('✅ Using Gemini API key from Firebase config');
//   return configKey;
// };

// // ==================== REAL-TIME DATA FUNCTIONS ====================

// async function fetchWeather(city: string, country: string = "IN"): Promise<any> {
//   try {
//     const apiKey = process.env.OPENWEATHER_API_KEY || functions.config().weather?.api_key;
//     if (!apiKey) {
//       console.warn('⚠️ Weather API key not configured');
//       return { error: "Weather API not configured" };
//     }
    
//     const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=metric`;
//     console.log('🌤️ Fetching weather for:', city);
//     const response = await axios.get(url);
    
//     return {
//       temperature: response.data.main.temp,
//       feelsLike: response.data.main.feels_like,
//       condition: response.data.weather[0].description,
//       humidity: response.data.main.humidity,
//       city: response.data.name,
//     };
//   } catch (error) {
//     console.error('Weather API error:', error);
//     return { error: "Unable to fetch weather data" };
//   }
// }

// async function fetchNews(query: string): Promise<any> {
//   try {
//     const apiKey = process.env.NEWS_API_KEY || functions.config().news?.api_key;
//     if (!apiKey) {
//       console.warn('⚠️ News API key not configured');
//       return { error: "News API not configured" };
//     }
    
//     const url = `https://newsapi.org/v2/top-headlines?q=${query}&apiKey=${apiKey}`;
//     console.log('📰 Fetching news for:', query);
//     const response = await axios.get(url);
    
//     const headlines = response.data.articles.slice(0, 3).map((article: any) => ({
//       title: article.title,
//       description: article.description,
//     }));
    
//     return { headlines };
//   } catch (error) {
//     console.error('News API error:', error);
//     return { error: "Unable to fetch news data" };
//   }
// }

// // ==================== ATTEMPT TRACKING ====================

// interface ConversationContext {
//   currentTopic: string | null;
//   attemptCount: number;
//   isLearningMode: boolean;
//   problemStartTime?: number;
//   lastAttemptTime?: number;
//   thinkingTimeSeconds?: number;
//   timeTravelEnabled?: boolean; // NEW: User preference for time-locked hints
// }

// function analyzeContext(
//   message: string,
//   conversationHistory: any[],
//   previousContext?: ConversationContext
// ): ConversationContext {
//   const msgLower = message.toLowerCase().trim();
//   const now = Date.now();
  
//   // ============ PRIORITY CHECK: REAL-TIME DATA REQUESTS ============
//   // CHANGE 1: Check for real-time data requests FIRST (before learning mode)
//   const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
//   const newsPatterns = ["news", "today's news", "latest news", "current events", "headlines", "what's happening", "news update"];
  
//   const isWeatherRequest = weatherPatterns.some(p => msgLower.includes(p));
//   const isNewsRequest = newsPatterns.some(p => msgLower.includes(p));
  
//   if (isWeatherRequest || isNewsRequest) {
//     console.log('🌐 Real-time data request detected - staying in chat mode');
//     return { 
//       currentTopic: null, 
//       attemptCount: 0, 
//       isLearningMode: false  // Force chat mode for real-time requests
//     };
//   }
//   // ============ END PRIORITY CHECK ============
  
//   // Phrases that indicate user wants solution directly (NOT an attempt)
//   const solutionRequestPhrases = [
//     "give me the answer",
//     "give the answer",
//     "just give me",
//     "give me solution",
//     "give the solution",
//     "show me the answer",
//     "show the solution",
//     "what is the solution",
//     "what's the solution",
//     "tell me the solution",
//     "just show me",
//     "just tell me"
//   ];
//   const isAskingForSolution = solutionRequestPhrases.some(phrase => msgLower.includes(phrase));
  
//   // Phrases indicating genuine attempt/confusion (should increment)
//   const attemptPhrases = [
//     "i tried",
//     "i think",
//     "maybe",
//     "is it",
//     "would it be",
//     "should i",
//     "idk",
//     "i don't know",
//     "not sure",
//     "i'm stuck",
//     "can't figure"
//   ];
//   const isGenuineAttempt = attemptPhrases.some(phrase => msgLower.includes(phrase));
  
//   // Phrases indicating returning to previous topic
//   const backToPreviousPhrases = [
//     "back to",
//     "return to",
//     "again about",
//     "still don't get"
//   ];
//   const isReturningToPrevious = backToPreviousPhrases.some(phrase => msgLower.includes(phrase));
  
//   // Learning keywords indicate NEW question
//   const learningKeywords = [
//     "how do i",
//     "how to",
//     "how about",
//     "what about",
//     "explain",
//     "solve",
//     "algorithm for",
//     "solution for",
//     "implement"
//   ];
//   const isNewLearningQuestion = learningKeywords.some(kw => msgLower.includes(kw));
  
//   // Follow-up keywords indicate question about SAME topic (not attempt)
//   const followUpKeywords = [
//     "time complexity",
//     "space complexity",
//     "complexity",
//     "why does this",
//     "why is",
//     "can you explain more",
//     "what do you mean",
//     "how does that",
//     "give me a hint",
//     "give hint",
//     "another hint"
//   ];
//   const isFollowUp = followUpKeywords.some(kw => msgLower.includes(kw));
  
//   // General chat patterns
//   const chatKeywords = ["hello", "hi", "hey", "thanks", "thank you", "okay", "ok", "got it", "cool"];
//   const isGeneralChat = chatKeywords.some(kw => msgLower === kw || msgLower.startsWith(kw + " ") || msgLower.startsWith(kw + "!"));
  
//   // Extract topic from message
//   const extractTopic = (msg: string): string => {
//     const words = msg.toLowerCase().split(" ");
//     const stopWords = ["how", "to", "the", "a", "an", "what", "is", "explain", "can", "you", "i", "do", "about", "for"];
//     const meaningful = words.filter(w => !stopWords.includes(w) && w.length > 3);
//     return meaningful.slice(0, 3).join(" ");
//   };
  
//   // Preserve timeTravelEnabled preference from previous context
//   const timeTravelEnabled = previousContext?.timeTravelEnabled || false;
  
//   // DECISION LOGIC
  
//   // 1. General chat - reset everything
//   if (isGeneralChat && !isNewLearningQuestion) {
//     console.log('💬 Detected: General chat');
//     return { currentTopic: null, attemptCount: 0, isLearningMode: false };
//   }
  
//   // 2. New learning question - START TIMER HERE
//  // 2. New learning question - START TIMER ONLY IF TOGGLE IS ON
// if (isNewLearningQuestion && !isReturningToPrevious) {
//   const newTopic = extractTopic(message);
//   console.log('📚 Detected: New learning question -', newTopic);
  
//   // ⏱️ FIXED: Only set start time if time travel is enabled
//   const startTime = timeTravelEnabled ? now : 0;
  
//   return {
//     currentTopic: newTopic,
//     attemptCount: 0,
//     isLearningMode: true,
//     problemStartTime: startTime, // ← Only tracks if toggle ON
//     lastAttemptTime: startTime,
//     thinkingTimeSeconds: 0,
//     timeTravelEnabled,
//   };
// }

  
//   // 3. Returning to previous topic mentioned in history
//   if (isReturningToPrevious && conversationHistory.length > 0) {
//     // Try to find the previous topic from history
//     const previousTopics = conversationHistory
//       .filter((msg: any) => msg.role === 'user')
//       .map((msg: any) => extractTopic(msg.text))
//       .filter((topic: string) => topic.length > 0);
    
//     if (previousTopics.length > 0) {
//       // Get the most relevant previous topic
//       const relevantTopic = previousTopics.find((topic: string) => 
//         msgLower.includes(topic.split(' ')[0])
//       ) || previousTopics[previousTopics.length - 2]; // Second to last topic
      
//       console.log('🔄 Detected: Returning to previous topic -', relevantTopic);
//       return {
//         currentTopic: relevantTopic,
//         attemptCount: 0, // Reset attempts when returning
//         isLearningMode: true,
//         problemStartTime: now,
//         lastAttemptTime: now,
//         thinkingTimeSeconds: 0,
//         timeTravelEnabled,
//       };
//     }
//   }
  
//   // 4. Follow-up question or hint request - SAME topic, SAME attempt count, UPDATE time
//   // 4. Follow-up question - ONLY calculate time if toggle is ON
// if (isFollowUp && previousContext?.currentTopic) {
//   console.log('❓ Detected: Follow-up question (no increment)');
  
//   // ⏱️ FIXED: Only track time if time travel enabled
//   let updatedThinkingTime = previousContext.thinkingTimeSeconds || 0;
//   if (timeTravelEnabled && previousContext.lastAttemptTime) {
//     const timeSinceLastAttempt = (now - previousContext.lastAttemptTime) / 1000;
//     updatedThinkingTime += timeSinceLastAttempt;
//   }
  
//   return {
//     currentTopic: previousContext.currentTopic,
//     attemptCount: previousContext.attemptCount,
//     isLearningMode: true,
//     problemStartTime: previousContext.problemStartTime,
//     lastAttemptTime: now,
//     thinkingTimeSeconds: updatedThinkingTime,
//     timeTravelEnabled,
//   };
// }

  
//   // 5. Asking for solution directly - increment ONLY once, then give solution
// // 5. Asking for solution - ONLY calculate time if toggle is ON
// if (isAskingForSolution && previousContext?.isLearningMode) {
//   console.log('🎯 Detected: Direct solution request');
  
//   // ⏱️ FIXED: Only track time if time travel enabled
//   let updatedThinkingTime = previousContext.thinkingTimeSeconds || 0;
//   if (timeTravelEnabled && previousContext.lastAttemptTime) {
//     const timeSinceLastAttempt = (now - previousContext.lastAttemptTime) / 1000;
//     updatedThinkingTime += timeSinceLastAttempt;
//   }
  
//   return {
//     currentTopic: previousContext.currentTopic,
//     attemptCount: Math.max(previousContext.attemptCount, 4), // ← CHANGED 3 to 4
//     isLearningMode: true,
//     problemStartTime: previousContext.problemStartTime,
//     lastAttemptTime: now,
//     thinkingTimeSeconds: updatedThinkingTime,
//     timeTravelEnabled,
//   };
// }

  
//   // 6. Genuine attempt at solving - increment attempts + UPDATE time
//   // 6. Genuine attempt - ONLY calculate time if toggle is ON
// if (isGenuineAttempt && previousContext?.isLearningMode && previousContext?.currentTopic) {
//   console.log('✍️ Detected: Genuine attempt (increment)');
  
//   // ⏱️ FIXED: Only track time if time travel enabled
//   let updatedThinkingTime = previousContext.thinkingTimeSeconds || 0;
//   if (timeTravelEnabled && previousContext.lastAttemptTime) {
//     const timeSinceLastAttempt = (now - previousContext.lastAttemptTime) / 1000;
//     updatedThinkingTime += timeSinceLastAttempt;
//   }
  
//   return {
//     currentTopic: previousContext.currentTopic,
//     attemptCount: previousContext.attemptCount + 1,
//     isLearningMode: true,
//     problemStartTime: previousContext.problemStartTime,
//     lastAttemptTime: now,
//     thinkingTimeSeconds: updatedThinkingTime,
//     timeTravelEnabled,
//   };
// }

  
//   // 7. User providing a substantive answer (longer than 10 chars, in learning mode)
//  // 7. Substantive response - ONLY calculate time if toggle is ON
// if (previousContext?.isLearningMode && 
//     previousContext?.currentTopic && 
//     !isFollowUp && 
//     !isAskingForSolution &&
//     message.length > 10) {
//   console.log('📝 Detected: Substantive response (increment)');
  
//   // ⏱️ FIXED: Only track time if time travel enabled
//   let updatedThinkingTime = previousContext.thinkingTimeSeconds || 0;
//   if (timeTravelEnabled && previousContext.lastAttemptTime) {
//     const timeSinceLastAttempt = (now - previousContext.lastAttemptTime) / 1000;
//     updatedThinkingTime += timeSinceLastAttempt;
//   }
  
//   return {
//     currentTopic: previousContext.currentTopic,
//     attemptCount: previousContext.attemptCount + 1,
//     isLearningMode: true,
//     problemStartTime: previousContext.problemStartTime,
//     lastAttemptTime: now,
//     thinkingTimeSeconds: updatedThinkingTime,
//     timeTravelEnabled,
//   };
// }

  
//   // 8. Default: maintain context
//   console.log('🔄 Maintaining previous context');
//   return previousContext || { currentTopic: null, attemptCount: 0, isLearningMode: false };
// }

// // ==================== MAIN FUNCTION ====================

// export const chat = functions.https.onRequest(async (req, res) => {
//   // CORS
//   res.set('Access-Control-Allow-Origin', '*');
//   res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
//   res.set('Access-Control-Allow-Headers', 'Content-Type');
  
//   if (req.method === 'OPTIONS') {
//     res.status(204).send('');
//     return;
//   }
  
//   if (req.method !== 'POST') {
//     res.status(405).json({ error: 'Method Not Allowed' });
//     return;
//   }
  
//   try {
//     const { message, conversationHistory, conversationContext } = req.body;
    
//     if (!message || typeof message !== 'string') {
//       res.status(400).json({ error: 'Invalid message' });
//       return;
//     }
    
//     if (!Array.isArray(conversationHistory)) {
//       res.status(400).json({ error: 'Invalid conversation history' });
//       return;
//     }
    
//     // Analyze conversation context
//     const currentContext = analyzeContext(message, conversationHistory, conversationContext);
    
//     console.log('📊 Context Analysis:', {
//       message: message.substring(0, 50),
//       currentTopic: currentContext.currentTopic,
//       attemptCount: currentContext.attemptCount,
//       isLearningMode: currentContext.isLearningMode,
//       thinkingTimeSeconds: currentContext.thinkingTimeSeconds,
//       timeTravelEnabled: currentContext.timeTravelEnabled,
//     });
    
//     const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
//     // ==================== ENHANCED REAL-TIME DATA DETECTION ====================
//     let realTimeData = "";
//     const msgLower = message.toLowerCase();
    
//     // Weather detection (more patterns)
//     const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
//     if (weatherPatterns.some(pattern => msgLower.includes(pattern))) {
//       console.log('🌤️ Weather request detected');
      
//       // Extract city from message (improved)
//       let city = "Delhi"; // default
//       const cityMatch = message.match(/in\s+([A-Za-z]+)/i) || 
//                         message.match(/at\s+([A-Za-z]+)/i) ||
//                         message.match(/weather\s+([A-Za-z]+)/i) ||
//                         message.match(/([A-Z][a-z]+)\s+weather/i);
      
//       if (cityMatch) {
//         city = cityMatch[1];
//       }
      
//       const weatherData = await fetchWeather(city);
//       console.log('🌤️ Weather data:', weatherData);
      
//       if (!weatherData.error) {
//         realTimeData = `\n\n[REAL-TIME WEATHER DATA - USE THIS IN YOUR RESPONSE]
// Current weather in ${weatherData.city}: 
// - Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feelsLike}°C)
// - Condition: ${weatherData.condition}
// - Humidity: ${weatherData.humidity}%

// Respond naturally using this information. Don't say you don't have access to real-time data!`;
//       } else {
//         console.error('Weather API failed:', weatherData.error);
//       }
//     }
    
//     // News detection (more patterns)
//     const newsPatterns = ["news", "latest", "current events", "happening", "today's", "recent"];
//     if (newsPatterns.some(pattern => msgLower.includes(pattern)) && !msgLower.includes("weather")) {
//       console.log('📰 News request detected');
      
//       const query = message.replace(/news|latest|about|what's|today's|recent/gi, "").trim() || "technology";
//       const newsData = await fetchNews(query);
//       console.log('📰 News data:', newsData);
      
//       if (!newsData.error && newsData.headlines && newsData.headlines.length > 0) {
//         const headlinesList = newsData.headlines
//           .map((h: any, i: number) => `${i + 1}. ${h.title}`)
//           .join('\n');
        
//         realTimeData = `\n\n[REAL-TIME NEWS DATA - USE THIS IN YOUR RESPONSE]
// Latest news headlines:
// ${headlinesList}

// Respond naturally using these headlines. Don't say you don't have access to real-time data!`;
//       } else {
//         console.error('News API failed:', newsData.error);
//       }
//     }
    
//     // ==================== BUILD SYSTEM PROMPT WITH FIXED TIME-TRAVEL LOGIC ====================
//     let systemPrompt = `You are ThinkFirst AI, an intelligent educational assistant that adapts to the user's needs.

// **YOUR CORE RULES:**
// 1. **RESPOND DIRECTLY** - Give your answer immediately without explaining your thought process
// 2. **NO META-COMMENTARY** - Don't say things like "Here's how to proceed"
// 3. **BE NATURAL** - Talk like a friendly tutor, not a robot
// 4. **USE REAL-TIME DATA** - When real-time data is provided in [REAL-TIME DATA] sections, YOU MUST use it naturally in your response. NEVER say "I don't have access to real-time data" when data is provided.

// **BEHAVIOR:**

// **For General Chat:**
// - Answer naturally and conversationally
// - Be friendly and helpful`;
    
//     if (currentContext.isLearningMode) {
//       const { attemptCount, currentTopic, thinkingTimeSeconds = 0, timeTravelEnabled = false } = currentContext;
      
//       if (timeTravelEnabled) {
//         // ============ FIXED TIME-TRAVEL MODE LOGIC ============
//         // CHANGE LOCATION: Lines 466-530 (system prompt generation)
        
//         // Hint 1: 30 seconds OR 1 attempt (whichever comes first)
//         const canShowHint1 = thinkingTimeSeconds >= 30 && attemptCount >= 1;
        
//         // Hint 2: 60 seconds AND 1 attempt (BOTH required)
//         const canShowHint2 = thinkingTimeSeconds >= 60 && attemptCount >= 2;
        
//         // Hint 3: 90 seconds AND 2 attempts (BOTH required)
//         const canShowHint3 = thinkingTimeSeconds >= 90 && attemptCount >= 3;
        
//         // Solution: 120 seconds AND 3 attempts (BOTH required)
//         const canShowSolution = thinkingTimeSeconds >= 120 && attemptCount >= 4;
        
//         systemPrompt += `

// **CURRENT MODE: LEARNING MODE (TIME-TRAVEL HINTS ENABLED ⏱️)**
// Topic: "${currentTopic}"
// Attempt: ${attemptCount}
// Thinking Time: ${Math.round(thinkingTimeSeconds)}s

// **TIME-LOCKED HINT AVAILABILITY:**
// - Hint 1 (conceptual): ${canShowHint1 ? '🔓 UNLOCKED' : '🔒 LOCKED (need 30s AND 1 attempt)'}
// - Hint 2 (approach): ${canShowHint2 ? '🔓 UNLOCKED' : '🔒 LOCKED (need 60s AND 2 attempt)'}
// - Hint 3 (pseudocode): ${canShowHint3 ? '🔓 UNLOCKED' : '🔒 LOCKED (need 90s AND 3 attempts)'}
// - Solution: ${canShowSolution ? '🔓 UNLOCKED' : '🔒 LOCKED (need 120s AND 4 attempts)'}

// **PROGRESSIVE GUIDANCE:**
// `;
        
//         // Determine which hint level to give based on what's unlocked
//         if (!canShowHint1) {
//           // Nothing unlocked yet - encourage thinking
//           const timeLeft = Math.max(0, 30 - thinkingTimeSeconds);
//           const attemptsLeft = Math.max(0, 1 - attemptCount);
          
//           systemPrompt += `- User hasn't unlocked any hints yet
// - GENTLY encourage them to keep thinking
// - Tell them: "Keep thinking! 🤔 You need either ${Math.round(timeLeft)} more seconds OR make ${attemptsLeft} attempt to unlock Hint 1"
// - Set isHint: false, isSolution: false, mode: "learning"`;
          
//         } else if (canShowHint1 && !canShowHint2) {
//           // Only Hint 1 available
//           if (attemptCount === 0) {
//             // They unlocked via time, no attempts yet
//             systemPrompt += `- Hint 1 UNLOCKED (via time)
// - Give conceptual hint that makes them think
// - Ask guiding questions
// - Set isHint: true, isSolution: false, mode: "learning"`;
//           } else {
//             // They have made attempts but Hint 2 not unlocked yet
//             const timeLeft = Math.max(0, 60 - thinkingTimeSeconds);
//             const attemptsLeft = Math.max(0, 1 - attemptCount);
            
//             if (timeLeft > 0 && attemptsLeft <= 0) {
//               // Have attempts, need more time
//               systemPrompt += `- Hint 1 available, but Hint 2 still locked
// - Give Hint 1 if they ask
// - Tell them: "Great attempt! ⏰ You need ${Math.round(timeLeft)} more seconds to unlock Hint 2 (approach)"
// - Set isHint: true, isSolution: false, mode: "learning"`;
//             } else if (attemptsLeft > 0) {
//               // Have time, need more attempts
//               systemPrompt += `- Hint 1 available, but Hint 2 still locked
// - Give Hint 1 if they ask
// - Tell them: "Keep trying! You need ${attemptsLeft} more attempt to unlock Hint 2 (approach)"
// - Set isHint: true, isSolution: false, mode: "learning"`;
//             }
//           }
          
//         } else if (canShowHint2 && !canShowHint3) {
//           // Hint 2 available, Hint 3 locked
//           const timeLeft = Math.max(0, 90 - thinkingTimeSeconds);
//           const attemptsLeft = Math.max(0, 2 - attemptCount);
          
//           systemPrompt += `- Hint 2 UNLOCKED (approach)
// - Provide stronger hints with techniques/algorithms
// - Point toward relevant concepts
// - Progress status: "⏰ ${Math.round(timeLeft)}s and ${attemptsLeft} more attempt(s) needed for Hint 3 (pseudocode)"
// - Set isHint: true, isSolution: false, mode: "learning"`;
          
//         } else if (canShowHint3 && !canShowSolution) {
//           // Hint 3 available, Solution locked
//           const timeLeft = Math.max(0, 120 - thinkingTimeSeconds);
//           const attemptsLeft = Math.max(0, 3 - attemptCount);
          
//           systemPrompt += `- Hint 3 UNLOCKED (pseudocode)
// - Give pseudocode or step-by-step roadmap
// - Be explicit about the approach
// - Progress status: "⏰ ${Math.round(timeLeft)}s and ${attemptsLeft} more attempt(s) needed for full solution"
// - Set isHint: true, isSolution: false, mode: "learning"`;
          
//         } else if (canShowSolution) {
//           // Full solution unlocked
//           systemPrompt += `- Full solution UNLOCKED 🎉
// - Provide COMPLETE solution with detailed explanation
// - Include code examples with proper syntax
// - Explain WHY each step works
// - Set isHint: false, isSolution: true, mode: "learning"`;
//         }
        
//       } else {
//         // STANDARD LEARNING MODE: Instant hints
//         systemPrompt += `

// **CURRENT MODE: LEARNING MODE (STANDARD)**
// Topic: "${currentTopic}"
// Attempt: ${attemptCount}

// **PROGRESSIVE GUIDANCE:**
// `;
        
//         if (attemptCount === 0) {
//           systemPrompt += `- This is the FIRST interaction with this topic
// - Give a conceptual hint that makes them think
// - Ask guiding questions to assess their understanding
// - Set isHint: true, isSolution: false, mode: "learning"`;
//         } else if (attemptCount === 1) {
//           systemPrompt += `- This is attempt ${attemptCount} (SECOND attempt)
// - Provide stronger hints with techniques or approaches
// - Point toward relevant concepts/algorithms
// - Set isHint: true, isSolution: false, mode: "learning"`;
//         } else if (attemptCount === 2) {
//           systemPrompt += `- This is attempt ${attemptCount} (THIRD attempt)
// - Give pseudocode or step-by-step roadmap
// - Be explicit about the approach
// - Set isHint: true, isSolution: false, mode: "learning"`;
//         } else {
//           systemPrompt += `- This is attempt ${attemptCount} (FOURTH+ attempt or direct solution request)
// - Provide COMPLETE solution with detailed explanation
// - Include code examples with proper syntax
// - Explain WHY each step works
// - Set isHint: false, isSolution: true, mode: "learning"`;
//         }
//       }
      
//       systemPrompt += `

// **IMPORTANT:** If user asks a follow-up question about complexity or clarification, answer directly without treating it as a new attempt.`;
//     }
    
//     // Build conversation history
//     const historyString = conversationHistory
//       .map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`)
//       .join('\n');
    
//     const prompt = historyString
//       ? `${historyString}\n\nUser: ${message}${realTimeData}`
//       : `User: ${message}${realTimeData}`;
    
//     console.log('📝 Has real-time data:', realTimeData.length > 0);
    
//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-flash',
//       contents: prompt,
//       config: {
//         systemInstruction: systemPrompt,
//         responseMimeType: "application/json",
//         responseSchema: {
//           type: Type.OBJECT,
//           properties: {
//             text: { type: Type.STRING },
//             mode: { type: Type.STRING, enum: ['learning', 'chat'] },
//             isHint: { type: Type.BOOLEAN },
//             isSolution: { type: Type.BOOLEAN }
//           },
//           required: ["text", "mode", "isHint", "isSolution"]
//         }
//       }
//     });
    
//     const result = JSON.parse(response.text || '{}');
    
//     // Return response with updated context
//     res.status(200).json({
//       ...result,
//       conversationContext: currentContext,
//     });
    
//   } catch (error: any) {
//     functions.logger.error("Chat Error:", error);
//     res.status(500).json({
//       error: "Internal server error",
//       details: error.message || "Unknown error"
//     });
//   }
// });


// // import * as functions from "firebase-functions";
// // import * as admin from "firebase-admin";
// // import { GoogleGenAI, Type } from "@google/genai";
// // import axios from "axios";

// // admin.initializeApp();

// // const getApiKey = (): string => {
// //   const envKey = process.env.GEMINI_API_KEY;
// //   if (envKey) {
// //     console.log('✅ Using Gemini API key from .env');
// //     return envKey;
// //   }
  
// //   const configKey = functions.config().gemini?.api_key;
// //   if (!configKey) {
// //     throw new Error('GEMINI_API_KEY not configured in .env or Firebase config');
// //   }
  
// //   console.log('✅ Using Gemini API key from Firebase config');
// //   return configKey;
// // };

// // // ==================== REAL-TIME DATA FUNCTIONS ====================

// // async function fetchWeather(city: string, country: string = "IN"): Promise<any> {
// //   try {
// //     const apiKey = process.env.OPENWEATHER_API_KEY || functions.config().weather?.api_key;
// //     if (!apiKey) {
// //       console.warn('⚠️ Weather API key not configured');
// //       return { error: "Weather API not configured" };
// //     }
    
// //     const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=metric`;
// //     console.log('🌤️ Fetching weather for:', city);
// //     const response = await axios.get(url);
    
// //     return {
// //       temperature: response.data.main.temp,
// //       feelsLike: response.data.main.feels_like,
// //       condition: response.data.weather[0].description,
// //       humidity: response.data.main.humidity,
// //       city: response.data.name,
// //     };
// //   } catch (error) {
// //     console.error('Weather API error:', error);
// //     return { error: "Unable to fetch weather data" };
// //   }
// // }

// // async function fetchNews(query: string): Promise<any> {
// //   try {
// //     const apiKey = process.env.NEWS_API_KEY || functions.config().news?.api_key;
// //     if (!apiKey) {
// //       console.warn('⚠️ News API key not configured');
// //       return { error: "News API not configured" };
// //     }
    
// //     const url = `https://newsapi.org/v2/top-headlines?q=${query}&apiKey=${apiKey}`;
// //     console.log('📰 Fetching news for:', query);
// //     const response = await axios.get(url);
    
// //     const headlines = response.data.articles.slice(0, 3).map((article: any) => ({
// //       title: article.title,
// //       description: article.description,
// //     }));
    
// //     return { headlines };
// //   } catch (error) {
// //     console.error('News API error:', error);
// //     return { error: "Unable to fetch news data" };
// //   }
// // }

// // // ==================== ATTEMPT TRACKING ====================

// // interface ConversationContext {
// //   currentTopic: string | null;
// //   attemptCount: number;
// //   isLearningMode: boolean;
// // }

// // function analyzeContext(
// //   message: string,
// //   conversationHistory: any[],
// //   previousContext?: ConversationContext
// // ): ConversationContext {
// //   const msgLower = message.toLowerCase().trim();
  
// //   // ============ PRIORITY CHECK: REAL-TIME DATA REQUESTS ============
// //   // CHANGE 1: Check for real-time data requests FIRST (before learning mode)
// //   const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
// //   const newsPatterns = ["news", "today's news", "latest news", "current events", "headlines", "what's happening", "news update"];
  
// //   const isWeatherRequest = weatherPatterns.some(p => msgLower.includes(p));
// //   const isNewsRequest = newsPatterns.some(p => msgLower.includes(p));
  
// //   if (isWeatherRequest || isNewsRequest) {
// //     console.log('🌐 Real-time data request detected - staying in chat mode');
// //     return { 
// //       currentTopic: null, 
// //       attemptCount: 0, 
// //       isLearningMode: false  // Force chat mode for real-time requests
// //     };
// //   }
// //   // ============ END PRIORITY CHECK ============
  
// //   // Phrases that indicate user wants solution directly (NOT an attempt)
// //   const solutionRequestPhrases = [
// //     "give me the answer",
// //     "give the answer",
// //     "just give me",
// //     "give me solution",
// //     "give the solution",
// //     "show me the answer",
// //     "show the solution",
// //     "what is the solution",
// //     "what's the solution",
// //     "tell me the solution",
// //     "just show me",
// //     "just tell me"
// //   ];
// //   const isAskingForSolution = solutionRequestPhrases.some(phrase => msgLower.includes(phrase));
  
// //   // Phrases indicating genuine attempt/confusion (should increment)
// //   const attemptPhrases = [
// //     "i tried",
// //     "i think",
// //     "maybe",
// //     "is it",
// //     "would it be",
// //     "should i",
// //     "idk",
// //     "i don't know",
// //     "not sure",
// //     "i'm stuck",
// //     "can't figure"
// //   ];
// //   const isGenuineAttempt = attemptPhrases.some(phrase => msgLower.includes(phrase));
  
// //   // Phrases indicating returning to previous topic
// //   const backToPreviousPhrases = [
// //     "back to",
// //     "return to",
// //     "again about",
// //     "still don't get"
// //   ];
// //   const isReturningToPrevious = backToPreviousPhrases.some(phrase => msgLower.includes(phrase));
  
// //   // Learning keywords indicate NEW question
// //   const learningKeywords = [
// //     "how do i",
// //     "how to",
// //     "how about",
// //     "what about",
// //     "explain",
// //     "solve",
// //     "algorithm for",
// //     "solution for",
// //     "implement"
// //   ];
// //   const isNewLearningQuestion = learningKeywords.some(kw => msgLower.includes(kw));
  
// //   // Follow-up keywords indicate question about SAME topic (not attempt)
// //   const followUpKeywords = [
// //     "time complexity",
// //     "space complexity",
// //     "complexity",
// //     "why does this",
// //     "why is",
// //     "can you explain more",
// //     "what do you mean",
// //     "how does that",
// //     "give me a hint",
// //     "give hint",
// //     "another hint"
// //   ];
// //   const isFollowUp = followUpKeywords.some(kw => msgLower.includes(kw));
  
// //   // General chat patterns
// //   const chatKeywords = ["hello", "hi", "hey", "thanks", "thank you", "okay", "ok", "got it", "cool"];
// //   const isGeneralChat = chatKeywords.some(kw => msgLower === kw || msgLower.startsWith(kw + " ") || msgLower.startsWith(kw + "!"));
  
// //   // Extract topic from message
// //   const extractTopic = (msg: string): string => {
// //     const words = msg.toLowerCase().split(" ");
// //     const stopWords = ["how", "to", "the", "a", "an", "what", "is", "explain", "can", "you", "i", "do", "about", "for"];
// //     const meaningful = words.filter(w => !stopWords.includes(w) && w.length > 3);
// //     return meaningful.slice(0, 3).join(" ");
// //   };
  
// //   // DECISION LOGIC
  
// //   // 1. General chat - reset everything
// //   if (isGeneralChat && !isNewLearningQuestion) {
// //     console.log('💬 Detected: General chat');
// //     return { currentTopic: null, attemptCount: 0, isLearningMode: false };
// //   }
  
// //   // 2. New learning question - reset topic and attempts
// //   if (isNewLearningQuestion && !isReturningToPrevious) {
// //     const newTopic = extractTopic(message);
// //     console.log('📚 Detected: New learning question -', newTopic);
// //     return {
// //       currentTopic: newTopic,
// //       attemptCount: 0,
// //       isLearningMode: true,
// //     };
// //   }
  
// //   // 3. Returning to previous topic mentioned in history
// //   if (isReturningToPrevious && conversationHistory.length > 0) {
// //     // Try to find the previous topic from history
// //     const previousTopics = conversationHistory
// //       .filter((msg: any) => msg.role === 'user')
// //       .map((msg: any) => extractTopic(msg.text))
// //       .filter((topic: string) => topic.length > 0);
    
// //     if (previousTopics.length > 0) {
// //       // Get the most relevant previous topic
// //       const relevantTopic = previousTopics.find((topic: string) => 
// //         msgLower.includes(topic.split(' ')[0])
// //       ) || previousTopics[previousTopics.length - 2]; // Second to last topic
      
// //       console.log('🔄 Detected: Returning to previous topic -', relevantTopic);
// //       return {
// //         currentTopic: relevantTopic,
// //         attemptCount: 0, // Reset attempts when returning
// //         isLearningMode: true,
// //       };
// //     }
// //   }
  
// //   // 4. Follow-up question or hint request - SAME topic, SAME attempt count
// //   if (isFollowUp && previousContext?.currentTopic) {
// //     console.log('❓ Detected: Follow-up question (no increment)');
// //     return {
// //       currentTopic: previousContext.currentTopic,
// //       attemptCount: previousContext.attemptCount, // Don't increment
// //       isLearningMode: true,
// //     };
// //   }
  
// //   // 5. Asking for solution directly - increment ONLY once, then give solution
// //   if (isAskingForSolution && previousContext?.isLearningMode) {
// //     console.log('🎯 Detected: Direct solution request');
// //     // Set attempt to 3 to trigger full solution
// //     return {
// //       currentTopic: previousContext.currentTopic,
// //       attemptCount: Math.max(previousContext.attemptCount, 3), // Jump to solution
// //       isLearningMode: true,
// //     };
// //   }
  
// //   // 6. Genuine attempt at solving - increment attempts
// //   if (isGenuineAttempt && previousContext?.isLearningMode && previousContext?.currentTopic) {
// //     console.log('✍️ Detected: Genuine attempt (increment)');
// //     return {
// //       currentTopic: previousContext.currentTopic,
// //       attemptCount: previousContext.attemptCount + 1,
// //       isLearningMode: true,
// //     };
// //   }
  
// //   // 7. User providing a substantive answer (longer than 10 chars, in learning mode)
// //   if (previousContext?.isLearningMode && 
// //       previousContext?.currentTopic && 
// //       !isFollowUp && 
// //       !isAskingForSolution &&
// //       message.length > 10) {
// //     console.log('📝 Detected: Substantive response (increment)');
// //     return {
// //       currentTopic: previousContext.currentTopic,
// //       attemptCount: previousContext.attemptCount + 1,
// //       isLearningMode: true,
// //     };
// //   }
  
// //   // 8. Default: maintain context
// //   console.log('🔄 Maintaining previous context');
// //   return previousContext || { currentTopic: null, attemptCount: 0, isLearningMode: false };
// // }

// // // ==================== MAIN FUNCTION ====================

// // export const chat = functions.https.onRequest(async (req, res) => {
// //   // CORS
// //   res.set('Access-Control-Allow-Origin', '*');
// //   res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
// //   res.set('Access-Control-Allow-Headers', 'Content-Type');
  
// //   if (req.method === 'OPTIONS') {
// //     res.status(204).send('');
// //     return;
// //   }
  
// //   if (req.method !== 'POST') {
// //     res.status(405).json({ error: 'Method Not Allowed' });
// //     return;
// //   }
  
// //   try {
// //     const { message, conversationHistory, conversationContext } = req.body;
    
// //     if (!message || typeof message !== 'string') {
// //       res.status(400).json({ error: 'Invalid message' });
// //       return;
// //     }
    
// //     if (!Array.isArray(conversationHistory)) {
// //       res.status(400).json({ error: 'Invalid conversation history' });
// //       return;
// //     }
    
// //     // Analyze conversation context
// //     const currentContext = analyzeContext(message, conversationHistory, conversationContext);
    
// //     console.log('📊 Context Analysis:', {
// //       message: message.substring(0, 50),
// //       currentTopic: currentContext.currentTopic,
// //       attemptCount: currentContext.attemptCount,
// //       isLearningMode: currentContext.isLearningMode
// //     });
    
// //     const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
// //     // ==================== ENHANCED REAL-TIME DATA DETECTION ====================
// //     let realTimeData = "";
// //     const msgLower = message.toLowerCase();
    
// //     // Weather detection (more patterns)
// //     const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
// //     if (weatherPatterns.some(pattern => msgLower.includes(pattern))) {
// //       console.log('🌤️ Weather request detected');
      
// //       // Extract city from message (improved)
// //       let city = "Delhi"; // default
// //       const cityMatch = message.match(/in\s+([A-Za-z]+)/i) || 
// //                         message.match(/at\s+([A-Za-z]+)/i) ||
// //                         message.match(/weather\s+([A-Za-z]+)/i) ||
// //                         message.match(/([A-Z][a-z]+)\s+weather/i);
      
// //       if (cityMatch) {
// //         city = cityMatch[1];
// //       }
      
// //       const weatherData = await fetchWeather(city);
// //       console.log('🌤️ Weather data:', weatherData);
      
// //       if (!weatherData.error) {
// //         realTimeData = `\n\n[REAL-TIME WEATHER DATA - USE THIS IN YOUR RESPONSE]
// // Current weather in ${weatherData.city}: 
// // - Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feelsLike}°C)
// // - Condition: ${weatherData.condition}
// // - Humidity: ${weatherData.humidity}%

// // Respond naturally using this information. Don't say you don't have access to real-time data!`;
// //       } else {
// //         console.error('Weather API failed:', weatherData.error);
// //       }
// //     }
    
// //     // News detection (more patterns)
// //     const newsPatterns = ["news", "latest", "current events", "happening", "today's", "recent"];
// //     if (newsPatterns.some(pattern => msgLower.includes(pattern)) && !msgLower.includes("weather")) {
// //       console.log('📰 News request detected');
      
// //       const query = message.replace(/news|latest|about|what's|today's|recent/gi, "").trim() || "technology";
// //       const newsData = await fetchNews(query);
// //       console.log('📰 News data:', newsData);
      
// //       if (!newsData.error && newsData.headlines && newsData.headlines.length > 0) {
// //         const headlinesList = newsData.headlines
// //           .map((h: any, i: number) => `${i + 1}. ${h.title}`)
// //           .join('\n');
        
// //         realTimeData = `\n\n[REAL-TIME NEWS DATA - USE THIS IN YOUR RESPONSE]
// // Latest news headlines:
// // ${headlinesList}

// // Respond naturally using these headlines. Don't say you don't have access to real-time data!`;
// //       } else {
// //         console.error('News API failed:', newsData.error);
// //       }
// //     }
    
// //     // Build enhanced system prompt
// //     let systemPrompt = `You are ThinkFirst AI, an intelligent educational assistant that adapts to the user's needs.

// // **YOUR CORE RULES:**
// // 1. **RESPOND DIRECTLY** - Give your answer immediately without explaining your thought process
// // 2. **NO META-COMMENTARY** - Don't say things like "Here's how to proceed"
// // 3. **BE NATURAL** - Talk like a friendly tutor, not a robot
// // 4. **USE REAL-TIME DATA** - When real-time data is provided in [REAL-TIME DATA] sections, YOU MUST use it naturally in your response. NEVER say "I don't have access to real-time data" when data is provided.

// // **BEHAVIOR:**

// // **For General Chat:**
// // - Answer naturally and conversationally
// // - Be friendly and helpful`;
    
// //     if (currentContext.isLearningMode) {
// //       const { attemptCount, currentTopic } = currentContext;
      
// //       systemPrompt += `

// // **CURRENT MODE: LEARNING MODE**
// // Topic: "${currentTopic}"
// // Attempt: ${attemptCount}

// // **PROGRESSIVE GUIDANCE:**
// // `;
      
// //       if (attemptCount === 0) {
// //         systemPrompt += `- This is the FIRST interaction with this topic
// // - Give a conceptual hint that makes them think
// // - Ask guiding questions to assess their understanding
// // - Set isHint: true, isSolution: false, mode: "learning"`;
// //       } else if (attemptCount === 1) {
// //         systemPrompt += `- This is attempt ${attemptCount} (SECOND attempt)
// // - Provide stronger hints with techniques or approaches
// // - Point toward relevant concepts/algorithms
// // - Set isHint: true, isSolution: false, mode: "learning"`;
// //       } else if (attemptCount === 2) {
// //         systemPrompt += `- This is attempt ${attemptCount} (THIRD attempt)
// // - Give pseudocode or step-by-step roadmap
// // - Be explicit about the approach
// // - Set isHint: true, isSolution: false, mode: "learning"`;
// //       } else {
// //         systemPrompt += `- This is attempt ${attemptCount} (FOURTH+ attempt or direct solution request)
// // - Provide COMPLETE solution with detailed explanation
// // - Include code examples with proper syntax
// // - Explain WHY each step works
// // - Set isHint: false, isSolution: true, mode: "learning"`;
// //       }
      
// //       systemPrompt += `

// // **IMPORTANT:** If user asks a follow-up question about complexity or clarification, answer directly without treating it as a new attempt.`;
// //     }
    
// //     // Build conversation history
// //     const historyString = conversationHistory
// //       .map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`)
// //       .join('\n');
    
// //     const prompt = historyString
// //       ? `${historyString}\n\nUser: ${message}${realTimeData}`
// //       : `User: ${message}${realTimeData}`;
    
// //     console.log('📝 Has real-time data:', realTimeData.length > 0);
    
// //     const response = await ai.models.generateContent({
// //       model: 'gemini-2.5-flash',
// //       contents: prompt,
// //       config: {
// //         systemInstruction: systemPrompt,
// //         responseMimeType: "application/json",
// //         responseSchema: {
// //           type: Type.OBJECT,
// //           properties: {
// //             text: { type: Type.STRING },
// //             mode: { type: Type.STRING, enum: ['learning', 'chat'] },
// //             isHint: { type: Type.BOOLEAN },
// //             isSolution: { type: Type.BOOLEAN }
// //           },
// //           required: ["text", "mode", "isHint", "isSolution"]
// //         }
// //       }
// //     });
    
// //     const result = JSON.parse(response.text || '{}');
    
// //     // Return response with updated context
// //     res.status(200).json({
// //       ...result,
// //       conversationContext: currentContext,
// //     });
    
// //   } catch (error: any) {
// //     functions.logger.error("Chat Error:", error);
// //     res.status(500).json({
// //       error: "Internal server error",
// //       details: error.message || "Unknown error"
// //     });
// //   }
// // });
