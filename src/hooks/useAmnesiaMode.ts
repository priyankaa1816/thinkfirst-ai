import { useState, useCallback } from 'react';

interface AmnesiaState {
  isEnabled: boolean;           
  isStudying: boolean;          
  isReconstructing: boolean;    
  studyTimeLeft: number;        
  originalContent: string;      
  difficulty: 'easy' | 'medium' | 'hard'; 
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

  const toggleAmnesiaMode = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isEnabled: enabled }));
  }, []);

  const setDifficulty = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    setState(prev => ({ ...prev, difficulty }));
  }, []);

  const startStudyPhase = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      isStudying: true,
      isReconstructing: false,
      studyTimeLeft: STUDY_TIMES[prev.difficulty],
      originalContent: content,
    }));
  }, []);

  const decrementTimer = useCallback(() => {
    setState(prev => {
      if (prev.studyTimeLeft <= 1) {
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

  const skipToReconstruction = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStudying: false,
      isReconstructing: true,
      studyTimeLeft: 0,
    }));
  }, []);

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
