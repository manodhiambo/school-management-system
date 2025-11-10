import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const AcademicPage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Academic content</p>
      </CardContent>
    </Card>
  );
};
