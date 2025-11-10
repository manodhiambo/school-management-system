import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@school/api-client';

export const AttendanceReport: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'attendance'],
    queryFn: () => apiClient.getReports('attendance'),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Attendance Report</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
