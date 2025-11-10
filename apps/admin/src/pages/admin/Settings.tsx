import React from 'react'';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolLogoUrl: '',
    address: '',
    phone: '',
    email: '',
    currentSession: '',
    timezone: 'Asia/Kolkata',
    attendanceMethod: 'all',
  });
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: existingSettings } = useQuery(['settings'], () =>
    apiClient.request({ url: '/api/v1/admin/settings', method: 'GET' })
  );

  useEffect(() => {
    if (existingSettings?.data) {
      setSettings(existingSettings.data);
    }
  }, [existingSettings]);

  const updateMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/admin/settings',
      method: 'PUT',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        addToast('success', 'Settings updated successfully');
      },
      onError: () => {
        addToast('error', 'Failed to update settings');
      },
    }
  );

  const handleSubmit = () => {
    updateMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input
              label="School Name"
              value={settings.schoolName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
              placeholder="Enter school name"
            />
            <Input
              label="School Logo URL"
              value={settings.schoolLogoUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
              placeholder="Enter logo URL"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={settings.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter school address"
              />
            </div>
            <Input
              label="Phone"
              value={settings.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
              placeholder="Enter phone number"
            />
            <Input
              label="Email"
              type="email"
              value={settings.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
              placeholder="Enter email"
            />
            <Input
              label="Current Session"
              value={settings.currentSession}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
              placeholder="e.g., 2024-25"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Method</label>
              <select
                value={settings.attendanceMethod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set.*e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="manual">Manual</option>
                <option value="biometric">Biometric</option>
                <option value="qr">QR Code</option>
                <option value="all">All</option>
              </select>
            </div>
            <Button onClick={handleSubmit} disabled={updateMutation.isLoading}>
              <Save size={16} className="mr-2" />
              {updateMutation.isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
