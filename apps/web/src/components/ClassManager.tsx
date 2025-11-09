import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Modal, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export default function ClassManager() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: classes, isLoading } = useQuery(['classes'], () => 
    apiClient.getClasses()
  );

  const createMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/classes',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        addToast('success', 'Class created successfully');
        setShowForm(false);
      },
      onError: () => {
        addToast('error', 'Failed to create class');
      },
    }
  );

  const columns = [
    {
      key: 'name',
      title: 'Class Name',
    },
    {
      key: 'section',
      title: 'Section',
    },
    {
      key: 'classTeacherId',
      title: 'Class Teacher',
      render: (value: string) => value || 'Not assigned',
    },
    {
      key: 'maxStudents',
      title: 'Max Students',
    },
    {
      key: 'roomNumber',
      title: 'Room',
      render: (value: string) => value || 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Classes & Sections</h2>
        <Button onClick={() => setShowForm(true)}>
          Add Class
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={classes?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Class"
      >
        <ClassForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function ClassForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    numericValue: '',
    classTeacherId: '',
    maxStudents: '40',
    roomNumber: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      numericValue: parseInt(formData.numericValue),
      maxStudents: parseInt(formData.maxStudents),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Class Name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., Grade 1"
        />
        <Input
          label="Section"
          value={formData.section}
          onChange={(e) => setFormData({...formData, section: e.target.value})}
          placeholder="e.g., A"
        />
      </div>
      <Input
        label="Numeric Value"
        type="number"
        value={formData.numericValue}
        onChange={(e) => setFormData({...formData, numericValue: e.target.value})}
        placeholder="e.g., 1"
      />
      <Input
        label="Class Teacher ID"
        value={formData.classTeacherId}
        onChange={(e) => setFormData({...formData, classTeacherId: e.target.value})}
        placeholder="Enter teacher ID"
      />
      <Input
        label="Max Students"
        type="number"
        value={formData.maxStudents}
        onChange={(e) => setFormData({...formData, maxStudents: e.target.value})}
      />
      <Input
        label="Room Number"
        value={formData.roomNumber}
        onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
        placeholder="e.g., 101"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Class
        </Button>
      </div>
    </form>
  );
}
