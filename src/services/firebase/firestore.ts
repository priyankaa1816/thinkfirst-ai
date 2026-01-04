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
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { ChatSession, ChatMessage } from '../../types/index';

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

export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('sessionId', '==', sessionId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);


    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};


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
      const current = progressSnap.data();
      await updateDoc(progressRef, {
        totalQuestions: updates.totalQuestions ?? current.totalQuestions ?? 0,
        hintsUsed: updates.hintsUsed ?? current.hintsUsed ?? 0,
        solutionsUnlocked: updates.solutionsUnlocked ?? current.solutionsUnlocked ?? 0,
        currentStreak: updates.currentStreak ?? current.currentStreak ?? 0,
        updatedAt: Date.now(),
      });
    } else {
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

export const getUserProgress = async (userId: string) => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);


    if (progressSnap.exists()) {
      return progressSnap.data();
    }

    return {
      totalQuestions: 0,
      hintsUsed: 0,
      solutionsUnlocked: 0,
      currentStreak: 0,
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

export const trackProblemEffort = async (
  userId: string, 
  attemptCount: number
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    if (attemptCount >= 2) {
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        await updateDoc(progressRef, {
          problemsTriedBeforeSolution: increment(1),
          solutionsAfterEffort: increment(1),
          effortScore: increment(attemptCount), 
          updatedAt: Date.now(),
        });
      } else {
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

export const trackWeeklyHint = async (userId: string): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);
    
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (progressSnap.exists()) {
      const progress = progressSnap.data();
      const lastReset = progress.lastWeekReset || 0;
      
      if (now - lastReset > weekInMs) {
        await updateDoc(progressRef, {
          hintsUsedThisWeek: 1,
          lastWeekReset: now,
          updatedAt: Date.now(),
        });
      } else {
        await updateDoc(progressRef, {
          hintsUsedThisWeek: increment(1),
          updatedAt: Date.now(),
        });
      }
    } else {
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
    const solutionsUnlocked = progress.solutionsUnlocked || 1;
    
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

export const saveAmnesiaAttempt = async (
  userId: string,
  attemptData: {
    problemId: string;
    originalSolution: string;
    userReconstruction: string;
    logicScore: number;
    passed: boolean;
    keyConcepts: string[];
    missedConcepts: string[];
    feedback: string;
  }
): Promise<string> => {
  try {
    const attemptRef = await addDoc(collection(db, 'amnesiaAttempts'), {
      userId,
      ...attemptData,
      timestamp: Date.now(),
    });

    console.log('Saved amnesia attempt:', attemptRef.id);
    return attemptRef.id;
  } catch (error) {
    console.error('Error saving amnesia attempt:', error);
    throw error;
  }
};

export const getAmnesiaStats = async (userId: string) => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      return {
        totalAttempts: 0,
        perfectStreak: 0,
        currentStreak: 0,
        bestStreak: 0,
        averageScore: 0,
        lastAttemptDate: null,
      };
    }

    const progress = progressSnap.data();
    
    return {
      totalAttempts: progress.amnesiaTotalAttempts || 0,
      perfectStreak: progress.amnesiaPerfectStreak || 0,
      currentStreak: progress.amnesiaCurrentStreak || 0,
      bestStreak: progress.amnesiaBestStreak || 0,
      averageScore: progress.amnesiaAverageScore || 0,
      lastAttemptDate: progress.amnesiaLastAttemptDate || null,
    };
  } catch (error) {
    console.error('Error getting amnesia stats:', error);
    throw error;
  }
};

export const updateAmnesiaStats = async (
  userId: string,
  logicScore: number,
  passed: boolean
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    const now = Date.now();

    if (progressSnap.exists()) {
      const progress = progressSnap.data();
      const totalAttempts = (progress.amnesiaTotalAttempts || 0) + 1;
      const currentStreak = (progress.amnesiaCurrentStreak || 0);
      const bestStreak = progress.amnesiaBestStreak || 0;
      const previousAverage = progress.amnesiaAverageScore || 0;
      
      let newStreak = currentStreak;
      let newBestStreak = bestStreak;
      
      if (passed) {
        newStreak = currentStreak + 1;
        newBestStreak = Math.max(newStreak, bestStreak);
      } else {
        newStreak = 0; 
      }
      
      const newAverage = Math.round(
        ((previousAverage * (totalAttempts - 1)) + logicScore) / totalAttempts
      );

      await updateDoc(progressRef, {
        amnesiaTotalAttempts: totalAttempts,
        amnesiaCurrentStreak: newStreak,
        amnesiaBestStreak: newBestStreak,
        amnesiaPerfectStreak: passed ? increment(1) : (progress.amnesiaPerfectStreak || 0),
        amnesiaAverageScore: newAverage,
        amnesiaLastAttemptDate: now,
        updatedAt: now,
      });
    } else {
      await setDoc(progressRef, {
        userId,
        totalQuestions: 0,
        hintsUsed: 0,
        solutionsUnlocked: 0,
        currentStreak: 0,
        problemsTriedBeforeSolution: 0,
        hintsUsedThisWeek: 0,
        solutionsAfterEffort: 0,
        lastWeekReset: now,
        effortScore: 0,
        amnesiaTotalAttempts: 1,
        amnesiaCurrentStreak: passed ? 1 : 0,
        amnesiaBestStreak: passed ? 1 : 0,
        amnesiaPerfectStreak: passed ? 1 : 0,
        amnesiaAverageScore: logicScore,
        amnesiaLastAttemptDate: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log('Updated amnesia stats for user:', userId);
  } catch (error) {
    console.error('Error updating amnesia stats:', error);
    throw error;
  }
};

export const getRecentAmnesiaAttempts = async (
  userId: string,
  limit: number = 10
): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'amnesiaAttempts'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const attempts = snapshot.docs
      .slice(0, limit)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    return attempts;
  } catch (error) {
    console.error('Error getting recent amnesia attempts:', error);
    throw error;
  }
};

