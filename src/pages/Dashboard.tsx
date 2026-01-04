import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserSessions, createSession, getEffortStats, getAmnesiaStats } from '../services/firebase/firestore'; 
import { ChatSession } from '../types';

const Dashboard: React.FC = () => {
  const [problemText, setProblemText] = useState('');
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [effortStats, setEffortStats] = useState({
    problemsTriedBeforeSolution: 0,
    hintsUsedThisWeek: 0,
    solutionsAfterEffort: 0,
    effortScore: 0,
    averageEffortPerSolution: 0
  });
  const [amnesiaStats, setAmnesiaStats] = useState({
    totalAttempts: 0,
    perfectStreak: 0,
    currentStreak: 0,
    bestStreak: 0,
    averageScore: 0,
    lastAttemptDate: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [sessions, stats, amnesia] = await Promise.all([
          getUserSessions(auth.currentUser.uid),
          getEffortStats(auth.currentUser.uid),
          getAmnesiaStats(auth.currentUser.uid)
        ]);
        
        setRecentSessions(sessions.slice(0, 5));
        setEffortStats(stats);
        setAmnesiaStats(amnesia); 
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What is this chat about?</h2>
        <p className="text-gray-500 mb-6">To solve a coding problem, math question, or just say hello.</p>
        
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
            </button>
          </div>
        </form>
      </section>

      {/* EFFORT-BASED PROGRESS SECTION */}
      <section className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-sm border-2 border-purple-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">Effort-Based Progress</h3>
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-purple-100 rounded-lg"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Problems Tried Before Solution */}
            <div className="bg-white p-5 rounded-xl border border-purple-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Problems Tried Before Answers</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-600">
                  {effortStats.problemsTriedBeforeSolution}
                </span>
                <span className="text-sm text-gray-500">problems</span>
              </div>
            </div>

            {/* Stat 2: Hints This Week */}
            <div className="bg-white p-5 rounded-xl border border-indigo-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Hints Used This Week</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-600">
                  {effortStats.hintsUsedThisWeek}
                </span>
                <span className="text-sm text-gray-500">hints</span>
              </div>
            </div>

            {/* Stat 3: Solutions After Effort */}
            <div className="bg-white p-5 rounded-xl border border-green-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Solutions After Effort</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-600">
                  {effortStats.solutionsAfterEffort}
                </span>
                <span className="text-sm text-gray-500">unlocked</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">2+ attempts before solution</p>
            </div>

            {/* Stat 4: Effort Score */}
            <div className="bg-white p-5 rounded-xl border border-purple-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Effort Score</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-700">
                  {effortStats.averageEffortPerSolution.toFixed(1)}x
                </span>
                <span className="text-sm text-gray-500">avg</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Attempts per solution</p>
            </div>
          </div>
        )}
      </section>

      {/* AMNESIA MODE STATS SECTION */}
      <section className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl shadow-sm border-2 border-pink-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">Answer Amnesia Mode</h3>
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-pink-100 rounded-lg"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Total Attempts */}
            <div className="bg-white p-5 rounded-xl border border-pink-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Attempts</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-pink-600">
                  {amnesiaStats.totalAttempts}
                </span>
                <span className="text-sm text-gray-500">times</span>
              </div>
            </div>

            {/* Stat 2: Average Score */}
            <div className="bg-white p-5 rounded-xl border border-purple-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Average Logic Score</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-600">
                  {amnesiaStats.averageScore}
                </span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {amnesiaStats.averageScore >= 80 ? 'Excellent!' : amnesiaStats.averageScore >= 60 ? 'Good!' : 'Keep practicing!'}
              </p>
            </div>

            {/* Stat 3: Current Streak */}
            <div className="bg-white p-5 rounded-xl border border-orange-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Current Streak</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-600">
                  {amnesiaStats.currentStreak}
                </span>
                <span className="text-sm text-gray-500">passed</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">80+ score to continue</p>
            </div>

            {/* Stat 4: Best Streak */}
            <div className="bg-white p-5 rounded-xl border border-yellow-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Best Streak</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-yellow-600">
                  {amnesiaStats.bestStreak}
                </span>
                <span className="text-sm text-gray-500">record</span>
              </div>
            </div>
          </div>
        )}
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