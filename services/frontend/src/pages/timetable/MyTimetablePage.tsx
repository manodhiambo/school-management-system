import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export function MyTimetablePage() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (user?.id) {
      loadTimetable();
    }
  }, [user?.id]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading timetable for user:', user?.id, 'role:', user?.role);
      
      let response: any;
      if (user?.role === 'teacher') {
        response = await api.getTeacherTimetable(user.id);
      } else {
        response = await api.getStudentTimetable(user?.id || '');
      }
      
      console.log('Timetable API response:', JSON.stringify(response, null, 2));
      
      // Handle the response - it could be { success, data } or direct array
      const timetableData = response?.data || response || [];
      console.log('Timetable data extracted:', JSON.stringify(timetableData, null, 2));
      
      setTimetable(Array.isArray(timetableData) ? timetableData : []);
    } catch (error: any) {
      console.error('Error loading timetable:', error);
      setError(error?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  // Group timetable entries by day
  const groupedTimetable = daysOfWeek.map(day => {
    const dayEntries = timetable.filter(entry => {
      const entryDay = (entry.day_of_week || '').toLowerCase();
      return entryDay === day.toLowerCase();
    });
    
    return {
      day,
      entries: dayEntries.sort((a, b) => {
        const timeA = a.start_time || '00:00';
        const timeB = b.start_time || '00:00';
        return timeA.localeCompare(timeB);
      })
    };
  });

  console.log('Grouped timetable:', groupedTimetable);

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
        <p className="text-gray-500">
          {user?.role === 'teacher' ? 'View your teaching schedule' : 'View your weekly class schedule'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Total entries: {timetable.length}
        </p>
      </div>

      {timetable.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No timetable entries found</p>
              <p className="text-sm text-gray-400 mt-2">
                {user?.role === 'teacher' 
                  ? 'You have no classes assigned yet.' 
                  : 'Your class timetable has not been set up yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupedTimetable.map(({ day, entries }) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{day}</span>
                  <span className="text-sm font-normal text-gray-400">({entries.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No classes scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry: any, index: number) => (
                      <div 
                        key={entry.id || index} 
                        className="p-3 bg-blue-50 rounded-lg border border-blue-100"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-blue-900">
                              {entry.subject_name || 'Subject'}
                            </p>
                            {user?.role === 'teacher' ? (
                              <p className="text-sm text-blue-700">{entry.class_name || 'Class'}</p>
                            ) : (
                              <p className="text-sm text-blue-700">{entry.teacher_name || 'Teacher'}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-blue-800">
                              {entry.start_time?.substring(0, 5) || '??:??'} - {entry.end_time?.substring(0, 5) || '??:??'}
                            </p>
                            {entry.room && (
                              <p className="text-xs text-blue-600">Room: {entry.room}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
