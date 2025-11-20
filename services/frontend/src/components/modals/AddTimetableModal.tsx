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
    classId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 'monday',
    periodNumber: '1',
    startTime: '08:00:00',
    endTime: '08:45:00',
    academicYear: '2024-2025',
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
      // Create period first (simplified - you might want to check if it exists)
      const periodData = {
        name: `Period ${formData.periodNumber}`,
        periodNumber: Number(formData.periodNumber),
        startTime: formData.startTime,
        endTime: formData.endTime,
        isBreak: false
      };

      let periodId;
      try {
        const periodRes: any = await api.createPeriod(periodData);
        periodId = periodRes.data?.id;
      } catch (err) {
        // Period might already exist, try to get it
        console.log('Period creation failed, it might already exist');
        // For now, we'll create a temp ID - ideally you'd fetch existing periods
        periodId = `period-${formData.periodNumber}`;
      }

      // Now create timetable entry
      await api.createTimetableEntry({
        classId: formData.classId,
        subjectId: formData.subjectId,
        teacherId: formData.teacherId,
        periodId: periodId,
        dayOfWeek: formData.dayOfWeek,
        academicYear: formData.academicYear,
      });

      alert('Timetable entry added successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        classId: '',
        subjectId: '',
        teacherId: '',
        dayOfWeek: 'monday',
        periodNumber: '1',
        startTime: '08:00:00',
        endTime: '08:45:00',
        academicYear: '2024-2025',
      });
    } catch (error: any) {
      console.error('Add timetable error:', error);
      if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
        alert(`Validation failed:\n${errorMessages}`);
      } else {
        alert(error.message || 'Failed to add timetable entry');
      }
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
              <Label htmlFor="classId">Class *</Label>
              <Select
                id="classId"
                value={formData.classId}
                onChange={(e) => handleChange('classId', e.target.value)}
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
                <Label htmlFor="subjectId">Subject *</Label>
                <Select
                  id="subjectId"
                  value={formData.subjectId}
                  onChange={(e) => handleChange('subjectId', e.target.value)}
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
                <Label htmlFor="teacherId">Teacher *</Label>
                <Select
                  id="teacherId"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select
                  id="dayOfWeek"
                  value={formData.dayOfWeek}
                  onChange={(e) => handleChange('dayOfWeek', e.target.value)}
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
                <Label htmlFor="periodNumber">Period *</Label>
                <Select
                  id="periodNumber"
                  value={formData.periodNumber}
                  onChange={(e) => handleChange('periodNumber', e.target.value)}
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
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime.slice(0, 5)}
                  onChange={(e) => handleChange('startTime', e.target.value + ':00')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime.slice(0, 5)}
                  onChange={(e) => handleChange('endTime', e.target.value + ':00')}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="academicYear">Academic Year *</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                placeholder="2024-2025"
                required
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
