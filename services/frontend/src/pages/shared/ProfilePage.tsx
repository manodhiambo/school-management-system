import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin, Calendar, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCurrentUser();
      console.log('Profile data:', response);
      setProfile(response.user || response.data || user);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setError(error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // TODO: Implement profile update API
      // await api.updateProfile(profile);
      setEditing(false);
      alert('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={loadProfile} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Profile</h2>
          <p className="text-gray-500">Manage your personal information</p>
        </div>
        <Button
          onClick={() => editing ? handleSave() : setEditing(true)}
        >
          {editing ? 'Save Changes' : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-2xl font-bold">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-gray-500 capitalize">{user?.role}</p>
              {editing && (
                <Button variant="outline" size="sm" className="mt-2">
                  Change Photo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              {editing ? (
                <Input
                  id="first_name"
                  value={profile?.first_name || ''}
                  onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{profile?.first_name || 'Not set'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              {editing ? (
                <Input
                  id="last_name"
                  value={profile?.last_name || ''}
                  onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{profile?.last_name || 'Not set'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center space-x-2 text-gray-700">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {editing ? (
                <Input
                  id="phone"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  placeholder="+254 XXX XXX XXX"
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{profile?.phone || 'Not set'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              {editing ? (
                <Input
                  id="address"
                  value={profile?.address || ''}
                  onChange={(e) => setProfile({...profile, address: e.target.value})}
                />
              ) : (
                <div className="flex items-center space-x-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{profile?.address || 'Not set'}</span>
                </div>
              )}
            </div>

            {profile?.date_of_birth && (
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <div className="flex items-center space-x-2 text-gray-700">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{new Date(profile.date_of_birth).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {profile?.admission_number && (
              <div className="space-y-2">
                <Label>Admission Number</Label>
                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="font-mono">{profile.admission_number}</span>
                </div>
              </div>
            )}

            {profile?.employee_id && (
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="font-mono">{profile.employee_id}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline">Change Password</Button>
            <Button variant="outline">Enable Two-Factor Authentication</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
