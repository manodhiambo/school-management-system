import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function AttendanceReport() {
  const { data: report } = useQuery(['reports', 'attendance'], () =>
    apiClient.request({ url: '/api/v1/reports/attendance', method: 'GET' })
  );

  const chartData = report?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={20} />
          Attendance Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="attendance" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
