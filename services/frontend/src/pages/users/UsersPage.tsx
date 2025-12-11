import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Key, Mail, Users, Shield, Bell } from 'lucide-react';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { ResetPasswordModal } from '@/components/modals/ResetPasswordModal';
import { SendAnnouncementModal } from '@/components/modals/SendAnnouncementModal';
import api from '@/services/api';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response: any = await api.getUsers();
      setUsers(response.data || response || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowResetModal(true);
  };

  const handleToggleStatus = async (user: User) => {
    if (!confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} this user?`)) return;
    
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      alert(`User ${user.is_active ? 'deactivated' : 'activated'} successfully!`);
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to update user status');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) return;
    
    try {
      await api.deleteUser(user.id);
      alert('User deleted successfully!');
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-purple-100 text-purple-800',
      student: 'bg-green-100 text-green-800',
      parent: 'bg-blue-100 text-blue-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const userCounts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => u.role === 'student').length,
    parent: users.filter(u => u.role === 'parent').length,
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
          <h2 className="text-3xl font-bold">User Management</h2>
          <p className="text-gray-500">Manage system users, passwords, and send announcements</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowAnnouncementModal(true)}>
            <Bell className="mr-2 h-4 w-4" />
            Send Announcement
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {['all', 'admin', 'teacher', 'student', 'parent'].map((role) => (
          <Card 
            key={role}
            className={`cursor-pointer transition-all ${roleFilter === role ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
            onClick={() => setRoleFilter(role)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">{role === 'all' ? 'Total' : role}s</p>
                  <p className="text-2xl font-bold">{userCounts[role as keyof typeof userCounts]}</p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  role === 'all' ? 'bg-gray-100' :
                  role === 'admin' ? 'bg-red-100' :
                  role === 'teacher' ? 'bg-purple-100' :
                  role === 'student' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {role === 'all' ? <Users className="h-5 w-5 text-gray-600" /> :
                   role === 'admin' ? <Shield className="h-5 w-5 text-red-600" /> :
                   <Users className={`h-5 w-5 ${
                     role === 'teacher' ? 'text-purple-600' :
                     role === 'student' ? 'text-green-600' : 'text-blue-600'
                   }`} />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <span className="text-sm text-gray-500 ml-auto">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No users found</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Last Login</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold mr-3">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : user.email.split('@')[0]}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
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
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Password"
                            onClick={() => handleResetPassword(user)}
                          >
                            <Key className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete User"
                            onClick={() => handleDelete(user)}
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

      <ResetPasswordModal
        open={showResetModal}
        onOpenChange={setShowResetModal}
        user={selectedUser}
        onSuccess={loadUsers}
      />

      <SendAnnouncementModal
        open={showAnnouncementModal}
        onOpenChange={setShowAnnouncementModal}
      />
    </div>
  );
}
