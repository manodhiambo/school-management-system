import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import api from '@/services/api';

interface GenerateInvoicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateInvoicesModal({ open, onOpenChange, onSuccess }: GenerateInvoicesModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    class_id: '',
    fee_type: 'tuition',
    amount: '',
    due_date: '',
    academic_year: '2024-2025',
    description: '',
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
      await api.generateInvoices({
        ...formData,
        amount: Number(formData.amount)
      });
      alert('Invoices generated successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        class_id: '',
        fee_type: 'tuition',
        amount: '',
        due_date: '',
        academic_year: '2024-2025',
        description: '',
      });
    } catch (error: any) {
      console.error('Generate invoices error:', error);
      alert(error.message || 'Failed to generate invoices');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Fee Invoices</DialogTitle>
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
                <option value="">Select Class (or leave empty for all)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">Leave empty to generate for all students</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fee_type">Fee Type *</Label>
                <Select
                  id="fee_type"
                  value={formData.fee_type}
                  onChange={(e) => handleChange('fee_type', e.target.value)}
                  required
                >
                  <option value="tuition">Tuition Fee</option>
                  <option value="transport">Transport Fee</option>
                  <option value="library">Library Fee</option>
                  <option value="laboratory">Laboratory Fee</option>
                  <option value="sports">Sports Fee</option>
                  <option value="exam">Exam Fee</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (KSH) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="10000"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="academic_year">Academic Year *</Label>
                <Input
                  id="academic_year"
                  value={formData.academic_year}
                  onChange={(e) => handleChange('academic_year', e.target.value)}
                  placeholder="2024-2025"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Invoice description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Invoices'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
