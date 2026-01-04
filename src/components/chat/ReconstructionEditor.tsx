import React, { useState } from 'react';

interface ReconstructionEditorProps {
  onSubmit: (reconstruction: string) => void;
  onCancel: () => void;
  isChecking: boolean;
}

const ReconstructionEditor: React.FC<ReconstructionEditorProps> = ({
  onSubmit,
  onCancel,
  isChecking,
}) => {
  const [reconstruction, setReconstruction] = useState('');

  const handleSubmit = () => {
    if (reconstruction.trim()) {
      onSubmit(reconstruction);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-bold">Reconstruct from Memory</h2>
                <p className="text-purple-100 text-sm">Write the solution you just studied. No peeking!</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isChecking}
              className="text-white/80 hover:text-white text-2xl disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            value={reconstruction}
            onChange={(e) => setReconstruction(e.target.value)}
            disabled={isChecking}
            placeholder="Type your answer here... Focus on the logic and approach, not exact syntax!"
            className="w-full h-64 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-mono text-sm resize-none disabled:bg-gray-100 dark:disabled:bg-gray-700"
            autoFocus
          />

          {/* Tips */}
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Remember:</p>
            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1 list-disc list-inside">
              <li>Focus on the <strong>main algorithm/approach</strong></li>
              <li>Variable names don't need to match exactly</li>
              <li>Syntax differences are okay</li>
              <li>Show you understand the <strong>logic</strong></li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isChecking}
            className="px-6 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isChecking || !reconstruction.trim()}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Checking Your Memory...' : 'Check My Memory'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconstructionEditor;
