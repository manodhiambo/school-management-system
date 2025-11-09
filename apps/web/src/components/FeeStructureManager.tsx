import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Modal, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export default function FeeStructureManager() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: feeStructures, isLoading } = useQuery(
    ['fee-structure'],
    () => apiClient.getFeeStructure()
  );

  const createMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/fee/structure',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('fee-structure');
        addToast('success', 'Fee structure created successfully');
        setShowForm(false);
      },
      onError: () => {
        addToast('error', 'Failed to create fee structure');
      },
    }
  );

  const columns = [
    {
      key: 'name',
      title: 'Fee Name',
    },
    {
      key: 'classId',
      title: 'Class',
      render: (value: string) => value || 'All Classes',
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (value: number) => `₹${value}`,
    },
    {
      key: 'frequency',
      title: 'Frequency',
    },
    {
      key: 'dueDay',
      title: 'Due Day',
      render: (value: number) => `${value}th`,
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Fee Structure</h2>
        <Button onClick={() => setShowForm(true)}>
          Add Fee Component
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={feeStructures?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Create Fee Structure Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Fee Component"
      >
        <FeeStructureForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function FeeStructureForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    amount: '',
    frequency: 'monthly',
    dueDay: '10',
    lateFeeAmount: '0',
    lateFeePerDay: '0',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      dueDay: parseInt(formData.dueDay),
      lateFeeAmount: parseFloat(formData.lateFeeAmount),
      lateFeePerDay: parseFloat(formData.lateFeePerDay),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Fee Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="e.g., Tuition Fee"
      />
      <Input
        label="Class ID (leave empty for all classes)"
        value={formData.classId}
        onChange={(e) => setFormData({...formData, classId: e.target.value})}
        placeholder="Enter class ID"
      />
      <Input
        label="Amount"
        type="number"
        value={formData.amount}
        onChange={(e) => setFormData({...formData, amount: e.target.value})}
        placeholder="Enter amount"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
        <select
          value={formData.frequency}
          onChange={(e) => setFormData({...formData, frequency: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="half_yearly">Half Yearly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <Input
        label="Due Day (of month)"
        type="number"
        value={formData.dueDay}
        onChange={(e) => setFormData({...formData, dueDay: e.target.value})}
      />
      <Input
        label="Late Fee Amount"
        type="number"
        value={formData.lateFeeAmount}
        onChange={(e) => setFormData({...formData, lateFeeAmount: e.target.value})}
      />
      <Input
        label="Late Fee Per Day"
        type="number"
        value={formData.lateFeePerDay}
        onChange={(e) => setFormData({...formData, lateFeePerDay: e.target.value})}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Fee Structure
        </Button>
      </div>
    </form>
  );
}
