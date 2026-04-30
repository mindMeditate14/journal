import { useAuthStore } from '../utils/authStore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { manuscriptAPI, projectAPI } from '../services/api';
import { Role } from '../types';

const hasRole = (target: Role, roles?: Role[], fallbackRole?: Role) => {
  if (Array.isArray(roles) && roles.length > 0) {
    return roles.includes(target);
  }
  return fallbackRole === target;
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [draftCount, setDraftCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingDocFor, setUploadingDocFor] = useState<string | null>(null);
  const [uploadingWorkingDocFor, setUploadingWorkingDocFor] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, File | null>>({});
  const [selectedWorkingDocs, setSelectedWorkingDocs] = useState<Record<string, File | null>>({});
  const [journals, setJournals] = useState<Array<{ _id: string; title: string; isOpen?: boolean }>>([]);
  const [existingPaperSubmitting, setExistingPaperSubmitting] = useState(false);
  const [existingPaperFile, setExistingPaperFile] = useState<File | null>(null);
  const [existingPaper, setExistingPaper] = useState({
    journalId: '', title: '', abstract: '', description: '', authors: '', keywords: '', discipline: 'General', methodology: 'external-submission',
  });

  const isAdmin = hasRole('admin', user?.roles, user?.role);
  const isEditor = hasRole('editor', user?.roles, user?.role) || isAdmin;
  const isResearcher = hasRole('researcher', user?.roles, user?.role) || isAdmin;

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const results = await Promise.allSettled([
        apiClient.get('/manuscripts', { params: { status: 'draft', page: 1, limit: 50 } }),
        apiClient.get('/manuscripts', { params: { status: 'submitted', page: 1, limit: 50 } }),
        apiClient.get('/manuscripts', { params: { status: 'under-review', page: 1, limit: 50 } }),
        apiClient.get('/manuscripts', { params: { status: 'revision-requested', page: 1, limit: 50 } }),
        apiClient.get('/manuscripts', { params: { status: 'accepted', page: 1, limit: 50 } }),
        apiClient.get('/manuscripts', { params: { status: 'published', page: 1, limit: 50 } }),
      ]);

      const allManuscripts: any[] = [];
      const seenIds = new Set<string>();
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const m of result.value.data?.manuscripts || []) {
            if (!seenIds.has(m._id)) { seenIds.add(m._id); allManuscripts.push(m); }
          }
        }
      }

      setSubmissions(allManuscripts);
      setDraftCount(allManuscripts.filter((m) => m.status === 'draft').length);
      setSubmittedCount(allManuscripts.filter((m) => ['submitted', 'under-review', 'revision-requested', 'accepted'].includes(m.status)).length);
      setAcceptedCount(allManuscripts.filter((m) => m.status === 'accepted').length);
      setPublishedCount(allManuscripts.filter((m) => m.status === 'published').length);
    } catch { /* keep dashboard usable */ }
    finally { setSubmissionsLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    fetchSubmissions();

    apiClient.get('/journals/search', { params: { q: '', page: 1, limit: 100, isOpen: true } })
      .then((r) => setJournals(r.data?.journals || []))
      .catch(() => {});
  }, [user]);

  const refreshSubmissions = async () => {
    await fetchSubmissions();
  };

  const handleFinalDocumentUpload = async (manuscriptId: string) => {
    const file = selectedDocs[manuscriptId];
    if (!file) { toast.error('Select a PDF file first'); return; }
    const formData = new FormData();
    formData.append('document', file);
    setUploadingDocFor(manuscriptId);
    try {
      await manuscriptAPI.uploadFinalDocument(manuscriptId, formData);
      toast.success('Final document uploaded.');
      setSelectedDocs((p) => ({ ...p, [manuscriptId]: null }));
      await refreshSubmissions();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Upload failed'); }
    finally { setUploadingDocFor(null); }
  };

  const handleWorkingDocumentUpload = async (manuscriptId: string) => {
    const file = selectedWorkingDocs[manuscriptId];
    if (!file) { toast.error('Select a file first'); return; }
    const formData = new FormData();
    formData.append('document', file);
    setUploadingWorkingDocFor(manuscriptId);
    try {
      await manuscriptAPI.uploadWorkingDocument(manuscriptId, formData);
      toast.success('Working document updated.');
      setSelectedWorkingDocs((p) => ({ ...p, [manuscriptId]: null }));
      await refreshSubmissions();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Upload failed'); }
    finally { setUploadingWorkingDocFor(null); }
  };

  const handleEditDraft = (manuscriptId: string) => navigate(`/manuscripts/${manuscriptId}/edit`);
  const handleEditPracticeManuscript = (manuscriptId: string, practiceDataId?: string) => {
    if (practiceDataId) navigate(`/practice-data/${practiceDataId}/generate-manuscript`);
    else navigate(`/manuscripts/${manuscriptId}/edit`);
  };

  const handleDeleteManuscript = async (manuscriptId: string, title: string) => {
    if (!window.confirm(`Delete "${title || 'this manuscript'}"? This cannot be undone.`)) return;
    setDeletingId(manuscriptId);
    try {
      await manuscriptAPI.delete(manuscriptId);
      toast.success('Manuscript deleted');
      await refreshSubmissions();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Delete failed'); }
    finally { setDeletingId(null); }
  };

  const submitExistingPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingPaper.journalId || !existingPaper.title.trim() || !existingPaper.abstract.trim()) {
      toast.error('Journal, title and abstract are required.'); return;
    }
    if (!existingPaperFile) { toast.error('Attach a document.'); return; }
    const formData = new FormData();
    Object.entries(existingPaper).forEach(([k, v]) => formData.append(k, v as string));
    formData.append('document', existingPaperFile);
    setExistingPaperSubmitting(true);
    try {
      await apiClient.post('/manuscripts/submit-existing', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Paper submitted for review.');
      setExistingPaper({ journalId: '', title: '', abstract: '', description: '', authors: '', keywords: '', discipline: 'General', methodology: 'external-submission' });
      setExistingPaperFile(null);
      await refreshSubmissions();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Submit failed'); }
    finally { setExistingPaperSubmitting(false); }
  };

  const filteredSubmissions = filterStatus === 'all' ? submissions : submissions.filter((m) => m.status === filterStatus);

  const statusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-purple-100 text-purple-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under-review': return 'bg-cyan-100 text-cyan-800';
      case 'revision-requested': return 'bg-amber-100 text-amber-800';
      case 'accepted': return 'bg-emerald-100 text-emerald-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user.profile?.firstName || user.email}</h1>
        <p className="text-gray-600 mb-8">Manage your research projects and manuscripts</p>

        {(isEditor || isResearcher) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {isResearcher && (
              <div className="bg-white rounded-lg shadow p-6 border border-indigo-100">
                <h3 className="text-lg font-semibold text-gray-900">Researcher Actions</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">Create and submit manuscripts.</p>
                <button onClick={() => navigate('/manuscripts/create')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Create Manuscript</button>
              </div>
            )}
            {isEditor && (
              <div className="bg-white rounded-lg shadow p-6 border border-violet-100">
                <h3 className="text-lg font-semibold text-gray-900">Editor Actions</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">Review submissions and publish accepted manuscripts.</p>
                <button onClick={() => navigate('/editor/dashboard')} className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700">Editor Dashboard</button>
              </div>
            )}
          </div>
        )}

        {/* Stats Cards - also filter tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Drafts', count: draftCount, value: 'draft', color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Under Review', count: submittedCount, value: 'submitted', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Accepted', count: acceptedCount, value: 'accepted', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Published', count: publishedCount, value: 'published', color: 'text-green-600', bg: 'bg-green-50' },
          ].map((stat) => (
            <button
              key={stat.value}
              onClick={() => setFilterStatus(filterStatus === stat.value ? 'all' : stat.value)}
              className={`rounded-lg shadow p-6 text-left transition-all hover:shadow-md ${
                filterStatus === stat.value ? `${stat.bg} ring-2 ring-offset-2 ring-${stat.color.split('-')[1]}-400` : 'bg-white'
              }`}
            >
              <h3 className="text-sm font-medium text-gray-600">{stat.label}</h3>
              <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
            </button>
          ))}
        </div>

        {/* My Submissions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {filterStatus === 'all' ? 'My Submissions' : `${filterStatus.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} Manuscripts`}
              <span className="ml-2 text-sm font-normal text-gray-500">({filteredSubmissions.length})</span>
            </h2>
            <button onClick={() => navigate('/manuscripts/create')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">New Manuscript Draft</button>
          </div>

          {submissionsLoading ? (
            <p className="p-6 text-gray-600">Loading...</p>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">No manuscripts found.</p>
              <p className="text-gray-400 mb-6">Generate a manuscript from your practice data or create a new draft.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/practice-data/create')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Collect Practice Data</button>
                <button onClick={() => navigate('/manuscripts/create')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Create Manuscript</button>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredSubmissions.map((m: any) => (
                <div key={m._id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{m.title || 'Untitled Manuscript'}</h3>
                        <span className={`text-xs px-2 py-1 rounded capitalize font-medium ${statusColor(m.status)}`}>
                          {String(m.status || 'draft').replace('-', ' ')}
                        </span>
                        {m.sourcePath === 'clinical_case' && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">From Practice Data</span>
                        )}
                      </div>

                      {m.status === 'draft' && <p className="text-sm text-purple-700">Draft not yet submitted — click Edit to continue</p>}
                      {m.status === 'revision-requested' && <p className="text-sm text-amber-700">Revision requested — click Revise to address feedback</p>}

                      <p className="text-sm text-gray-600 mt-1">
                        {m.journalId?.title ? `Journal: ${m.journalId.title}` : m.status === 'draft' ? 'No journal selected yet' : 'Journal: Unspecified'}
                      </p>

                      {m.submittedAt && <p className="text-sm text-gray-500">Submitted: {new Date(m.submittedAt).toLocaleString()}</p>}
                      {m.status === 'draft' && m.createdAt && <p className="text-sm text-gray-500">Created: {new Date(m.createdAt).toLocaleDateString()}</p>}
                      {m.submissionId && <p className="text-sm text-gray-500">Submission ID: {m.submissionId}</p>}
                      {m.editorNotes && <p className="text-sm text-amber-700 mt-1">Editor note: {m.editorNotes}</p>}

                      {(m.workingDocument?.url || m.finalDocument?.url) && (
                        <div className="flex gap-3 mt-2">
                          {m.workingDocument?.url && (
                            <a href={m.workingDocument.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline">Working document</a>
                          )}
                          {m.finalDocument?.url && (
                            <a href={m.finalDocument.url} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">Final PDF</a>
                          )}
                        </div>
                      )}

                      {m.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.keywords.map((kw: string, i: number) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[130px]">
                      {m.status === 'draft' && (
                        <>
                          <button type="button" onClick={() => handleEditDraft(m._id)} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Edit</button>
                          <button type="button" onClick={() => handleDeleteManuscript(m._id, m.title)} disabled={deletingId === m._id} className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50">
                            {deletingId === m._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                      {m.status === 'revision-requested' && (
                        <button type="button" onClick={() => handleEditDraft(m._id)} className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700">Revise</button>
                      )}
                    </div>
                  </div>

                  {/* Working doc upload for submitted statuses */}
                  {['submitted', 'under-review', 'revision-requested', 'accepted'].includes(m.status) && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-gray-700 mb-2">Upload editable document for reviewer/editor corrections.</p>
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setSelectedWorkingDocs((p) => ({ ...p, [m._id]: e.target.files?.[0] || null }))} className="text-sm" />
                        <button type="button" onClick={() => handleWorkingDocumentUpload(m._id)} disabled={uploadingWorkingDocFor === m._id}
                          className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm">
                          {uploadingWorkingDocFor === m._id ? 'Uploading...' : m.status === 'revision-requested' ? 'Upload Revised & Resubmit' : 'Upload Working Document'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Final doc upload for accepted */}
                  {m.status === 'accepted' && (
                    <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-gray-700 mb-2">Upload final PDF for publication.</p>
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <input type="file" accept=".pdf" onChange={(e) => setSelectedDocs((p) => ({ ...p, [m._id]: e.target.files?.[0] || null }))} className="text-sm" />
                        <button type="button" onClick={() => handleFinalDocumentUpload(m._id)} disabled={uploadingDocFor === m._id}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
                          {uploadingDocFor === m._id ? 'Uploading...' : 'Upload Final Document'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}