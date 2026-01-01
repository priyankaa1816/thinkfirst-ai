import React, { useState } from 'react';
import { VOICE_MODES, VoiceMode } from '../../hooks/useTextToSpeech';

interface VoiceSelectorProps {
  selectedMode: VoiceMode;
  onChangeMode: (mode: VoiceMode) => void;
  onTestVoice: (mode: VoiceMode) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedMode, onChangeMode, onTestVoice }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm"
      >
        <span className="text-lg">{VOICE_MODES[selectedMode].emoji}</span>
        <span className="font-medium text-gray-700">{VOICE_MODES[selectedMode].name}</span>
        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20 min-w-[280px]">
            <div className="text-xs font-semibold text-gray-500 px-3 py-2 mb-1">
              🎭 Choose Voice Mode
            </div>
            
            {(Object.keys(VOICE_MODES) as VoiceMode[]).map((mode) => {
              const modeData = VOICE_MODES[mode];
              const isSelected = mode === selectedMode;
              
              return (
                <div
                  key={mode}
                  className={`flex items-center justify-between p-3 rounded-lg mb-1 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 border-2 border-indigo-300'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                  onClick={() => {
                    onChangeMode(mode);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{modeData.emoji}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{modeData.name}</div>
                      <div className="text-xs text-gray-500">{modeData.description}</div>
                    </div>
                  </div>
                  
                  {/* Test button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestVoice(mode);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-all"
                  >
                    🔊
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceSelector;
