import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { X, Bus, Camera } from 'lucide-react';
import api from '@/services/api';

function resizeImageToBase64(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  studentId: string;
}

export function EditStudentModal({ open, onOpenChange, onSuccess, studentId }: EditStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    admission_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    class_id: '',
    student_type: 'day_scholar',
    uses_transport: false,
    address: '',
    city: '',
    state: '',
    pincode: '',
    status: 'active',
    profile_photo_url: '',
    // Kenya CBE fields
    nemis_number: '',
    education_level: '',
    birth_certificate_number: '',
    county: '',
    sub_county: '',
    special_needs: false,
    special_needs_details: '',
    medical_conditions: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    previous_school: '',
  });

  useEffect(() => {
    if (open && studentId) {
      loadStudent();
      loadClasses();
      loadCategories();
    }
  }, [open, studentId]);

  const loadClasses = async () => {
    try {
      const response: any = await api.getClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response: any = await api.getStudentCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error loading student categories:', error);
    }
  };

  const toggleCategory = (id: string) => {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const loadStudent = async () => {
    try {
      setFetching(true);
      const response: any = await api.getStudent(studentId);
      const student = response.data;
      const photoUrl = student.profile_photo_url || '';
      setPhotoPreview(photoUrl);
      setFormData({
        admission_number: student.admission_number || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth?.split('T')[0] || '',
        gender: student.gender || 'male',
        blood_group: student.blood_group || '',
        class_id: student.class_id || '',
        student_type: student.student_type || 'day_scholar',
        uses_transport: student.uses_transport === true,
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
        status: student.status || 'active',
        profile_photo_url: photoUrl,
        nemis_number: student.nemis_number || '',
        education_level: student.education_level || '',
        birth_certificate_number: student.birth_certificate_number || '',
        county: student.county || '',
        sub_county: student.sub_county || '',
        special_needs: student.special_needs === true,
        special_needs_details: student.special_needs_details || '',
        medical_conditions: student.medical_conditions || '',
        emergency_contact_name: student.emergency_contact_name || '',
        emergency_contact_phone: student.emergency_contact_phone || '',
        previous_school: student.previous_school || '',
      });
      setCategoryIds(student.category_ids || []);
    } catch (error) {
      console.error('Error loading student:', error);
      alert('Failed to load student data');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageToBase64(file, 300);
      setPhotoPreview(base64);
      setFormData(prev => ({ ...prev, profile_photo_url: base64 }));
    } catch {
      alert('Failed to process photo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateStudent(studentId, { ...formData, category_ids: categoryIds });
      alert('Student updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update student';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
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
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              {/* Passport Photo */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Passport Photo</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 hover:border-blue-400 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="h-7 w-7 text-gray-300 mx-auto" />
                        <span className="text-xs text-gray-400 mt-1 block">Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" />
                      {photoPreview ? 'Change Photo' : 'Choose Photo'}
                    </Button>
                    {photoPreview && (
                      <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500" onClick={() => { setPhotoPreview(''); setFormData(p => ({ ...p, profile_photo_url: '' })); }}>
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-gray-400 mt-1">JPG or PNG. Will be resized to passport size.</p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="admission_number">Admission Number</Label>
                    <Input
                      id="admission_number"
                      value={formData.admission_number}
                      onChange={(e) => handleChange('admission_number', e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">Must be unique across all students</p>
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
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <Select
                      id="blood_group"
                      value={formData.blood_group}
                      onChange={(e) => handleChange('blood_group', e.target.value)}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="class_id">Class/Grade</Label>
                    <Select
                      id="class_id"
                      value={formData.class_id}
                      onChange={(e) => handleChange('class_id', e.target.value)}
                    >
                      <option value="">No Class Assigned</option>
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                        </option>
                      ))}
                    </Select>
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
                      <option value="suspended">Suspended</option>
                      <option value="transferred">Transferred</option>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Boarding Type *</Label>
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
                        Ensure this student is assigned to a route under Welfare → Transport.
                      </p>
                    )}
                  </div>
                  {categories.length > 0 && (
                    <div className="md:col-span-2">
                      <Label>Student Categories (optional)</Label>
                      <p className="text-xs text-gray-400 mb-2">
                        Admin-defined categories used for fee reporting (e.g. bursary recipients).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                              categoryIds.includes(c.id)
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
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
                    <Label htmlFor="state">State/County</Label>
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

              {/* Kenya CBE Details */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Kenya CBE Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="nemis_number">NEMIS Number</Label>
                    <Input
                      id="nemis_number"
                      value={formData.nemis_number}
                      onChange={(e) => handleChange('nemis_number', e.target.value)}
                      placeholder="e.g. 12345678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_certificate_number">Birth Certificate No.</Label>
                    <Input
                      id="birth_certificate_number"
                      value={formData.birth_certificate_number}
                      onChange={(e) => handleChange('birth_certificate_number', e.target.value)}
                      placeholder="e.g. BC/2012/123456"
                    />
                  </div>
                  <div>
                    <Label htmlFor="county">Home County</Label>
                    <Input
                      id="county"
                      value={formData.county}
                      onChange={(e) => handleChange('county', e.target.value)}
                      placeholder="e.g. Nairobi City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub_county">Sub-County</Label>
                    <Input
                      id="sub_county"
                      value={formData.sub_county}
                      onChange={(e) => handleChange('sub_county', e.target.value)}
                      placeholder="e.g. Westlands"
                    />
                  </div>
                  <div>
                    <Label htmlFor="previous_school">Previous School</Label>
                    <Input
                      id="previous_school"
                      value={formData.previous_school}
                      onChange={(e) => handleChange('previous_school', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="education_level">Education Level</Label>
                    <select
                      id="education_level"
                      value={formData.education_level}
                      onChange={(e) => handleChange('education_level', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Not specified</option>
                      <option value="playgroup">Playgroup</option>
                      <option value="pre_primary">Pre-Primary (PP1/PP2)</option>
                      <option value="lower_primary">Lower Primary (Grade 1–6)</option>
                      <option value="junior_secondary">Junior Secondary (Grade 7–9)</option>
                      <option value="senior_secondary">Senior Secondary (Grade 10–12)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.special_needs}
                        onChange={(e) => handleChange('special_needs', e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium text-orange-700">Student has special needs</span>
                    </label>
                  </div>
                  {formData.special_needs && (
                    <div className="md:col-span-2">
                      <Label htmlFor="special_needs_details">Special Needs Details</Label>
                      <textarea
                        id="special_needs_details"
                        value={formData.special_needs_details}
                        onChange={(e) => handleChange('special_needs_details', e.target.value)}
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label htmlFor="medical_conditions">Medical Conditions / Allergies</Label>
                    <textarea
                      id="medical_conditions"
                      value={formData.medical_conditions}
                      onChange={(e) => handleChange('medical_conditions', e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Known medical conditions, allergies..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Student'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
