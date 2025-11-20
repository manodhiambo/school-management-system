import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Download, Upload } from 'lucide-react';
import { AddStudentModal } from '@/components/modals/AddStudentModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import api from '@/services/api';

interface Student {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  status: string;
  created_at: string;
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; student: Student | null }>({
    open: false,
    student: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response: any = await api.getStudents();
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.student) return;

    try {
      setDeleting(true);
      await api.deleteStudent(deleteModal.student.id);
      alert('Student deleted successfully!');
      loadStudents();
      setDeleteModal({ open: false, student: null });
    } catch (error: any) {
      alert(error.message || 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    // Convert students to CSV
    const headers = ['Admission No', 'Name', 'Email', 'Phone', 'Gender', 'Status'];
    const csvData = students.map(s => [
      s.admission_number,
      `${s.first_name} ${s.last_name}`,
      s.email || 'N/A',
      s.phone || 'N/A',
      s.gender,
      s.status,
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.admission_number}`
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
          <h2 className="text-3xl font-bold">Students</h2>
          <p className="text-gray-500">Manage student records and information</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search students by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              Total: {filteredStudents.length} students
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No students found matching your search' : 'No students found'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Student
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Admission No.</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Gender</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{student.admission_number}</td>
                      <td className="p-4">{student.first_name} {student.last_name}</td>
                      <td className="p-4">{student.email || 'N/A'}</td>
                      <td className="p-4">{student.phone || 'N/A'}</td>
                      <td className="p-4 capitalize">{student.gender}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete"
                            onClick={() => setDeleteModal({ open: true, student })}
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

      {/* Add Student Modal */}
      <AddStudentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadStudents}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, student: null })}
        onConfirm={handleDelete}
        title="Delete Student"
        description={`Are you sure you want to delete ${deleteModal.student?.first_name} ${deleteModal.student?.last_name}? This will permanently remove all student data including attendance, grades, and fee records.`}
        loading={deleting}
      />
    </div>
  );
}
