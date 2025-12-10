import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { X, Check, UserPlus } from 'lucide-react';
import api from '@/services/api';

interface LinkStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: any;
  onSuccess: () => void;
}

export function LinkStudentModal({ open, onOpenChange, parent, onSuccess }: LinkStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [relationship, setRelationship] = useState('guardian');

  useEffect(() => {
    if (open && parent) {
      fetchData();
    }
  }, [open, parent]);

  const fetchData = async () => {
    try {
      // Get all students
      const studentsRes: any = await api.getStudents();
      const allStudents = studentsRes?.students || studentsRes?.data || [];
      setStudents(Array.isArray(allStudents) ? allStudents : []);

      // Get parent's linked children
      if (parent?.id) {
        const parentRes: any = await api.getParent(parent.id);
        const children = parentRes?.data?.children || [];
        setLinkedStudents(children.map((c: any) => c.id));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleLinkStudent = async () => {
    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }

    setLoading(true);
    try {
      await api.linkStudentToParent(parent.id, {
        studentId: selectedStudent,
        relationship
      });
      alert('Student linked successfully!');
      setSelectedStudent('');
      fetchData(); // Refresh
      onSuccess();
    } catch (error: any) {
      console.error('Link student error:', error);
      alert(error.message || 'Failed to link student');
    } finally {
      setLoading(false);
    }
  };

  // Filter out already linked students
  const availableStudents = students.filter(s => !linkedStudents.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
            Link Student to {parent?.first_name} {parent?.last_name}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Currently Linked Students */}
          {linkedStudents.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Currently Linked Children</Label>
              <div className="mt-2 space-y-2">
                {students.filter(s => linkedStudents.includes(s.id)).map(student => (
                  <div key={student.id} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <Check className="h-4 w-4 text-green-600 mr-2" />
                    <span className="font-medium">{student.first_name} {student.last_name}</span>
                    <span className="text-sm text-gray-500 ml-2">({student.admission_number})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link New Student */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-gray-700">Link New Student</Label>
            
            {availableStudents.length > 0 ? (
              <div className="space-y-3 mt-2">
                <div>
                  <Label htmlFor="student">Select Student</Label>
                  <Select
                    id="student"
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                  >
                    <option value="">-- Select a student --</option>
                    {availableStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - {student.admission_number}
                        {student.class_name && ` (${student.class_name})`}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select
                    id="relationship"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Guardian</option>
                    <option value="other">Other</option>
                  </Select>
                </div>

                <Button 
                  onClick={handleLinkStudent} 
                  disabled={loading || !selectedStudent}
                  className="w-full"
                >
                  {loading ? 'Linking...' : 'Link Student'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg mt-2">
                <p className="text-gray-500">
                  {students.length === 0 
                    ? 'No students available in the system' 
                    : 'All students are already linked to this parent'}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
