import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Button, DataTable, Modal, Badge, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { Plus, Upload, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@school/shared-ui';
import StudentForm from '../../components/StudentForm';
import BulkImportWizard from '../../components/BulkImportWizard';
import { Student } from '@school/shared-types';

export default function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    status: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading } = useQuery(
    ['students', searchTerm, filters],
    () => apiClient.getStudents({ search: searchTerm, ...filters, page: 1, limit: 50 })
  );

  const deleteMutation = useMutation(
    (id: string) => apiClient.request({ url: `/api/v1/students/${id}`, method: 'DELETE' }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
        addToast('success', 'Student deleted successfully');
      },
      onError: () => {
        addToast('error', 'Failed to delete student');
      },
    }
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'admissionNumber',
      title: 'Admission No',
      sortable: true,
    },
    {
      key: 'firstName',
      title: 'Name',
      render: (_: any, record: Student) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            {record.firstName[0]}
          </div>
          <div>
            <div className="font-medium">{`${record.firstName} ${record.lastName}`}</div>
            <div className="text-xs text-gray-500">{record.rollNumber}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'className',
      title: 'Class',
      render: (_: any, record: Student) => (
        <span>{`${record.classId || 'N/A'} - ${record.sectionId || 'N/A'}`}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge
          variant={
            value === 'active'
              ? 'success'
              : value === 'suspended'
              ? 'warning'
              : 'destructive'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Student) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = `/students/${record.id}`}
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = `/students/${record.id}/edit`}
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(record.id)}
            disabled={deleteMutation.isLoading}
          >
            <Trash2 size={16} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport(true)} variant="outline">
            <Upload size={16} className="mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} className="mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                placeholder="Search by name, admission number..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter size={16} className="mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            onRowClick={(record) => window.location.href = `/students/${record.id}`}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Student">
        <StudentForm
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries('students');
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Bulk Import Students">
        <BulkImportWizard
          onSuccess={() => {
            setShowImport(false);
            queryClient.invalidateQueries('students');
          }}
          onCancel={() => setShowImport(false)}
        />
      </Modal>
    </div>
  );
}
