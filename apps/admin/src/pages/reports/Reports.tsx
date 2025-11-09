import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { BarChart3, Users, TrendingUp, DollarSign } from 'lucide-react';
import EnrollmentReport from '../../components/EnrollmentReport';
import AttendanceReport from '../../components/AttendanceReport';
import FinanceReport from '../../components/FinanceReport';
import AcademicReport from '../../components/AcademicReport';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('enrollment');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="custom">Custom Report</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollment">
          <EnrollmentReport />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceReport />
        </TabsContent>

        <TabsContent value="finance">
          <FinanceReport />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicReport />
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Custom report builder will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
