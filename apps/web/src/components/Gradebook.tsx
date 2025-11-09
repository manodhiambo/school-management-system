import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Modal, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export default function Gradebook() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: gradebook, isLoading } = useQuery(['gradebook'], () => 
    apiClient.request({ url: '/api/v1/gradebook', method: 'GET' })
  );

  const createMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/gradebook',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('gradebook');
        addToast('success', 'Gradebook entry added successfully');
        setShowForm(false);
      },
      onError: () => {
        addToast('error', 'Failed to add gradebook entry');
      },
    }
  );

  const columns = [
    {
      key: 'studentName',
      title: 'Student',
    },
    {
      key: 'subjectName',
      title: 'Subject',
    },
    {
      key: 'assessmentType',
      title: 'Type',
    },
    {
      key: 'marks',
      title: 'Marks',
      render: (_: any, record: any) => `${record.marks}/${record.maxMarks}`,
    },
    {
      key: 'grade',
      title: 'Grade',
    },
    {
      key: 'date',
      title: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Continuous Assessment</h2>
        <Button onClick={() => setShowForm(true)}>
          Add Entry
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={gradebook?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Gradebook Entry"
      >
        <GradebookForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function GradebookForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    classId: '',
    studentId: '',
    subjectId: '',
    assessmentType: 'homework',
    marks: '',
    maxMarks: '100',
    grade: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      marks: parseFloat(formData.marks),
      maxMarks: parseFloat(formData.maxMarks),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Student ID"
        value={formData.studentId}
        onChange={(e) => setFormData({...formData, studentId: e.target.value})}
        placeholder="Enter student ID"
      />
      <Input
        label="Subject ID"
        value={formData.subjectId}
        onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
        placeholder="Enter subject ID"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
        <select
          value={formData.assessmentType}
          onChange={(e) => setFormData({...formData, assessmentType: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="homework">Homework</option>
          <option value="classwork">Classwork</option>
          <option value="project">Project</option>
          <option value="presentation">Presentation</option>
          <option value="behavior">Behavior</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Marks Obtained"
          type="number"
          value={formData.marks}
          onChange={(e) => setFormData({...formData, marks: e.target.value})}
        />
        <Input
          label="Max Marks"
          type="number"
          value={formData.maxMarks}
          onChange={(e) => setFormData({...formData, maxMarks: e.target.value})}
        />
      </div>
      <Input
        label="Grade"
        value={formData.grade}
        onChange={(e) => setFormData({...formData, grade: e.target.value})}
        placeholder="e.g., A, B+, C"
      />
      <Input
        label="Date"
        type="date"
        value={formData.date}
        onChange={(e) => setFormData({...formData, date: e.target.value})}
      />
      <Input
        label="Notes"
        value={formData.notes}
        onChange={(e) => setFormData({...formData, notes: e.target.value})}
        placeholder="Optional notes"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Entry
        </Button>
      </div>
    </form>
  );
}
