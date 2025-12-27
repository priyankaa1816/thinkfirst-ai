// src/hooks/useChat.ts
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  getSession,
  getSessionMessages,
  addMessage,
  updateSession,
  incrementProgress
} from '../services/firebase/firestore';
import { ChatSession, ChatMessage } from '../types';

export const useChat = (sessionId: string) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load session and messages on mount
  useEffect(() => {
    const loadData = async () => {
      if (!sessionId || !auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [sessionData, messagesData] = await Promise.all([
          getSession(sessionId),
          getSessionMessages(sessionId)
        ]);

        setSession(sessionData);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  const sendMessage = async (text: string) => {
    if (!sessionId || !auth.currentUser || !text.trim()) return;

    setSending(true);

    try {
      // Add user message
      const userMessage: Omit<ChatMessage, 'id'> = {
        role: 'user',
        text: text.trim(),
        timestamp: Date.now(),
        senderId: auth.currentUser.uid,
        createdAt: Date.now(),
      };

      const userMessageId = await addMessage(sessionId, userMessage);
      
      // Update local state immediately
      setMessages(prev => [...prev, { ...userMessage, id: userMessageId }]);

      // Call backend for AI response
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      if (backendUrl) {
        // Production: Call Firebase Function
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory: messages.map(m => ({
              role: m.role,
              text: m.text
            })),
            attemptNumber: messages.filter(m => m.role === 'user').length + 1
          })
        });

        if (!response.ok) {
          throw new Error('Backend error');
        }

        const aiResponse = await response.json();

        // Add AI response
        const aiMessage: Omit<ChatMessage, 'id'> = {
          role: 'ai',
          text: aiResponse.text,
          timestamp: Date.now(),
          senderId: 'ai',
          createdAt: Date.now(),
          metadata: {
            isHint: aiResponse.isHint || false,
            isSolution: aiResponse.isSolution || false,
          },
          mode: aiResponse.mode === 'REFUSE_WITH_HINT' ? 'learning' : 'general'
        };

        const aiMessageId = await addMessage(sessionId, aiMessage);
        setMessages(prev => [...prev, { ...aiMessage, id: aiMessageId }]);

        // Update session mode
        const newMode = aiResponse.mode === 'REFUSE_WITH_HINT' ? 'learning' : 'general';
        await updateSession(sessionId, { mode: newMode });
        setSession(prev => prev ? { ...prev, mode: newMode } : null);

        // Track progress
        if (aiResponse.isHint) {
          await incrementProgress(auth.currentUser.uid, 'hintsUsed');
        }
        if (aiResponse.isSolution) {
          await incrementProgress(auth.currentUser.uid, 'solutionsUnlocked');
        }
      } else {
        // Development: Mock AI response
        console.warn('VITE_BACKEND_URL not set. Using mock response.');
        
        const mockAiMessage: Omit<ChatMessage, 'id'> = {
          role: 'ai',
          text: `Mock response to: "${text}"\n\nTo use real AI responses, set up your backend and configure VITE_BACKEND_URL in .env.local`,
          timestamp: Date.now(),
          senderId: 'ai',
          createdAt: Date.now(),
          metadata: {
            isHint: false,
            isSolution: false,
          },
          mode: 'general'
        };

        const mockMessageId = await addMessage(sessionId, mockAiMessage);
        setMessages(prev => [...prev, { ...mockAiMessage, id: mockMessageId }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Omit<ChatMessage, 'id'> = {
        role: 'ai',
        text: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: Date.now(),
        senderId: 'ai',
        createdAt: Date.now(),
      };

      const errorMessageId = await addMessage(sessionId, errorMessage);
      setMessages(prev => [...prev, { ...errorMessage, id: errorMessageId }]);
    } finally {
      setSending(false);
    }
  };

  return {
    session,
    messages,
    loading,
    sending,
    sendMessage
  };
};
