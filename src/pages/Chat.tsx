import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { Session, ChatMessage, QuestionType, GeminiMode, EffortLevel } from '../types';

// ✅ Backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  'http://localhost:5001/YOUR-PROJECT-ID/us-central1/chat';

const SessionChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ solved: 0, avgAttempts: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    // Fetch Stats for Sidebar
    const fetchStats = async () => {
      try {
        const qSessions = query(
          collection(db, 'sessions'),
          where('userId', '==', auth.currentUser?.uid),
          where('createdAt', '>=', new Date().setHours(0, 0, 0, 0))
        );
        const snap = await getDocs(qSessions);
        const sessions = snap.docs.map(d => d.data() as Session);
        const solved = sessions.filter(s => s.unlocked).length;
        const avg =
          sessions.length > 0
            ? sessions.reduce((acc, s) => acc + s.attemptsCount, 0) / sessions.length
            : 0;
        setStats({ solved, avgAttempts: Number(avg.toFixed(1)) });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();

    // ✅ FIXED: Sync Session Data
    const unsubSession = onSnapshot(doc(db, 'sessions', id), docSnap => {
      if (docSnap.exists()) {
        setSession({ 
          ...docSnap.data(), 
          id: docSnap.id 
        } as Session);
      }
    });

    // ✅ FIXED: Sync Messages
    const qMessages = query(
      collection(db, 'sessions', id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubMessages = onSnapshot(qMessages, snap => {
      const msgs = snap.docs.map(d => ({ 
        ...d.data(), 
        id: d.id 
      })) as ChatMessage[];
      setMessages(msgs);
    });

    return () => {
      unsubSession();
      unsubMessages();
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ UPDATED: Call backend instead of Gemini directly
  const handleSend = async (forcedMode?: 'HINT' | 'SOLUTION') => {
    if ((!input.trim() && !forcedMode) || !session || !id || sending) return;

    setSending(true);
    const userText =
      input.trim() ||
      (forcedMode === 'HINT'
        ? 'I need a hint please.'
        : 'Can I see the solution?');
    setInput('');

    try {
      // 1. Save User Message
      console.log('[SessionChat] Saving user message:', userText);
      await addDoc(collection(db, 'sessions', id, 'messages'), {
        role: 'user',
        text: userText,
        timestamp: Date.now()
      });

      // 2. Call Backend API
      console.log('[SessionChat] Calling backend...');
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            text: m.text,
          })),
          attemptNumber: session.attemptsCount + 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const aiResponse = await response.json();
      console.log('[SessionChat] Backend response:', aiResponse);

      // 3. Save AI Response
      await addDoc(collection(db, 'sessions', id, 'messages'), {
        role: 'ai',
        text: aiResponse.text,
        timestamp: Date.now(),
        replyType: aiResponse.isSolution ? 'SOLUTION' : 'HINT',
        effortScore: session.attemptsCount + 1,
      });

      // 4. Update Session State
      const newAttemptsCount = session.attemptsCount + 1;
      const updateData: Partial<Session> = {
        attemptsCount: newAttemptsCount,
      };

      if (aiResponse.isSolution && !session.unlocked) {
        updateData.unlocked = true;
        updateData.unlockedAt = Date.now();
      }

      console.log('[SessionChat] Updating session:', updateData);
      await updateDoc(doc(db, 'sessions', id), updateData as any);

    } catch (error) {
      console.error('Chat error:', error);
      alert('Error processing message. Check console and backend logs.');
    } finally {
      setSending(false);
    }
  };

  const getEffortLabel = (score?: number): EffortLevel => {
    if (score === undefined) return 'Low';
    if (score <= 3) return 'Low';
    if (score <= 7) return 'Medium';
    return 'High';
  };

  if (!session)
    return (
      <div className="p-8 text-center text-slate-400">
        Loading session...
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)]">
      {/* Sidebar Panel */}
      <aside className="w-full lg:w-72 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Problem Context
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Subject</p>
              <p className="font-semibold text-slate-800">Math / DSA</p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Solved Today</p>
              <p className="text-2xl font-bold text-indigo-600">
                {stats.solved}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Avg Attempts</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.avgAttempts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-100 text-white">
          <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">
            Original Question
          </h3>
          <p className="text-sm line-clamp-6 leading-relaxed opacity-90 italic">
            "{session.questionText}"
          </p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase">
                {session.questionType || 'Evaluating...'}
              </span>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                  getEffortLabel(session.lastEffortScore) === 'High'
                    ? 'bg-emerald-100 text-emerald-700'
                    : getEffortLabel(session.lastEffortScore) === 'Medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Effort: {getEffortLabel(session.lastEffortScore)}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <p className="text-xs font-medium text-slate-500">
                Unlock Progress: {session.attemptsCount}/2 attempts
              </p>
              <div className="flex space-x-1">
                <div
                  className={`w-3 h-3 rounded-full ${
                    session.attemptsCount >= 1
                      ? 'bg-indigo-600'
                      : 'bg-slate-200'
                  }`}
                ></div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    session.attemptsCount >= 2 || session.unlocked
                      ? 'bg-indigo-600'
                      : 'bg-slate-200'
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                <span className="text-3xl">👋</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Ready to start?</h4>
                <p className="text-sm text-slate-500 max-w-xs">
                  Share your current thinking, pseudocode, or initial steps to
                  unlock hints or the full solution.
                </p>
              </div>
            </div>
          )}
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                {m.role === 'ai' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                      Tutor Bot
                    </span>
                    {m.replyType && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          m.replyType === 'HINT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {m.replyType === 'HINT'
                          ? '💡 Hint Mode'
                          : '✅ Solution Unlocked'}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {m.text}
                </div>
                {m.role === 'ai' && m.replyType === 'HINT' && (
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-medium text-slate-400">
                    Hint only – full solution locked until you try more.
                  </p>
                )}
                {m.role === 'ai' && m.replyType === 'SOLUTION' && (
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-medium text-emerald-600">
                    Full solution unlocked after {session.attemptsCount} attempts.
                  </p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex flex-col space-y-2">
            <textarea
              className="w-full p-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none text-sm h-24"
              placeholder="Type your reasoning, attempt, or question here..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSend('HINT')}
                  disabled={sending || session.unlocked}
                  className="px-4 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100 disabled:opacity-50"
                >
                  Get Hint
                </button>
              </div>
              <button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-sm font-bold rounded-lg transition-all shadow-md flex items-center space-x-2"
              >
                {sending ? 'Analyzing...' : 'Send Attempt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionChat;
