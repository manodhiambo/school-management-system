import React, { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const PTMScheduler: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent-Teacher Meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          placeholder="Student ID" 
          value={studentId} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentId(e.target.value)} 
        />
        <Input 
          type="date" 
          value={date} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} 
        />
        <Button>Schedule</Button>
      </CardContent>
    </Card>
  );
};
