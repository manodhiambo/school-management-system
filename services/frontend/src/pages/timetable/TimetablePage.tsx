import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, Plus, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function TimetablePage() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<'all' | 'class' | 'teacher'>('all');
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: '1',
    startTime: '08:00',
    endTime: '08:45',
    room: ''
  });

  const daysOfWeek = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadTimetable();
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, teachersRes]: any = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getTeachers()
      ]);
      
      setClasses(classesRes?.data || []);
      setSubjects(subjectsRes?.data || []);
      setTeachers(teachersRes?.data || []);
      
      // Auto-select first class
      if (classesRes?.data?.length > 0) {
        setSelectedClass(classesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimetable = async () => {
    try {
      const response: any = await api.getTimetable({ classId: selectedClass });
      console.log('Timetable response:', response);
      setTimetable(response?.data || []);
    } catch (error) {
      console.error('Error loading timetable:', error);
      setTimetable([]);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTimetableEntry({
        class_id: formData.classId || selectedClass,
        subject_id: formData.subjectId,
        teacher_id: formData.teacherId,
        day_of_week: parseInt(formData.dayOfWeek),
        start_time: formData.startTime,
        end_time: formData.endTime,
        room: formData.room
      });
      
      alert('Timetable entry added successfully!');
      setShowAddModal(false);
      loadTimetable();
      resetForm();
    } catch (error: any) {
      alert(error?.message || 'Failed to add timetable entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;
    
    try {
      await api.deleteTimetableEntry(id);
      alert('Entry deleted successfully!');
      loadTimetable();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete entry');
    }
  };

  const handleResetTimetable = async () => {
    try {
      let message = '';
      
      if (resetType === 'all') {
        await api.resetAllTimetable();
        message = 'Entire timetable has been reset!';
      } else if (resetType === 'class' && selectedClass) {
        await api.deleteClassTimetable(selectedClass);
        message = 'Class timetable has been reset!';
      } else if (resetType === 'teacher' && formData.teacherId) {
        await api.deleteTeacherTimetable(formData.teacherId);
        message = 'Teacher timetable has been reset!';
      }
      
      alert(message);
      setShowResetModal(false);
      loadTimetable();
    } catch (error: any) {
      alert(error?.message || 'Failed to reset timetable');
    }
  };

  const resetForm = () => {
    setFormData({
      classId: '',
      subjectId: '',
      teacherId: '',
      dayOfWeek: '1',
      startTime: '08:00',
      endTime: '08:45',
      room: ''
    });
  };

  const groupByDay = (entries: any[]) => {
    const grouped: Record<string, any[]> = {};
    daysOfWeek.forEach(day => {
      grouped[day.value] = entries.filter(e => {
        const entryDay = String(e.day_of_week);
        return entryDay === day.value || 
               entryDay.toLowerCase() === day.label.toLowerCase();
      }).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    });
    return grouped;
  };

  const groupedTimetable = groupByDay(timetable);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Timetable Management</h2>
          <p className="text-gray-500">View and manage class schedules</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowResetModal(true)} className="text-red-600">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Timetable
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Class Schedule</CardTitle>
            <div className="w-64">
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section || ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a class to view timetable</p>
            </div>
          ) : timetable.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No timetable entries for this class</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Entry
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {daysOfWeek.map((day) => (
                <Card key={day.value} className="border">
                  <CardHeader className="pb-2 bg-gray-50">
                    <CardTitle className="text-lg flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-primary" />
                      {day.label}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({groupedTimetable[day.value]?.length || 0})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {(groupedTimetable[day.value] || []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No classes</p>
                    ) : (
                      <div className="space-y-2">
                        {groupedTimetable[day.value].map((entry: any) => (
                          <div 
                            key={entry.id} 
                            className="p-2 bg-blue-50 rounded border border-blue-100 relative group"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-blue-900 text-sm">
                                  {entry.subject_name || 'Subject'}
                                </p>
                                <p className="text-xs text-blue-700">
                                  {entry.teacher_name || 'Teacher'}
                                </p>
                                <p className="text-xs text-blue-600">
                                  {entry.start_time?.substring(0, 5)} - {entry.end_time?.substring(0, 5)}
                                  {entry.room && ` • ${entry.room}`}
                                </p>
                              </div>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
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
        </CardContent>
      </Card>

      {/* Add Entry Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timetable Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEntry}>
            <div className="space-y-4">
              <div>
                <Label>Class</Label>
                <Select
                  value={formData.classId || selectedClass}
                  onChange={(e) => handleChange('classId', e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section || ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Subject</Label>
                <Select
                  value={formData.subjectId}
                  onChange={(e) => handleChange('subjectId', e.target.value)}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Teacher</Label>
                <Select
                  value={formData.teacherId}
                  onChange={(e) => handleChange('teacherId', e.target.value)}
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Day of Week</Label>
                <Select
                  value={formData.dayOfWeek}
                  onChange={(e) => handleChange('dayOfWeek', e.target.value)}
                  required
                >
                  {daysOfWeek.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Room (Optional)</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => handleChange('room', e.target.value)}
                  placeholder="e.g., Room 101"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Timetable Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Reset Timetable
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Choose what you want to reset. This action cannot be undone.
            </p>

            <div>
              <Label>Reset Type</Label>
              <Select
                value={resetType}
                onChange={(e) => setResetType(e.target.value as any)}
              >
                <option value="class">Reset Selected Class Timetable</option>
                <option value="teacher">Reset Teacher's Timetable</option>
                <option value="all">Reset Entire School Timetable</option>
              </Select>
            </div>

            {resetType === 'class' && (
              <div>
                <Label>Class to Reset</Label>
                <Select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section || ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {resetType === 'teacher' && (
              <div>
                <Label>Teacher to Reset</Label>
                <Select
                  value={formData.teacherId}
                  onChange={(e) => handleChange('teacherId', e.target.value)}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {resetType === 'all' && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-700 font-medium">Warning!</p>
                <p className="text-red-600 text-sm">
                  This will delete ALL timetable entries for the entire school.
                  Make sure you have a backup before proceeding.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetTimetable}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                (resetType === 'class' && !selectedClass) ||
                (resetType === 'teacher' && !formData.teacherId)
              }
            >
              Reset Timetable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
