import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const AttendancePage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Attendance content</p>
      </CardContent>
    </Card>
  );
};
