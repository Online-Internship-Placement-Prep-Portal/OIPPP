import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = { STUDENT: '/home', RECRUITER: '/recruiter/listings', ADMIN: '/admin/recruiters' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (session.token ? session.user : null));

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    session.save(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
