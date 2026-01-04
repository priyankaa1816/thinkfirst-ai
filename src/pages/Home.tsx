import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Sign in failed", err);
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key') {
        setError("Firebase Configuration Error: The API key is invalid for this project. Please ensure your project settings are correct in firebase.ts.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup was closed. Please try again to access your dashboard.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized in the Firebase console. Add it to Authentication > Settings > Authorized Domains.");
      } else {
        setError(err.message || "An unexpected error occurred. Please check the console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="max-w-2xl">
        <div className="inline-block p-3 bg-indigo-50 rounded-2xl mb-6">
          <span className="text-indigo-600 font-semibold text-sm">Brought to you by HackSquad</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Hints before answers.<br/>
          <span className="text-indigo-600">Think</span> before you see.
        </h1>
        <p className="text-xl text-slate-600 mb-10 leading-relaxed">
          The only AI tutor that rewards persistence. Master DSA and Math by tackling questions head-on, with guided help that unlocks only when you show your work.
        </p>
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-pulse">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={handleSignIn}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white p-0.5 rounded-full" />
            )}
            <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-emerald-600 font-bold">1</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Paste Question</h3>
            <p className="text-slate-500 text-sm">Upload any math or coding problem you're stuck on.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-amber-600 font-bold">2</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Show Effort</h3>
            <p className="text-slate-500 text-sm">Attempt the problem. Our AI scores your reasoning in real-time.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-indigo-600 font-bold">3</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Unlock Success</h3>
            <p className="text-slate-500 text-sm">Get hints first. Full solutions unlock after serious attempts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
