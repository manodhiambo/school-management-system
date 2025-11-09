import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { DollarSign } from 'lucide-react';

export default function Payroll() {
  const { data: teachers } = useQuery(['teachers'], () => apiClient.getTeachers());
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const processPayrollMutation = useMutation(
    () => apiClient.request({ url: '/api/v1/admin/staff/salary', method: 'POST' }),
    {
      onSuccess: () => {
        addToast('success', 'Payroll processed successfully');
        queryClient.invalidateQueries(['teachers']);
      },
      onError: () => {
        addToast('error', 'Failed to process payroll');
      },
    }
  );

  const columns = [
    { key: 'employeeId', title: 'Employee ID' },
    { key: 'name', title: 'Name', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { key: 'designation', title: 'Designation' },
    { key: 'salary', title: 'Salary', render: () => '₹65,000' },
    { key: 'status', title: 'Status', render: () => 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payroll Management</h1>
        <Button onClick={() => processPayrollMutation.mutate()} disabled={processPayrollMutation.isLoading}>
          <DollarSign size={16} className="mr-2" />
          Process Monthly Payroll
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={teachers?.data || []} />
        </CardContent>
      </Card>
    </div>
  );
}
