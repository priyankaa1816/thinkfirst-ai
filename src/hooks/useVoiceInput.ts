import { useState, useEffect } from 'react';

export const useVoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('⚠️ Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    // Configuration
    recognitionInstance.continuous = false;  // Stop after one result
    recognitionInstance.interimResults = false;  // Only final results
    recognitionInstance.lang = 'en-US';  // Language
    recognitionInstance.maxAlternatives = 1;

    // When speech is recognized
    recognitionInstance.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      console.log('🎤 Recognized:', speechResult);
      setTranscript(speechResult);
      setIsListening(false);
    };

    // On error
    recognitionInstance.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone in browser settings.');
      }
    };

    // When recognition ends
    recognitionInstance.onend = () => {
      console.log('🎤 Recognition ended');
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    // Cleanup
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript('');
      setIsListening(true);
      try {
        recognition.start();
        console.log('🎤 Started listening...');
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      console.log('🎤 Stopped listening');
    }
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening
  };
};
