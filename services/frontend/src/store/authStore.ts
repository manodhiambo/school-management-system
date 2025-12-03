import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        console.log('Setting auth with user:', user);
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken); // Also set as 'token' for compatibility
        set({ user, accessToken, isAuthenticated: true });
      },
      clearAuth: () => {
        console.log('Clearing auth');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    { 
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('Auth store rehydrated:', state?.user);
      }
    }
  )
);
