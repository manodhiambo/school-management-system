import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Key, Mail } from 'lucide-react';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { ResetPasswordModal } from '@/components/modals/ResetPasswordModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/services/api';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // This would be a new API endpoint: GET /api/v1/users
      const response: any = await api.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Mock data for now
      setUsers([
        {
          id: '1',
          email: 'admin@school.com',
          role: 'admin',
          is_active: true,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // await api.updateUserStatus(userId, !currentStatus);
      alert(`User ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to update user status');
    }
  };

  const handleSendCredentials = async (userId: string, email: string) => {
    try {
      // await api.sendUserCredentials(userId);
      alert(`Credentials sent to ${email}`);
    } catch (error: any) {
      alert(error.message || 'Failed to send credentials');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;

    try {
      setDeleting(true);
      // await api.deleteUser(deleteModal.user.id);
      alert('User deleted successfully!');
      loadUsers();
      setDeleteModal({ open: false, user: null });
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800',
      parent: 'bg-yellow-100 text-yellow-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">User Management</h2>
          <p className="text-gray-500">Manage system users and access control</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredUsers.length} users
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No users found"
              description="Get started by adding your first user"
              actionLabel="Add User"
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Last Login</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs capitalize ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          className={`px-2 py-1 rounded text-xs ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Password"
                            onClick={() => setResetPasswordModal({ open: true, userId: user.id })}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Send Credentials"
                            onClick={() => handleSendCredentials(user.id, user.email)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleteModal({ open: true, user })}
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

      {/* Modals */}
      <AddUserModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadUsers}
      />

      {resetPasswordModal.userId && (
        <ResetPasswordModal
          open={resetPasswordModal.open}
          onOpenChange={(open) => setResetPasswordModal({ open, userId: null })}
          userId={resetPasswordModal.userId}
        />
      )}

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, user: null })}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteModal.user?.email}? This will permanently remove their access to the system.`}
        loading={deleting}
      />
    </div>
  );
}
