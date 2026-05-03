import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, School, Globe, Clock, Upload, X, ImageIcon, UserCheck } from 'lucide-react';
import api from '@/services/api';

// Resize an image file to max 256x256 and return a base64 data URL
function resizeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'system' | 'attendance'>('general');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
    try {
      setLogoUploading(true);
      const base64 = await resizeImageToBase64(file);
      setSettings((s: any) => ({ ...s, school_logo_url: base64 }));
    } catch {
      alert('Failed to process image. Please try another file.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'attendance' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="h-4 w-4 inline mr-2" />
          Attendance
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
                <Label>School Logo</Label>
                <div className="mt-2 flex items-start gap-4">
                  {/* Preview */}
                  <div className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {settings?.school_logo_url ? (
                      <img src={settings.school_logo_url} alt="School logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  {/* Upload controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoUploading ? 'Processing...' : 'Upload Image'}
                    </Button>
                    {settings?.school_logo_url && (
                      <button
                        type="button"
                        onClick={() => handleChange('school_logo_url', '')}
                        className="flex items-center text-xs text-red-500 hover:text-red-700 gap-1"
                      >
                        <X className="h-3 w-3" /> Remove logo
                      </button>
                    )}
                    <p className="text-xs text-gray-400">PNG, JPG, SVG up to 5 MB. Resized to 256×256 for storage.</p>
                    <p className="text-xs text-gray-400">Or paste a URL directly:</p>
                    <Input
                      value={settings?.school_logo_url?.startsWith('data:') ? '' : (settings?.school_logo_url || '')}
                      onChange={(e) => handleChange('school_logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="text-xs h-8"
                    />
                  </div>
                </div>
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

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Teacher Check-in Hours
              </CardTitle>
              <p className="text-sm text-gray-500">
                Set when teachers can check in, when they are marked late, and when check-in closes for the day.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <Label htmlFor="teacher_checkin_start">School Opens (Check-in Opens)</Label>
                  <Input
                    id="teacher_checkin_start"
                    type="time"
                    value={settings?.teacher_checkin_start || '08:00'}
                    onChange={(e) => handleChange('teacher_checkin_start', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Teachers can check in from this time</p>
                </div>
                <div>
                  <Label htmlFor="teacher_checkin_late_after">Late After</Label>
                  <Input
                    id="teacher_checkin_late_after"
                    type="time"
                    value={settings?.teacher_checkin_late_after || '08:15'}
                    onChange={(e) => handleChange('teacher_checkin_late_after', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Teachers checking in after this time are marked <span className="text-amber-600 font-medium">Late</span></p>
                </div>
                <div>
                  <Label htmlFor="teacher_checkin_end">School Ends (Check-in Closes)</Label>
                  <Input
                    id="teacher_checkin_end"
                    type="time"
                    value={settings?.teacher_checkin_end || '17:00'}
                    onChange={(e) => handleChange('teacher_checkin_end', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">No check-ins allowed after this time</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>Current schedule:</strong> School opens at <strong>{settings?.teacher_checkin_start || '08:00'}</strong>,
                teachers are late after <strong>{settings?.teacher_checkin_late_after || '08:15'}</strong>,
                check-in closes at <strong>{settings?.teacher_checkin_end || '17:00'}</strong>.
              </div>
            </CardContent>
          </Card>
        </div>
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
