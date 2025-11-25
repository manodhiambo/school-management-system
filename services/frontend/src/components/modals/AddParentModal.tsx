import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import api from '@/services/api';

interface AddParentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddParentModal({ open, onOpenChange, onSuccess }: AddParentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: 'parent123',
    firstName: '',
    lastName: '',
    relationship: 'father',
    phonePrimary: '',
    phoneSecondary: '',
    emailSecondary: '',
    occupation: '',
    annualIncome: '',
    education: '',
    idNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert annualIncome to number if provided, remove empty optional fields
      const submitData: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        relationship: formData.relationship,
        phonePrimary: formData.phonePrimary,
      };

      // Add optional fields only if they have values
      if (formData.phoneSecondary) submitData.phoneSecondary = formData.phoneSecondary;
      if (formData.emailSecondary) submitData.emailSecondary = formData.emailSecondary;
      if (formData.occupation) submitData.occupation = formData.occupation;
      if (formData.annualIncome) submitData.annualIncome = Number(formData.annualIncome);
      if (formData.education) submitData.education = formData.education;
      if (formData.idNumber) submitData.idNumber = formData.idNumber;
      if (formData.address) submitData.address = formData.address;
      if (formData.city) submitData.city = formData.city;
      if (formData.state) submitData.state = formData.state;
      if (formData.pincode) submitData.pincode = formData.pincode;
      
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
        emailSecondary: '',
        occupation: '',
        annualIncome: '',
        education: '',
        idNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
      });
    } catch (error: any) {
      console.error('Create parent error:', error);
      
      // Show detailed validation errors if available
      if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
        alert(`Validation failed:\n${errorMessages}`);
      } else {
        alert(error.message || 'Failed to add parent');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Parent</DialogTitle>
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
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) => handleChange('education', e.target.value)}
                    placeholder="e.g., Bachelor's Degree"
                  />
                </div>
                <div>
                  <Label htmlFor="idNumber">ID Number (8 digits)</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => handleChange('idNumber', e.target.value)}
                    pattern="[0-9]{8}"
                    placeholder="12345678"
                  />
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
                  <Label htmlFor="emailSecondary">Secondary Email</Label>
                  <Input
                    id="emailSecondary"
                    type="email"
                    value={formData.emailSecondary}
                    onChange={(e) => handleChange('emailSecondary', e.target.value)}
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
                <div></div>
                <div>
                  <Label htmlFor="phonePrimary">Primary Phone * (10 digits)</Label>
                  <Input
                    id="phonePrimary"
                    value={formData.phonePrimary}
                    onChange={(e) => handleChange('phonePrimary', e.target.value)}
                    pattern="[0-9]{10}"
                    placeholder="0712345678"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phoneSecondary">Secondary Phone (10 digits)</Label>
                  <Input
                    id="phoneSecondary"
                    value={formData.phoneSecondary}
                    onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                    pattern="[0-9]{10}"
                    placeholder="0712345678"
                  />
                </div>
              </div>
            </div>

            {/* Professional & Financial Information */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Professional Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="annualIncome">Annual Income (KSH)</Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    value={formData.annualIncome}
                    onChange={(e) => handleChange('annualIncome', e.target.value)}
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="pb-4">
              <h3 className="font-semibold mb-3">Address Information</h3>
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
                    placeholder="e.g., Nyeri"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Postal Code</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
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
              {loading ? 'Adding...' : 'Add Parent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
