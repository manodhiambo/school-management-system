import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { BookOpen, Users, Calendar, Award } from 'lucide-react';
import SubjectManager from '../../components/SubjectManager';
import ClassManager from '../../components/ClassManager';
import ExamManager from '../../components/ExamManager';
import Gradebook from '../../components/Gradebook';

export default function Academic() {
  const [activeTab, setActiveTab] = useState('subjects');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Academic Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="classes">Classes & Sections</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
          <TabsTrigger value="syllabus">Curriculum</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects">
          <SubjectManager />
        </TabsContent>

        <TabsContent value="classes">
          <ClassManager />
        </TabsContent>

        <TabsContent value="exams">
          <ExamManager />
        </TabsContent>

        <TabsContent value="gradebook">
          <Gradebook />
        </TabsContent>

        <TabsContent value="syllabus">
          <Card>
            <CardHeader>
              <CardTitle>Curriculum Planner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Curriculum planning tools will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
