import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen } from 'lucide-react';

export default function AcademicReport() {
  const { data: report } = useQuery(['reports', 'academic'], () =>
    apiClient.request({ url: '/api/v1/reports/academic', method: 'GET' })
  );

  const radarData = [
    { subject: 'Maths', A: 85, B: 78, fullMark: 100 },
    { subject: 'Science', A: 82, B: 75, fullMark: 100 },
    { subject: 'English', A: 88, B: 82, fullMark: 100 },
    { subject: 'Social Studies', A: 78, B: 70, fullMark: 100 },
    { subject: 'Hindi', A: 75, B: 68, fullMark: 100 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Performance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            <Radar name="Current Term" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Radar name="Previous Term" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
