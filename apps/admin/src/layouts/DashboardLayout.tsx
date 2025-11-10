import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@school/shared-ui';

export const DashboardLayout: React.FC = () => {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Dashboard content</p>
        </CardContent>
      </Card>
    </div>
  );
};
