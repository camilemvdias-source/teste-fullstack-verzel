import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Se há token guardado, ainda precisamos confirmar quem é a pessoa
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/me')
      .then((me) => setUser(me))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Token venceu em qualquer chamada: volta para deslogado
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(data.token);
    // /me traz também o saldo e o código público (usado para marcar "Você" no histórico)
    try {
      setUser(await api('/me'));
    } catch {
      setUser(data.user);
    }
    return data.user;
  }, []);

  const register = useCallback(
    async ({ name, email, password, role }) => {
      await api('/auth/register', { method: 'POST', body: { name, email, password, role }, auth: false });
      return login(email, password);
    },
    [login]
  );

  // Recarrega nome e saldo (depois de um lance ou depósito)
  const refreshUser = useCallback(async () => {
    try {
      setUser(await api('/me'));
    } catch {
      /* se o token venceu, o client já avisa o app */
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
