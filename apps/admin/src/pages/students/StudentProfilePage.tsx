import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const StudentProfilePage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Student profile content</p>
      </CardContent>
    </Card>
  );
};
