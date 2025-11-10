import { useState } from 'react';
import { apiClient } from '@school/api-client';

export const PayrollPage: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);

  const loadTeachers = async () => {
    const response = await apiClient.getTeachers();
    setTeachers(response.data);
  };

  const handleProcessPayroll = async () => {
    await apiClient.request({
      url: '/api/v1/admin/staff/salary',
      method: 'POST',
    });
  };

  return (
    <div>
      <button onClick={loadTeachers}>Load Teachers</button>
      <button onClick={handleProcessPayroll}>Process Payroll</button>
      <pre>{JSON.stringify(teachers, null, 2)}</pre>
    </div>
  );
};
