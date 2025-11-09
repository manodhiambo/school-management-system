import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@school/api-client';
import { User } from '@school/shared-types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        return;
      }
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string, role: string) => {
    const response = await apiClient.login({ email, password, role });
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  return { user, login, logout, loading };
};
