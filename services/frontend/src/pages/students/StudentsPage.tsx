import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Download, Upload, Eye, Users, FileText, Bus } from 'lucide-react';
import AddStudentModal from '@/components/modals/AddStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { BulkImportModal } from '@/components/modals/BulkImportModal';
import { AdvancedFilter } from '@/components/filters/AdvancedFilter';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { jsPDF } from 'jspdf';
import { studentTypeLabel, studentTypeBadgeClass } from '@/utils/studentType';

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
  class_name: string;
  student_type: string;
  uses_transport: boolean;
  created_at: string;
}

interface ClassStat {
  class_id: string;
  class_name: string;
  section: string;
  education_level: string;
  student_count: number;
}

type ViewTab = 'all' | 'by-class';

// ── Download helpers ────────────────────────────────────────────────────────

function exportToExcel(rows: Student[], filename: string, className?: string) {
  const headers = ['#', 'Admission No', 'Name', 'Gender', 'Class', 'Category', 'Transport', 'Phone', 'Status'];
  const csvData = rows.map((s, i) => [
    i + 1,
    s.admission_number,
    `${s.first_name} ${s.last_name}`,
    s.gender,
    s.class_name || (className ?? '—'),
    studentTypeLabel(s.student_type),
    s.uses_transport ? 'Yes' : 'No',
    s.phone || '—',
    s.status,
  ]);
  const csv = [headers, ...csvData].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToPDF(rows: Student[], filename: string, title: string) {
  // Fetch school branding
  let school: any = {};
  try {
    const res: any = await api.getSettings();
    school = res?.data || res || {};
  } catch { /* use defaults */ }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(school.school_name || 'SkulManager School', pageW / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addr = [school.address, school.city, school.phone].filter(Boolean).join(' | ');
  if (addr) doc.text(addr, pageW / 2, 17, { align: 'center' });
  doc.text(title, pageW / 2, 23, { align: 'center' });
  y = 34;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  // Table header
  const cols = [10, 28, 62, 88, 113, 140, 163, 190, 220];
  const heads = ['#', 'Adm No', 'Full Name', 'Gender', 'Class', 'Category', 'Transport', 'Phone', 'Status'];
  doc.setFillColor(240, 245, 255);
  doc.rect(8, y - 4, pageW - 16, 8, 'F');
  doc.setFont('helvetica', 'bold');
  heads.forEach((h, i) => doc.text(h, cols[i], y));
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);

  rows.forEach((s, idx) => {
    if (y > 190) {
      doc.addPage();
      y = 14;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(8, y - 4, pageW - 16, 7, 'F');
    }
    const name = `${s.first_name} ${s.last_name}`;
    [
      String(idx + 1),
      s.admission_number || '—',
      name.length > 20 ? name.slice(0, 20) + '…' : name,
      s.gender || '—',
      (s.class_name || '—').slice(0, 14),
      studentTypeLabel(s.student_type),
      s.uses_transport ? 'Yes' : 'No',
      (s.phone || '—').slice(0, 12),
      s.status,
    ].forEach((v, i) => doc.text(v, cols[i], y));
    y += 7;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total: ${rows.length} students`, pageW / 2, 200, { align: 'center' });

  doc.save(filename);
}

// ── Component ────────────────────────────────────────────────────────────────

export function StudentsPage() {
  const user = useAuthStore((s: any) => s.user);
  const { t } = useLanguageStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<{ total_students: number; active_students: number; male_students: number; female_students: number; by_class: ClassStat[] }>({
    total_students: 0, active_students: 0, male_students: 0, female_students: 0, by_class: [],
  });

  // View mode
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [selectedClass, setSelectedClass] = useState<ClassStat | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classSearch, setClassSearch] = useState('');

  const itemsPerPage = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; studentId: string | null }>({ open: false, studentId: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudents();
    loadStats();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response: any = await api.getStudents();
      setStudents(response.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const response: any = await api.getStudentStatistics();
      if (response.data) setStats(response.data);
    } catch { /* silent */ }
  };

  const loadClassStudents = async (cls: ClassStat) => {
    setSelectedClass(cls);
    setClassLoading(true);
    setClassSearch('');
    try {
      const res: any = await api.getStudents({ classId: cls.class_id });
      setClassStudents(res.data || []);
    } catch { setClassStudents([]); } finally { setClassLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal.student) return;
    try {
      setDeleting(true);
      await api.deleteStudent(deleteModal.student.id);
      loadStudents(); loadStats();
      if (selectedClass) loadClassStudents(selectedClass);
      setDeleteModal({ open: false, student: null });
    } catch (error: any) {
      alert(error.message || 'Failed to delete student');
    } finally { setDeleting(false); }
  };

  const filterConfigs = [
    { field: 'gender', label: 'Gender', type: 'select' as const, options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }] },
    { field: 'status', label: 'Status', type: 'select' as const, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }, { value: 'transferred', label: 'Transferred' }] },
  ];

  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilters = Object.entries(filters).every(([k, v]) => !v || s[k as keyof Student]?.toString().toLowerCase() === v.toLowerCase());
    return matchesSearch && matchesFilters;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredClassStudents = classStudents.filter(s =>
    !classSearch || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(classSearch.toLowerCase())
  );

  const classFileName = selectedClass ? `${selectedClass.class_name}${selectedClass.section ? `_${selectedClass.section}` : ''}_students` : 'class_students';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('Students')}</h2>
          <p className="text-gray-500">{t('Manage Students')}</p>
        </div>
        <div className="flex space-x-2 flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => exportToExcel(filteredStudents, `students_${new Date().toISOString().slice(0,10)}.csv`)} className="hidden sm:flex">
                <Download className="mr-2 h-4 w-4" /> {t('Export CSV')}
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImportModal(true)} className="hidden sm:flex">
                <Upload className="mr-2 h-4 w-4" /> {t('Import')}
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t('Add Student')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('Total Students'), val: stats.total_students || 0, color: '' },
          { label: t('Active'), val: stats.active_students || 0, color: 'text-green-600' },
          { label: t('Boys'), val: stats.male_students || 0, color: 'text-blue-600' },
          { label: t('Girls'), val: stats.female_students || 0, color: 'text-pink-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['all', 'by-class'] as ViewTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab === 'all' ? t('All Students') : t('By Class')}
          </button>
        ))}
      </div>

      {/* ── ALL STUDENTS TAB ── */}
      {activeTab === 'all' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
                <Search className="h-5 w-5 text-gray-400" />
                <Input placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
              </div>
              <div className="flex items-center space-x-2">
                <AdvancedFilter filters={filterConfigs} onApply={f => { setFilters(f); setCurrentPage(1); }} onReset={() => { setFilters({}); setCurrentPage(1); }} />
                <span className="text-sm text-gray-500">{filteredStudents.length} students</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <TableSkeleton rows={5} /> : filteredStudents.length === 0 ? (
              <EmptyState icon={Search} title="No students found"
                description={searchTerm || Object.keys(filters).length > 0 ? 'Try adjusting your search or filters' : 'Get started by adding your first student'}
                actionLabel={isAdmin && !searchTerm && Object.keys(filters).length === 0 ? 'Add Student' : undefined}
                onAction={() => setShowAddModal(true)} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">{t('Admission No')}</th>
                        <th className="text-left p-4">{t('Full Name')}</th>
                        <th className="text-left p-4 hidden md:table-cell">{t('Class')}</th>
                        <th className="text-left p-4 hidden md:table-cell">{t('Category')}</th>
                        <th className="text-left p-4 hidden sm:table-cell">{t('Phone')}</th>
                        <th className="text-left p-4 hidden lg:table-cell">{t('Gender')}</th>
                        <th className="text-left p-4">{t('Status')}</th>
                        <th className="text-left p-4">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map(student => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{student.admission_number}</td>
                          <td className="p-4">{student.first_name} {student.last_name}</td>
                          <td className="p-4 hidden md:table-cell">{student.class_name || '—'}</td>
                          <td className="p-4 hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${studentTypeBadgeClass(student.student_type)}`}>
                                {t(studentTypeLabel(student.student_type))}
                              </span>
                              {student.uses_transport && (
                                <span className="flex items-center gap-0.5 text-xs text-orange-600 font-medium">
                                  <Bus className="h-3 w-3" /> Transport
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 hidden sm:table-cell">{student.phone || 'N/A'}</td>
                          <td className="p-4 capitalize hidden lg:table-cell">{student.gender}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="icon" title="View" className="hidden sm:flex"><Eye className="h-4 w-4" /></Button>
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditModal({ open: true, studentId: student.id })}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteModal({ open: true, student })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── BY CLASS TAB ── */}
      {activeTab === 'by-class' && (
        <div className="space-y-4">
          {/* Class cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {stats.by_class.map(cls => (
              <div key={cls.class_id}
                onClick={() => loadClassStudents(cls)}
                className={`text-center p-3 rounded-lg border cursor-pointer transition-all ${selectedClass?.class_id === cls.class_id ? 'border-blue-500 bg-blue-50 shadow-md' : 'bg-gray-50 hover:bg-blue-50 hover:border-blue-300'}`}>
                <div className="text-xl font-bold text-blue-600">{cls.student_count}</div>
                <div className="text-sm font-medium">{cls.class_name}{cls.section ? ` ${cls.section}` : ''}</div>
                {cls.education_level && <div className="text-xs text-gray-400 capitalize">{cls.education_level.replace(/_/g, ' ')}</div>}
              </div>
            ))}
          </div>

          {/* Selected class student list */}
          {selectedClass && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-lg">{selectedClass.class_name}{selectedClass.section ? ` ${selectedClass.section}` : ''}</span>
                    <span className="text-sm text-gray-500">— {classStudents.length} students</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search in class..." value={classSearch} onChange={e => setClassSearch(e.target.value)} className="pl-8 h-8 text-sm w-48" />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(filteredClassStudents, `${classFileName}.csv`, selectedClass.class_name)}>
                      <Download className="h-3 w-3 mr-1" /> Excel
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportToPDF(filteredClassStudents, `${classFileName}.pdf`, `${selectedClass.class_name} — Student List`)}>
                      <FileText className="h-3 w-3 mr-1" /> PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {classLoading ? <TableSkeleton rows={5} /> : filteredClassStudents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">{classSearch ? 'No students match your search.' : 'No students in this class.'}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3">#</th>
                          <th className="text-left px-4 py-3">Adm No</th>
                          <th className="text-left px-4 py-3">Full Name</th>
                          <th className="text-left px-4 py-3">Gender</th>
                          <th className="text-left px-4 py-3">Category</th>
                          <th className="text-left px-4 py-3">Phone</th>
                          <th className="text-left px-4 py-3">Status</th>
                          {isAdmin && <th className="text-left px-4 py-3">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredClassStudents.map((s, i) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                            <td className="px-4 py-3 font-medium">{s.admission_number}</td>
                            <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}</td>
                            <td className="px-4 py-3 capitalize">{s.gender}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${studentTypeBadgeClass(s.student_type)}`}>
                                  {studentTypeLabel(s.student_type)}
                                </span>
                                {s.uses_transport && (
                                  <span className="flex items-center gap-0.5 text-xs text-orange-600 font-medium">
                                    <Bus className="h-3 w-3" /> Transport
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">{s.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setEditModal({ open: true, studentId: s.id })}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteModal({ open: true, student: s })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedClass && (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Click on a class above to view its students</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isAdmin && (
        <>
          <AddStudentModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={() => { loadStudents(); loadStats(); }} />
          {editModal.studentId && (
            <EditStudentModal open={editModal.open} onOpenChange={open => setEditModal({ open, studentId: null })}
              onSuccess={() => { loadStudents(); loadStats(); if (selectedClass) loadClassStudents(selectedClass); }} studentId={editModal.studentId} />
          )}
          <ConfirmDeleteModal open={deleteModal.open} onOpenChange={open => setDeleteModal({ open, student: null })}
            onConfirm={handleDelete}
            title="Delete Student"
            description={`Are you sure you want to delete ${deleteModal.student?.first_name} ${deleteModal.student?.last_name}? This will permanently remove all student data.`}
            loading={deleting} />
          <BulkImportModal open={showBulkImportModal} onOpenChange={setShowBulkImportModal}
            onSuccess={() => { loadStudents(); loadStats(); }} type="students" />
        </>
      )}
    </div>
  );
}
