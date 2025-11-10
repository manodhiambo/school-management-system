import { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';

export const ExamScheduler: React.FC = () => {
  const [, setExams] = useState([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam Scheduler</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setExams([])}>Schedule Exam</Button>
      </CardContent>
    </Card>
  );
};
