import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@school/api-client';

export const AcademicReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'academic'],
    queryFn: () => apiClient.getReports('academic'),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Academic Report</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
