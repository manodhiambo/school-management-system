import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { AddParentModal } from '@/components/modals/AddParentModal';
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
      await api.deleteUser(id);
      alert('Parent deleted successfully');
      loadParents();
    } catch (error) {
      console.error('Error deleting parent:', error);
      alert('Failed to delete parent');
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
          <p className="text-gray-500">Manage parent accounts and relationships</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Parent
        </Button>
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
                  <tr className="border-b">
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Relationship</th>
                    <th className="text-left p-4">Occupation</th>
                    <th className="text-left p-4">Children</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.map((parent) => (
                    <tr key={parent.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{parent.first_name} {parent.last_name}</td>
                      <td className="p-4">{parent.email}</td>
                      <td className="p-4">{parent.phone_primary}</td>
                      <td className="p-4 capitalize">{parent.relationship}</td>
                      <td className="p-4">{parent.occupation || 'N/A'}</td>
                      <td className="p-4">{parent.children_count || 0}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
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

      <AddParentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadParents}
      />
    </div>
  );
}
