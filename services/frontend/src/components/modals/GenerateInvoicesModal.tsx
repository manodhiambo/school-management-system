import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, CheckSquare, Square } from 'lucide-react';
import api from '@/services/api';

interface GenerateInvoicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateInvoicesModal({ open, onOpenChange, onSuccess }: GenerateInvoicesModalProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    classId: '',
    feeStructureId: '',
    dueDate: '',
    description: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (formData.classId) {
      loadStudents(formData.classId);
    } else {
      loadAllStudents();
    }
  }, [formData.classId]);

  const loadData = async () => {
    try {
      const [classesRes, feeStructuresRes]: any = await Promise.all([
        api.getClasses(),
        api.getFeeStructures()
      ]);
      setClasses(classesRes.data || []);
      setFeeStructures(feeStructuresRes.data || []);
      loadAllStudents();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadAllStudents = async () => {
    try {
      const response: any = await api.getStudents();
      setStudents(response.data || []);
      // Select all by default
      setSelectedStudents((response.data || []).map((s: any) => s.id));
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const response: any = await api.getStudents({ classId });
      setStudents(response.data || []);
      // Select all students from the class by default
      setSelectedStudents((response.data || []).map((s: any) => s.id));
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }
    
    if (!formData.feeStructureId) {
      alert('Please select a fee structure');
      return;
    }
    
    setLoading(true);

    try {
      const response: any = await api.generateBulkInvoices({
        studentIds: selectedStudents,
        feeStructureId: formData.feeStructureId,
        dueDate: formData.dueDate || null,
        description: formData.description || null
      });
      
      alert(`Successfully generated ${response.data?.created?.length || 0} invoices!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Generate invoices error:', error);
      alert(error.message || 'Failed to generate invoices');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      classId: '',
      feeStructureId: '',
      dueDate: '',
      description: '',
    });
    setSelectedStudents([]);
  };

  const selectedFeeStructure = feeStructures.find(f => f.id === formData.feeStructureId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Fee Invoices</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feeStructureId">Fee Structure *</Label>
                <Select
                  id="feeStructureId"
                  value={formData.feeStructureId}
                  onChange={(e) => handleChange('feeStructureId', e.target.value)}
                  required
                >
                  <option value="">Select Fee Structure</option>
                  {feeStructures.map((fs) => (
                    <option key={fs.id} value={fs.id}>
                      {fs.name} - KES {parseFloat(fs.amount).toLocaleString()}
                    </option>
                  ))}
                </Select>
                {feeStructures.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No fee structures found. Please create one first in Fee Structure page.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            {selectedFeeStructure && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p><strong>Selected Fee:</strong> {selectedFeeStructure.name}</p>
                <p><strong>Amount:</strong> KES {parseFloat(selectedFeeStructure.amount).toLocaleString()}</p>
                <p><strong>Frequency:</strong> {selectedFeeStructure.frequency}</p>
              </div>
            )}

            <div>
              <Label htmlFor="classId">Filter by Class</Label>
              <Select
                id="classId"
                value={formData.classId}
                onChange={(e) => handleChange('classId', e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section || ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Additional invoice description..."
                rows={2}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Select Students ({selectedStudents.length}/{students.length})</Label>
                <div className="space-x-2">
                  <Button type="button" size="sm" variant="outline" onClick={selectAllStudents}>
                    Select All
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={deselectAllStudents}>
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <div className="border rounded max-h-48 overflow-y-auto">
                {students.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No students found</p>
                ) : (
                  students.map((student) => (
                    <div 
                      key={student.id}
                      className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => toggleStudent(student.id)}
                    >
                      {selectedStudents.includes(student.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary mr-2" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-gray-500">
                          {student.admission_number} • {student.class_name || 'No Class'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedStudents.length === 0 || !formData.feeStructureId}>
              {loading ? 'Generating...' : `Generate ${selectedStudents.length} Invoice(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
