import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Lock, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: '',
    address: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<any>({});

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateUser(user?.id || '', formData);
      alert('Profile updated successfully!');
      setEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      alert(error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const errors: any = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (error: any) {
      console.error('Change password error:', error);
      if (error?.message?.toLowerCase().includes('incorrect')) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
      } else {
        alert(error?.message || 'Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'teacher':
        return 'bg-purple-100 text-purple-700';
      case 'student':
        return 'bg-green-100 text-green-700';
      case 'parent':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Profile</h2>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setEditing(!editing)}
                disabled={saving}
              >
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar and Name */}
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-semibold">{user?.email?.split('@')[0]}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user?.role || '')}`}>
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!editing}
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="0712345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!editing}
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <Input
                      id="address"
                      placeholder="Enter your address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      disabled={!editing}
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Lock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">Keep your account secure</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowPasswordModal(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">Account Status</h4>
              <div className="flex items-center text-sm text-blue-600">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                Active
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>User ID: <code className="bg-gray-100 px-1 rounded text-xs">{user?.id?.substring(0, 8)}...</code></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2 text-blue-600" />
              Change Password
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
            {/* Current Password */}
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => {
                    setPasswordData({...passwordData, currentPassword: e.target.value});
                    setPasswordErrors({...passwordErrors, currentPassword: null});
                  }}
                  className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData({...passwordData, newPassword: e.target.value});
                    setPasswordErrors({...passwordErrors, newPassword: null});
                  }}
                  className={passwordErrors.newPassword ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.newPassword}</p>
              )}
              {passwordData.newPassword && passwordData.newPassword.length >= 6 && (
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" /> Password strength: Good
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({...passwordData, confirmPassword: e.target.value});
                  setPasswordErrors({...passwordErrors, confirmPassword: null});
                }}
                className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
              )}
              {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" /> Passwords match
                </p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
