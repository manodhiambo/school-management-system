import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import api from '@/services/api';

interface AddTimetableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTimetableModal({ open, onOpenChange, onSuccess }: AddTimetableModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    day_of_week: 'monday',
    period: '1',
    start_time: '08:00',
    end_time: '08:45',
    room_number: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [classesRes, subjectsRes, teachersRes]: any = await Promise.all([
        api.getClasses(),
        api.getSubjects(),
        api.getTeachers(),
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createTimetableEntry(formData);
      alert('Timetable entry added successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        class_id: '',
        subject_id: '',
        teacher_id: '',
        day_of_week: 'monday',
        period: '1',
        start_time: '08:00',
        end_time: '08:45',
        room_number: '',
      });
    } catch (error: any) {
      console.error('Add timetable error:', error);
      alert(error.message || 'Failed to add timetable entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Timetable Entry</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="class_id">Class *</Label>
              <Select
                id="class_id"
                value={formData.class_id}
                onChange={(e) => handleChange('class_id', e.target.value)}
                required
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject_id">Subject *</Label>
                <Select
                  id="subject_id"
                  value={formData.subject_id}
                  onChange={(e) => handleChange('subject_id', e.target.value)}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="teacher_id">Teacher *</Label>
                <Select
                  id="teacher_id"
                  value={formData.teacher_id}
                  onChange={(e) => handleChange('teacher_id', e.target.value)}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="day_of_week">Day of Week *</Label>
                <Select
                  id="day_of_week"
                  value={formData.day_of_week}
                  onChange={(e) => handleChange('day_of_week', e.target.value)}
                  required
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="period">Period *</Label>
                <Select
                  id="period"
                  value={formData.period}
                  onChange={(e) => handleChange('period', e.target.value)}
                  required
                >
                  <option value="1">1st Period</option>
                  <option value="2">2nd Period</option>
                  <option value="3">3rd Period</option>
                  <option value="4">4th Period</option>
                  <option value="5">5th Period</option>
                  <option value="6">6th Period</option>
                  <option value="7">7th Period</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="room_number">Room Number</Label>
              <Input
                id="room_number"
                value={formData.room_number}
                onChange={(e) => handleChange('room_number', e.target.value)}
                placeholder="e.g., Room 101"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
