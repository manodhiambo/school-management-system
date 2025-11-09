import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent, Button } from '@school/shared-ui';
import { Clock, Calendar, Users, AlertCircle } from 'lucide-react';
import TimetableBuilder from '../../components/TimetableBuilder';
import ExamScheduler from '../../components/ExamScheduler';
import SubstitutionManager from '../../components/SubstitutionManager';

export default function Timetable() {
  const [activeTab, setActiveTab] = useState('builder');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule & Timetable</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="builder">Timetable Builder</TabsTrigger>
          <TabsTrigger value="exams">Exam Schedule</TabsTrigger>
          <TabsTrigger value="substitution">Substitutions</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <TimetableBuilder />
        </TabsContent>

        <TabsContent value="exams">
          <ExamScheduler />
        </TabsContent>

        <TabsContent value="substitution">
          <SubstitutionManager />
        </TabsContent>

        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Conflicts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No conflicts detected</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
