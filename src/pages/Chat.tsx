// src/pages/Chat.tsx

import React, { useRef, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChat } from '../hooks/UseChat';
import MessageBubble from '../components/chat/MessageBubble';
import ModeIndicator from '../components/chat/ModeIndicator';
import { useVoiceInput } from '../hooks/useVoiceInput';
import VoiceSelector from '../components/chat/VoiceSelector';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

const Chat: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { messages, session, loading, sending, sendMessage, conversationContext } = useChat(sessionId || '');
  const [inputText, setInputText] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🎤 VOICE INPUT
  const { isListening, transcript, isSupported, startListening, stopListening } = useVoiceInput();

  // 🔊 TEXT-TO-SPEECH
  const ttsHook = useTextToSpeech();

  // Auto-fill input when voice transcription completes
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            ← Back to Dashboard
          </Link>
          
          {/* 🆕 VOICE SELECTOR */}
          <VoiceSelector
            selectedMode={ttsHook.selectedMode}
            onChangeMode={ttsHook.changeMode}
            onTestVoice={(mode) => {
              const modeData = ttsHook.availableModes[mode];
              ttsHook.speak(`Hello! I'm ${modeData.name}. ${modeData.description}`, mode);
            }}
          />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800">{session?.title || 'Chat Session'}</h1>
        <p className="text-sm text-gray-500">Started {session ? new Date(session.createdAt).toLocaleString() : ''}</p>
      </div>

      {/* Mode Status */}
      <ModeIndicator mode={session?.mode || 'chat'} />

      {/* Learning Mode Indicator */}
      {conversationContext.isLearningMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm">
          <span className="font-semibold">📚 Learning Mode Active</span>
          {' | '}
          <span>Topic: {conversationContext.currentTopic}</span>
          {' | '}
          <span>Attempts: {conversationContext.attemptCount}</span>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-xl text-gray-700">Hello! I'm ThinkFirst AI. How can I help you learn today?</p>
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {sending && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-pulse">💭</div>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with Voice */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          {/* 🎤 MIC BUTTON */}
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={sending}
              className={`px-4 py-3 rounded-xl font-bold transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending || isListening}
            placeholder={isListening ? "🎤 Listening..." : "Type your message or use voice..."}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim() || isListening}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>

        {/* Help Text */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <p>In learning mode, I'll provide hints first to help you solve it yourself!</p>
          {!isSupported && (
            <p className="text-amber-600">💡 Voice input works in Chrome, Edge, Safari</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;





// // src/pages/Chat.tsx

// import React, { useRef, useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { useChat } from '../hooks/UseChat';
// import MessageBubble from '../components/chat/MessageBubble';
// import ModeIndicator from '../components/chat/ModeIndicator';

// // ========== THINKING TIMELINE COMPONENT ========== 
// const ThinkingTimeline = ({ context }: { context: any }) => {
//   const [elapsed, setElapsed] = useState(0);
  
//   useEffect(() => {
//   // ⏱️ FIXED: Only track time when toggle is ON
//   if (!context.problemStartTime || !context.isLearningMode || !context.timeTravelEnabled) {
//     setElapsed(0);
//     return;
//   }
  
//   const interval = setInterval(() => {
//     const now = Date.now();
//     setElapsed(Math.floor((now - context.problemStartTime!) / 1000));
//   }, 1000);
  
//   return () => clearInterval(interval);
// }, [context.problemStartTime, context.isLearningMode, context.timeTravelEnabled]); // ← Added timeTravelEnabled
//  // Fixed: Added isLearningMode dependency
  
//   if (!context.isLearningMode) return null;
  
//   // Fixed: Consistent progressive OR logic
//   const canShowHint1 = elapsed >= 30 && context.attemptCount >= 1;
//   const canShowHint2 = elapsed >= 60 && context.attemptCount >= 2;
//   const canShowHint3 = elapsed >= 90 && context.attemptCount >= 3;
//   const canShowSolution = elapsed >= 120 && context.attemptCount >= 4;
  
//   return (
//     <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 rounded-lg mb-4 shadow-sm">
//       <div className="flex items-center justify-between mb-3">
//         <span className="font-semibold text-indigo-900 flex items-center gap-2">
//           ⏱️ Time-Travel Hints
//         </span>
//         <span className="text-indigo-600 font-mono text-lg font-bold">{elapsed}s</span>
//       </div>
      
//       <div className="space-y-2 text-sm">
//         <div className={`flex items-center gap-2 ${canShowHint1 ? "text-green-600 font-medium" : "text-gray-400"}`}>
//           <span className="text-lg">{canShowHint1 ? "🔓" : "🔒"}</span>
//           <span>Hint 1: Conceptual (30s AND 1 attempt)</span>
//         </div>
//         <div className={`flex items-center gap-2 ${canShowHint2 ? "text-green-600 font-medium" : "text-gray-400"}`}>
//           <span className="text-lg">{canShowHint2 ? "🔓" : "🔒"}</span>
//           <span>Hint 2: Approach (60s AND 2 attempts)</span>
//         </div>
//         <div className={`flex items-center gap-2 ${canShowHint3 ? "text-green-600 font-medium" : "text-gray-400"}`}>
//           <span className="text-lg">{canShowHint3 ? "🔓" : "🔒"}</span>
//           <span>Hint 3: Pseudocode (90s AND 3 attempts)</span>
//         </div>
//         <div className={`flex items-center gap-2 ${canShowSolution ? "text-green-600 font-medium" : "text-gray-400"}`}>
//           <span className="text-lg">{canShowSolution ? "🔓" : "🔒"}</span>
//           <span>Solution (120s AND 4 attempts)</span>
//         </div>
//       </div>
      
//       <div className="mt-3 pt-3 border-t border-indigo-200 flex justify-between text-xs text-indigo-700">
//         <span>📝 Attempts: {context.attemptCount}</span>
//         <span>🧠 Thinking: {Math.round(context.thinkingTimeSeconds || 0)}s</span>
//       </div>
//     </div>
//   );
// };
// // ========== END TIMELINE COMPONENT ==========

// const Chat: React.FC = () => {
//   const { sessionId } = useParams<{ sessionId: string }>();
//   const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
//   const { messages, session, loading, sending, sendMessage, conversationContext } = useChat(sessionId || '', timeTravelEnabled);
//   const [inputText, setInputText] = React.useState('');
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const handleSend = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!inputText.trim()) return;
//     sendMessage(inputText);
//     setInputText('');
//   };

//   if (loading && messages.length === 0) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <div className="text-gray-500">Loading conversation...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white border-b border-gray-200 px-6 py-4">
//         <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-2 inline-block">
//           ← Back to Dashboard
//         </Link>
//         <h1 className="text-2xl font-bold text-gray-800">{session?.title || 'Chat Session'}</h1>
//         <p className="text-sm text-gray-500">Started {session ? new Date(session.createdAt).toLocaleString() : ''}</p>
//       </div>

//       {/* Mode Status */}
//       <ModeIndicator mode={session?.mode || 'chat'} />

//       {/* Debug Context Info (Optional - Remove in production) */}
//       {conversationContext.isLearningMode && (
//         <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm">
//           <span className="font-semibold">📚 Learning Mode Active</span>
//           {' | '}
//           <span>Topic: {conversationContext.currentTopic}</span>
//           {' | '}
//           <span>Attempts: {conversationContext.attemptCount}</span>
//         </div>
//       )}

//       {/* Time-Travel Toggle */}
//       {conversationContext.isLearningMode && (
//         <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <span className="text-sm font-medium text-gray-700">⏱️ Time-Travel Hints Mode</span>
//             <label className="relative inline-flex items-center cursor-pointer">
//               <input
//                 type="checkbox"
//                 checked={timeTravelEnabled}
//                 onChange={(e) => setTimeTravelEnabled(e.target.checked)}
//                 className="sr-only peer"
//               />
//               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
//             </label>
//             <span className="text-xs text-gray-500">
//               {timeTravelEnabled ? 'Hints unlock over time' : 'Instant hints'}
//             </span>
//           </div>
//         </div>
//       )}

//       {/* Timeline Display */}
//       {conversationContext.isLearningMode && timeTravelEnabled && (
//         <div className="px-6 pt-4">
//           <ThinkingTimeline context={conversationContext} />
//         </div>
//       )}

//       {/* Chat Area */}
//       <div className="flex-1 overflow-y-auto p-6 space-y-4">
//         {messages.length === 0 ? (
//           <div className="flex items-center justify-center h-full">
//             <div className="text-center">
//               <div className="text-6xl mb-4">🤖</div>
//               <p className="text-xl text-gray-700">Hello! I'm ThinkFirst AI. How can I help you learn today?</p>
//             </div>
//           </div>
//         ) : (
//           messages.map((m) => <MessageBubble key={m.id} message={m} />)
//         )}
//         {sending && (
//           <div className="flex items-center space-x-2 text-gray-500">
//             <div className="animate-pulse">💭</div>
//             <span>Thinking...</span>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input Area */}
//       <div className="bg-white border-t border-gray-200 p-4">
//         <form onSubmit={handleSend} className="flex items-center space-x-2">
//           <input
//             type="text"
//             value={inputText}
//             onChange={(e) => setInputText(e.target.value)}
//             disabled={sending}
//             placeholder="Type your message..."
//             className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
//           />
//           <button
//             type="submit"
//             disabled={sending || !inputText.trim()}
//             className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//           >
//             {sending ? '...' : 'Send'}
//           </button>
//         </form>
//         <p className="text-xs text-gray-500 text-center mt-2">
//           In learning mode, I'll provide hints first to help you solve it yourself!
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Chat;
