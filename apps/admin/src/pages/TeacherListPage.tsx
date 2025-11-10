import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const TeacherListPage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teachers</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Teacher list content</p>
      </CardContent>
    </Card>
  );
};
