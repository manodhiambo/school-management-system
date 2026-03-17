import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Bus } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddStudentModal({ open, onOpenChange, onSuccess }: AddStudentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: 'student123',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    classId: '',
    student_type: 'day_scholar',
    uses_transport: false,
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.getClasses();
        setClasses(response.data || []);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    if (open) fetchClasses();
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createStudent(formData);
      toast({
        title: 'Success',
        description: 'Student added successfully',
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        email: '',
        password: 'student123',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        bloodGroup: '',
        classId: '',
        student_type: 'day_scholar',
        uses_transport: false,
        address: '',
        city: '',
        state: '',
        pincode: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add student',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {/* Personal Information */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Personal Information</h3>
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
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Student Category *</Label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { value: 'day_scholar', label: 'Day Scholar' },
                      { value: 'boarder', label: 'Boarder' },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => handleChange('student_type', opt.value)}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                          formData.student_type === opt.value
                            ? opt.value === 'boarder'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-1"><Bus className="h-4 w-4 text-orange-500" /> School Transport</Label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { value: true, label: 'Uses school transport' },
                      { value: false, label: 'Does not use transport' },
                    ].map(opt => (
                      <button key={String(opt.value)} type="button"
                        onClick={() => handleChange('uses_transport', opt.value)}
                        className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                          formData.uses_transport === opt.value
                            ? opt.value
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-gray-600 text-white border-gray-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {formData.uses_transport && (
                    <p className="text-xs text-orange-600 mt-1">
                      Remember to assign this student to a transport route under Welfare → Transport after registration.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="classId">Class/Grade *</Label>
                  <select
                    id="classId"
                    value={formData.classId}
                    onChange={(e) => handleChange('classId', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `- ${cls.section}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Contact Information</h3>
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
                  <p className="text-xs text-gray-500 mt-1">Default: student123</p>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
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
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
