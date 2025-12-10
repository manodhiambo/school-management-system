import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, UserPlus, Trash2 } from 'lucide-react';
import api from '@/services/api';

interface EditParentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: any;
  onSuccess: () => void;
}

export function EditParentModal({ open, onOpenChange, parent, onSuccess }: EditParentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'children'>('details');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: 'guardian',
    phonePrimary: '',
    phoneSecondary: '',
    occupation: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (open && parent) {
      console.log('EditParentModal opened for:', parent);
      // Pre-fill form with parent data
      setFormData({
        firstName: parent.first_name || '',
        lastName: parent.last_name || '',
        relationship: parent.relationship || 'guardian',
        phonePrimary: parent.phone_primary || '',
        phoneSecondary: parent.phone_secondary || '',
        occupation: parent.occupation || '',
        address: parent.address || '',
        city: parent.city || '',
        state: parent.state || '',
        pincode: parent.pincode || '',
      });
      setActiveTab('details');
      fetchData();
    }
  }, [open, parent]);

  const fetchData = async () => {
    if (!parent?.id) return;
    
    try {
      // Get all students
      const studentsRes: any = await api.getStudents();
      const allStudents = studentsRes?.students || studentsRes?.data || [];
      setStudents(Array.isArray(allStudents) ? allStudents : []);

      // Get parent details with children
      const parentRes: any = await api.getParent(parent.id);
      setLinkedChildren(parentRes?.data?.children || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parent?.id) return;
    
    setLoading(true);
    try {
      await api.updateParent(parent.id, formData);
      alert('Parent updated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Update parent error:', error);
      alert(error.message || 'Failed to update parent');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkStudent = async (studentId: string) => {
    if (!parent?.id) return;
    
    try {
      await api.linkStudentToParent(parent.id, {
        studentId,
        relationship: formData.relationship
      });
      alert('Student linked successfully!');
      fetchData();
      onSuccess();
    } catch (error: any) {
      console.error('Link student error:', error);
      alert(error.message || 'Failed to link student');
    }
  };

  const handleUnlinkStudent = async (studentId: string) => {
    if (!parent?.id) return;
    if (!confirm('Are you sure you want to unlink this student?')) return;
    
    try {
      await api.unlinkStudentFromParent(parent.id, studentId);
      alert('Student unlinked successfully!');
      fetchData();
      onSuccess();
    } catch (error: any) {
      console.error('Unlink student error:', error);
      alert(error.message || 'Failed to unlink student');
    }
  };

  // Get IDs of already linked students
  const linkedStudentIds = linkedChildren.map((c: any) => c.id);
  const availableStudents = students.filter(s => !linkedStudentIds.includes(s.id));

  if (!parent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Parent: {parent?.first_name} {parent?.last_name}</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Parent Details
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'children' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('children')}
          >
            Linked Children ({linkedChildren.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateDetails} className="space-y-4">
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
                    <Label htmlFor="relationship">Relationship</Label>
                    <Select
                      id="relationship"
                      value={formData.relationship}
                      onChange={(e) => handleChange('relationship', e.target.value)}
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
                <h3 className="font-semibold mb-3 text-blue-600">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="phonePrimary">Primary Phone</Label>
                    <Input
                      id="phonePrimary"
                      value={formData.phonePrimary}
                      onChange={(e) => handleChange('phonePrimary', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneSecondary">Secondary Phone</Label>
                    <Input
                      id="phoneSecondary"
                      value={formData.phoneSecondary}
                      onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="pb-4">
                <h3 className="font-semibold mb-3 text-blue-600">Address</h3>
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {activeTab === 'children' && (
            <div className="space-y-6">
              {/* Currently Linked Children */}
              <div>
                <h3 className="font-semibold mb-3 text-green-600">Currently Linked Children</h3>
                {linkedChildren.length > 0 ? (
                  <div className="space-y-2">
                    {linkedChildren.map((child: any) => (
                      <div key={child.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="font-bold text-green-600">
                              {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{child.first_name} {child.last_name}</p>
                            <p className="text-sm text-gray-500">
                              {child.admission_number} • {child.class_name || 'No class'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleUnlinkStudent(child.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No children linked to this parent</p>
                  </div>
                )}
              </div>

              {/* Available Students to Link */}
              <div>
                <h3 className="font-semibold mb-3 text-blue-600">Available Students to Link</h3>
                {availableStudents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableStudents.map((student: any) => (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="font-bold text-blue-600">
                              {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{student.first_name} {student.last_name}</p>
                            <p className="text-sm text-gray-500">
                              {student.admission_number} • {student.class_name || 'No class'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleLinkStudent(student.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">
                      {students.length === 0 
                        ? 'No students in the system' 
                        : 'All students are already linked to this parent'}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
