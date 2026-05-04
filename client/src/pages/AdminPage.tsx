import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { AdminUser, AdminStats, Role } from '../types';
import { useAuthStore } from '../utils/authStore';
import toast from 'react-hot-toast';

const ROLES: Role[] = ['admin', 'editor', 'researcher'];

const getUserRoles = (user: AdminUser) => {
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles;
  }
  return user.role ? [user.role] : [];
};

const ROLE_COLORS: Record<AdminUser['role'], string> = {
  admin: 'bg-amber-100 text-amber-800',
  editor: 'bg-violet-100 text-violet-800',
  researcher: 'bg-indigo-100 text-indigo-800',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?._id);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role[]>>({});

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadStats = useCallback(async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch {
      // non-critical
    }
  }, []);

  const loadUsers = useCallback(async (targetPage = 1) => {
    setLoadingUsers(true);
    try {
      const data = await adminAPI.listUsers({
        page: targetPage,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [search, roleFilter, limit]);

  useEffect(() => {
    loadStats();
    loadUsers(1);
  }, []);

  // Re-load when filters change
  useEffect(() => {
    loadUsers(1);
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleRoleSave = async (user: AdminUser) => {
    const selectedRoles = pendingRoles[user._id] || getUserRoles(user);
    if (selectedRoles.length === 0) {
      toast.error('Select at least one role');
      return;
    }
    setUpdating(user._id + ':role');
    try {
      const updated = await adminAPI.changeRole(user._id, selectedRoles);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, role: updated.role, roles: updated.roles } : u)));
      toast.success(`${user.email} roles updated`);
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const togglePendingRole = (user: AdminUser, role: Role, checked: boolean) => {
    const current = pendingRoles[user._id] || getUserRoles(user);
    const next = checked ? [...new Set([...current, role])] : current.filter((r) => r !== role);
    setPendingRoles((prev) => ({ ...prev, [user._id]: next }));
  };

  const handleToggleActive = async (user: AdminUser) => {
    setUpdating(user._id + ':active');
    try {
      const updated = await adminAPI.setActive(user._id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, isActive: updated.isActive } : u)));
      toast.success(`${user.email} ${updated.isActive ? 'activated' : 'deactivated'}`);
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update account status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
            <p className="mt-1 text-gray-600">Manage users, roles, and corpus ingestion.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Open Ingest Panel →
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total users</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.activeUsers}</div>
              <div className="text-xs text-gray-500 mt-0.5">Active</div>
            </div>
            {ROLES.map((r) => (
              <div key={r} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.roleBreakdown[r] ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5 capitalize">{r}s</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Search
            </button>
            {(search || roleFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setRoleFilter(''); loadUsers(1); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* User table */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">
              {loadingUsers ? 'Loading…' : `${total} user${total === 1 ? '' : 's'}`}
            </span>
            <span className="text-xs text-gray-500">Tip: tick roles and click Save</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 text-left">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === currentUserId;
                  const isUpdatingRole = updating === u._id + ':role';
                  const isUpdatingActive = updating === u._id + ':active';
                  return (
                    <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {u.email}
                        {isSelf && (
                          <span className="ml-2 text-xs text-indigo-500">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {ROLES.map((role) => {
                            const selected = (pendingRoles[u._id] || getUserRoles(u)).includes(role);
                            return (
                              <label
                                key={role}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${selected ? ROLE_COLORS[role] : 'bg-white text-gray-600 border-gray-300'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={isSelf || isUpdatingRole}
                                  onChange={(e) => togglePendingRole(u, role, e.target.checked)}
                                />
                                {role}
                              </label>
                            );
                          })}
                          {!isSelf && (
                            <button
                              type="button"
                              disabled={isUpdatingRole}
                              onClick={() => handleRoleSave(u)}
                              className="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                            >
                              {isUpdatingRole ? 'saving...' : 'Save'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isSelf || isUpdatingActive}
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-default ${
                            u.isActive
                              ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {isUpdatingActive ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loadingUsers && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => loadUsers(page - 1)}
                disabled={page <= 1 || loadingUsers}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => loadUsers(page + 1)}
                disabled={page >= totalPages || loadingUsers}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

