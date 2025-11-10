import { useState, useEffect } from 'react';
import { apiClient } from '@school/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await apiClient.request({
          url: '/api/v1/auth/me',
          method: 'GET',
        }) as { data: User };
        
        setUser(response.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    void loadUser();
  }, []);

  return { user, loading };
};
