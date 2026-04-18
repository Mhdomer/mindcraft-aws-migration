'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading]   = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { user } = await api.get('/api/auth/me');
      setUserData(user);
    } catch {
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Heartbeat — keeps isOnline and lastSeen fresh, same behaviour as before
  useEffect(() => {
    if (!userData) return;
    const interval = setInterval(() => {
      api.post('/api/auth/heartbeat').catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [userData]);

  // Session timeout — 1 hour of inactivity
  useEffect(() => {
    if (!userData) return;
    let timeoutId;
    const TIMEOUT = 3600000;

    const reset = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => logout(), TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'];
    events.forEach(e => document.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => document.removeEventListener(e, reset));
    };
  }, [userData]);

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {}
    setUserData(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user: userData, userData, loading, logout, refetch: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}
