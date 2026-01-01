import { useState, useEffect } from 'react';

// 🎭 Voice personas (like ChatGPT)
export const VOICE_MODES = {
  breeze: { name: 'Breeze', emoji: '🌊', description: 'Calm and friendly', rate: 1.0, pitch: 1.1 },
  sage: { name: 'Sage', emoji: '🧙', description: 'Wise and steady', rate: 0.9, pitch: 0.9 },
  spark: { name: 'Spark', emoji: '⚡', description: 'Energetic and quick', rate: 1.2, pitch: 1.2 },
  ember: { name: 'Ember', emoji: '🔥', description: 'Warm and expressive', rate: 1.0, pitch: 1.0 },
  atlas: { name: 'Atlas', emoji: '🗺️', description: 'Deep and confident', rate: 0.95, pitch: 0.85 },
};

export type VoiceMode = keyof typeof VOICE_MODES;

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedMode, setSelectedMode] = useState<VoiceMode>('breeze');

  useEffect(() => {
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      console.warn('⚠️ Text-to-speech not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      console.log('🎤 Available voices:', availableVoices.length);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const getVoiceForMode = (mode: VoiceMode): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // Voice preferences based on mode
    const preferences: Record<VoiceMode, string[]> = {
      breeze: ['Samantha', 'Karen', 'Victoria', 'Zira', 'Google UK English Female'],
      sage: ['Daniel', 'Alex', 'Arthur', 'David', 'Google US English'],
      spark: ['Fiona', 'Kate', 'Tessa', 'Microsoft Zira', 'Google UK English Female'],
      ember: ['Samantha', 'Moira', 'Microsoft Zira', 'Google US English Female'],
      atlas: ['Daniel', 'Oliver', 'Alex', 'Microsoft David', 'Google UK English Male'],
    };

    // Try to find preferred voice
    for (const voiceName of preferences[mode]) {
      const voice = voices.find(v => 
        v.name.includes(voiceName) && v.lang.startsWith('en')
      );
      if (voice) return voice;
    }

    // Fallback: any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  const speak = (text: string, customMode?: VoiceMode) => {
    if (!isSupported) {
      console.warn('Text-to-speech not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text (remove markdown, emojis, code blocks)
    let cleanText = text
      .replace(/```[\s\S]*?```/g, '[code block]') // Replace code with placeholder
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
      .replace(/[🎯💡✅❌🔥🚀📚🧠⏱️🎤🔴💭🔊🔇⚡🌊🗺️]/g, '') // Remove emojis
      .trim();

    if (!cleanText) return;

    // Limit length for better performance (optional)
    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500) + '... text truncated';
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Get mode settings
    const mode = customMode || selectedMode;
    const modeSettings = VOICE_MODES[mode];

    // Set voice
    const voice = getVoiceForMode(mode);
    if (voice) {
      utterance.voice = voice;
      console.log(`🎙️ Using voice: ${voice.name} for mode: ${modeSettings.name}`);
    }

    // Set speech parameters based on mode
    utterance.rate = modeSettings.rate;
    utterance.pitch = modeSettings.pitch;
    utterance.volume = 1.0;

    // Event handlers
    utterance.onstart = () => {
      console.log(`🔊 Speaking in ${modeSettings.name} mode`);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('🔇 Finished speaking');
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event.error);
      setIsSpeaking(false);
    };

    // Speak!
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const changeMode = (mode: VoiceMode) => {
    setSelectedMode(mode);
    localStorage.setItem('voiceMode', mode); // Save preference
  };

  // Load saved preference on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('voiceMode') as VoiceMode;
    if (savedMode && VOICE_MODES[savedMode]) {
      setSelectedMode(savedMode);
    }
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    selectedMode,
    changeMode,
    availableModes: VOICE_MODES,
  };
};

