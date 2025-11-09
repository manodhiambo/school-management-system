import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { apiClient } from '@school/api-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { User, BookOpen, Calendar, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { Student } from '@school/shared-types';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();

  const { data: student, isLoading } = useQuery(
    ['student', id],
    () => apiClient.getStudent(id as string)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!student?.data) {
    return <div className="text-center py-8">Student not found</div>;
  }

  const studentData: Student = student.data;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <User size={48} className="text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{`${studentData.firstName} ${studentData.lastName}`}</h1>
                <Badge
                  variant={studentData.status === 'active' ? 'success' : 'warning'}
                >
                  {studentData.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Admission No:</span> {studentData.admissionNumber}
                </div>
                <div>
                  <span className="text-gray-500">Roll No:</span> {studentData.rollNumber || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-500">Class:</span> {studentData.classId || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-500">Section:</span> {studentData.sectionId || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-500">Date of Birth:</span> {new Date(studentData.dateOfBirth).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-gray-500">Gender:</span> {studentData.gender || 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = `/students/${id}/edit`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Edit Profile
              </button>
              <button
                onClick={() => window.location.href = `/fee/student/${id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                View Fee Details
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <Calendar className="text-blue-500" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92%</div>
                <p className="text-xs text-gray-500">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">GPA</CardTitle>
                <BookOpen className="text-green-500" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.5</div>
                <p className="text-xs text-gray-500">Last exam</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fees Due</CardTitle>
                <DollarSign className="text-yellow-500" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹1,250</div>
                <p className="text-xs text-gray-500">Due in 3 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Behavior</CardTitle>
                <AlertCircle className="text-purple-500" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Good</div>
                <p className="text-xs text-gray-500">No incidents</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Exam results will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Attendance history will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>Fee Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Fee statement will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Uploaded documents will appear here</p>
                <Button className="mt-4">Upload Document</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle>Behavior Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No behavior records found</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
