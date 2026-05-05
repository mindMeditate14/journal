import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);

      const response = await apiClient.get(`/admin/users?${params}`);
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('User role updated');
      fetchUsers();
      setEditingUserId(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update user role');
    }
  };

  const formatRole = (role) => {
    if (Array.isArray(role)) {
      return role.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
    }
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="reviewer">Reviewer</option>
            <option value="researcher">Researcher</option>
          </select>
        </div>

        <div className="pt-8">
          <span className="text-gray-400">Total: {users.length} users</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Joined</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-700 transition">
                <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{formatRole(user.role)}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                <td className="px-6 py-4 text-sm">
                  {editingUserId === user._id ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="researcher">Researcher</option>
                      </select>
                      <button
                        onClick={() => handleRoleChange(user._id, selectedRole)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingUserId(user._id);
                        setSelectedRole(Array.isArray(user.role) ? user.role[0] : user.role);
                      }}
                      className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}
