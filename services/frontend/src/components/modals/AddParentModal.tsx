import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Search } from 'lucide-react';
import api from '@/services/api';

interface AddParentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddParentModal({ open, onOpenChange, onSuccess }: AddParentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: 'parent123',
    firstName: '',
    lastName: '',
    relationship: 'father',
    phonePrimary: '',
    phoneSecondary: '',
    occupation: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    studentIds: [] as string[],
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response: any = await api.getStudents();
        const studentsData = response?.students || response?.data || [];
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    if (open) fetchStudents();
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        relationship: formData.relationship,
        phonePrimary: formData.phonePrimary,
        studentIds: formData.studentIds, // Include student IDs
      };

      // Add optional fields only if they have values
      if (formData.phoneSecondary) submitData.phoneSecondary = formData.phoneSecondary;
      if (formData.occupation) submitData.occupation = formData.occupation;
      if (formData.address) submitData.address = formData.address;
      if (formData.city) submitData.city = formData.city;
      if (formData.state) submitData.state = formData.state;
      if (formData.pincode) submitData.pincode = formData.pincode;

      console.log('Creating parent with data:', submitData);
      await api.createParent(submitData);
      alert('Parent added successfully!');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        email: '',
        password: 'parent123',
        firstName: '',
        lastName: '',
        relationship: 'father',
        phonePrimary: '',
        phoneSecondary: '',
        occupation: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        studentIds: [],
      });
    } catch (error: any) {
      console.error('Create parent error:', error);
      alert(error.message || 'Failed to add parent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Parent</DialogTitle>
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
                  <Label htmlFor="relationship">Relationship *</Label>
                  <Select
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => handleChange('relationship', e.target.value)}
                    required
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Guardian</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
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
                  <p className="text-xs text-gray-500 mt-1">Default: parent123</p>
                </div>
                <div>
                  <Label htmlFor="phonePrimary">Primary Phone *</Label>
                  <Input
                    id="phonePrimary"
                    value={formData.phonePrimary}
                    onChange={(e) => handleChange('phonePrimary', e.target.value)}
                    placeholder="0712345678"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phoneSecondary">Secondary Phone</Label>
                  <Input
                    id="phoneSecondary"
                    value={formData.phoneSecondary}
                    onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                    placeholder="0712345678"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3 text-blue-600">Address (Optional)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">County</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Student Association */}
            <div className="pb-4">
              <h3 className="font-semibold mb-1 text-blue-600">Link Children (Students)</h3>
              <p className="text-sm text-gray-500 mb-3">Search and select the student(s) who belong to this parent</p>

              {/* Search box */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, admission no, or class..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              {students.length > 0 ? (() => {
                const q = studentSearch.toLowerCase();
                const filtered = q
                  ? students.filter(s =>
                      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
                      (s.admission_number || '').toLowerCase().includes(q) ||
                      (s.class_name || '').toLowerCase().includes(q)
                    )
                  : students;
                return (
                  <div className="border rounded-lg bg-gray-50 overflow-hidden">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No students match your search.</p>
                    ) : (
                      <div className="divide-y max-h-52 overflow-y-auto">
                        {filtered.map((student: any) => {
                          const isSelected = formData.studentIds.includes(student.id);
                          return (
                            <div
                              key={student.id}
                              onClick={() => toggleStudent(student.id)}
                              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium">{student.first_name} {student.last_name}</p>
                                <p className="text-xs text-gray-500">
                                  {student.admission_number}{student.class_name ? ` • ${student.class_name}` : ''}
                                  {student.student_type === 'boarder' ? ' • Boarder' : ''}
                                </p>
                              </div>
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border">
                  <p className="text-gray-500">No students available</p>
                  <p className="text-sm text-gray-400">Add students first to link them to parents</p>
                </div>
              )}

              {formData.studentIds.length > 0 && (
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  {formData.studentIds.length} student(s) selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Parent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
