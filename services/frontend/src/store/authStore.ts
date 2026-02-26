import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  tenant_id?: string | null;
  tenant_name?: string;
  tenant_status?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, rememberMe?: boolean, refreshToken?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, rememberMe = true, refreshToken?: string) => {
        if (rememberMe) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('token', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('refreshToken');
        } else {
          sessionStorage.setItem('accessToken', accessToken);
          sessionStorage.setItem('token', accessToken);
          if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
        set({ user, accessToken, refreshToken: refreshToken || null, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // If token only lives in sessionStorage (no rememberMe), restore it
        if (state && !state.accessToken) {
          const sessionToken = sessionStorage.getItem('accessToken');
          if (sessionToken) {
            state.accessToken = sessionToken;
            state.isAuthenticated = true;
          }
        }
      }
    }
  )
);
