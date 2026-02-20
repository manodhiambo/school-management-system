import { useState } from 'react';
import { User, Lock, Phone, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function SuperAdminProfilePage() {
  const { user, setAuth, accessToken } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.updateSuperAdminProfile({ name: profileForm.name, phone: profileForm.phone });
      if (user && accessToken) {
        setAuth({ ...user, name: profileForm.name }, accessToken, true);
      }
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) { setError('Passwords do not match.'); return; }
    if (pwForm.newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await api.updateSuperAdminProfile({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSuccess('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your superadmin account settings</p>
      </div>

      {/* Avatar Card */}
      <Card>
        <CardContent className="p-6 flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-gray-900">{user?.email?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name || 'Superadmin'}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
              SUPERADMIN
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        <button
          onClick={() => { setTab('profile'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'profile' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Profile Info
        </button>
        <button
          onClick={() => { setTab('password'); setError(''); setSuccess(''); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'password' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Change Password
        </button>
      </div>

      {(success || error) && (
        <div className={`flex items-center space-x-2 p-3 rounded-lg border ${success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
          <p className={`text-sm ${success ? 'text-green-600' : 'text-red-600'}`}>{success || error}</p>
        </div>
      )}

      {tab === 'profile' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={user?.email || ''} disabled
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0703 445 756"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
                {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Saving...</> : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'password' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              {[
                { field: 'currentPassword', label: 'Current Password', placeholder: '••••••••' },
                { field: 'newPassword', label: 'New Password', placeholder: 'Min 8 characters' },
                { field: 'confirmPassword', label: 'Confirm New Password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={(pwForm as any)[f.field]}
                      onChange={e => setPwForm(p => ({ ...p, [f.field]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
              <Button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold">
                {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Changing...</> : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
