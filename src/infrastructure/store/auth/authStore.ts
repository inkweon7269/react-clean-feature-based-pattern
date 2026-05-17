import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { AuthTokens } from '@/domain/auth/entities';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (tokens: AuthTokens) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),
      clearTokens: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: (name): StorageValue<AuthState> | null => {
          const value = Cookies.get(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          Cookies.set(name, JSON.stringify(value), {
            expires: 7,
            sameSite: 'Lax',
            secure: import.meta.env.PROD,
            path: '/',
          });
        },
        removeItem: (name) => {
          Cookies.remove(name, { path: '/' });
        },
      },
    },
  ),
);
