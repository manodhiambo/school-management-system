import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@school/api-client';

export const EnrollmentReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'enrollment'],
    queryFn: () => apiClient.getReports('enrollment'),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Enrollment Report</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
