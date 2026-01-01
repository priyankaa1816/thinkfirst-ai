// src/services/firestore.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  increment, // ← ADD THIS IMPORT
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { ChatSession, ChatMessage } from '../../types/index';


// ========== SESSIONS ==========


/**
 * Create a new chat session
 */
export const createSession = async (
  userId: string,
  title: string
): Promise<string> => {
  try {
    const sessionRef = await addDoc(collection(db, 'sessions'), {
      userId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    });
    return sessionRef.id;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};


/**
 * Get all sessions for a user
 */
export const getUserSessions = async (userId: string): Promise<ChatSession[]> => {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatSession[];
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
};


/**
 * Get a single session by ID
 */
export const getSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ChatSession;
    }
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};


/**
 * Update a session
 */
export const updateSession = async (
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<void> => {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};


/**
 * Delete a session and all its messages
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    // Delete all messages in this session
    const messagesQuery = query(
      collection(db, 'messages'),
      where('sessionId', '==', sessionId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);


    // Delete the session
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};


// ========== MESSAGES ==========


/**
 * Add a message to a session
 */
export const addMessage = async (
  sessionId: string,
  message: Omit<ChatMessage, 'id'>
): Promise<string> => {
  try {
    const messageRef = await addDoc(collection(db, 'messages'), {
      ...message,
      sessionId,
      timestamp: Date.now(),
    });


    // Update session message count and updatedAt
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const currentCount = sessionSnap.data().messageCount || 0;
      await updateDoc(sessionRef, {
        messageCount: currentCount + 1,
        updatedAt: Date.now(),
      });
    }


    return messageRef.id;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};


/**
 * Get all messages for a session
 */
export const getSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatMessage[];
  } catch (error) {
    console.error('Error getting session messages:', error);
    throw error;
  }
};


// ========== PROGRESS TRACKING ==========


/**
 * Update user progress
 */
export const updateUserProgress = async (
  userId: string,
  updates: {
    totalQuestions?: number;
    hintsUsed?: number;
    solutionsUnlocked?: number;
    currentStreak?: number;
  }
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);


    if (progressSnap.exists()) {
      // Update existing progress
      const current = progressSnap.data();
      await updateDoc(progressRef, {
        totalQuestions: updates.totalQuestions ?? current.totalQuestions ?? 0,
        hintsUsed: updates.hintsUsed ?? current.hintsUsed ?? 0,
        solutionsUnlocked: updates.solutionsUnlocked ?? current.solutionsUnlocked ?? 0,
        currentStreak: updates.currentStreak ?? current.currentStreak ?? 0,
        updatedAt: Date.now(),
      });
    } else {
      // Create new progress document
      await setDoc(progressRef, {
        userId,
        totalQuestions: updates.totalQuestions ?? 0,
        hintsUsed: updates.hintsUsed ?? 0,
        solutionsUnlocked: updates.solutionsUnlocked ?? 0,
        currentStreak: updates.currentStreak ?? 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error updating user progress:', error);
    throw error;
  }
};


/**
 * Get user progress
 */
export const getUserProgress = async (userId: string) => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);


    if (progressSnap.exists()) {
      return progressSnap.data();
    }


    // Return default progress if none exists
    return {
      totalQuestions: 0,
      hintsUsed: 0,
      solutionsUnlocked: 0,
      currentStreak: 0,
      // 🆕 ADD: Default effort-based fields
      problemsTriedBeforeSolution: 0,
      hintsUsedThisWeek: 0,
      solutionsAfterEffort: 0,
      lastWeekReset: Date.now(),
      effortScore: 0,
    };
  } catch (error) {
    console.error('Error getting user progress:', error);
    throw error;
  }
};


/**
 * Increment a progress metric
 */
export const incrementProgress = async (
  userId: string,
  metric: 'totalQuestions' | 'hintsUsed' | 'solutionsUnlocked' | 'currentStreak'
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);


    let currentValue = 0;
    if (progressSnap.exists()) {
      currentValue = progressSnap.data()[metric] || 0;
    }


    await updateUserProgress(userId, {
      [metric]: currentValue + 1,
    });
  } catch (error) {
    console.error(`Error incrementing ${metric}:`, error);
    throw error;
  }
};


// ========== 🆕 EFFORT-BASED PROGRESS TRACKING (NEW FUNCTIONS) ==========


/**
 * Track when user makes effort before seeing solution
 * Only counts if attemptCount >= 2
 */
export const trackProblemEffort = async (
  userId: string, 
  attemptCount: number
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    
    // Only count if they made 2+ attempts before solution
    if (attemptCount >= 2) {
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        await updateDoc(progressRef, {
          problemsTriedBeforeSolution: increment(1),
          solutionsAfterEffort: increment(1),
          effortScore: increment(attemptCount), // Add total attempts
          updatedAt: Date.now(),
        });
      } else {
        // Create new document if doesn't exist
        await setDoc(progressRef, {
          userId,
          totalQuestions: 0,
          hintsUsed: 0,
          solutionsUnlocked: 0,
          currentStreak: 0,
          problemsTriedBeforeSolution: 1,
          hintsUsedThisWeek: 0,
          solutionsAfterEffort: 1,
          lastWeekReset: Date.now(),
          effortScore: attemptCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  } catch (error) {
    console.error('Error tracking problem effort:', error);
    throw error;
  }
};


/**
 * Track weekly hint usage (resets every 7 days)
 */
export const trackWeeklyHint = async (userId: string): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);
    
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (progressSnap.exists()) {
      const progress = progressSnap.data();
      const lastReset = progress.lastWeekReset || 0;
      
      // Reset weekly counter if 7 days passed
      if (now - lastReset > weekInMs) {
        await updateDoc(progressRef, {
          hintsUsedThisWeek: 1,
          lastWeekReset: now,
          updatedAt: Date.now(),
        });
      } else {
        // Just increment
        await updateDoc(progressRef, {
          hintsUsedThisWeek: increment(1),
          updatedAt: Date.now(),
        });
      }
    } else {
      // Create new document
      await setDoc(progressRef, {
        userId,
        totalQuestions: 0,
        hintsUsed: 1,
        solutionsUnlocked: 0,
        currentStreak: 0,
        problemsTriedBeforeSolution: 0,
        hintsUsedThisWeek: 1,
        solutionsAfterEffort: 0,
        lastWeekReset: now,
        effortScore: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error('Error tracking weekly hint:', error);
    throw error;
  }
};


/**
 * Get effort-based stats for dashboard
 */
export const getEffortStats = async (userId: string) => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);
    
    if (!progressSnap.exists()) {
      return {
        problemsTriedBeforeSolution: 0,
        hintsUsedThisWeek: 0,
        solutionsAfterEffort: 0,
        effortScore: 0,
        averageEffortPerSolution: 0,
      };
    }
    
    const progress = progressSnap.data();
    const solutionsUnlocked = progress.solutionsUnlocked || 1; // Avoid divide by 0
    
    return {
      problemsTriedBeforeSolution: progress.problemsTriedBeforeSolution || 0,
      hintsUsedThisWeek: progress.hintsUsedThisWeek || 0,
      solutionsAfterEffort: progress.solutionsAfterEffort || 0,
      effortScore: progress.effortScore || 0,
      averageEffortPerSolution: Math.round((progress.effortScore || 0) / solutionsUnlocked * 10) / 10,
    };
  } catch (error) {
    console.error('Error getting effort stats:', error);
    throw error;
  }
};
