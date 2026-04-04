import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '../api/auth.api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ogp_token';
const USER_KEY = 'ogp_user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_KEY);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    persistSession(null, null);
  }, [persistSession]);

  const loginWithResponse = useCallback(
    (res) => {
      const { token: t, user: u } = res.data;
      persistSession(t, u);
    },
    [persistSession]
  );

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.getMe();
      if (data?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch {
      persistSession(null, null);
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      isOrganizer: user?.role === 'organizer',
      isPlayer: user?.role === 'player',
      setUser: (u) => {
        if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
        else localStorage.removeItem(USER_KEY);
        setUser(u);
      },
      loginWithResponse,
      logout,
      refreshUser,
    }),
    [user, token, loading, loginWithResponse, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
