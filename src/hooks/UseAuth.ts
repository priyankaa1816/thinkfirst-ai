
import { useState, useEffect } from 'react';
import { auth } from '../firebase';

export const useAuth = () => {
  const [user, setUser] = useState<any>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
};
