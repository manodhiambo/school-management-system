import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolLogoUrl: '',
    address: '',
    phone: '',
    email: '',
    currentSession: '',
  });
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          placeholder="School Name" 
          value={settings.schoolName} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({...settings, schoolName: e.target.value})} 
        />
        <Button onClick={() => toast({ title: 'Settings saved' })}>Save</Button>
      </CardContent>
    </Card>
  );
};
