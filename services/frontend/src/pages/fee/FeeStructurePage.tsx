import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import api from '@/services/api';

export function FeeStructurePage() {
  const [structures, setStructures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'quarterly',
    description: '',
    dueDay: '15',
    classId: '',
    academicYear: new Date().getFullYear().toString(),
    isMandatory: true,
    lateFeeAmount: '0',
    gracePeriodDays: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [structuresRes, classesRes]: any = await Promise.all([
        api.getFeeStructures(),
        api.getClasses()
      ]);
      setStructures(structuresRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        description: formData.description,
        due_day: parseInt(formData.dueDay),
        class_id: formData.classId || null,
        academic_year: formData.academicYear,
        is_mandatory: formData.isMandatory,
        late_fee_amount: parseFloat(formData.lateFeeAmount) || 0,
        grace_period_days: parseInt(formData.gracePeriodDays) || 0
      };

      if (editingStructure) {
        await api.updateFeeStructure(editingStructure.id, payload);
        alert('Fee structure updated successfully!');
      } else {
        await api.createFeeStructure(payload);
        alert('Fee structure created successfully!');
      }
      
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to save fee structure');
    }
  };

  const handleEdit = (structure: any) => {
    setEditingStructure(structure);
    setFormData({
      name: structure.name || '',
      amount: structure.amount?.toString() || '',
      frequency: structure.frequency || 'quarterly',
      description: structure.description || '',
      dueDay: structure.due_day?.toString() || '15',
      classId: structure.class_id || '',
      academicYear: structure.academic_year || new Date().getFullYear().toString(),
      isMandatory: structure.is_mandatory ?? true,
      lateFeeAmount: structure.late_fee_amount?.toString() || '0',
      gracePeriodDays: structure.grace_period_days?.toString() || '0'
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;
    
    try {
      await api.deleteFeeStructure(id);
      alert('Fee structure deleted successfully!');
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete fee structure');
    }
  };

  const resetForm = () => {
    setEditingStructure(null);
    setFormData({
      name: '',
      amount: '',
      frequency: 'quarterly',
      description: '',
      dueDay: '15',
      classId: '',
      academicYear: new Date().getFullYear().toString(),
      isMandatory: true,
      lateFeeAmount: '0',
      gracePeriodDays: '0'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      'monthly': 'Monthly',
      'quarterly': 'Quarterly (Per Term)',
      'half_yearly': 'Half Yearly',
      'yearly': 'Yearly',
      'one_time': 'One Time'
    };
    return labels[freq] || freq;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Fee Structures</h2>
          <p className="text-gray-500">Manage your school's fee structures</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Fee Structure
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Structures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{structures.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {structures.filter(s => s.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {structures.filter(s => s.is_mandatory).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(structures.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Structure List</CardTitle>
        </CardHeader>
        <CardContent>
          {structures.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No fee structures created yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Click "Add Fee Structure" to create your first fee structure
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Frequency</th>
                    <th className="text-left p-3 font-medium">Class</th>
                    <th className="text-left p-3 font-medium">Due Day</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((structure) => (
                    <tr key={structure.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{structure.name}</p>
                          {structure.description && (
                            <p className="text-xs text-gray-500">{structure.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{formatCurrency(structure.amount)}</td>
                      <td className="p-3">{getFrequencyLabel(structure.frequency)}</td>
                      <td className="p-3">{structure.class_name || 'All Classes'}</td>
                      <td className="p-3">{structure.due_day || 15}th</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          structure.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {structure.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(structure)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(structure.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Fee Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Tuition Fee"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (KES) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="50000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onChange={(e) => handleChange('frequency', e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (Per Term)</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One Time</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDay">Due Day of Month</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.dueDay}
                    onChange={(e) => handleChange('dueDay', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="classId">Apply to Class</Label>
                  <Select
                    value={formData.classId}
                    onChange={(e) => handleChange('classId', e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.section || ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input
                    id="academicYear"
                    value={formData.academicYear}
                    onChange={(e) => handleChange('academicYear', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Description of the fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lateFeeAmount">Late Fee Amount (KES)</Label>
                  <Input
                    id="lateFeeAmount"
                    type="number"
                    value={formData.lateFeeAmount}
                    onChange={(e) => handleChange('lateFeeAmount', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => handleChange('gracePeriodDays', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={formData.isMandatory}
                  onChange={(e) => handleChange('isMandatory', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isMandatory">This fee is mandatory for all students</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingStructure ? 'Update' : 'Create'} Fee Structure
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
