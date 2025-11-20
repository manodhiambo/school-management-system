import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Download, Upload } from 'lucide-react';
import { AddTeacherModal } from '@/components/modals/AddTeacherModal';
import { EditTeacherModal } from '@/components/modals/EditTeacherModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { BulkImportModal } from '@/components/modals/BulkImportModal';
import api from '@/services/api';

interface Teacher {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  specialization: string;
  status: string;
  created_at: string;
}

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; teacherId: string | null }>({
    open: false,
    teacherId: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; teacher: Teacher | null }>({
    open: false,
    teacher: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response: any = await api.getTeachers();
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.teacher) return;

    try {
      setDeleting(true);
      await api.deleteTeacher(deleteModal.teacher.id);
      alert('Teacher deleted successfully!');
      loadTeachers();
      setDeleteModal({ open: false, teacher: null });
    } catch (error: any) {
      alert(error.message || 'Failed to delete teacher');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Specialization', 'Status'];
    const csvData = teachers.map(t => [
      t.employee_id,
      `${t.first_name} ${t.last_name}`,
      t.email,
      t.phone || 'N/A',
      t.specialization || 'N/A',
      t.status,
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.first_name} ${teacher.last_name} ${teacher.employee_id}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Teachers</h2>
          <p className="text-gray-500">Manage teacher records and assignments</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowBulkImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search teachers by name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              Total: {filteredTeachers.length} teachers
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No teachers found matching your search' : 'No teachers found'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Teacher
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Employee ID</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Specialization</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{teacher.employee_id}</td>
                      <td className="p-4">{teacher.first_name} {teacher.last_name}</td>
                      <td className="p-4">{teacher.email}</td>
                      <td className="p-4">{teacher.phone || 'N/A'}</td>
                      <td className="p-4">{teacher.specialization || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          teacher.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {teacher.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Edit"
                            onClick={() => setEditModal({ open: true, teacherId: teacher.id })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete"
                            onClick={() => setDeleteModal({ open: true, teacher })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddTeacherModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadTeachers}
      />

      {editModal.teacherId && (
        <EditTeacherModal
          open={editModal.open}
          onOpenChange={(open) => setEditModal({ open, teacherId: null })}
          onSuccess={loadTeachers}
          teacherId={editModal.teacherId}
        />
      )}

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, teacher: null })}
        onConfirm={handleDelete}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${deleteModal.teacher?.first_name} ${deleteModal.teacher?.last_name}? This will remove their access and all associated records.`}
        loading={deleting}
      />

      <BulkImportModal
        open={showBulkImportModal}
        onOpenChange={setShowBulkImportModal}
        onSuccess={loadTeachers}
        type="teachers"
      />
    </div>
  );
}
