import React from 'react'';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@school/shared-ui';
import { Calendar, Clock } from 'lucide-react';

export default function ExamScheduler() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar size={20} />
          Exam Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Exam scheduling tools will appear here</p>
          <Button className="mt-4">Create Exam Schedule</Button>
        </div>
      </CardContent>
    </Card>
  );
}
