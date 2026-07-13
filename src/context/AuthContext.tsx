import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, logout as logoutRequest, refresh as refreshRequest, type AuthUser } from '../services/authApi';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: AuthUser['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_KEY = 'zaikaHubAccessToken';
const USER_KEY = 'zaikaHubUser';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshRequest()
      .then((session) => {
        setUser(session.user);
        setAccessToken(session.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
        localStorage.setItem(ACCESS_KEY, session.accessToken);
      })
      .catch(() => {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ACCESS_KEY);
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      loading,
      login: async (email, password) => {
        const session = await loginRequest(email, password);
        setUser(session.user);
        setAccessToken(session.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(session.user));
        localStorage.setItem(ACCESS_KEY, session.accessToken);
      },
      logout: async () => {
        if (accessToken) await logoutRequest(accessToken).catch(() => undefined);
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ACCESS_KEY);
      },
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [accessToken, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
