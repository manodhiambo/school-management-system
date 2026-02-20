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
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, rememberMe?: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, rememberMe = true) => {
        if (rememberMe) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('token', accessToken);
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
        } else {
          sessionStorage.setItem('accessToken', accessToken);
          sessionStorage.setItem('token', accessToken);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
        }
        set({ user, accessToken, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('token');
        set({ user: null, accessToken: null, isAuthenticated: false });
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
