import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Calendar, Clock, Users } from 'lucide-react';

export default function TimetableBuilder() {
  const [selectedClass, setSelectedClass] = useState('CLASS001');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: classes } = useQuery(['classes'], () => apiClient.getClasses());
  const { data: timetable } = useQuery(
    ['timetable', selectedClass],
    () => apiClient.request({ url: `/api/v1/timetable/class/${selectedClass}`, method: 'GET' })
  );

  const generateMutation = useMutation(
    () => apiClient.request({
      url: '/api/v1/timetable/generate',
      method: 'POST',
      data: { classId: selectedClass },
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['timetable', selectedClass]);
        addToast('success', 'Timetable generated successfully');
      },
      onError: () => {
        addToast('error', 'Failed to generate timetable');
      },
    }
  );

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const periods = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const columns = [
    {
      key: 'period',
      title: 'Period',
    },
    ...days.map((day) => ({
      key: day,
      title: day.charAt(0).toUpperCase() + day.slice(1),
      render: (value: any, record: any) => {
        const entry = timetable?.data?.find(
          (t: any) => t.dayOfWeek === day && t.periodId === record.period
        );
        return entry ? (
          <div className="text-sm">
            <div className="font-medium">{entry.subjectId}</div>
            <div className="text-xs text-gray-500">{entry.teacherId}</div>
          </div>
        ) : (
          <span className="text-gray-400">Free</span>
        );
      },
    })),
  ];

  const periodRows = periods.map((period) => ({
    period: `Period ${period}`,
    periodId: period,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Timetable Builder</h2>
        <Button onClick={() => generateMutation.mutate()}>
          Auto Generate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {classes?.data?.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.section}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={periodRows}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
