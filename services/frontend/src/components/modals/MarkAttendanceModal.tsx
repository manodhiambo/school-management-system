import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/services/api';

interface MarkAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MarkAttendanceModal({ open, onOpenChange, onSuccess }: MarkAttendanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const response: any = await api.getClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response: any = await api.getStudents({ classId: selectedClass });
      const studentsList = response.data || [];
      setStudents(studentsList);
      
      // Initialize all as present
      const initialAttendance: Record<string, string> = {};
      studentsList.forEach((student: any) => {
        initialAttendance[student.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: string) => {
    const newAttendance: Record<string, string> = {};
    students.forEach(student => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
  };

  const handleSubmit = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }

    if (students.length === 0) {
      alert('No students found in this class');
      return;
    }

    setLoading(true);
    try {
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        studentId: studentId,
        
        date: date,
        status: status,
      }));

      await api.markAttendance({ attendanceList: attendanceRecords });
      alert('Attendance marked successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Mark attendance error:', error);
      alert(error.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="class">Class *</Label>
              <Select
                id="class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {selectedClass && students.length > 0 && (
            <>
              <div className="flex space-x-2 border-t pt-4">
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Mark All Present
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Mark All Absent
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('late')}>
                  <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                  Mark All Late
                </Button>
              </div>

              <div className="overflow-y-auto max-h-96 border rounded">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3">Student Name</th>
                      <th className="text-left p-3">Admission No</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{student.first_name} {student.last_name}</td>
                        <td className="p-3">{student.admission_number}</td>
                        <td className="p-3">
                          <div className="flex justify-center space-x-2">
                            <Button
                              size="sm"
                              variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(student.id, 'present')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(student.id, 'absent')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                              onClick={() => handleAttendanceChange(student.id, 'late')}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {selectedClass && students.length === 0 && (
            <p className="text-center text-gray-500 py-8">No students found in this class</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedClass || students.length === 0}>
            {loading ? 'Submitting...' : 'Submit Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
