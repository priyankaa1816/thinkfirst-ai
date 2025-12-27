
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * WORLD-CLASS SENIOR ENGINEER NOTE:
 * In hackathon and sandbox environments, the API key for Gemini and Firebase
 * services often share the same project scope. We use the pre-configured 
 * process.env.API_KEY to ensure authentication works out-of-the-box.
 * 
 * To customize: Replace 'thinkfirst-ai-hackathon' with your actual Firebase Project ID.
 */

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDM8FrITiIZC6dh64n2tG3uBwa66_H5W1k",
  authDomain: "think-first-ai.firebaseapp.com",
  projectId: "think-first-ai",
  storageBucket: "think-first-ai.firebasestorage.app",
  messagingSenderId: "928780599442",
  appId: "1:928780599442:web:170aa8e986e3df36f2664b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firebase with resilience
// let app;
// try {
//   app = initializeApp(firebaseConfig);
// } catch (error) {
//   console.error("Firebase initialization failed:", error);
//   // Fallback to allow UI rendering even if config is partially broken
//   app = initializeApp({
//     apiKey: "placeholder-to-prevent-crash",
//     projectId: PROJECT_ID
//   });
// }

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Standard UX: Always prompt for account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/*
// In a real project, you would use:
// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';

// For the purpose of this sandbox demonstration, we'll implement a 
// robust Mock Firebase system that persists to localStorage.

import { ChatMessage, ChatSession } from './types';

const STORAGE_KEY_SESSIONS = 'thinkfirst_sessions';
const STORAGE_KEY_MESSAGES_PREFIX = 'thinkfirst_messages_';

const getSessions = (): ChatSession[] => {
  const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
  return data ? JSON.parse(data) : [];
};

const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
};

export const db = {
  sessions: {
    list: async (userId: string) => {
      return getSessions().filter(s => s.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    get: async (id: string) => {
      return getSessions().find(s => s.id === id);
    },
    create: async (session: Omit<ChatSession, 'id'>) => {
      const id = Math.random().toString(36).substring(7);
      const newSession = { ...session, id };
      const sessions = getSessions();
      sessions.push(newSession);
      saveSessions(sessions);
      return newSession;
    },
    update: async (id: string, updates: Partial<ChatSession>) => {
      const sessions = getSessions();
      const index = sessions.findIndex(s => s.id === id);
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() };
        saveSessions(sessions);
      }
    }
  },
  messages: {
    list: async (sessionId: string) => {
      const data = localStorage.getItem(STORAGE_KEY_MESSAGES_PREFIX + sessionId);
      return data ? JSON.parse(data) : [];
    },
    add: async (sessionId: string, message: Omit<ChatMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(7);
      const newMessage = { ...message, id };
      const messages = await db.messages.list(sessionId);
      messages.push(newMessage);
      localStorage.setItem(STORAGE_KEY_MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
      
      // Update session count
      const session = await db.sessions.get(sessionId);
      if (session) {
        await db.sessions.update(sessionId, { messageCount: session.messageCount + 1 });
      }
      return newMessage;
    }
  }
};

export const auth = {
  currentUser: {
    uid: 'demo-user-123',
    email: 'user@example.com'
  },
  // Mock methods
  signOut: async () => console.log('Signed out'),
  onAuthStateChanged: (callback: any) => {
    callback({ uid: 'demo-user-123', email: 'user@example.com' });
    return () => {};
  }
};
*/