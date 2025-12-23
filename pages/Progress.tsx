
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Session } from '../types';
import { Link } from 'react-router-dom';

const Progress: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Session)));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading your progress...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Progress</h1>
          <p className="text-slate-500">Track your learning journey and effort milestones.</p>
        </div>
        <Link 
          to="/dashboard" 
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg"
        >
          New Problem
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-slate-300">📔</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">No sessions yet</h3>
          <p className="text-slate-500 mb-6">Start your first practice session to see your progress here.</p>
          <Link to="/dashboard" className="text-indigo-600 font-bold hover:underline">Begin your first challenge &rarr;</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((s) => (
            <Link 
              key={s.id} 
              to={`/session/${s.id}`}
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50 transition-all flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                    {s.questionType || 'Evaluating'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                  {s.questionText}
                </h3>
                <div className="flex items-center space-x-6 mt-3">
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span className="text-xs font-medium">{s.attemptsCount} Attempts</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-xs font-medium">{s.unlocked ? 'Full Solution' : 'Hints only'}</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                {s.unlocked ? (
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Progress;
