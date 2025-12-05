import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, BookOpen, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function MyTimetablePage() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = [
    { value: 1, name: 'Monday' },
    { value: 2, name: 'Tuesday' },
    { value: 3, name: 'Wednesday' },
    { value: 4, name: 'Thursday' },
    { value: 5, name: 'Friday' },
    { value: 6, name: 'Saturday' }
  ];

  useEffect(() => {
    if (user?.id) {
      loadTimetable();
    }
  }, [user?.id]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      let response: any;
      
      if (user?.role === 'teacher') {
        response = await api.getTeacherTimetable(user?.id || '');
      } else {
        response = await api.getStudentTimetable(user?.id || '');
      }
      
      console.log('My timetable response:', response);
      
      // Handle different response formats
      const data = response?.data || response || [];
      setTimetable(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading timetable:', error);
      setError(error?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  // Group timetable entries by day
  const groupByDay = (entries: any[]) => {
    const grouped: Record<number, any[]> = {};
    
    days.forEach(day => {
      grouped[day.value] = entries.filter(entry => {
        // Handle both numeric and string day values
        const entryDay = typeof entry.day_of_week === 'string' 
          ? entry.day_of_week.toLowerCase() 
          : entry.day_of_week;
        
        return entryDay === day.value || 
               entryDay === day.name.toLowerCase() ||
               entry.day === day.value ||
               entry.day === day.name;
      }).sort((a, b) => {
        const timeA = a.start_time || '';
        const timeB = b.start_time || '';
        return timeA.localeCompare(timeB);
      });
    });
    
    return grouped;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    // Handle both HH:MM:SS and HH:MM formats
    return time.substring(0, 5);
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

  const groupedTimetable = groupByDay(timetable);
  const hasAnyClasses = timetable.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Timetable</h2>
        <p className="text-gray-500">
          {user?.role === 'teacher' 
            ? 'View your teaching schedule' 
            : 'View your weekly class schedule'}
        </p>
      </div>

      {!hasAnyClasses ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No timetable entries found</p>
              <p className="text-sm text-gray-400">
                {user?.role === 'teacher'
                  ? 'You have not been assigned to any classes yet.'
                  : 'Your class schedule has not been set up yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => {
            const dayEntries = groupedTimetable[day.value] || [];
            
            return (
              <Card key={day.value} className="overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{day.name}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {dayEntries.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No classes</p>
                  ) : (
                    <div className="space-y-3">
                      {dayEntries.map((entry: any, index: number) => (
                        <div 
                          key={entry.id || index} 
                          className="p-3 bg-blue-50 rounded-lg border border-blue-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <p className="font-medium text-blue-900">
                                  {entry.subject_name || entry.subject || 'Subject'}
                                </p>
                              </div>
                              
                              {user?.role === 'teacher' ? (
                                <p className="text-sm text-blue-700 mt-1">
                                  {entry.class_name || entry.class || 'Class'}
                                </p>
                              ) : (
                                <div className="flex items-center space-x-1 mt-1">
                                  <User className="h-3 w-3 text-blue-600" />
                                  <p className="text-sm text-blue-700">
                                    {entry.teacher_name || entry.teacher || 'Teacher'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                            <div className="flex items-center space-x-1 text-blue-800">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm font-medium">
                                {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                              </span>
                            </div>
                            {entry.room && (
                              <div className="flex items-center space-x-1 text-blue-600">
                                <MapPin className="h-3 w-3" />
                                <span className="text-sm">{entry.room}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
