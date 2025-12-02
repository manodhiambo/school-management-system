import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Users, BookOpen, Plus } from 'lucide-react';
import { AddTimetableModal } from '@/components/modals/AddTimetableModal';
import { AssignSubstituteModal } from '@/components/modals/AssignSubstituteModal';
import api from '@/services/api';

export function TimetablePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [timetable, setTimetable] = useState<any[]>([]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response: any = await api.getClasses();
      const classData = response.data || [];
      setClasses(classData);
      
      // Auto-select first class if available
      if (classData.length > 0 && !selectedClass) {
        setSelectedClass(classData[0].id);
        setSelectedClassName(classData[0].name);
        loadTimetable(classData[0].id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimetable = async (classId: string) => {
    try {
      const response: any = await api.getTimetable(classId);
      setTimetable(response.data || []);
    } catch (error) {
      console.error('Error loading timetable:', error);
      setTimetable([]);
    }
  };

  const handleClassSelect = (classId: string) => {
    const selectedCls = classes.find(c => c.id === classId);
    setSelectedClass(classId);
    setSelectedClassName(selectedCls?.name || '');
    loadTimetable(classId);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const periods = [
    { id: 1, name: '1st Period', time: '08:00 - 08:45', start: '08:00' },
    { id: 2, name: '2nd Period', time: '08:45 - 09:30', start: '08:45' },
    { id: 3, name: '3rd Period', time: '09:30 - 10:15', start: '09:30' },
    { id: 4, name: 'Break', time: '10:15 - 10:30', start: '10:15', isBreak: true },
    { id: 5, name: '4th Period', time: '10:30 - 11:15', start: '10:30' },
    { id: 6, name: '5th Period', time: '11:15 - 12:00', start: '11:15' },
    { id: 7, name: 'Lunch', time: '12:00 - 12:45', start: '12:00', isBreak: true },
    { id: 8, name: '6th Period', time: '12:45 - 13:30', start: '12:45' },
    { id: 9, name: '7th Period', time: '13:30 - 14:15', start: '13:30' },
  ];

  // Helper function to find timetable entry for a specific day and time
  const getEntry = (day: string, startTime: string) => {
    return timetable.find(entry => {
      const entryDay = entry.day_of_week?.toLowerCase();
      const entryStart = entry.start_time?.substring(0, 5); // Get HH:MM format
      return entryDay === day.toLowerCase() && entryStart === startTime;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Timetable</h2>
          <p className="text-gray-500">Manage class schedules and periods</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowSubstituteModal(true)}>
            <Users className="mr-2 h-4 w-4" />
            Assign Substitute
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Classes</span>
              <BookOpen className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total Periods</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timetable.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Days Active</span>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(timetable.map(t => t.day_of_week)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Teachers Assigned</span>
              <Users className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(timetable.filter(t => t.teacher_id).map(t => t.teacher_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => (
              <Button
                key={cls.id}
                variant={selectedClass === cls.id ? 'default' : 'outline'}
                onClick={() => handleClassSelect(cls.id)}
              >
                {cls.name} {cls.section || ''}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Timetable - {selectedClassName}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left font-medium">Period</th>
                  {daysOfWeek.map((day) => (
                    <th key={day} className="border p-2 text-center font-medium">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id} className={period.isBreak ? 'bg-gray-100' : ''}>
                    <td className="border p-2">
                      <div className="font-medium">{period.name}</div>
                      <div className="text-xs text-gray-500">{period.time}</div>
                    </td>
                    {daysOfWeek.map((day) => {
                      if (period.isBreak) {
                        return (
                          <td key={day} className="border p-2 text-center text-gray-500">
                            {period.name}
                          </td>
                        );
                      }
                      const entry = getEntry(day, period.start);
                      return (
                        <td key={day} className="border p-2">
                          {entry ? (
                            <div className="p-2 bg-blue-50 rounded">
                              <div className="font-medium text-sm">
                                {entry.subject_name || 'No Subject'}
                              </div>
                              <div className="text-xs text-gray-600">
                                {entry.teacher_name || 'No Teacher'}
                              </div>
                              {entry.room && (
                                <div className="text-xs text-gray-500">{entry.room}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 text-sm">
                              No class
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <AddTimetableModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          if (selectedClass) {
            loadTimetable(selectedClass);
          }
        }}
      />

      <AssignSubstituteModal
        open={showSubstituteModal}
        onOpenChange={setShowSubstituteModal}
        onSuccess={() => {
          if (selectedClass) {
            loadTimetable(selectedClass);
          }
        }}
      />
    </div>
  );
}
