import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyTimetablePage() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadTimetable();
    }
  }, [user]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getStudentTimetable(user?.id);
      console.log('My timetable:', response);
      setTimetable(Array.isArray(response.data) ? response.data : (response.data?.timetable || []));
    } catch (error: any) {
      console.error('Error loading timetable:', error);
      setError(error?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Timetable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadTimetable} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Timetable</h2>
        <p className="text-gray-500">View your weekly class schedule</p>
      </div>

      <div className="space-y-4">
        {days.map((day, index) => {
          const daySchedule = timetable.find(t => t.day_name === day || t.day === day);
          
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{day}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {daySchedule && daySchedule.periods && daySchedule.periods.length > 0 ? (
                  <div className="space-y-2">
                    {daySchedule.periods.map((period: any, pIndex: number) => (
                      <div key={pIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{period.subject_name || period.subject}</p>
                            <p className="text-sm text-gray-500">{period.teacher_name || period.teacher}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {period.start_time} - {period.end_time}
                          </p>
                          <p className="text-sm text-gray-500">
                            Room {period.room_number || period.room}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No classes scheduled</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
