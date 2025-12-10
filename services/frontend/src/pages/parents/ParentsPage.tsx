import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Users, UserPlus, Eye } from 'lucide-react';
import { AddParentModal } from '@/components/modals/AddParentModal';
import { LinkStudentModal } from '@/components/modals/LinkStudentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/services/api';

interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_primary: string;
  relationship: string;
  occupation: string;
  children_count?: number;
  created_at: string;
}

export function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [parentDetails, setParentDetails] = useState<any>(null);

  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    try {
      setLoading(true);
      const response: any = await api.getParents();
      setParents(response.data || []);
    } catch (error) {
      console.error('Error loading parents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this parent?')) return;

    try {
      await api.deleteParent(id);
      alert('Parent deleted successfully');
      loadParents();
    } catch (error) {
      console.error('Error deleting parent:', error);
      alert('Failed to delete parent');
    }
  };

  const handleLinkStudent = (parent: any) => {
    setSelectedParent(parent);
    setShowLinkModal(true);
  };

  const handleViewParent = async (parent: any) => {
    try {
      const response: any = await api.getParent(parent.id);
      setParentDetails(response.data);
      setSelectedParent(parent);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error loading parent details:', error);
    }
  };

  const filteredParents = parents.filter(parent =>
    `${parent.first_name} ${parent.last_name} ${parent.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-3xl font-bold">Parents</h2>
          <p className="text-gray-500">Manage parent accounts and link them to students</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Parent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Parents</p>
                <p className="text-3xl font-bold">{parents.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With Linked Children</p>
                <p className="text-3xl font-bold text-green-600">
                  {parents.filter(p => (p.children_count || 0) > 0).length}
                </p>
              </div>
              <UserPlus className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Without Children</p>
                <p className="text-3xl font-bold text-orange-600">
                  {parents.filter(p => (p.children_count || 0) === 0).length}
                </p>
              </div>
              <Users className="h-10 w-10 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search parents by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredParents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No parents found</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Parent
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Phone</th>
                    <th className="text-left p-4 font-medium">Relationship</th>
                    <th className="text-left p-4 font-medium">Children</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.map((parent) => (
                    <tr key={parent.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{parent.first_name} {parent.last_name}</td>
                      <td className="p-4 text-gray-600">{parent.email}</td>
                      <td className="p-4">{parent.phone_primary || '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                          {parent.relationship || 'guardian'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (parent.children_count || 0) > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {parent.children_count || 0} linked
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="View Details"
                            onClick={() => handleViewParent(parent)}
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Link Student"
                            onClick={() => handleLinkStudent(parent)}
                          >
                            <UserPlus className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDelete(parent.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Add Parent Modal */}
      <AddParentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadParents}
      />

      {/* Link Student Modal */}
      {selectedParent && (
        <LinkStudentModal
          open={showLinkModal}
          onOpenChange={setShowLinkModal}
          parent={selectedParent}
          onSuccess={loadParents}
        />
      )}

      {/* View Parent Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Parent Details</DialogTitle>
          </DialogHeader>
          {parentDetails && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {parentDetails.first_name?.charAt(0)}{parentDetails.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {parentDetails.first_name} {parentDetails.last_name}
                  </h3>
                  <p className="text-gray-500">{parentDetails.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{parentDetails.phone_primary || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Relationship</p>
                  <p className="font-medium capitalize">{parentDetails.relationship || 'Guardian'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Occupation</p>
                  <p className="font-medium">{parentDetails.occupation || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{parentDetails.address || '-'}</p>
                </div>
              </div>

              {/* Linked Children */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Linked Children ({parentDetails.children?.length || 0})
                </h4>
                {parentDetails.children && parentDetails.children.length > 0 ? (
                  <div className="space-y-2">
                    {parentDetails.children.map((child: any) => (
                      <div key={child.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium">{child.first_name} {child.last_name}</p>
                          <p className="text-sm text-gray-500">{child.admission_number}</p>
                        </div>
                        <span className="text-sm text-gray-500">{child.class_name || 'No class'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No children linked</p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        setShowViewModal(false);
                        setSelectedParent(parentDetails);
                        setShowLinkModal(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Link Student
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
