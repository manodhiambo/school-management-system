import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign } from 'lucide-react';

export default function FinanceReport() {
  const { data: report } = useQuery(['reports', 'finance'], () =>
    apiClient.request({ url: '/api/v1/reports/finance', method: 'GET' })
  );

  const pieData = [
    { name: 'Collected', value: report?.data?.collected || 0, color: '#10b981' },
    { name: 'Pending', value: report?.data?.pending || 0, color: '#ef4444' },
    { name: 'Overdue', value: report?.data?.overdue || 0, color: '#f59e0b' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign size={20} />
          Fee Collection Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
