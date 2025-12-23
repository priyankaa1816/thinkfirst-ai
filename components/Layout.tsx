
import React from 'react';
import Navbar from './Navbar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>
      <footer className="py-6 border-t border-slate-200 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} ThinkFirst AI - Built for GDG Hackathon
      </footer>
    </div>
  );
};

export default Layout;
