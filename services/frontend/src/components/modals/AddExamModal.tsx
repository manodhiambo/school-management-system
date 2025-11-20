import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { X } from 'lucide-react';
import api from '@/services/api';

interface AddExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddExamModal({ open, onOpenChange, onSuccess }: AddExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'term',
    session: '2024-2025',
    class_id: '',
    start_date: '',
    end_date: '',
    max_marks: '100',
    passing_marks: '40',
  });

  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  const loadClasses = async () => {
    try {
      const response: any = await api.getClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createExam({
        ...formData,
        max_marks: Number(formData.max_marks),
        passing_marks: Number(formData.passing_marks),
      });
      alert('Exam scheduled successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        type: 'term',
        session: '2024-2025',
        class_id: '',
        start_date: '',
        end_date: '',
        max_marks: '100',
        passing_marks: '40',
      });
    } catch (error: any) {
      console.error('Create exam error:', error);
      alert(error.message || 'Failed to schedule exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule New Exam</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Exam Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., First Term Exam"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Exam Type *</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  required
                >
                  <option value="term">Term</option>
                  <option value="final">Final</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="unit_test">Unit Test</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session">Academic Session *</Label>
                <Input
                  id="session"
                  value={formData.session}
                  onChange={(e) => handleChange('session', e.target.value)}
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>
              <div>
                <Label htmlFor="class_id">Class</Label>
                <Select
                  id="class_id"
                  value={formData.class_id}
                  onChange={(e) => handleChange('class_id', e.target.value)}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_marks">Maximum Marks *</Label>
                <Input
                  id="max_marks"
                  type="number"
                  value={formData.max_marks}
                  onChange={(e) => handleChange('max_marks', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="passing_marks">Passing Marks *</Label>
                <Input
                  id="passing_marks"
                  type="number"
                  value={formData.passing_marks}
                  onChange={(e) => handleChange('passing_marks', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Exam'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
