import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const TimetablePage: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timetable</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Timetable content</p>
      </CardContent>
    </Card>
  );
};
