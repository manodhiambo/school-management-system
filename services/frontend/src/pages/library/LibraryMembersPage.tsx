import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Edit, Trash2, Search, Ban, CheckCircle } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function LibraryMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [usersWithoutMembership, setUsersWithoutMembership] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [memberForm, setMemberForm] = useState({
    max_books_allowed: 3,
    max_days_allowed: 14
  });

  const [editForm, setEditForm] = useState({
    max_books_allowed: 3,
    max_days_allowed: 14,
    status: 'active',
    is_blocked: false,
    block_reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, usersRes] = await Promise.all([
        libraryAPI.getAllMembers(),
        libraryAPI.getUsersWithoutMembership()
      ]);

      const membersData = membersRes?.data?.data || membersRes?.data || [];
      const usersData = usersRes?.data?.data || usersRes?.data || [];

      setMembers(Array.isArray(membersData) ? membersData : []);
      setUsersWithoutMembership(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Error loading members:', error);
      alert('Failed to load members data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    try {
      // FIXED: Send the correct data structure
      const memberData: any = {
        user_id: selectedUser.user_id,
        member_type: selectedUser.member_type,
        max_books_allowed: memberForm.max_books_allowed,
        max_days_allowed: memberForm.max_days_allowed
      };

      // Send student_id or teacher_id based on member_type
      if (selectedUser.member_type === 'student') {
        memberData.student_id = selectedUser.id;
        memberData.teacher_id = null;
      } else if (selectedUser.member_type === 'teacher') {
        memberData.teacher_id = selectedUser.id;
        memberData.student_id = null;
      }

      console.log('Creating member with data:', memberData);
      await libraryAPI.createMember(memberData);

      alert('Library member created successfully!');
      setShowAddModal(false);
      setSelectedUser(null);
      setMemberForm({ max_books_allowed: 3, max_days_allowed: 14 });
      await loadData();
    } catch (error: any) {
      console.error('Error creating member:', error);
      alert(error?.response?.data?.message || 'Failed to create member');
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingMember) return;

    try {
      await libraryAPI.updateMember(editingMember.id, editForm);
      alert('Member updated successfully!');
      setShowEditModal(false);
      setEditingMember(null);
      await loadData();
    } catch (error: any) {
      console.error('Error updating member:', error);
      alert(error?.response?.data?.message || 'Failed to update member');
    }
  };

  const openEditModal = (member: any) => {
    setEditingMember(member);
    setEditForm({
      max_books_allowed: member.max_books_allowed || 3,
      max_days_allowed: member.max_days_allowed || 14,
      status: member.status || 'active',
      is_blocked: member.is_blocked || false,
      block_reason: member.block_reason || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this library member?')) return;

    try {
      await libraryAPI.deleteMember(id);
      alert('Member deactivated successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Error deleting member:', error);
      alert(error?.response?.data?.message || 'Failed to deactivate member');
    }
  };

  const handleUserSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    const user = usersWithoutMembership.find(u => u.id === userId);
    
    if (user) {
      setSelectedUser(user);
      
      // Auto-set limits based on member type
      if (user.member_type === 'student') {
        setMemberForm({ max_books_allowed: 3, max_days_allowed: 14 });
      } else if (user.member_type === 'teacher') {
        setMemberForm({ max_books_allowed: 5, max_days_allowed: 30 });
      } else {
        setMemberForm({ max_books_allowed: 3, max_days_allowed: 14 });
      }
    } else {
      setSelectedUser(null);
    }
  };

  const getStatusBadge = (member: any) => {
    if (member.is_blocked) {
      return <Badge className="bg-red-100 text-red-700">Blocked</Badge>;
    }
    if (member.status === 'active') {
      return <Badge className="bg-green-100 text-green-700">Active</Badge>;
    }
    return <Badge variant="secondary">{member.status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: any = {
      student: 'bg-blue-100 text-blue-700',
      teacher: 'bg-purple-100 text-purple-700',
      admin: 'bg-red-100 text-red-700'
    };
    return <Badge className={colors[role] || 'bg-gray-100 text-gray-700'}>{role}</Badge>;
  };

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.member_name?.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search) ||
      member.membership_number?.toLowerCase().includes(search) ||
      member.member_id_number?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Library Members</h2>
          <p className="text-gray-500">Manage library memberships and user access</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-gray-500">Registered library members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {members.filter(m => m.status === 'active' && !m.is_blocked).length}
            </div>
            <p className="text-xs text-gray-500">Can borrow books</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Users</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{usersWithoutMembership.length}</div>
            <p className="text-xs text-gray-500">Without library membership</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, membership number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Library Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Membership #</th>
                  <th className="text-center py-3 px-4">Books Limit</th>
                  <th className="text-center py-3 px-4">Days Limit</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{member.member_name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        {member.member_id_number && (
                          <p className="text-xs text-gray-400">{member.member_id_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(member.role || member.member_type)}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {member.membership_number}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-center">{member.max_books_allowed}</td>
                    <td className="py-3 px-4 text-center">{member.max_days_allowed}</td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(member)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(member)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No members found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Library Member</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Select User *</Label>
              <select
                id="user"
                value={selectedUser?.id || ''}
                onChange={handleUserSelection}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Choose a user...</option>
                {usersWithoutMembership.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.member_type}) - {user.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {usersWithoutMembership.length} users without library membership
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max_books">Max Books Allowed</Label>
                <Input
                  id="max_books"
                  type="number"
                  min="1"
                  max="10"
                  value={memberForm.max_books_allowed}
                  onChange={(e) => setMemberForm({...memberForm, max_books_allowed: parseInt(e.target.value)})}
                  required
                />
                <p className="text-xs text-gray-500">Default: Students=3, Teachers=5</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_days">Max Days Allowed</Label>
                <Input
                  id="max_days"
                  type="number"
                  min="1"
                  max="90"
                  value={memberForm.max_days_allowed}
                  onChange={(e) => setMemberForm({...memberForm, max_days_allowed: parseInt(e.target.value)})}
                  required
                />
                <p className="text-xs text-gray-500">Default: Students=14, Teachers=30</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Member</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Library Member</DialogTitle>
          </DialogHeader>

          {editingMember && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium">{editingMember.member_name}</p>
              <p className="text-sm text-gray-600">{editingMember.membership_number}</p>
            </div>
          )}

          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_max_books">Max Books Allowed</Label>
                <Input
                  id="edit_max_books"
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.max_books_allowed}
                  onChange={(e) => setEditForm({...editForm, max_books_allowed: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_max_days">Max Days Allowed</Label>
                <Input
                  id="edit_max_days"
                  type="number"
                  min="1"
                  max="90"
                  value={editForm.max_days_allowed}
                  onChange={(e) => setEditForm({...editForm, max_days_allowed: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_blocked}
                  onChange={(e) => setEditForm({...editForm, is_blocked: e.target.checked})}
                  className="rounded"
                />
                <span>Block member from borrowing</span>
              </label>
            </div>

            {editForm.is_blocked && (
              <div className="space-y-2">
                <Label htmlFor="block_reason">Block Reason</Label>
                <Input
                  id="block_reason"
                  value={editForm.block_reason}
                  onChange={(e) => setEditForm({...editForm, block_reason: e.target.value})}
                  placeholder="Reason for blocking..."
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Member</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
