import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../firebase';

const Navbar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'History', path: '/history' },
    { label: 'Brain Scanner', path: '/practice' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600">ThinkFirst AI</span>
            </Link>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4 hidden md:block">
              {auth.currentUser?.email}
            </span>
            <button
              onClick={() => auth.signOut()}
              className="ml-4 px-3 py-1 text-sm text-gray-700 hover:text-indigo-600 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
