import { useState, useEffect } from 'react';
import { User } from '@school/shared-types';

interface AuthUser extends User {
  token?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getAuthToken: () => string | null;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      setUser({ ...JSON.parse(userStr), token });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Implementation would call auth service
    console.log('Login called with:', email, password);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const getAuthToken = () => localStorage.getItem('accessToken');

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    getAuthToken,
  };
};
