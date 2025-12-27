// src/services/auth.ts
import { 
  signInWithRedirect,  // ← Changed from signInWithPopup
  getRedirectResult,   // ← Added
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';

/**
 * Sign in with Google (using redirect instead of popup)
 */
export const signInWithGoogle = async (): Promise<void> => {
  try {
    await signInWithRedirect(auth, googleProvider);
    // User will be redirected, handle result in App.tsx
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Handle redirect result after sign-in
 */
export const handleAuthRedirect = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error('Error handling redirect:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
