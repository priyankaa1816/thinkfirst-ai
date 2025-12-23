
import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">ThinkFirst <span className="text-indigo-600">AI</span></span>
        </Link>

        {user && (
          <div className="flex items-center space-x-6">
            <Link 
              to="/dashboard" 
              className={`text-sm font-medium ${location.pathname === '/dashboard' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-500'}`}
            >
              Start Practice
            </Link>
            <Link 
              to="/progress" 
              className={`text-sm font-medium ${location.pathname === '/progress' ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-500'}`}
            >
              My Progress
            </Link>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              Logout
            </button>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-slate-200"
            />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
