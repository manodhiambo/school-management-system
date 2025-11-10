import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, Button, DataTable } from '@school/shared-ui';
import { apiClient } from '@school/api-client';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

export const Payroll: React.FC = () => {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => apiClient.getTeachers(),
  });

  const processSalary = useMutation({
    mutationFn: () => apiClient.request({
      url: '/api/v1/admin/staff/salary',
      method: 'POST',
    }),
  });

  // Use type assertion to fix the 'key' type mismatch
  const columns = [
    { key: 'employeeId', header: 'Employee ID' },
    { key: 'firstName', header: 'First Name' },
    { key: 'lastName', header: 'Last Name' },
    {
      key: 'fullName' as any, // Allow computed fields not in Teacher interface
      header: 'Full Name',
      render: (_: any, record: Teacher) => `${record.firstName} ${record.lastName}`,
    },
  ] as const;

  if (isLoading) return <div>Loading teachers...</div>;

  return (
    <Card>
      <CardContent>
        <h1>Payroll Processing</h1>
        <DataTable 
          columns={columns as any} // Type assertion for DataTable props
          data={teachers?.data || []} 
        />
        <Button 
          onClick={() => processSalary.mutate()}
          loading={processSalary.isPending}
          style={{ marginTop: '1rem' }}
        >
          Process Salary
        </Button>
      </CardContent>
    </Card>
  );
};
