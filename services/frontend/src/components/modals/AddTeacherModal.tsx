import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';

interface AddTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTeacherModal({ open, onOpenChange, onSuccess }: AddTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ class_id: string; subject_id: string; class_name: string; subject_name: string }[]>([]);
  const [newClassId, setNewClassId] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: 'teacher123',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    dateOfJoining: '',
    qualification: '',
    specialization: '',
    experienceYears: '',
    designation: '',
    address: '',
  });

  useEffect(() => {
    if (open) {
      api.getClasses().then((r: any) => setClasses(r.data || r.classes || [])).catch(() => {});
      api.getSubjects().then((r: any) => setSubjects(r.data || r.subjects || [])).catch(() => {});
    }
  }, [open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAssignment = () => {
    if (!newClassId || !newSubjectId) return;
    const alreadyExists = assignments.some(a => a.class_id === newClassId && a.subject_id === newSubjectId);
    if (alreadyExists) return;
    const cls = classes.find(c => c.id === newClassId);
    const sub = subjects.find(s => s.id === newSubjectId);
    setAssignments(prev => [...prev, {
      class_id: newClassId,
      subject_id: newSubjectId,
      class_name: cls ? `${cls.name}${cls.section ? ' ' + cls.section : ''}` : newClassId,
      subject_name: sub ? sub.name : newSubjectId,
    }]);
    setNewClassId('');
    setNewSubjectId('');
  };

  const removeAssignment = (index: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: Record<string, any> = {
        ...formData,
        experienceYears: formData.experienceYears ? Number(formData.experienceYears) : undefined,
      };

      // Strip empty strings so Joi doesn't reject optional date/string fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') delete submitData[key];
      });

      const response: any = await api.createTeacher(submitData);
      const teacherId = response.data?.id || response.id;

      // Save assignments if any
      if (teacherId && assignments.length > 0) {
        await Promise.all(
          assignments.map(a => api.addTeacherAssignment(teacherId, { class_id: a.class_id, subject_id: a.subject_id }))
        );
      }

      alert('Teacher added successfully!');
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        email: '',
        password: 'teacher123',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        dateOfJoining: '',
        qualification: '',
        specialization: '',
        experienceYears: '',
        designation: '',
        address: '',
      });
      setAssignments([]);
      setNewClassId('');
      setNewSubjectId('');
    } catch (error: any) {
      console.error('Create teacher error:', error);
      alert(error.message || 'Failed to add teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto flex-1 px-1 pb-4">
            {/* Personal Information */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3 text-blue-600">Personal Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
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
                  <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                  <Input
                    id="dateOfJoining"
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => handleChange('dateOfJoining', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3 text-blue-600">Contact & Login</h3>
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
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="text"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: teacher123</p>
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
                    placeholder="e.g., Senior Teacher"
                  />
                </div>
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => handleChange('experienceYears', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Textarea
                    id="qualification"
                    value={formData.qualification}
                    onChange={(e) => handleChange('qualification', e.target.value)}
                    placeholder="e.g., B.Ed, M.Sc Mathematics"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Teaching Assignments */}
            <div className="pb-4">
              <h3 className="font-semibold mb-1 text-blue-600">Teaching Assignments</h3>
              <p className="text-sm text-gray-500 mb-3">Assign this teacher to classes and subjects they will teach</p>

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
                  onClick={addAssignment}
                  disabled={!newClassId || !newSubjectId}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Assignment list */}
              {assignments.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-sm text-gray-400">No assignments added yet. You can add them after saving too.</p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {assignments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{a.subject_name}</span>
                        <span className="text-xs text-gray-500 ml-2">— {a.class_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignment(i)}
                        className="text-red-400 hover:text-red-600 p-1"
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
              {loading ? 'Adding...' : 'Add Teacher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
