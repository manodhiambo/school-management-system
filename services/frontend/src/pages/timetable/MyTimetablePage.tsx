import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export function MyTimetablePage() {
  const { user } = useAuth();
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
      // For students: get their class timetable
      // For teachers: get their teaching schedule
      let response;
      if (user?.role === 'teacher') {
        response = await api.getTeacherTimetable(user.id);
      } else {
        // Get student's timetable
        response = await api.getStudentTimetable(user?.id);
      }
      console.log('My timetable data:', response);
      setTimetable(response.timetable || response || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Timetable</h2>
        <p className="text-gray-500">View your weekly schedule</p>
      </div>

      <div className="space-y-4">
        {timetable.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No timetable data available</p>
            </CardContent>
          </Card>
        ) : (
          timetable.map((day, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{day.day_name || day.day}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {day.periods && day.periods.length > 0 ? (
                    day.periods.map((period: any, pIndex: number) => (
                      <div key={pIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{period.subject_name || period.subject}</p>
                          <p className="text-sm text-gray-500">{period.teacher_name || period.teacher}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{period.start_time} - {period.end_time}</p>
                          <p className="text-sm text-gray-500">Room {period.room_number || period.room}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No classes scheduled</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
