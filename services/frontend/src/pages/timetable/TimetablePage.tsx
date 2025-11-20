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
  const [timetable, setTimetable] = useState<any[]>([]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response: any = await api.getClasses();
      setClasses(response.data || []);
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
    }
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    loadTimetable(classId);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = [
    { id: 1, name: '1st Period', time: '08:00 - 08:45' },
    { id: 2, name: '2nd Period', time: '08:45 - 09:30' },
    { id: 3, name: '3rd Period', time: '09:30 - 10:15' },
    { id: 4, name: 'Break', time: '10:15 - 10:30' },
    { id: 5, name: '4th Period', time: '10:30 - 11:15' },
    { id: 6, name: '5th Period', time: '11:15 - 12:00' },
    { id: 7, name: 'Lunch', time: '12:00 - 12:45' },
    { id: 8, name: '6th Period', time: '12:45 - 01:30' },
    { id: 9, name: '7th Period', time: '01:30 - 02:15' },
  ];

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
          <h2 className="text-3xl font-bold">Timetable Management</h2>
          <p className="text-gray-500">Manage class schedules and periods</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
          <Button onClick={() => setShowSubstituteModal(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Assign Substitute
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Total Classes</span>
              <Users className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Working Days</span>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-gray-500">Monday - Saturday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Periods per Day</span>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-gray-500">Plus breaks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class to View Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            {classes.slice(0, 8).map((cls: any) => (
              <Button
                key={cls.id}
                variant={selectedClass === cls.id ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => handleClassSelect(cls.id)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {cls.name} - {cls.section}
              </Button>
            ))}
          </div>
          {classes.length === 0 && (
            <p className="text-gray-500 text-center py-8">No classes available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Timetable {selectedClass && '- ' + classes.find(c => c.id === selectedClass)?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-50">Period</th>
                  {daysOfWeek.map(day => (
                    <th key={day} className="border p-2 bg-gray-50">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period.id}>
                    <td className="border p-2 bg-gray-50">
                      <div className="font-medium text-sm">{period.name}</div>
                      <div className="text-xs text-gray-500">{period.time}</div>
                    </td>
                    {daysOfWeek.map(day => (
                      <td key={day} className="border p-2 text-center">
                        {period.name.includes('Break') || period.name.includes('Lunch') ? (
                          <span className="text-gray-400 italic text-sm">{period.name}</span>
                        ) : (
                          <div className="text-sm text-gray-400">
                            {selectedClass ? 'No class' : 'Select a class'}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddTimetableModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => selectedClass && loadTimetable(selectedClass)}
      />

      <AssignSubstituteModal
        open={showSubstituteModal}
        onOpenChange={setShowSubstituteModal}
        onSuccess={() => alert('Substitute assigned successfully')}
      />
    </div>
  );
}
