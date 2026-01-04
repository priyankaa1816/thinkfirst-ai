import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  getSession,
  getSessionMessages,
  addMessage,
  updateSession,
  incrementProgress,
  trackProblemEffort,  
  trackWeeklyHint      
} from '../services/firebase/firestore';
import { ChatSession, ChatMessage } from '../types';
import {
  trackHintShown,
  trackSolutionUnlocked,
  trackAttemptSubmitted,
  trackModeSwitched,
} from "../lib/analytics";
import axios from 'axios';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';


interface ConversationContext {
  currentTopic: string | null;
  attemptCount: number;
  isLearningMode: boolean;
}

interface TopicTracker {
  [topicKey: string]: {
    attemptCount: number;
    lastMessageIndex: number;
  };
}

interface GroqResponse {
  text: string;
  mode: 'learning' | 'chat';
  isHint?: boolean;
  isSolution?: boolean;
  metadata?: {
    detectedIntent?: string;
  };
}


async function fetchWeather(city: string, country: string = "IN"): Promise<any> {
  try {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn('Weather API key not configured');
      return { error: "Weather API not configured" };
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=metric`;
    console.log('Fetching weather for:', city);
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
    const apiKey = import.meta.env.VITE_NEWS_API_KEY;
    if (!apiKey) {
      console.warn(' News API key not configured');
      return { error: "News API not configured" };
    }
    
    const url = `https://newsapi.org/v2/top-headlines?q=${query}&apiKey=${apiKey}`;
    console.log(' Fetching news for:', query);
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


function analyzeContext(
  message: string,
  conversationHistory: ChatMessage[],
  previousContext: ConversationContext,
  topicTracker: TopicTracker
): { context: ConversationContext; updatedTracker: TopicTracker } {
  const msgLower = message.toLowerCase().trim();
  const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
  const newsPatterns = ["news", "today's news", "latest news", "current events", "headlines", "what's happening", "news update"];
  
  const isWeatherRequest = weatherPatterns.some(p => msgLower.includes(p));
  const isNewsRequest = newsPatterns.some(p => msgLower.includes(p));
  
  if (isWeatherRequest || isNewsRequest) {
    console.log('Real-time data request detected - staying in chat mode');
    return { 
      context: { 
        currentTopic: null, 
        attemptCount: 0, 
        isLearningMode: false
      },
      updatedTracker: topicTracker
    };
  }
  
  // Phrases that indicate user wants solution directly
  const solutionRequestPhrases = [
    "give me the answer",
    "give the answer",
    "give me solution",
    "give the solution",
    "show me the answer",
    "show the solution",
    "what is the solution",
    "what's the solution",
    "tell me the solution",
    "i give up",
    "just tell me"
  ];
  const isAskingForSolution = solutionRequestPhrases.some(phrase => msgLower.includes(phrase)) && 
                               previousContext?.isLearningMode && 
                               previousContext?.attemptCount > 0;
  
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
  const backToPreviousPhrases = [
    "back to",
    "return to",
    "again about",
    "still don't get"
  ];
  const isReturningToPrevious = backToPreviousPhrases.some(phrase => msgLower.includes(phrase));
  
  const learningKeywords = [
    "how do i",
    "how to",
    "how about",
    "what about",
    "explain",
    "solve",
    "algorithm for",
    "solution for",
    "implement",
    "calculate",
    "compute",
    "find",
    "integrate",
    "derive",
    "prove",
    "answer of",
    "answer to",
    "final answer",
    "result of",
    "value of"
  ];
  const isNewLearningQuestion = learningKeywords.some(kw => msgLower.includes(kw));
  
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
  
  const chatKeywords = ["hello", "hi", "hey", "thanks", "thank you", "okay", "ok", "got it", "cool"];
  const isGeneralChat = chatKeywords.some(kw => msgLower === kw || msgLower.startsWith(kw + " ") || msgLower.startsWith(kw + "!"));
  
  const extractTopic = (msg: string): string => {
    const words = msg.toLowerCase().split(" ");
    const stopWords = ["how", "to", "the", "a", "an", "what", "is", "explain", "can", "you", "i", "do", "about", "for", "bro", "just", "give", "me"];
    const meaningful = words.filter(w => !stopWords.includes(w) && w.length > 2);
    return meaningful.slice(0, 4).join(" ").trim();
  };
  
  const findMatchingTopic = (currentMsg: string): string | null => {
    const currentWords = currentMsg.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    for (const topic of Object.keys(topicTracker)) {
      const topicWords = topic.split(/\s+/);
      const matchCount = currentWords.filter(w => topicWords.includes(w)).length;
      if (matchCount >= Math.min(2, topicWords.length / 2)) {
        console.log(`Matched existing topic: "${topic}"`);
        return topic;
      }
    }
    
    if (conversationHistory.length > 0) {
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === 'user' && msg.metadata?.detectedIntent !== 'general_chat') {
          const historicalWords = msg.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const matchCount = currentWords.filter(w => historicalWords.includes(w)).length;
          if (matchCount >= 2) {
            const historicalTopic = extractTopic(msg.text);
            console.log(`Found topic in history: "${historicalTopic}"`);
            return historicalTopic;
          }
        }
      }
    }
    
    return null;
  };
  

  if (isGeneralChat && !isNewLearningQuestion) {
    console.log('Detected: General chat');
    return { 
      context: { 
        currentTopic: null, 
        attemptCount: 0, 
        isLearningMode: false
      },
      updatedTracker: topicTracker
    };
  }
  
  if (isNewLearningQuestion && !isReturningToPrevious) {
    const matchedTopic = findMatchingTopic(message);
    
    if (matchedTopic && topicTracker[matchedTopic]) {
      console.log('Detected: Returning to existing topic -', matchedTopic);
      return {
        context: {
          currentTopic: matchedTopic,
          attemptCount: topicTracker[matchedTopic].attemptCount,
          isLearningMode: true
        },
        updatedTracker: topicTracker
      };
    } else {
      const newTopic = extractTopic(message);
      console.log('Detected: New learning question -', newTopic);
      
      const updatedTracker = {
        ...topicTracker,
        [newTopic]: { 
          attemptCount: 0, 
          lastMessageIndex: conversationHistory.length
        }
      };
      
      return {
        context: {
          currentTopic: newTopic,
          attemptCount: 0,
          isLearningMode: true
        },
        updatedTracker
      };
    }
  }
  
  if (isReturningToPrevious && conversationHistory.length > 0) {
    const previousTopics = conversationHistory
      .filter((msg: ChatMessage) => msg.role === 'user')
      .map((msg: ChatMessage) => extractTopic(msg.text))
      .filter((topic: string) => topic.length > 0);
    
    if (previousTopics.length > 0) {
      const relevantTopic = previousTopics.find((topic: string) => 
        msgLower.includes(topic.split(' ')[0])
      ) || previousTopics[previousTopics.length - 2];
      
      console.log('Detected: Returning to previous topic -', relevantTopic);
      return {
        context: {
          currentTopic: relevantTopic,
          attemptCount: topicTracker[relevantTopic]?.attemptCount || 0,
          isLearningMode: true
        },
        updatedTracker: topicTracker
      };
    }
  }
  
  if (isFollowUp && previousContext?.currentTopic) {
    console.log('❓ Detected: Follow-up question (no increment)');
    return {
      context: {
        currentTopic: previousContext.currentTopic,
        attemptCount: previousContext.attemptCount,
        isLearningMode: true
      },
      updatedTracker: topicTracker
    };
  }
  
  if (isAskingForSolution && previousContext?.isLearningMode) {
    console.log('Detected: Direct solution request');
    return {
      context: {
        currentTopic: previousContext.currentTopic,
        attemptCount: 4,
        isLearningMode: true
      },
      updatedTracker: topicTracker
    };
  }
  
  if (isGenuineAttempt && previousContext?.isLearningMode && previousContext?.currentTopic) {
    console.log('Detected: Genuine attempt (increment)');
    
    const newAttemptCount = previousContext.attemptCount + 1;
    
    const updatedTracker = {
      ...topicTracker,
      [previousContext.currentTopic]: {
        ...topicTracker[previousContext.currentTopic],
        attemptCount: newAttemptCount
      }
    };
    
    return {
      context: {
        currentTopic: previousContext.currentTopic,
        attemptCount: newAttemptCount,
        isLearningMode: true
      },
      updatedTracker
    };
  }
  
  if (previousContext?.isLearningMode && 
      previousContext?.currentTopic && 
      !isFollowUp && 
      !isAskingForSolution &&
      message.length > 10) {
    console.log('Detected: Substantive response (increment)');
    
    const newAttemptCount = previousContext.attemptCount + 1;
    
    const updatedTracker = {
      ...topicTracker,
      [previousContext.currentTopic]: {
        ...topicTracker[previousContext.currentTopic],
        attemptCount: newAttemptCount
      }
    };
    
    return {
      context: {
        currentTopic: previousContext.currentTopic,
        attemptCount: newAttemptCount,
        isLearningMode: true
      },
      updatedTracker
    };
  }
  
  console.log('Maintaining previous context');
  return { 
    context: previousContext,
    updatedTracker: topicTracker
  };
}

export const useChat = (sessionId: string) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    currentTopic: null,
    attemptCount: 0,
    isLearningMode: false,
  });
  
  const [topicTracker, setTopicTracker] = useState<TopicTracker>({});

  useEffect(() => {
    const loadData = async () => {
      if (!sessionId || !auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [sessionData, messagesData] = await Promise.all([
          getSession(sessionId),
          getSessionMessages(sessionId)
        ]);
        setSession(sessionData);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [sessionId]);

  const sendMessage = async (text: string) => {
    if (!sessionId || !auth.currentUser || !text.trim()) return;

    setSending(true);

    try {
      const userMessage: Omit<ChatMessage, 'id'> = {
        role: 'user',
        text: text.trim(),
        timestamp: Date.now(),
        senderId: auth.currentUser.uid,
        createdAt: Date.now(),
      };

      const userMessageId = await addMessage(sessionId, userMessage);
      setMessages(prev => [...prev, { ...userMessage, id: userMessageId }]);

      const { context: currentContext, updatedTracker } = analyzeContext(
        text, 
        messages, 
        conversationContext,
        topicTracker
      );
      
      setTopicTracker(updatedTracker);
      
      console.log('Context Analysis:', {
        message: text.substring(0, 50),
        currentTopic: currentContext.currentTopic,
        attemptCount: currentContext.attemptCount,
        isLearningMode: currentContext.isLearningMode
      });

      let realTimeData = "";
      const msgLower = text.toLowerCase();
      
      const weatherPatterns = ["weather", "temperature", "how hot", "how cold", "climate", "forecast"];
      if (weatherPatterns.some(pattern => msgLower.includes(pattern))) {
        console.log('Weather request detected');
        
        let city = "Delhi";
        const cityMatch = text.match(/in\s+([A-Za-z]+)/i) || 
                          text.match(/at\s+([A-Za-z]+)/i) ||
                          text.match(/weather\s+([A-Za-z]+)/i) ||
                          text.match(/([A-Z][a-z]+)\s+weather/i);
        
        if (cityMatch) {
          city = cityMatch[1];
        }
        
        const weatherData = await fetchWeather(city);
        console.log('Weather data:', weatherData);
        
        if (!weatherData.error) {
          realTimeData = `\n\n[REAL-TIME WEATHER DATA - USE THIS IN YOUR RESPONSE]
Current weather in ${weatherData.city}: 
- Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feelsLike}°C)
- Condition: ${weatherData.condition}
- Humidity: ${weatherData.humidity}%

Respond naturally using this information. Don't say you don't have access to real-time data!`;
        }
      }
      
      const newsPatterns = ["news", "latest", "current events", "happening", "today's", "recent"];
      if (newsPatterns.some(pattern => msgLower.includes(pattern)) && !msgLower.includes("weather")) {
        console.log('News request detected');
        
        const query = text.replace(/news|latest|about|what's|today's|recent/gi, "").trim() || "technology";
        const newsData = await fetchNews(query);
        console.log('News data:', newsData);
        
        if (!newsData.error && newsData.headlines && newsData.headlines.length > 0) {
          const headlinesList = newsData.headlines
            .map((h: any, i: number) => `${i + 1}. ${h.title}`)
            .join('\n');
          
          realTimeData = `\n\n[REAL-TIME NEWS DATA - USE THIS IN YOUR RESPONSE]
Latest news headlines:
${headlinesList}

Respond naturally using these headlines. Don't say you don't have access to real-time data!`;
        }
      }
      
      let systemPrompt = `You are ThinkFirst AI, an intelligent daily-life chatbot that helps people learn by thinking first.

**YOUR ABSOLUTE CORE RULES:**
1. **NEVER GIVE DIRECT ANSWERS TO LEARNING QUESTIONS ON FIRST ASK** - This is your PRIMARY rule
2. **BE A NORMAL CHATBOT** - For casual chat (greetings, general questions), respond naturally
3. **DETECT REAL-TIME REQUESTS** - For weather/news, provide real-time data naturally
4. **FOR LEARNING QUESTIONS** - Use progressive hints (0→1→2→3 attempts before solution)
5. **RESPOND IN JSON FORMAT** - Always return valid JSON with required structure

**CRITICAL: You are NOT just a tutor, you are a daily-life assistant that:**
- Chats normally about life, interests, feelings
- Provides weather and news when asked
- BUT when someone asks a solvable problem/homework/learning question, you guide them instead of solving it directly

**BEHAVIOR:**

**For General Chat (casual conversation):**
- Answer naturally and conversationally
- Be friendly, helpful, and engaging
- No hints needed - just chat normally
- Examples: "What's up?", "Tell me a joke", "I'm feeling sad", "What should I eat?"

**For Real-Time Data (weather/news):**
- Use provided real-time data naturally
- Don't say you lack access to current data
- Respond helpfully and directly`;
      
      if (currentContext.isLearningMode) {
        const { attemptCount, currentTopic } = currentContext;
        
        systemPrompt += `

**CURRENT MODE: LEARNING MODE**
Topic: "${currentTopic}"
Attempt: ${attemptCount}

**PROGRESSIVE GUIDANCE:**
`;
        
        if (attemptCount === 0) {
          systemPrompt += `- This is ATTEMPT 0 - The user JUST ASKED the question
- CRITICAL: DO NOT SOLVE IT! DO NOT GIVE THE ANSWER!
- Your job: Give a small hint or ask what they know
- Be supportive and encouraging
- Examples:
  * "Great question! What integration techniques have you learned?"
  * "Interesting! Have you tried simplifying the expression first?"
  * "Nice problem! What's your initial thought on approaching this?"
- Set isHint: true, isSolution: false, mode: "learning"`;
        } else if (attemptCount === 1) {
          systemPrompt += `- This is ATTEMPT 1 - They've tried once
- STILL NO COMPLETE SOLUTION!
- Give a stronger hint: point to a technique, formula, or concept
- Examples:
  * "Good try! For integrals like this, try using [technique name]"
  * "You're on the right track! Remember [relevant formula/concept]"
- Set isHint: true, isSolution: false, mode: "learning"`;
        } else if (attemptCount === 2) {
          systemPrompt += `- This is ATTEMPT 2 - Third interaction
- STILL NO COMPLETE SOLUTION!
- Give detailed guidance: pseudocode, steps, or partial work
- Show the approach but let them finish
- Set isHint: true, isSolution: false, mode: "learning"`;
        } else if (attemptCount === 3) {
          systemPrompt += `- This is ATTEMPT 3 - Fourth interaction
- STILL NO COMPLETE SOLUTION!
- Give very detailed guidance: more specific steps
- Almost show the solution but hold back the final answer
- Set isHint: true, isSolution: false, mode: "learning"`;
        } else {
          systemPrompt += `- This is ATTEMPT 4+ - Fifth+ interaction or they gave up
- NOW you can give the COMPLETE SOLUTION
- Provide the full answer with step-by-step explanation
- Show all work and explain the reasoning
- Set isHint: false, isSolution: true, mode: "learning"`;
        }
        
        systemPrompt += `

**IMPORTANT REMINDERS:**
- If user asks follow-up questions (complexity, "why", "how does that work"), answer directly without incrementing attempts
- Each NEW learning topic has its own separate attempt counter
- Switching between topics preserves their individual attempt counts
- "Give me the answer" only unlocks solution if they've already made genuine attempts`;
      }
      
      systemPrompt += `

**ABSOLUTELY CRITICAL - READ THIS:**
- At attempt 0, 1, 2, 3: DO NOT provide the final answer or complete solution
- Only at attempt 4+ can you reveal the full solution
- Think of yourself as a patient teacher who guides, not solves

**REQUIRED JSON RESPONSE FORMAT:**
You must respond with valid JSON containing these fields:
{
  "text": "your response text here",
  "mode": "learning" or "chat",
  "isHint": true or false,
  "isSolution": true or false
}

**CODE FORMATTING INSIDE JSON:**
When including code blocks in the text field, use ESCAPED backticks and newlines:
- Use \\n for line breaks
- Use \\\`\\\`\\\` for triple backticks

Example JSON with code:
{
  "text": "Here's a Python solution:\\n\\\`\\\`\\\`python\\ndef example():\\n    return 'hello'\\n\\\`\\\`\\\`",
  "mode": "learning",
  "isHint": false,
  "isSolution": true
}

This ensures valid JSON while preserving code formatting.`;





      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        
        if (!BACKEND_URL) {
          throw new Error('VITE_BACKEND_URL is not configured');
        }

        const idToken = await auth.currentUser!.getIdToken();

        console.log('Calling FastAPI Backend...');

        const conversationHistory = messages.map(m => ({
          role: m.role,
          text: m.text
        }));

        const backendResponse = await axios.post(
          `${BACKEND_URL}/api/chat`,
          {
            message: text + realTimeData, 
            conversationHistory,
            conversationContext: currentContext,
            sessionId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            }
          }
        );

        console.log('FastAPI raw response:', backendResponse.data);

        let aiResponse: GroqResponse;
        try {
          aiResponse = {
            text: backendResponse.data.text,
            mode: backendResponse.data.mode,
            isHint: backendResponse.data.isHint,
            isSolution: backendResponse.data.isSolution
          };
          
          console.log('Parsed AI response:', aiResponse);
          
          // Safety check (keep your existing safety logic)
          if (currentContext.isLearningMode && currentContext.attemptCount < 4) {
            if (aiResponse.isSolution === true) {
              console.warn('AI tried to give solution too early! Forcing hint mode.');
              aiResponse.isSolution = false;
              aiResponse.isHint = true;
              aiResponse.text = "Let me give you a hint first! " + aiResponse.text.split('\n').slice(0, 3).join('\n');
            }
          }
          
        } catch (parseError) {
          console.error('Failed to parse FastAPI response:', parseError);
          throw new Error('Invalid response from backend');
        }


        setConversationContext(currentContext);
        console.log('Updated Context:', currentContext);

        const topic = currentContext.currentTopic || "unknown_topic";
        const attempt = currentContext.attemptCount ?? 0;

        if (currentContext.isLearningMode) {
          trackAttemptSubmitted(topic, attempt);
        }

        if (aiResponse.isHint) {
          trackHintShown(topic, attempt);
          await trackWeeklyHint(auth.currentUser.uid); 
        }

        if (aiResponse.isSolution) {
          trackSolutionUnlocked(topic, attempt);
          console.log(`SOLUTION UNLOCKED at attempt ${attempt}`);
          await trackProblemEffort(auth.currentUser.uid, attempt);
          console.log(`trackProblemEffort called with attempt: ${attempt}`);
        }

        if (aiResponse.mode) {
          trackModeSwitched(aiResponse.mode);
        }
        
        const aiMessage: Omit<ChatMessage, 'id'> = {
          role: 'ai',
          text: aiResponse.text,
          timestamp: Date.now(),
          senderId: 'ai',
          createdAt: Date.now(),
          metadata: {
            isHint: aiResponse.isHint ?? false,
            isSolution: aiResponse.isSolution ?? false,
            detectedIntent: aiResponse.metadata?.detectedIntent ?? 'general_chat'
          },
          mode: aiResponse.mode || 'chat'
        };

        const aiMessageId = await addMessage(sessionId, aiMessage);
        setMessages(prev => [...prev, { ...aiMessage, id: aiMessageId }]);

        const newMode = aiResponse.mode || 'chat';
        await updateSession(sessionId, { mode: newMode });
        setSession(prev => prev ? { ...prev, mode: newMode } : null);

        if (aiResponse.isHint) {
          await incrementProgress(auth.currentUser.uid, 'hintsUsed');
        }
        if (aiResponse.isSolution) {
          await incrementProgress(auth.currentUser.uid, 'solutionsUnlocked');
        }

      } catch (apiError) {
        console.error('Groq API call failed:', apiError);
        
        const mockAiMessage: Omit<ChatMessage, 'id'> = {
          role: 'ai',
          text: `Oops! I'm having trouble connecting right now. \n\n**Your question:** "${text}"\n\n**Troubleshooting:**\n1. Check if VITE_GROQ_API_KEY is set in your .env file\n2. Verify your API key is valid at https://console.groq.com\n3. Check your internet connection\n\nTry again in a moment!`,
          timestamp: Date.now(),
          senderId: 'ai',
          createdAt: Date.now(),
          metadata: {
            isHint: false,
            isSolution: false,
            detectedIntent: 'error'
          },
          mode: 'chat'
        };

        const mockMessageId = await addMessage(sessionId, mockAiMessage);
        setMessages(prev => [...prev, { ...mockAiMessage, id: mockMessageId }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Omit<ChatMessage, 'id'> = {
        role: 'ai',
        text: 'Sorry, something unexpected happened. Please check your connection and try again.',
        timestamp: Date.now(),
        senderId: 'ai',
        createdAt: Date.now(),
        metadata: {
          isHint: false,
          isSolution: false,
          detectedIntent: 'error'
        },
        mode: 'chat'
      };

      const errorMessageId = await addMessage(sessionId, errorMessage);
      setMessages(prev => [...prev, { ...errorMessage, id: errorMessageId }]);
    } finally {
      setSending(false);
    }
  };

  return {
    session,
    messages,
    loading,
    sending,
    sendMessage,
    conversationContext,
    topicTracker,
  };
};
