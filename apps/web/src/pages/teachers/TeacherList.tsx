import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Modal, DataTable, useToast } from '@school/shared-ui';
import { teacherService } from '@school/api-client';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  designation?: string;
  status: string;
}

export default function TeacherList() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const response = await teacherService.getTeachers();
      setTeachers(response.data?.data || []);
    } catch (error) {
      showToast({ title: 'Error', description: 'Failed to load teachers', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'employeeId' as keyof Teacher, header: 'Employee ID' },
    { key: 'firstName' as keyof Teacher, header: 'First Name' },
    { key: 'lastName' as keyof Teacher, header: 'Last Name' },
    { key: 'email' as keyof Teacher, header: 'Email' },
    { key: 'designation' as keyof Teacher, header: 'Designation' },
    { key: 'status' as keyof Teacher, header: 'Status' },
  ];

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Input placeholder="Search teachers..." className="max-w-xs" />
            <Button onClick={() => setIsModalOpen(true)}>Add Teacher</Button>
          </div>
          <DataTable data={teachers} columns={columns} />
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title="Add Teacher">
        <div className="space-y-4">
          <Input placeholder="First Name" />
          <Input placeholder="Last Name" />
          <Input placeholder="Email" type="email" />
          <Input placeholder="Designation" />
          <Button className="w-full">Save Teacher</Button>
        </div>
      </Modal>
    </div>
  );
}
