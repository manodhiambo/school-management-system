import { useState, useEffect } from 'react';
// import { apiClient } from '@school/api-client'; // Remove unused import

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    schoolName: '',
    address: '',
    phone: '',
  });

  // Example of using apiClient when actually needed:
  const loadSettings = async () => {
    const { apiClient } = await import('@school/api-client');
    const response = await apiClient.request({
      url: '/api/v1/admin/settings',
      method: 'GET',
    });
    setSettings(response.data);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div>
      <h1>School Settings</h1>
      <pre>{JSON.stringify(settings, null, 2)}</pre>
    </div>
  );
};
