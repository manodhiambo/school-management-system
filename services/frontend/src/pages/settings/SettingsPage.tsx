import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, School, Bell, Lock, FileText } from 'lucide-react';
import api from '@/services/api';

export function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'academic'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response: any = await api.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Settings</h2>
          <p className="text-gray-500">Manage system configuration and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              variant={activeTab === 'general' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('general')}
            >
              <School className="mr-2 h-4 w-4" />
              General
            </Button>
            <Button
              className="w-full justify-start"
              variant={activeTab === 'academic' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('academic')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Academic
            </Button>
            <Button
              className="w-full justify-start"
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            <Button
              className="w-full justify-start"
              variant={activeTab === 'security' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('security')}
            >
              <Lock className="mr-2 h-4 w-4" />
              Security
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>
              {activeTab === 'general' && 'General Settings'}
              {activeTab === 'academic' && 'Academic Settings'}
              {activeTab === 'notifications' && 'Notification Settings'}
              {activeTab === 'security' && 'Security Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="school_name">School Name</Label>
                    <Input
                      id="school_name"
                      value={settings?.school_name || ''}
                      onChange={(e) => handleChange('school_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="school_code">School Code</Label>
                    <Input
                      id="school_code"
                      value={settings?.school_code || ''}
                      onChange={(e) => handleChange('school_code', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={settings?.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings?.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    className="w-full border rounded-md p-3"
                    rows={3}
                    value={settings?.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={settings?.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={settings?.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={settings?.pincode || ''}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'academic' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="current_academic_year">Current Academic Year</Label>
                    <Input
                      id="current_academic_year"
                      value={settings?.current_academic_year || ''}
                      onChange={(e) => handleChange('current_academic_year', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={settings?.timezone || ''}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="date_format">Date Format</Label>
                    <select
                      id="date_format"
                      className="w-full border rounded-md p-2"
                      value={settings?.date_format || 'DD/MM/YYYY'}
                      onChange={(e) => handleChange('date_format', e.target.value)}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="time_format">Time Format</Label>
                    <select
                      id="time_format"
                      className="w-full border rounded-md p-2"
                      value={settings?.time_format || '12'}
                      onChange={(e) => handleChange('time_format', e.target.value)}
                    >
                      <option value="12">12 Hour</option>
                      <option value="24">24 Hour</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={settings?.currency || 'INR'}
                    onChange={(e) => handleChange('currency', e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Enable SMS notifications for important alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.sms_enabled || false}
                    onChange={(e) => handleChange('sms_enabled', e.target.checked)}
                    className="h-5 w-5"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Enable email notifications for system updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.email_enabled || false}
                    onChange={(e) => handleChange('email_enabled', e.target.checked)}
                    className="h-5 w-5"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Enable push notifications for mobile app</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.push_notification_enabled || false}
                    onChange={(e) => handleChange('push_notification_enabled', e.target.checked)}
                    className="h-5 w-5"
                  />
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-medium">Late Fee Applicable</p>
                    <p className="text-sm text-gray-500">Automatically apply late fees on overdue payments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings?.fee_late_fee_applicable || false}
                    onChange={(e) => handleChange('fee_late_fee_applicable', e.target.checked)}
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <Label htmlFor="attendance_method">Attendance Method</Label>
                  <select
                    id="attendance_method"
                    className="w-full border rounded-md p-2"
                    value={settings?.attendance_method || 'all'}
                    onChange={(e) => handleChange('attendance_method', e.target.value)}
                  >
                    <option value="manual">Manual Only</option>
                    <option value="biometric">Biometric Only</option>
                    <option value="qr">QR Code Only</option>
                    <option value="all">All Methods</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="font-medium text-yellow-800">Security Information</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    For advanced security settings, please contact system administrator.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">School ID</p>
              <p className="font-medium">{settings?.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium">{new Date(settings?.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">{new Date(settings?.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
