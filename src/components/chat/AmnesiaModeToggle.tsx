import React from 'react';

interface AmnesiaModeToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

export const AmnesiaModeToggle: React.FC<AmnesiaModeToggleProps> = ({
  isEnabled,
  onToggle,
  difficulty,
  onDifficultyChange,
}) => {
  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-100">
              Answer Amnesia Mode
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Test your memory after seeing solutions
            </p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
        </label>
      </div>

      {isEnabled && (
        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
            Difficulty Level:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onDifficultyChange('easy')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                difficulty === 'easy'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-700'
              }`}
            >
              Easy (60s)
            </button>
            <button
              onClick={() => onDifficultyChange('medium')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                difficulty === 'medium'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-700'
              }`}
            >
              Medium (30s)
            </button>
            <button
              onClick={() => onDifficultyChange('hard')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                difficulty === 'hard'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-700'
              }`}
            >
              Hard (10s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
