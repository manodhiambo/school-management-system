import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';

interface EditTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  teacherId: string;
}

export function EditTeacherModal({ open, onOpenChange, onSuccess, teacherId }: EditTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [newClassId, setNewClassId] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    date_of_joining: '',
    qualification: '',
    specialization: '',
    experience_years: '',
    designation: '',
    address: '',
    status: 'active',
  });

  useEffect(() => {
    if (open && teacherId) {
      loadTeacher();
      loadAssignments();
      api.getClasses().then((r: any) => setClasses(r.data || r.classes || [])).catch(() => {});
      api.getSubjects().then((r: any) => setSubjects(r.data || r.subjects || [])).catch(() => {});
    }
  }, [open, teacherId]);

  const loadTeacher = async () => {
    try {
      setFetching(true);
      const response: any = await api.getTeacher(teacherId);
      const teacher = response.data;
      setFormData({
        employee_id: teacher.employee_id || '',
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        date_of_birth: teacher.date_of_birth?.split('T')[0] || '',
        gender: teacher.gender || 'male',
        date_of_joining: teacher.date_of_joining?.split('T')[0] || '',
        qualification: teacher.qualification || '',
        specialization: teacher.specialization || '',
        experience_years: teacher.experience_years?.toString() || '',
        designation: teacher.designation || '',
        address: teacher.address || '',
        status: teacher.status || 'active',
      });
    } catch (error) {
      console.error('Error loading teacher:', error);
      alert('Failed to load teacher data');
    } finally {
      setFetching(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response: any = await api.getTeacherSubjectAssignments(teacherId);
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAssignment = async () => {
    if (!newClassId || !newSubjectId) return;
    const alreadyExists = assignments.some(a => a.class_id === newClassId && a.subject_id === newSubjectId);
    if (alreadyExists) return;
    try {
      setAssignmentSaving(true);
      const response: any = await api.addTeacherAssignment(teacherId, { class_id: newClassId, subject_id: newSubjectId });
      setAssignments(response.data || []);
      setNewClassId('');
      setNewSubjectId('');
    } catch (error: any) {
      alert(error.message || 'Failed to add assignment');
    } finally {
      setAssignmentSaving(false);
    }
  };

  const handleRemoveAssignment = async (csId: string) => {
    try {
      setAssignmentSaving(true);
      await api.removeTeacherAssignment(teacherId, csId);
      setAssignments(prev => prev.filter(a => a.id !== csId));
    } catch (error: any) {
      alert(error.message || 'Failed to remove assignment');
    } finally {
      setAssignmentSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim()) { alert('First name is required'); return; }
    if (!formData.last_name.trim())  { alert('Last name is required');  return; }
    setLoading(true);

    try {
      // Backend schema expects camelCase; strip unknown/read-only fields
      const payload: Record<string, any> = {
        firstName: formData.first_name.trim(),
        lastName: formData.last_name.trim(),
        gender: formData.gender,
        designation: formData.designation,
        specialization: formData.specialization,
        qualification: formData.qualification,
        address: formData.address,
      };
      if (formData.date_of_birth) payload.dateOfBirth = formData.date_of_birth;
      if (formData.date_of_joining) payload.dateOfJoining = formData.date_of_joining;
      if (formData.experience_years) payload.experienceYears = Number(formData.experience_years);
      if (formData.phone) payload.phone = formData.phone;

      // Strip empty strings
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });

      await api.updateTeacher(teacherId, payload);
      alert('Teacher updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      alert(error.message || 'Failed to update teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 overflow-y-auto flex-1 px-1 pb-4">
              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-blue-600">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date_of_joining">Date of Joining *</Label>
                    <Input
                      id="date_of_joining"
                      type="date"
                      value={formData.date_of_joining}
                      onChange={(e) => handleChange('date_of_joining', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="resigned">Resigned</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-blue-600">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-blue-600">Professional Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      value={formData.specialization}
                      onChange={(e) => handleChange('specialization', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience_years">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => handleChange('experience_years', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Textarea
                      id="qualification"
                      value={formData.qualification}
                      onChange={(e) => handleChange('qualification', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Teaching Assignments */}
              <div className="pb-4">
                <h3 className="font-semibold mb-1 text-blue-600">Teaching Assignments</h3>
                <p className="text-sm text-gray-500 mb-3">Classes and subjects this teacher is assigned to teach</p>

                {/* Add row */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <Select value={newClassId} onChange={e => setNewClassId(e.target.value)}>
                      <option value="">Select class...</option>
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}{cls.section ? ' ' + cls.section : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)}>
                      <option value="">Select subject...</option>
                      {subjects.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}{sub.code ? ` (${sub.code})` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddAssignment}
                    disabled={!newClassId || !newSubjectId || assignmentSaving}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Assignment list */}
                {assignments.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                    <p className="text-sm text-gray-400">No teaching assignments yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {assignments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{a.subject_name}</span>
                          {a.subject_code && <span className="text-xs text-gray-400 ml-1">({a.subject_code})</span>}
                          <span className="text-xs text-gray-500 ml-2">
                            — {a.class_name}{a.class_section ? ' ' + a.class_section : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(a.id)}
                          disabled={assignmentSaving}
                          className="text-red-400 hover:text-red-600 p-1 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Teacher'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
