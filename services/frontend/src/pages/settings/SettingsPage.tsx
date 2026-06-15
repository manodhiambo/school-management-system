import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, School, Globe, Clock, Upload, X, ImageIcon, UserCheck, Shield, QrCode, CheckCircle, AlertTriangle, Copy, Eye, EyeOff, KeyRound, CreditCard, Volume2, VolumeX, Bell, MessageSquare, DollarSign, Play } from 'lucide-react';
import { useSoundSettings } from '@/components/notifications/SoundNotificationProvider';
import api from '@/services/api';
import { useLanguageStore } from '@/store/languageStore';

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
  const { t } = useLanguageStore();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'system' | 'attendance' | 'security' | 'payments' | 'sounds'>('general');
  const sound = useSoundSettings();
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'scanning' | 'verifying' | 'backup-codes'>('idle');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupQR, setSetupQR] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    loadSettings();
    load2FAStatus();
  }, []);

  const load2FAStatus = async () => {
    try {
      const res: any = await api.get2FAStatus();
      setTwoFAEnabled(res.data?.enabled || false);
    } catch {}
  };

  const start2FASetup = async () => {
    setTwoFALoading(true);
    setVerifyError('');
    try {
      const res: any = await api.setup2FA();
      setSetupSecret(res.data.secret);
      setSetupQR(res.data.qr_code);
      setSetupStep('scanning');
    } catch (e: any) {
      alert(e.message || 'Failed to start 2FA setup');
    } finally {
      setTwoFALoading(false);
    }
  };

  const confirm2FASetup = async () => {
    setVerifyError('');
    setTwoFALoading(true);
    try {
      const res: any = await api.enable2FA(setupSecret, verifyCode);
      setBackupCodes(res.data.backup_codes);
      setTwoFAEnabled(true);
      setSetupStep('backup-codes');
    } catch (e: any) {
      setVerifyError(e.message || 'Invalid code, please try again.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const disable2FA = async () => {
    setDisableError('');
    setTwoFALoading(true);
    try {
      await api.disable2FA(disablePassword);
      setTwoFAEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      setSetupStep('idle');
    } catch (e: any) {
      setDisableError(e.message || 'Failed to disable 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

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
          <h2 className="text-3xl font-bold">{t('Settings')}</h2>
          <p className="text-gray-500">{t('Manage system configuration and preferences')}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? t('Saving...') : t('Save Changes')}
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
          {t('School Info')}
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'contact' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe className="h-4 w-4 inline mr-2" />
          {t('Contact & Address')}
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'system' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          {t('System')}
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'attendance' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="h-4 w-4 inline mr-2" />
          {t('Attendance')}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'security' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="h-4 w-4 inline mr-2" />
          {t('Security')}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'payments' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CreditCard className="h-4 w-4 inline mr-2" />
          Payments
        </button>
        <button
          onClick={() => setActiveTab('sounds')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sounds' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Volume2 className="h-4 w-4 inline mr-2" />
          Sounds
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <School className="h-5 w-5 mr-2" />
              {t('School Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="school_name">{t('School Name')} *</Label>
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
                <Label>{t('School Logo')}</Label>
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
              {t('Contact & Address')}
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

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Two-Factor Authentication (2FA)
              </CardTitle>
              <p className="text-sm text-gray-500">
                Protect your admin account with an authenticator app (Google Authenticator, Authy, etc.).
                You will need to enter a 6-digit code each time you log in.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Status badge */}
              <div className="flex items-center gap-3">
                {twoFAEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-4 w-4" /> 2FA is Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    <AlertTriangle className="h-4 w-4" /> 2FA is not enabled
                  </span>
                )}
              </div>

              {/* IDLE — not enabled, not in setup */}
              {!twoFAEnabled && setupStep === 'idle' && (
                <div className="border rounded-lg p-5 bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-800 mb-4">
                    Enable 2FA to add an extra layer of security. You will need a free authenticator app installed on your phone.
                  </p>
                  <Button onClick={start2FASetup} disabled={twoFALoading}>
                    <QrCode className="h-4 w-4 mr-2" />
                    {twoFALoading ? 'Loading...' : 'Set Up Two-Factor Authentication'}
                  </Button>
                </div>
              )}

              {/* STEP 1 — Scan QR */}
              {setupStep === 'scanning' && (
                <div className="border rounded-lg p-5 space-y-4">
                  <h3 className="font-semibold text-gray-800">Step 1: Scan this QR code</h3>
                  <p className="text-sm text-gray-600">
                    Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator) and scan the QR code below.
                  </p>
                  {setupQR && (
                    <div className="flex justify-center">
                      <img src={setupQR} alt="2FA QR Code" className="w-48 h-48 border-2 border-gray-200 rounded-lg" />
                    </div>
                  )}
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500 mb-1">Can't scan? Enter this key manually:</p>
                    <code className="text-xs font-mono text-gray-700 break-all">{setupSecret}</code>
                  </div>
                  <Button onClick={() => setSetupStep('verifying')} className="w-full">
                    I've scanned the QR code — Next
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setSetupStep('idle'); setSetupSecret(''); setSetupQR(''); }}
                    className="text-sm text-gray-400 hover:text-gray-600 w-full text-center"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* STEP 2 — Verify code */}
              {setupStep === 'verifying' && (
                <div className="border rounded-lg p-5 space-y-4">
                  <h3 className="font-semibold text-gray-800">Step 2: Verify your authenticator</h3>
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code shown in your authenticator app to confirm setup.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="verifyCode">Verification Code</Label>
                    <Input
                      id="verifyCode"
                      type="text"
                      inputMode="numeric"
                      placeholder="000 000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-xl tracking-widest font-mono"
                      autoFocus
                    />
                  </div>
                  {verifyError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{verifyError}</div>
                  )}
                  <Button
                    onClick={confirm2FASetup}
                    disabled={twoFALoading || verifyCode.length !== 6}
                    className="w-full"
                  >
                    {twoFALoading ? 'Verifying...' : 'Enable 2FA'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSetupStep('scanning')}
                    className="text-sm text-gray-400 hover:text-gray-600 w-full text-center"
                  >
                    Back
                  </button>
                </div>
              )}

              {/* STEP 3 — Show backup codes */}
              {setupStep === 'backup-codes' && (
                <div className="border rounded-lg p-5 space-y-4 border-green-200 bg-green-50">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <h3 className="font-semibold">2FA Enabled Successfully!</h3>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      Save your backup codes — you will not see them again!
                    </p>
                    <p className="text-xs text-amber-700 mb-3">
                      These 8 codes can be used if you lose access to your authenticator app. Each code can only be used once.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm mb-3">
                      {backupCodes.map((c, i) => (
                        <div key={i} className="bg-white border border-amber-200 rounded px-3 py-1.5 text-center">{c}</div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={copyBackupCodes} className="w-full border-amber-300">
                      <Copy className="h-4 w-4 mr-2" />
                      {copiedCodes ? 'Copied!' : 'Copy All Codes'}
                    </Button>
                  </div>
                  <Button onClick={() => setSetupStep('idle')} className="w-full">
                    Done — I've saved my backup codes
                  </Button>
                </div>
              )}

              {/* Enabled state — disable option */}
              {twoFAEnabled && setupStep === 'idle' && (
                <div className="border rounded-lg p-5 space-y-4 border-red-100">
                  <h3 className="font-semibold text-gray-700">Disable Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">
                    Removing 2FA will make your account less secure. Enter your password to confirm.
                  </p>
                  {!showDisableForm ? (
                    <Button variant="outline" onClick={() => setShowDisableForm(true)} className="border-red-200 text-red-600 hover:bg-red-50">
                      Disable 2FA
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          type={showDisablePassword ? 'text' : 'password'}
                          placeholder="Your current password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDisablePassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showDisablePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {disableError && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{disableError}</div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={disable2FA}
                          disabled={twoFALoading || !disablePassword}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {twoFALoading ? 'Disabling...' : 'Confirm Disable'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setShowDisableForm(false); setDisablePassword(''); setDisableError(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              {t('System Preferences')}
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
      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                School Payment Details
              </CardTitle>
              <p className="text-sm text-gray-500">
                Payment details shown to parents on their fee payment page so they can make manual transfers.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={settings?.bank_name || ''}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    placeholder="e.g. Co-operative Bank"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_number">Bank Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={settings?.bank_account_number || ''}
                    onChange={(e) => handleChange('bank_account_number', e.target.value)}
                    placeholder="e.g. 01234567890100"
                  />
                </div>
                <div>
                  <Label htmlFor="mpesa_paybill">M-Pesa Paybill Number</Label>
                  <Input
                    id="mpesa_paybill"
                    value={settings?.mpesa_paybill || ''}
                    onChange={(e) => handleChange('mpesa_paybill', e.target.value)}
                    placeholder="e.g. 400200"
                  />
                </div>
                <div>
                  <Label htmlFor="mpesa_account_ref">M-Pesa Account Reference</Label>
                  <Input
                    id="mpesa_account_ref"
                    value={settings?.mpesa_account_ref || ''}
                    onChange={(e) => handleChange('mpesa_account_ref', e.target.value)}
                    placeholder="e.g. Admission No. / Student Name"
                  />
                </div>
                <div>
                  <Label htmlFor="mpesa_till">M-Pesa Till Number (Buy Goods)</Label>
                  <Input
                    id="mpesa_till"
                    value={settings?.mpesa_till || ''}
                    onChange={(e) => handleChange('mpesa_till', e.target.value)}
                    placeholder="e.g. 5678901"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="payment_instructions">Additional Payment Instructions</Label>
                <textarea
                  id="payment_instructions"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={settings?.payment_instructions || ''}
                  onChange={(e) => handleChange('payment_instructions', e.target.value)}
                  placeholder="e.g. After making payment, send your deposit slip to the school accounts office..."
                />
              </div>
              <p className="text-xs text-gray-400">
                These details appear as a blue info box on the parent fee payments page. Leave blank to hide that section.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sounds Tab ───────────────────────────────────────────────── */}
      {activeTab === 'sounds' && (
        <div className="space-y-6 max-w-2xl">
          {/* Master toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {sound.enabled ? <Volume2 className="h-5 w-5 text-blue-600" /> : <VolumeX className="h-5 w-5 text-gray-400" />}
                Sound Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master on/off */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold">Enable Sound Notifications</p>
                  <p className="text-sm text-gray-500">Play audio alerts when new events arrive in the app</p>
                </div>
                <button
                  onClick={() => sound.setEnabled(!sound.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    sound.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    sound.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Volume slider */}
              <div className={`space-y-2 ${!sound.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <Label>Volume</Label>
                  <span className="text-sm text-gray-500">{Math.round(sound.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sound.volume}
                  onChange={e => sound.setVolume(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Per-type toggles */}
              <div className={`space-y-3 ${!sound.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <p className="text-sm font-semibold text-gray-700">Notification Types</p>

                {/* Messages */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Messages</p>
                      <p className="text-xs text-gray-500">New incoming messages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => sound.preview('message')}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      title="Preview sound"
                    >
                      <Play className="h-3 w-3" /> Test
                    </button>
                    <button
                      onClick={() => sound.setMessagesEnabled(!sound.messagesEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        sound.messagesEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        sound.messagesEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Fee alerts */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Fee Reminders</p>
                      <p className="text-xs text-gray-500">Fee alerts and payment reminders (parents)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => sound.preview('fee')}
                      className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1"
                      title="Preview sound"
                    >
                      <Play className="h-3 w-3" /> Test
                    </button>
                    <button
                      onClick={() => sound.setFeeEnabled(!sound.feeEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        sound.feeEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        sound.feeEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* General alerts */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">General Alerts</p>
                      <p className="text-xs text-gray-500">System notifications and announcements</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => sound.preview('alert')}
                      className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      title="Preview sound"
                    >
                      <Play className="h-3 w-3" /> Test
                    </button>
                    <button
                      onClick={() => sound.setAlertsEnabled(!sound.alertsEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        sound.alertsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        sound.alertsEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                <span className="font-semibold">Note:</span> Your browser may ask for permission to play audio the first time. Sound settings are saved locally on this device. The mute/unmute button (🔊) in the bottom-right corner is a quick toggle.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
