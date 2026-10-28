'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { authApi, usersApi } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) {
      setToken(t);
      usersApi.me().then((r) => setUser(r.data)).catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    localStorage.setItem('token', r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    getSocket(r.data.token);
  };

  const signup = async (email: string, password: string, name: string) => {
    const r = await authApi.signup(email, password, name);
    localStorage.setItem('token', r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    getSocket(r.data.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}