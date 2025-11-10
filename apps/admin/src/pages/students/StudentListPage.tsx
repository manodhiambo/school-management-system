import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

export const StudentListPage: React.FC = () => {
  const [students] = useState<Student[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {students.map(student => (
            <li key={student.id}>{student.firstName} {student.lastName}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
