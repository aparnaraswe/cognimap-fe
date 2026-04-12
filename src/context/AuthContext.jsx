import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);
const USER_KEY = 'cm_user';

// Read cached user synchronously so refresh shows the user immediately
function loadCachedUser() {
  try {
    const tok = api.getToken();
    if (!tok) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  // Hydrate from cache immediately — no flash of logged-out state on refresh
  const [user, setUser] = useState(() => loadCachedUser());
  const [loading, setLoading] = useState(() => {
    // If we have cached user + valid token, no need to "load" — already logged in
    return !loadCachedUser();
  });

  // Background re-validate the session (silent — doesn't show loading screen)
  useEffect(() => {
    const token = api.getToken();
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      })
      .catch(() => {
        // Only clear if we don't already have a cached user
        // (avoids logging the user out on a transient backend error)
        if (!loadCachedUser()) {
          api.setToken(null);
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    api.setToken(data.token);
    setUser(data.user);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    // ── Source selection rules on login ──
    if (data.user?.role === 'super_admin') {
      localStorage.removeItem('cognimap_active_source');
    } else {
      const myId = data.user?.source_id || data.user?.organization_id;
      if (myId) localStorage.setItem('cognimap_active_source', myId);
    }
    localStorage.removeItem('cognimap_active_batch');
    return data.user;
  }, []);

  const tokenLogin = useCallback(async (token) => {
    const data = await api.post('/auth/token-access', { token });
    api.setToken(data.token);
    setUser(data.user);
    if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await api.post('/auth/register', userData);
    api.setToken(data.token);
    setUser(data.user);
    if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('cognimap_active_source');
    localStorage.removeItem('cognimap_active_batch');
  }, []);

  // Auto-logout when the 30-min session window expires
  useEffect(() => {
    if (!user) return;
    const checkExpiry = () => {
      if (!api.getToken()) {
        // Token was cleared by api.js (session expired)
        setUser(null);
        localStorage.removeItem(USER_KEY);
      }
    };
    const interval = setInterval(checkExpiry, 30 * 1000); // check every 30s
    return () => clearInterval(interval);
  }, [user]);

  const isAdmin = user && ['super_admin', 'psychologist', 'client_admin'].includes(user.role);
  const isSuperAdmin = user && user.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, tokenLogin, register, logout, isAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
