import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import api from '@/services/api';

interface AddClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddClassModal({ open, onOpenChange, onSuccess }: AddClassModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    max_students: '40',
    room_number: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createClass({
        ...formData,
        max_students: Number(formData.max_students)
      });
      alert('Class created successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({ name: '', section: '', max_students: '40', room_number: '' });
    } catch (error: any) {
      console.error('Create class error:', error);
      alert(error.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
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
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Grade 10"
                required
              />
            </div>
            <div>
              <Label htmlFor="section">Section *</Label>
              <Input
                id="section"
                value={formData.section}
                onChange={(e) => handleChange('section', e.target.value)}
                placeholder="e.g., A"
                required
              />
            </div>
            <div>
              <Label htmlFor="max_students">Maximum Students</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => handleChange('max_students', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="room_number">Room Number</Label>
              <Input
                id="room_number"
                value={formData.room_number}
                onChange={(e) => handleChange('room_number', e.target.value)}
                placeholder="e.g., 101"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
