import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, journalAPI } from '../services/api';
import { AdminUser, AdminStats, Role, Journal } from '../types';
import { useAuthStore } from '../utils/authStore';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { invalidateClassificationsCache } from '../hooks/useClassifications';

const MS_STATUSES = ['draft','submitted','under-review','revision-requested','accepted','published','rejected'] as const;
const MS_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  'under-review': 'bg-purple-100 text-purple-700',
  'revision-requested': 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const ROLES: Role[] = ['admin', 'editor', 'researcher', 'reviewer'];

const getUserRoles = (user: AdminUser) => {
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles;
  }
  return user.role ? [user.role] : [];
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-amber-100 text-amber-800',
  editor: 'bg-violet-100 text-violet-800',
  researcher: 'bg-indigo-100 text-indigo-800',
  reviewer: 'bg-teal-100 text-teal-800',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?._id);

  const [activeTab, setActiveTab] = useState<'users' | 'manuscripts' | 'classifications'>('users');

  // ── Classifications tab state ──
  type ClassItem = { value: string; label: string };
  const [disciplines, setDisciplines] = useState<ClassItem[]>([]);
  const [methodologies, setMethodologies] = useState<ClassItem[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classSaving, setClassSaving] = useState<'disciplines' | 'methodologies' | null>(null);
  const [newDiscipline, setNewDiscipline] = useState({ value: '', label: '' });
  const [newMethodology, setNewMethodology] = useState({ value: '', label: '' });

  // ── Users tab state ──
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

  // ── Manuscripts tab state ──
  const [manuscripts, setManuscripts] = useState<any[]>([]);
  const [msTotal, setMsTotal] = useState(0);
  const [msPage, setMsPage] = useState(1);
  const [msSearch, setMsSearch] = useState('');
  const [msStatus, setMsStatus] = useState('');
  const [loadingMs, setLoadingMs] = useState(false);
  const [selectedMs, setSelectedMs] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingMs, setSavingMs] = useState(false);
  const MS_LIMIT = 15;

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

  // ── Manuscript tab logic ──
  const loadManuscripts = useCallback(async (targetPage = 1) => {
    setLoadingMs(true);
    try {
      const params: any = { page: targetPage, limit: MS_LIMIT };
      if (msStatus) params.status = msStatus;
      const { data } = await apiClient.get('/manuscripts', { params });
      setManuscripts(data.manuscripts || []);
      setMsTotal(data.pagination?.total || 0);
      setMsPage(data.pagination?.page || 1);
    } catch {
      toast.error('Failed to load manuscripts');
    } finally {
      setLoadingMs(false);
    }
  }, [msStatus, MS_LIMIT]);

  useEffect(() => {
    if (activeTab === 'manuscripts') loadManuscripts(1);
    if (activeTab === 'classifications') loadClassifications();
  }, [activeTab, msStatus]);

  const handleSelectMs = (ms: any) => {
    setSelectedMs(ms);
    setEditForm({
      title: ms.title || '',
      abstract: ms.abstract || '',
      keywords: Array.isArray(ms.keywords) ? ms.keywords.join(', ') : (ms.keywords || ''),
      discipline: ms.discipline || '',
      status: ms.status || '',
    });
  };

  const handleSaveMs = async () => {
    if (!selectedMs) return;
    setSavingMs(true);
    try {
      const payload: any = {
        title: editForm.title.trim(),
        abstract: editForm.abstract.trim(),
        keywords: editForm.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        discipline: editForm.discipline.trim(),
        status: editForm.status,
      };
      const { data } = await apiClient.patch(`/manuscripts/${selectedMs._id}`, payload);
      const updated = data.manuscript || { ...selectedMs, ...payload };
      setManuscripts(prev => prev.map(m => m._id === selectedMs._id ? { ...m, ...updated } : m));
      setSelectedMs({ ...selectedMs, ...updated });
      toast.success('Manuscript updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setSavingMs(false);
    }
  };

  const msTotalPages = Math.max(1, Math.ceil(msTotal / MS_LIMIT));

  // ── Classification tab logic ──
  const loadClassifications = useCallback(async () => {
    setClassLoading(true);
    try {
      const { data } = await apiClient.get('/config/classifications');
      setDisciplines(data.disciplines || []);
      setMethodologies(data.methodologies || []);
    } catch {
      toast.error('Failed to load classifications');
    } finally {
      setClassLoading(false);
    }
  }, []);

  const handleSaveClassification = async (type: 'disciplines' | 'methodologies', items: ClassItem[]) => {
    setClassSaving(type);
    try {
      await apiClient.put(`/config/${type}`, { items });
      if (type === 'disciplines') setDisciplines(items);
      else setMethodologies(items);
      invalidateClassificationsCache();
      toast.success(`${type === 'disciplines' ? 'Disciplines' : 'Methodologies'} saved`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setClassSaving(null);
    }
  };

  const removeItem = (type: 'disciplines' | 'methodologies', value: string) => {
    const items = type === 'disciplines' ? disciplines : methodologies;
    const next = items.filter(i => i.value !== value);
    handleSaveClassification(type, next);
  };

  const addItem = (type: 'disciplines' | 'methodologies') => {
    const draft = type === 'disciplines' ? newDiscipline : newMethodology;
    if (!draft.label.trim()) { toast.error('Label is required'); return; }
    const slugValue = draft.value.trim() || draft.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const items = type === 'disciplines' ? disciplines : methodologies;
    if (items.some(i => i.value === slugValue)) { toast.error('That value already exists'); return; }
    const next = [...items, { value: slugValue, label: draft.label.trim() }];
    handleSaveClassification(type, next).then(() => {
      if (type === 'disciplines') setNewDiscipline({ value: '', label: '' });
      else setNewMethodology({ value: '', label: '' });
    });
  };

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
      setPendingRoles((prev) => { const next = { ...prev }; delete next[user._id]; return next; });
      setEditingRoles(null);
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

  const [editingRoles, setEditingRoles] = useState<string | null>(null); // userId being edited

  // --- Journals management ---
  const [journals, setJournals] = useState<Journal[]>([]);
  const [journalSearch, setJournalSearch] = useState('');
  const [loadingJournals, setLoadingJournals] = useState(false);
  const [deletingJournal, setDeletingJournal] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadJournals = useCallback(async (q = '') => {
    setLoadingJournals(true);
    try {
      const data = await journalAPI.search(q, {}, 1, 50);
      setJournals(Array.isArray(data.journals) ? data.journals : []);
    } catch {
      toast.error('Failed to load journals');
    } finally {
      setLoadingJournals(false);
    }
  }, []);

  useEffect(() => { loadJournals(); }, []);

  const handleDeleteJournal = async (id: string) => {
    setDeletingJournal(id);
    try {
      await journalAPI.delete(id);
      setJournals((prev) => prev.filter((j) => j._id !== id));
      toast.success('Journal deleted');
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete journal');
    } finally {
      setDeletingJournal(null);
      setConfirmDeleteId(null);
    }
  };

  const startEditRoles = (user: AdminUser) => {
    setPendingRoles((prev) => ({ ...prev, [user._id]: getUserRoles(user) }));
    setEditingRoles(user._id);
  };

  const cancelEditRoles = (userId: string) => {
    setPendingRoles((prev) => { const next = { ...prev }; delete next[userId]; return next; });
    setEditingRoles(null);
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

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex gap-6">
            {(['users', 'manuscripts', 'classifications'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'users' ? 'Users & Roles' : tab === 'manuscripts' ? 'Manuscripts' : 'Classifications'}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'users' && (<>
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
                    <tr key={u._id} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {u.email}
                        {isSelf && (
                          <span className="ml-2 text-xs text-indigo-500">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingRoles === u._id ? (
                          /* ── Edit mode ── */
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2 min-w-[200px]">
                            <p className="text-xs font-semibold text-indigo-700 mb-2">Assign roles:</p>
                            {ROLES.map((role) => {
                              const checked = (pendingRoles[u._id] ?? []).includes(role);
                              return (
                                <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-indigo-600"
                                    checked={checked}
                                    onChange={(e) => togglePendingRole(u, role, e.target.checked)}
                                  />
                                  <span className={`text-sm font-medium capitalize ${checked ? 'text-indigo-700' : 'text-gray-600'}`}>
                                    {role}
                                  </span>
                                  <span className={`ml-auto inline-flex px-1.5 py-0.5 rounded text-xs ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {role === 'admin' && 'Full access'}
                                    {role === 'editor' && 'Can publish'}
                                    {role === 'researcher' && 'Can submit'}
                                    {role === 'reviewer' && 'Can review'}
                                  </span>
                                </label>
                              );
                            })}
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                disabled={isUpdatingRole || (pendingRoles[u._id] ?? []).length === 0}
                                onClick={() => handleRoleSave(u)}
                                className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isUpdatingRole ? 'Saving…' : 'Save Roles'}
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelEditRoles(u._id)}
                                className="flex-1 py-1.5 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Display mode ── */
                          <div className="flex flex-wrap items-center gap-1.5">
                            {getUserRoles(u).map((role) => (
                              <span
                                key={role}
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}
                              >
                                {role}
                              </span>
                            ))}
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => startEditRoles(u)}
                                className="ml-1 text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                ✎ Edit
                              </button>
                            )}
                          </div>
                        )}
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
        {/* Journals management */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Journals</h2>
          <p className="text-sm text-gray-500 mb-4">Delete incorrect or test journals. This cannot be undone.</p>

          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={journalSearch}
              onChange={(e) => setJournalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadJournals(journalSearch.trim())}
              placeholder="Search journals by title…"
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => loadJournals(journalSearch.trim())}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Search
            </button>
            {journalSearch && (
              <button
                type="button"
                onClick={() => { setJournalSearch(''); loadJournals(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Clear
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loadingJournals ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading…</div>
            ) : journals.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">No journals found.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Title</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">ISSN</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Owner</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {journals.map((j) => (
                    <tr key={j._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{j.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${j.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {j.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{j.issn || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(j as any).owner?.email || (j as any).owner || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {confirmDeleteId === j._id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600 font-medium">Delete this journal?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteJournal(j._id)}
                              disabled={deletingJournal === j._id}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingJournal === j._id ? 'Deleting…' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(j._id)}
                            className="px-3 py-1 border border-red-300 text-red-600 text-xs rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </>)}

        {activeTab === 'manuscripts' && (
          <div className="mt-6">
            {/* Manuscript filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={msStatus}
                onChange={(e) => setMsStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All statuses</option>
                {MS_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadManuscripts(1)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Refresh
              </button>
              <span className="ml-auto text-sm text-gray-500 self-center">{msTotal} manuscript{msTotal !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* List */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
                {loadingMs ? (
                  <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
                ) : manuscripts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">No manuscripts found.</div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {manuscripts.map(m => {
                      const reviews = m.reviews || [];
                      const isFinished = ['accepted', 'published', 'rejected'].includes(m.status);
                      const reviewerNames = reviews
                        .map((r: any) => r.reviewerId?.name || r.reviewerName)
                        .filter(Boolean);
                      const submitted = reviews.filter((r: any) => r.submittedAt).length;
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => handleSelectMs(m)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedMs?._id === m._id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                        >
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{m.title}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${MS_STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-600'}`}>
                              {String(m.status).replace(/-/g, ' ')}
                            </span>
                          </div>
                          {m.submittedBy?.name && (
                            <p className="text-xs text-gray-500 mt-0.5">By: {m.submittedBy?.name || m.submittedBy?.email}</p>
                          )}
                          {!isFinished && reviewerNames.length > 0 && (
                            <p className="text-xs text-teal-600 mt-0.5">Reviewers: {reviewerNames.join(', ')}{submitted > 0 ? ` (${submitted}/${reviews.length} done)` : ''}</p>
                          )}
                          {!isFinished && reviews.length > 0 && reviewerNames.length === 0 && (
                            <p className="text-xs text-amber-600 mt-0.5">{submitted}/{reviews.length} reviews submitted</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {msTotalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                    <button type="button" onClick={() => loadManuscripts(msPage - 1)} disabled={msPage <= 1 || loadingMs} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                    <span className="text-gray-600">{msPage}/{msTotalPages}</span>
                    <button type="button" onClick={() => loadManuscripts(msPage + 1)} disabled={msPage >= msTotalPages || loadingMs} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                  </div>
                )}
              </div>

              {/* Edit panel */}
              <div className="lg:col-span-3">
                {!selectedMs ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
                    Select a manuscript to view and edit
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-gray-400 font-mono">{selectedMs.submissionId || selectedMs._id}</p>
                        <h3 className="text-base font-semibold text-gray-900 mt-0.5">{selectedMs.title}</h3>
                      </div>
                      <a href={`/manuscripts/${selectedMs._id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-indigo-600 hover:underline">View →</a>
                    </div>

                    {/* Reviewers info (read-only) */}
                    {selectedMs.reviews?.length > 0 && (
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Assigned Reviewers</p>
                        <div className="space-y-1">
                          {selectedMs.reviews.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-700 font-medium">{r.reviewerId?.name || r.reviewerName || `Reviewer ${i + 1}`}</span>
                              {r.reviewerId?.email && <span className="text-gray-400 text-xs">({r.reviewerId.email})</span>}
                              {r.submittedAt ? (
                                <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Submitted</span>
                              ) : (
                                <span className="ml-auto text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Pending</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Editable fields */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        {MS_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Abstract</label>
                      <textarea
                        rows={5}
                        value={editForm.abstract}
                        onChange={e => setEditForm((f: any) => ({ ...f, abstract: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Discipline</label>
                        <input
                          type="text"
                          value={editForm.discipline}
                          onChange={e => setEditForm((f: any) => ({ ...f, discipline: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Keywords <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                        <input
                          type="text"
                          value={editForm.keywords}
                          onChange={e => setEditForm((f: any) => ({ ...f, keywords: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveMs}
                        disabled={savingMs}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingMs ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Classifications tab ────────────────────────────────── */}
        {activeTab === 'classifications' && (
          <div className="mt-6 space-y-8">
            {classLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <>
                {/* Disciplines */}
                <ClassificationSection
                  title="Disciplines"
                  description="Shown to authors as the research field / subject area."
                  items={disciplines}
                  newItem={newDiscipline}
                  setNewItem={setNewDiscipline}
                  onAdd={() => addItem('disciplines')}
                  onRemove={(v) => removeItem('disciplines', v)}
                  saving={classSaving === 'disciplines'}
                />

                {/* Methodologies / Article Types */}
                <ClassificationSection
                  title="Methodologies / Article Types"
                  description="Shown to authors as the study design or article type."
                  items={methodologies}
                  newItem={newMethodology}
                  setNewItem={setNewMethodology}
                  onAdd={() => addItem('methodologies')}
                  onRemove={(v) => removeItem('methodologies', v)}
                  saving={classSaving === 'methodologies'}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reusable section component ─────────────────────────────────────────────
function ClassificationSection({
  title, description, items, newItem, setNewItem, onAdd, onRemove, saving,
}: {
  title: string;
  description: string;
  items: { value: string; label: string }[];
  newItem: { value: string; label: string };
  setNewItem: (v: { value: string; label: string }) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
  saving: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      {/* Existing items */}
      <div className="divide-y divide-gray-50">
        {items.length === 0 && (
          <p className="px-6 py-4 text-sm text-gray-400 italic">No items. Add one below.</p>
        )}
        {items.map((item) => (
          <div key={item.value} className="flex items-center justify-between px-6 py-3">
            <div>
              <span className="text-sm font-medium text-gray-800">{item.label}</span>
              <span className="ml-2 text-xs text-gray-400 font-mono">{item.value}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.value)}
              disabled={saving}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 px-2 py-1 rounded hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add new item */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-2">Add new item</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Label (e.g. Ethnobotany)"
            value={newItem.label}
            onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          />
          <input
            type="text"
            placeholder="Slug (auto if blank)"
            value={newItem.value}
            onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
            className="w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={saving || !newItem.label.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

