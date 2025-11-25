import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Download, Upload, Eye } from 'lucide-react';
import AddStudentModal from '@/components/modals/AddStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { BulkImportModal } from '@/components/modals/BulkImportModal';
import { AdvancedFilter } from '@/components/filters/AdvancedFilter';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const itemsPerPage = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; studentId: string | null }>({
    open: false,
    studentId: null,
  });
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

  const filterConfigs = [
    {
      field: 'gender',
      label: 'Gender',
      type: 'select' as const,
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      field: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'transferred', label: 'Transferred' },
      ],
    },
  ];

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Apply search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = `${student.first_name} ${student.last_name} ${student.admission_number}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesFilters = Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return student[key as keyof Student]?.toString().toLowerCase() === value.toLowerCase();
    });

    return matchesSearch && matchesFilters;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Students</h2>
          <p className="text-gray-500">Manage student records and information</p>
        </div>
        <div className="flex space-x-2 flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowBulkImportModal(true)} className="hidden sm:flex">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <AdvancedFilter
                filters={filterConfigs}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              />
              <div className="text-sm text-gray-500">
                {filteredStudents.length} students
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No students found"
              description={searchTerm || Object.keys(filters).length > 0 
                ? "Try adjusting your search or filters" 
                : "Get started by adding your first student"}
              actionLabel={!searchTerm && Object.keys(filters).length === 0 ? "Add Student" : undefined}
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Admission No.</th>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4 hidden md:table-cell">Email</th>
                      <th className="text-left p-4 hidden sm:table-cell">Phone</th>
                      <th className="text-left p-4 hidden lg:table-cell">Gender</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{student.admission_number}</td>
                        <td className="p-4">{student.first_name} {student.last_name}</td>
                        <td className="p-4 hidden md:table-cell">{student.email || 'N/A'}</td>
                        <td className="p-4 hidden sm:table-cell">{student.phone || 'N/A'}</td>
                        <td className="p-4 capitalize hidden lg:table-cell">{student.gender}</td>
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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="View"
                              className="hidden sm:flex"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Edit"
                              onClick={() => setEditModal({ open: true, studentId: student.id })}
                            >
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

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddStudentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadStudents}
      />

      {editModal.studentId && (
        <EditStudentModal
          open={editModal.open}
          onOpenChange={(open) => setEditModal({ open, studentId: null })}
          onSuccess={loadStudents}
          studentId={editModal.studentId}
        />
      )}

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, student: null })}
        onConfirm={handleDelete}
        title="Delete Student"
        description={`Are you sure you want to delete ${deleteModal.student?.first_name} ${deleteModal.student?.last_name}? This will permanently remove all student data including attendance, grades, and fee records.`}
        loading={deleting}
      />

      <BulkImportModal
        open={showBulkImportModal}
        onOpenChange={setShowBulkImportModal}
        onSuccess={loadStudents}
        type="students"
      />
    </div>
  );
}
