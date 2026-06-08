import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage, safeSessionStorage, zustandSafeStorage } from './safeStorage';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  tenant_id?: string | null;
  tenant_name?: string;
  tenant_status?: string;
  disabled_modules?: string[];
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
          safeLocalStorage.setItem('accessToken', accessToken);
          safeLocalStorage.setItem('token', accessToken);
          if (refreshToken) safeLocalStorage.setItem('refreshToken', refreshToken);
          safeSessionStorage.removeItem('accessToken');
          safeSessionStorage.removeItem('token');
          safeSessionStorage.removeItem('refreshToken');
        } else {
          safeSessionStorage.setItem('accessToken', accessToken);
          safeSessionStorage.setItem('token', accessToken);
          if (refreshToken) safeSessionStorage.setItem('refreshToken', refreshToken);
          safeLocalStorage.removeItem('accessToken');
          safeLocalStorage.removeItem('token');
          safeLocalStorage.removeItem('refreshToken');
        }
        set({ user, accessToken, refreshToken: refreshToken || null, isAuthenticated: true });
      },
      clearAuth: () => {
        safeLocalStorage.removeItem('accessToken');
        safeLocalStorage.removeItem('token');
        safeLocalStorage.removeItem('user');
        safeLocalStorage.removeItem('refreshToken');
        safeSessionStorage.removeItem('accessToken');
        safeSessionStorage.removeItem('token');
        safeSessionStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandSafeStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.accessToken) {
          const sessionToken = safeSessionStorage.getItem('accessToken');
          if (sessionToken) {
            state.accessToken = sessionToken;
            state.isAuthenticated = true;
          }
        }
      },
    }
  )
);
