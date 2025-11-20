import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import api from '@/services/api';

interface AssignSubstituteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignSubstituteModal({ open, onOpenChange, onSuccess }: AssignSubstituteModalProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    original_teacher_id: '',
    substitute_teacher_id: '',
    class_id: '',
    date: new Date().toISOString().split('T')[0],
    period: '1',
    reason: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [teachersRes, classesRes]: any = await Promise.all([
        api.getTeachers(),
        api.getClasses(),
      ]);
      setTeachers(teachersRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.original_teacher_id === formData.substitute_teacher_id) {
      alert('Substitute teacher must be different from original teacher');
      return;
    }

    setLoading(true);

    try {
      await api.assignSubstitute(formData);
      alert('Substitute assigned successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        original_teacher_id: '',
        substitute_teacher_id: '',
        class_id: '',
        date: new Date().toISOString().split('T')[0],
        period: '1',
        reason: '',
      });
    } catch (error: any) {
      console.error('Assign substitute error:', error);
      alert(error.message || 'Failed to assign substitute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Substitute Teacher</DialogTitle>
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
              <Label htmlFor="original_teacher_id">Original Teacher *</Label>
              <Select
                id="original_teacher_id"
                value={formData.original_teacher_id}
                onChange={(e) => handleChange('original_teacher_id', e.target.value)}
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
              <Label htmlFor="substitute_teacher_id">Substitute Teacher *</Label>
              <Select
                id="substitute_teacher_id"
                value={formData.substitute_teacher_id}
                onChange={(e) => handleChange('substitute_teacher_id', e.target.value)}
                required
              >
                <option value="">Select Substitute</option>
                {teachers
                  .filter(t => t.id !== formData.original_teacher_id)
                  .map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>
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

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Reason for substitution..."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Substitute'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
