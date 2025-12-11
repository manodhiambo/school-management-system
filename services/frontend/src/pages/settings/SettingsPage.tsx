import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, School, Bell, Lock, Globe, Clock } from 'lucide-react';
import api from '@/services/api';

export function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'system'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response: any = await api.getSettings();
      setSettings(response.data || {});
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Send snake_case directly as backend expects
      await api.updateSettings(settings);
      alert('Settings saved successfully!');
      loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Failed to save settings');
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

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'general' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <School className="h-4 w-4 inline mr-2" />
          School Info
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'contact' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="h-4 w-4 inline mr-2" />
          Contact & Address
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'system' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          System
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <School className="h-5 w-5 mr-2" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="school_name">School Name *</Label>
                <Input
                  id="school_name"
                  value={settings?.school_name || ''}
                  onChange={(e) => handleChange('school_name', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <Label htmlFor="school_code">School Code</Label>
                <Input
                  id="school_code"
                  value={settings?.school_code || ''}
                  onChange={(e) => handleChange('school_code', e.target.value)}
                  placeholder="e.g., SCH001"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="school_logo_url">Logo URL</Label>
                <Input
                  id="school_logo_url"
                  value={settings?.school_logo_url || ''}
                  onChange={(e) => handleChange('school_logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label htmlFor="current_academic_year">Current Academic Year</Label>
                <Input
                  id="current_academic_year"
                  value={settings?.current_academic_year || ''}
                  onChange={(e) => handleChange('current_academic_year', e.target.value)}
                  placeholder="e.g., 2024-2025"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Contact & Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={settings?.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+254 712 345 678"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings?.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="info@school.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={settings?.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.school.com"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings?.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="School physical address"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={settings?.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Nairobi"
                />
              </div>
              <div>
                <Label htmlFor="state">County/State</Label>
                <Input
                  id="state"
                  value={settings?.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Nairobi County"
                />
              </div>
              <div>
                <Label htmlFor="pincode">Postal Code</Label>
                <Input
                  id="pincode"
                  value={settings?.pincode || ''}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="00100"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              System Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  id="timezone"
                  value={settings?.timezone || 'Africa/Nairobi'}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                >
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                  <option value="UTC">UTC</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  id="currency"
                  value={settings?.currency || 'KES'}
                  onChange={(e) => handleChange('currency', e.target.value)}
                >
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  id="date_format"
                  value={settings?.date_format || 'DD/MM/YYYY'}
                  onChange={(e) => handleChange('date_format', e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="time_format">Time Format</Label>
                <Select
                  id="time_format"
                  value={settings?.time_format || '12h'}
                  onChange={(e) => handleChange('time_format', e.target.value)}
                >
                  <option value="12h">12 Hour (AM/PM)</option>
                  <option value="24h">24 Hour</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
