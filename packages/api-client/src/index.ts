export * from './services/attendanceService';
export * from './services/studentService';
export * from './services/teacherService';
export * from './services/feeService';
export { apiClient } from './client';

// React hook
import { useState, useEffect } from 'react';
import { apiClient } from './client';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(url);
        setData(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}
