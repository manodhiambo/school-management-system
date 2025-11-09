import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Modal, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Package } from 'lucide-react';

export default function Inventory() {
  const [showForm, setShowForm] = useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventory } = useQuery(['inventory'], () => 
    apiClient.request({ url: '/api/v1/admin/inventory', method: 'GET' })
  );

  const createMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/admin/inventory',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventory');
        addToast('success', 'Inventory item added');
        setShowForm(false);
      },
      onError: () => {
        addToast('error', 'Failed to add item');
      },
    }
  );

  const columns = [
    { key: 'name', title: 'Item Name' },
    { key: 'category', title: 'Category' },
    { key: 'quantity', title: 'Quantity' },
    { key: 'status', title: 'Status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Button onClick={() => setShowForm(true)}>
          <Package size={16} className="mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={inventory?.data || []} />
        </CardContent>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Inventory Item">
        <InventoryForm onSubmit={createMutation.mutate} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

function InventoryForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({ name: '', category: '', quantity: '' });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      quantity: parseInt(formData.quantity),
    });
  };

  return (
    <form className="space-y-4">
      <Input
        label="Item Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <Input
        label="Category"
        value={formData.category}
        onChange={(e) => setFormData({...formData, category: e.target.value})}
      />
      <Input
        label="Quantity"
        type="number"
        value={formData.quantity}
        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Add Item</Button>
      </div>
    </form>
  );
}
