import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage } from '../../types';
import { useTextToSpeech } from '../../hooks/useTexttoSpeech';

interface MessageBubbleProps {
  message: ChatMessage;
  onStartAmnesiaChallenge?: (content: string) => void; // 🆕 NEW PROP
  isAmnesiaEnabled?: boolean; // 🆕 NEW PROP
}

// 🎨 Render message with syntax highlighting
const renderMessage = (text: string) => {
  // Match both ```
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```|``(\w+)?\s*\n([\s\S]*?)``/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Extract language and code (works for both ``` and ``)
    const language = match[1] || match[3] || 'python';
    const code = match[2] || match[4];
    
    if (code) {
      parts.push(
        <SyntaxHighlighter
          key={`code-${match.index}`}
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: '8px 0',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>
    );
  }

  return parts.length > 0 ? parts : text;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onStartAmnesiaChallenge, 
  isAmnesiaEnabled = false 
}) => {
  const isAi = message.role === 'ai';
  
  // 🆕 TEXT-TO-SPEECH HOOK
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

  // 🆕 HANDLE SPEAKER BUTTON CLICK
  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(message.text);
    }
  };

  // 🆕 HANDLE AMNESIA CHALLENGE
  const handleAmnesiaChallenge = () => {
    if (onStartAmnesiaChallenge) {
      onStartAmnesiaChallenge(message.text);
    }
  };
  
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
          {renderMessage(message.text)}
        </div>
        
        {isAi && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
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
            
            {/* 🆕 SPEAKER BUTTON */}
            {isSupported && (
              <button
                onClick={handleSpeak}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-all hover:scale-110 ${
                  isSpeaking
                    ? 'bg-red-100 text-red-800 animate-pulse'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              >
                {isSpeaking ? '🔇 Stop' : '🔊 Listen'}
              </button>
            )}

            {/* 🆕 AMNESIA CHALLENGE BUTTON - Only show if solution and amnesia enabled */}
            {message.metadata?.isSolution && isAmnesiaEnabled && onStartAmnesiaChallenge && (
              <button
                onClick={handleAmnesiaChallenge}
                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg transition-all hover:scale-105 animate-pulse"
                title="Test your memory!"
              >
                🧠 Start Amnesia Challenge
              </button>
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



// import React from 'react';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// import { ChatMessage } from '../../types';
// import { useTextToSpeech } from '../../hooks/useTexttoSpeech'; // 🆕 ADD

// interface MessageBubbleProps {
//   message: ChatMessage;
// }

// // 🎨 Render message with syntax highlighting
// const renderMessage = (text: string) => {
//   const codeBlockRegex = /``````/g;
//   const parts = [];
//   let lastIndex = 0;
//   let match;

//   while ((match = codeBlockRegex.exec(text)) !== null) {
//     // Add text before code block
//     if (match.index > lastIndex) {
//       parts.push(
//         <span key={`text-${lastIndex}`}>
//           {text.substring(lastIndex, match.index)}
//         </span>
//       );
//     }

//     // Add code block with syntax highlighting
//     const language = match[1] || 'javascript';
//     const code = match[2];
//     parts.push(
//       <SyntaxHighlighter
//         key={`code-${match.index}`}
//         language={language}
//         style={vscDarkPlus}
//         customStyle={{
//           margin: '8px 0',
//           borderRadius: '8px',
//           fontSize: '14px'
//         }}
//       >
//         {code}
//       </SyntaxHighlighter>
//     );

//     lastIndex = match.index + match[0].length;
//   }

//   // Add remaining text after last code block
//   if (lastIndex < text.length) {
//     parts.push(
//       <span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>
//     );
//   }

//   return parts.length > 0 ? parts : text;
// };

// const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
//   const isAi = message.role === 'ai';
  
//   // 🆕 TEXT-TO-SPEECH HOOK
//   const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

//   // 🆕 HANDLE SPEAKER BUTTON CLICK
//   const handleSpeak = () => {
//     if (isSpeaking) {
//       stop();
//     } else {
//       speak(message.text);
//     }
//   };
  
//   return (
//     <div className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
//       <div
//         className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
//           isAi
//             ? 'bg-white border border-gray-100 text-gray-800'
//             : 'bg-indigo-600 text-white'
//         }`}
//       >
//         <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
//           {renderMessage(message.text)}
//         </div>
        
//         {isAi && (
//           <div className="mt-2 flex flex-wrap gap-2 items-center">
//             {message.metadata?.isHint && (
//               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
//                 💡 Hint
//               </span>
//             )}
//             {message.metadata?.isSolution && (
//               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
//                 ✅ Solution
//               </span>
//             )}
//             {message.mode === 'learning' && (
//               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600">
//                 🧠 Learning Mode
//               </span>
//             )}
            
//             {/* 🆕 SPEAKER BUTTON */}
//             {isSupported && (
//               <button
//                 onClick={handleSpeak}
//                 className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-all hover:scale-110 ${
//                   isSpeaking
//                     ? 'bg-red-100 text-red-800 animate-pulse'
//                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                 }`}
//                 title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
//               >
//                 {isSpeaking ? '🔇 Stop' : '🔊 Listen'}
//               </button>
//             )}
//           </div>
//         )}
        
//         <div className={`mt-1 text-[10px] ${isAi ? 'text-gray-400' : 'text-indigo-200'}`}>
//           {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MessageBubble;

