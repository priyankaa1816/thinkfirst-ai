import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import History from './pages/History';
import PracticePage from './pages/PracticePage';
import { auth } from './firebase';

const App: React.FC = () => {
  const [user, setUser] = React.useState<any>(auth.currentUser);

  React.useEffect(() => {
    return auth.onAuthStateChanged((u: any) => {
      setUser(u);
    });
  }, []);

  return (
    <Router>
      <Routes>
        {!user ? (
          <Route path="*" element={<Home />} />
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat/:sessionId" element={<Chat />} />
            <Route path="/history" element={<History />} />
            <Route path="/practice" element={<PracticePage />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
};

export default App;
