
import React from 'react';

interface ModeIndicatorProps {
  mode: 'learning' | 'general';
}

const ModeIndicator: React.FC<ModeIndicatorProps> = ({ mode }) => {
  const isLearning = mode === 'learning';

  return (
    <div className={`py-2 px-4 flex items-center justify-center transition-colors duration-300 ${
      isLearning ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-gray-50 border-b border-gray-100'
    }`}>
      <div className="flex items-center space-x-2">
        <span className="text-xl">{isLearning ? '🧠' : '💬'}</span>
        <span className={`text-sm font-semibold uppercase tracking-wider ${
          isLearning ? 'text-indigo-700' : 'text-gray-600'
        }`}>
          {isLearning ? 'Learning Mode Active' : 'General Assistant Mode'}
        </span>
      </div>
      {isLearning && (
        <div className="ml-4 hidden md:block">
          <p className="text-xs text-indigo-500 italic">Hints will be provided before solutions.</p>
        </div>
      )}
    </div>
  );
};

export default ModeIndicator;
