
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const Dashboard: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !auth.currentUser) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: auth.currentUser.uid,
        questionText: question,
        createdAt: Date.now(),
        unlocked: false,
        attemptsCount: 0,
      });
      navigate(`/session/${docRef.id}`);
    } catch (error) {
      console.error("Error creating session", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Start a New Session</h2>
        <p className="text-slate-500 mb-8">What problem are we tackling today?</p>
        
        <form onSubmit={handleStartSession} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Practice Question
            </label>
            <textarea
              className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none bg-slate-50"
              placeholder="Example: How do I find the longest palindromic substring in O(n) time? Or, solve for x: 2x + 5 = 15..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Initializing Tutor...</span>
              </span>
            ) : (
              "Start Session"
            )}
          </button>
        </form>

        <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <h4 className="text-sm font-bold text-indigo-700 mb-1 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            How it works
          </h4>
          <p className="text-xs text-indigo-600 leading-relaxed">
            The tutor will ask you to explain your logic first. If your effort is high enough or you make 2 serious attempts, the full solution will unlock automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
