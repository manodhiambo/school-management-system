import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, DataTable, Modal, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export default function ExamManager() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: exams, isLoading } = useQuery(['exams'], () => 
    apiClient.getExams()
  );

  const createMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/exams',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('exams');
        addToast('success', 'Exam created successfully');
        setShowForm(false);
      },
      onError: () => {
        addToast('error', 'Failed to create exam');
      },
    }
  );

  const columns = [
    {
      key: 'name',
      title: 'Exam Name',
    },
    {
      key: 'type',
      title: 'Type',
    },
    {
      key: 'classId',
      title: 'Class',
    },
    {
      key: 'startDate',
      title: 'Start Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'endDate',
      title: 'End Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'isResultsPublished',
      title: 'Results',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value ? 'Published' : 'Pending'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Exams</h2>
        <Button onClick={() => setShowForm(true)}>
          Add Exam
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={exams?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Exam"
      >
        <ExamForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function ExamForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'unit_test',
    classId: '',
    startDate: '',
    endDate: '',
    maxMarks: '',
    passingMarks: '',
    weightage: '1.0',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      maxMarks: parseFloat(formData.maxMarks),
      passingMarks: parseFloat(formData.passingMarks),
      weightage: parseFloat(formData.weightage),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Exam Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="e.g., First Unit Test"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({...formData, type: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="unit_test">Unit Test</option>
          <option value="term">Term Exam</option>
          <option value="half_yearly">Half Yearly</option>
          <option value="final">Final Exam</option>
          <option value="practical">Practical</option>
        </select>
      </div>
      <Input
        label="Class ID"
        value={formData.classId}
        onChange={(e) => setFormData({...formData, classId: e.target.value})}
        placeholder="Enter class ID"
      />
      <Input
        label="Start Date"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
      />
      <Input
        label="End Date"
        type="date"
        value={formData.endDate}
        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
      />
      <Input
        label="Max Marks"
        type="number"
        value={formData.maxMarks}
        onChange={(e) => setFormData({...formData, maxMarks: e.target.value})}
        placeholder="e.g., 100"
      />
      <Input
        label="Passing Marks"
        type="number"
        value={formData.passingMarks}
        onChange={(e) => setFormData({...formData, passingMarks: e.target.value})}
        placeholder="e.g., 33"
      />
      <Input
        label="Weightage"
        type="number"
        step="0.1"
        value={formData.weightage}
        onChange={(e) => setFormData({...formData, weightage: e.target.value})}
        placeholder="e.g., 1.0"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Exam
        </Button>
      </div>
    </form>
  );
}
