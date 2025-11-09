import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Modal, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export default function SubjectManager() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: subjects, isLoading } = useQuery(['subjects'], () => 
    apiClient.request({ url: '/api/v1/subjects', method: 'GET' })
  );

  const createMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/subjects',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subjects');
        addToast('success', 'Subject created successfully');
        setShowForm(false);
      },
      onError: () => {
        addToast('error', 'Failed to create subject');
      },
    }
  );

  const columns = [
    {
      key: 'name',
      title: 'Subject Name',
    },
    {
      key: 'code',
      title: 'Code',
    },
    {
      key: 'category',
      title: 'Category',
      render: (value: string) => (
        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
          {value}
        </span>
      ),
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
        <h2 className="text-xl font-semibold">Subjects</h2>
        <Button onClick={() => setShowForm(true)}>
          Add Subject
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={subjects?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Subject"
      >
        <SubjectForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function SubjectForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'core',
    isActive: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Subject Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Enter subject name"
      />
      <Input
        label="Subject Code"
        value={formData.code}
        onChange={(e) => setFormData({...formData, code: e.target.value})}
        placeholder="e.g., MATH101"
      />
      <Input
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        placeholder="Enter description"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="core">Core</option>
          <option value="elective">Elective</option>
          <option value="co_curricular">Co-curricular</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
          className="rounded"
        />
        <label className="text-sm">Active</label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Subject
        </Button>
      </div>
    </form>
  );
}
