import { useState, useCallback } from 'react';

interface AmnesiaState {
  isEnabled: boolean;           // Toggle on/off
  isStudying: boolean;          // Currently in study phase
  isReconstructing: boolean;    // Currently reconstructing
  studyTimeLeft: number;        // Countdown timer
  originalContent: string;      // What AI showed
  difficulty: 'easy' | 'medium' | 'hard'; // Study time duration
}

const STUDY_TIMES = {
  easy: 60,
  medium: 30,
  hard: 10,
};

export const useAmnesiaMode = () => {
  const [state, setState] = useState<AmnesiaState>({
    isEnabled: false,
    isStudying: false,
    isReconstructing: false,
    studyTimeLeft: 0,
    originalContent: '',
    difficulty: 'medium',
  });

  // Toggle amnesia mode on/off
  const toggleAmnesiaMode = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isEnabled: enabled }));
  }, []);

  // Set difficulty level
  const setDifficulty = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    setState(prev => ({ ...prev, difficulty }));
  }, []);

  // Start study phase
  const startStudyPhase = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      isStudying: true,
      isReconstructing: false,
      studyTimeLeft: STUDY_TIMES[prev.difficulty],
      originalContent: content,
    }));
  }, []);

  // Countdown timer tick
  const decrementTimer = useCallback(() => {
    setState(prev => {
      if (prev.studyTimeLeft <= 1) {
        // Timer finished - move to reconstruction
        return {
          ...prev,
          isStudying: false,
          isReconstructing: true,
          studyTimeLeft: 0,
        };
      }
      return {
        ...prev,
        studyTimeLeft: prev.studyTimeLeft - 1,
      };
    });
  }, []);

  // Skip study phase
  const skipToReconstruction = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStudying: false,
      isReconstructing: true,
      studyTimeLeft: 0,
    }));
  }, []);

  // Cancel amnesia mode
  const cancelAmnesiaMode = useCallback(() => {
    setState({
      isEnabled: false,
      isStudying: false,
      isReconstructing: false,
      studyTimeLeft: 0,
      originalContent: '',
      difficulty: 'medium',
    });
  }, []);

  // Complete reconstruction
  const completeReconstruction = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStudying: false,
      isReconstructing: false,
    }));
  }, []);

  return {
    state,
    toggleAmnesiaMode,
    setDifficulty,
    startStudyPhase,
    decrementTimer,
    skipToReconstruction,
    cancelAmnesiaMode,
    completeReconstruction,
  };
};
