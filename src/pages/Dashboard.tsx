// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserSessions, createSession } from '../services/firebase/firestore';
import { ChatSession } from '../types';

const Dashboard: React.FC = () => {
  const [problemText, setProblemText] = useState('');
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecent = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const sessions = await getUserSessions(auth.currentUser.uid);
        setRecentSessions(sessions.slice(0, 5));
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim() || !auth.currentUser) return;

    setLoading(true);
    
    try {
      const title = problemText.length > 40 
        ? problemText.substring(0, 40) + '...' 
        : problemText;
      
      const sessionId = await createSession(auth.currentUser.uid, title);
      navigate(`/chat/${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What are you working on?</h2>
        <p className="text-gray-500 mb-6">Enter a coding problem, math question, or just say hello.</p>
        
        <form onSubmit={handleStart} className="space-y-4">
          <textarea
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder="e.g., How do I reverse a binary tree?"
            className="w-full p-4 h-32 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!problemText.trim() || loading}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center"
            >
              {loading ? 'Creating...' : 'Start Session'}
              <span className="ml-2">🚀</span>
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Recent Sessions</h3>
          <Link to="/history" className="text-indigo-600 text-sm font-medium hover:underline">View All</Link>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>)}
          </div>
        ) : recentSessions.length > 0 ? (
          <div className="grid gap-4">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                to={`/chat/${s.id}`}
                className="block bg-white border border-gray-100 p-4 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{s.title}</h4>
                    <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500">
                      <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{s.messageCount} messages</span>
                    </div>
                  </div>
                  <span className="text-gray-300 group-hover:text-indigo-400">→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400">No recent sessions yet. Start your first problem above!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
