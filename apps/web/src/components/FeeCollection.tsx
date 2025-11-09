import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Modal, Badge } from '@school/shared-ui';
import { Search, CreditCard, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@school/shared-ui';

interface FeePaymentData {
  studentId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'net_banking';
  invoiceId: string;
}

export default function FeeCollection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: students } = useQuery(
    ['students', searchTerm],
    () => apiClient.getStudents({ search: searchTerm, page: 1, limit: 20 })
  );

  const { data: feeData } = useQuery(
    ['student-fee', selectedStudent?.id],
    () => selectedStudent ? apiClient.getStudentFee(selectedStudent.id) : null,
    { enabled: !!selectedStudent }
  );

  const paymentMutation = useMutation(
    (data: FeePaymentData) => apiClient.request({
      url: '/api/v1/fee/payment',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student-fee', selectedStudent?.id]);
        addToast('success', 'Payment recorded successfully');
        setShowPaymentModal(false);
      },
      onError: () => {
        addToast('error', 'Failed to record payment');
      },
    }
  );

  const handlePayment = (paymentData: FeePaymentData) => {
    paymentMutation.mutate(paymentData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Search by name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Search size={20} className="text-gray-400 mt-2" />
          </div>
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Details - {selectedStudent.firstName} {selectedStudent.lastName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeData?.data?.invoices?.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText size={24} className="text-gray-500" />
                    <div>
                      <div className="font-medium">Invoice #{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-500">{invoice.month}</div>
                      <div className="text-sm">Amount: ₹{invoice.netAmount}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={invoice.status === 'paid' ? 'success' : 
                               invoice.status === 'partial' ? 'warning' : 'destructive'}
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.status !== 'paid' && (
                      <Button
                        onClick={() => setShowPaymentModal(true)}
                        size="sm"
                      >
                        <CreditCard size={16} className="mr-1" />
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Student</th>
                  <th className="px-4 py-2 text-left">Invoice</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No recent payments
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
      >
        <PaymentForm
          studentId={selectedStudent?.id}
          onSubmit={handlePayment}
          onCancel={() => setShowPaymentModal(false)}
        />
      </Modal>
    </div>
  );
}

function PaymentForm({ studentId, onSubmit, onCancel }: any) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'upi' | 'net_banking'>('cash');
  const { addToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      addToast('error', 'Enter a valid amount');
      return;
    }
    onSubmit({
      studentId,
      amount: parseFloat(amount),
      paymentMethod: method,
      invoiceId: 'INV001', // Will be selected from UI
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="net_banking">Net Banking</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Record Payment
        </Button>
      </div>
    </form>
  );
}
