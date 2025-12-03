import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import api from '@/services/api';

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({ open, onOpenChange, onSuccess }: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    student_id: '',
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open]);

  useEffect(() => {
    if (formData.student_id) {
      loadStudentInvoices(formData.student_id);
    }
  }, [formData.student_id]);

  const loadStudents = async () => {
    try {
      const response: any = await api.getStudents();
      // API returns { success: true, data: [...] }
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    }
  };

  const loadStudentInvoices = async (studentId: string) => {
    try {
      const response: any = await api.getFeeInvoices({ studentId });
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id) {
      alert('Please select a student');
      return;
    }
    
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    setLoading(true);

    try {
      await api.recordFeePayment({
        invoice_id: formData.invoice_id || null,
        student_id: formData.student_id,
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        transaction_id: formData.transaction_id || null,
        remarks: formData.remarks || null,
      });
      alert('Payment recorded successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        student_id: '',
        invoice_id: '',
        amount: '',
        payment_method: 'cash',
        transaction_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        remarks: '',
      });
    } catch (error: any) {
      console.error('Record payment error:', error);
      alert(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
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
              <Label htmlFor="student_id">Student *</Label>
              <Select
                id="student_id"
                value={formData.student_id}
                onChange={(e) => handleChange('student_id', e.target.value)}
                required
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} - {student.admission_number}
                  </option>
                ))}
              </Select>
            </div>

            {invoices.length > 0 && (
              <div>
                <Label htmlFor="invoice_id">Invoice (Optional)</Label>
                <Select
                  id="invoice_id"
                  value={formData.invoice_id}
                  onChange={(e) => handleChange('invoice_id', e.target.value)}
                >
                  <option value="">Select Invoice (or leave blank for general payment)</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - KES {invoice.balance_amount || invoice.net_amount} due
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleChange('payment_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => handleChange('payment_method', e.target.value)}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="transaction_id">Transaction ID / Reference</Label>
                <Input
                  id="transaction_id"
                  value={formData.transaction_id}
                  onChange={(e) => handleChange('transaction_id', e.target.value)}
                  placeholder="e.g., REF123456"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
