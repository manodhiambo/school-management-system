import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@school/api-client';

export const FinanceReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'finance'],
    queryFn: () => apiClient.getReports('finance'),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Finance Report</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
