
import React from 'react';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isAi = message.role === 'ai';
  
  return (
    <div className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
          isAi
            ? 'bg-white border border-gray-100 text-gray-800'
            : 'bg-indigo-600 text-white'
        }`}
      >
        <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
          {message.text}
        </div>
        
        {isAi && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.metadata?.isHint && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                💡 Hint
              </span>
            )}
            {message.metadata?.isSolution && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                ✅ Solution
              </span>
            )}
            {message.mode === 'learning' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">
                🧠 Learning Mode
              </span>
            )}
          </div>
        )}
        
        <div className={`mt-1 text-[10px] ${isAi ? 'text-gray-400' : 'text-indigo-200'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
