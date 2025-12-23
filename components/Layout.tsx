import React from 'react';
import Navbar from './Navbar';
import { User } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

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
