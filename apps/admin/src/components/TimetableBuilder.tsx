import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@school/shared-ui';

export const TimetableBuilder: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timetable Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Generate Timetable</Button>
      </CardContent>
    </Card>
  );
};
