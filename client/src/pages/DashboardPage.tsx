import { useAuthStore } from '../utils/authStore';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import apiClient from '../api/client';
import { manuscriptAPI } from '../services/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Role } from '../types';
import { DISCIPLINES, METHODOLOGIES } from '../constants/manuscriptOptions';

const hasRole = (target: Role, roles?: Role[], fallbackRole?: Role) => {
  if (Array.isArray(roles) && roles.length > 0) {
    return roles.includes(target);
  }
  return fallbackRole === target;
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [uploadingDocFor, setUploadingDocFor] = useState<string | null>(null);
  const [uploadingWorkingDocFor, setUploadingWorkingDocFor] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, File | null>>({});
  const [selectedWorkingDocs, setSelectedWorkingDocs] = useState<Record<string, File | null>>({});
  const [journals, setJournals] = useState<Array<{ _id: string; title: string; isOpen?: boolean }>>([]);
  const [existingPaperSubmitting, setExistingPaperSubmitting] = useState(false);
  const [existingPaperFile, setExistingPaperFile] = useState<File | null>(null);
  const [existingPaper, setExistingPaper] = useState({
    journalId: '',
    title: '',
    abstract: '',
    description: '',
    authors: '',
    keywords: '',
    discipline: 'General',
    methodology: 'external-submission',
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectAPI.list();
        setProjects(data);
      } catch (error) {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await apiClient.get('/manuscripts', {
          params: { page: 1, limit: 10 },
        });
        setSubmissions(response.data?.manuscripts || []);
      } catch (error) {
        // Keep dashboard usable even if submissions list fails.
      } finally {
        setSubmissionsLoading(false);
      }
    };

    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  useEffect(() => {
    const loadJournals = async () => {
      try {
        const response = await apiClient.get('/journals/search', {
          params: { q: '', page: 1, limit: 100, isOpen: true },
        });
        setJournals(response.data?.journals || []);
      } catch {
        // Keep dashboard usable if journal lookup fails.
      }
    };

    if (user) {
      loadJournals();
    }
  }, [user]);

  const refreshSubmissions = async () => {
    try {
      const response = await apiClient.get('/manuscripts', {
        params: { page: 1, limit: 10 },
      });
      setSubmissions(response.data?.manuscripts || []);
    } catch {
      // ignore refresh errors
    }
  };

  const handleFinalDocumentUpload = async (manuscriptId: string) => {
    const file = selectedDocs[manuscriptId];
    if (!file) {
      toast.error('Select a PDF/Word file first');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    setUploadingDocFor(manuscriptId);
    try {
      await manuscriptAPI.uploadFinalDocument(manuscriptId, formData);
      toast.success('Final document uploaded. Editor can now publish after approval.');
      setSelectedDocs((prev) => ({ ...prev, [manuscriptId]: null }));
      await refreshSubmissions();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload final document');
    } finally {
      setUploadingDocFor(null);
    }
  };

  const handleWorkingDocumentUpload = async (manuscriptId: string) => {
    const file = selectedWorkingDocs[manuscriptId];
    if (!file) {
      toast.error('Select a Word/PDF file first');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    setUploadingWorkingDocFor(manuscriptId);
    try {
      await manuscriptAPI.uploadWorkingDocument(manuscriptId, formData);
      toast.success('Working document updated for editor/reviewer corrections.');
      setSelectedWorkingDocs((prev) => ({ ...prev, [manuscriptId]: null }));
      await refreshSubmissions();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload working document');
    } finally {
      setUploadingWorkingDocFor(null);
    }
  };

  const submitExistingPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingPaper.journalId || !existingPaper.title.trim() || !existingPaper.abstract.trim()) {
      toast.error('Journal, title and abstract are required.');
      return;
    }
    if (!existingPaperFile) {
      toast.error('Attach PDF/Word document first.');
      return;
    }

    const formData = new FormData();
    formData.append('journalId', existingPaper.journalId);
    formData.append('title', existingPaper.title);
    formData.append('abstract', existingPaper.abstract);
    formData.append('description', existingPaper.description || existingPaper.abstract);
    formData.append('authors', existingPaper.authors);
    formData.append('keywords', existingPaper.keywords);
    formData.append('discipline', existingPaper.discipline);
    formData.append('methodology', existingPaper.methodology);
    formData.append('document', existingPaperFile);

    setExistingPaperSubmitting(true);
    try {
      await apiClient.post('/manuscripts/submit-existing', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Paper submitted for editor review.');
      setExistingPaper({
        journalId: '',
        title: '',
        abstract: '',
        description: '',
        authors: '',
        keywords: '',
        discipline: 'General',
        methodology: 'external-submission',
      });
      setExistingPaperFile(null);
      await refreshSubmissions();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to submit existing paper');
    } finally {
      setExistingPaperSubmitting(false);
    }
  };

  const isAdmin = hasRole('admin', user?.roles, user?.role);
  const isEditor = hasRole('editor', user?.roles, user?.role) || isAdmin;
  const isResearcher = hasRole('researcher', user?.roles, user?.role) || isAdmin;

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome, {user.profile?.firstName || user.email}
        </h1>
        <p className="text-gray-600 mb-8">
          Manage your research projects and manuscripts
        </p>

        {(isEditor || isResearcher) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {isResearcher && (
              <div className="bg-white rounded-lg shadow p-6 border border-indigo-100">
                <h3 className="text-lg font-semibold text-gray-900">Researcher Actions</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  Create and submit manuscripts to journals.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/manuscripts/create')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Create Manuscript
                </button>
              </div>
            )}

            {isEditor && (
              <div className="bg-white rounded-lg shadow p-6 border border-violet-100">
                <h3 className="text-lg font-semibold text-gray-900">Editor Actions</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  Review submissions, assign reviewers, and publish accepted manuscripts.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/editor/dashboard')}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"
                >
                  Open Editor Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {isResearcher && (
          <div className="mb-8 bg-white rounded-lg shadow p-6 border border-emerald-100">
            <h2 className="text-lg font-semibold text-gray-900">Have an Existing Paper?</h2>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Attach PDF/Word with short description. Editor can fast-review this path and publish once approved.
            </p>
            <form onSubmit={submitExistingPaper} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={existingPaper.journalId}
                  onChange={(e) => setExistingPaper((prev) => ({ ...prev, journalId: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select target journal</option>
                  {journals
                    .filter((journal) => journal.isOpen !== false)
                    .map((journal) => (
                      <option key={journal._id} value={journal._id}>
                        {journal.title}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  value={existingPaper.title}
                  onChange={(e) => setExistingPaper((prev) => ({ ...prev, title: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Paper title"
                />
              </div>
              <textarea
                value={existingPaper.abstract}
                onChange={(e) => setExistingPaper((prev) => ({ ...prev, abstract: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Short abstract (required)"
              />
              <textarea
                value={existingPaper.description}
                onChange={(e) => setExistingPaper((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Paper description for editor review"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={existingPaper.discipline}
                  onChange={(e) => setExistingPaper((prev) => ({ ...prev, discipline: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select discipline</option>
                  {DISCIPLINES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  value={existingPaper.methodology}
                  onChange={(e) => setExistingPaper((prev) => ({ ...prev, methodology: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select methodology</option>
                  {METHODOLOGIES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={existingPaper.authors}
                  onChange={(e) => setExistingPaper((prev) => ({ ...prev, authors: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Authors (comma separated)"
                />
                <input
                  type="text"
                  value={existingPaper.keywords}
                  onChange={(e) => setExistingPaper((prev) => ({ ...prev, keywords: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Keywords (comma separated)"
                />
              </div>
              <input
                type="file"
                accept="application/pdf,.doc,.docx"
                onChange={(e) => setExistingPaperFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <button
                type="submit"
                disabled={existingPaperSubmitting}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {existingPaperSubmitting ? 'Submitting...' : 'Submit Existing Paper for Review'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{projects.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Drafts</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Published</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
            <button
              onClick={() => navigate('/workspace/projects/new')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              New Project
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-gray-600">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="p-6 text-gray-600">No projects yet. Create one to get started!</p>
          ) : (
            <div className="divide-y">
              {projects.map((project: any) => (
                <div key={project._id} className="p-6 hover:bg-gray-50 cursor-pointer">
                  <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                  <div className="mt-4 flex gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      {project.manuscripts?.length || 0} manuscripts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow mt-8">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">My Submissions</h2>
            <button
              onClick={() => navigate('/manuscripts/create')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              New Manuscript Draft
            </button>
          </div>

          {submissionsLoading ? (
            <p className="p-6 text-gray-600">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="p-6 text-gray-600">No papers submitted yet. Click "New Manuscript Draft" to start.</p>
          ) : (
            <div className="divide-y">
              {submissions.map((m: any) => (
                <div key={m._id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Journal: {m.journalId?.title || 'Unspecified'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Submitted: {m.submittedAt ? new Date(m.submittedAt).toLocaleString() : 'N/A'}
                      </p>
                      {m.submissionId && (
                        <p className="text-sm text-gray-600">Submission ID: {m.submissionId}</p>
                      )}
                      {m.editorNotes && (
                        <p className="text-sm text-amber-700 mt-1">Editor note: {m.editorNotes}</p>
                      )}
                      {(m.workingDocument?.url || m.finalDocument?.url) && (
                        <a
                          href={m.workingDocument?.url || m.finalDocument?.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-indigo-700 underline mt-1 inline-block"
                        >
                          Open working document
                        </a>
                      )}
                      {m.finalDocument?.url && (
                        <a
                          href={m.finalDocument.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-emerald-700 underline mt-1 ml-3 inline-block"
                        >
                          Open final PDF
                        </a>
                      )}
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded capitalize">
                      {String(m.status || 'submitted').replace('-', ' ')}
                    </span>
                  </div>

                  {(m.status === 'submitted' || m.status === 'under-review' || m.status === 'revision-requested' || m.status === 'accepted' || m.status === 'rejected') && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-gray-700 mb-2">
                        Upload editable Word/PDF working document so reviewer/editor can annotate and request corrections.
                        {m.status === 'rejected' || m.status === 'revision-requested'
                          ? ' Uploading here will resubmit this manuscript to the editor queue.'
                          : ''}
                      </p>
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <input
                          type="file"
                          accept="application/pdf,.doc,.docx"
                          onChange={(e) =>
                            setSelectedWorkingDocs((prev) => ({
                              ...prev,
                              [m._id]: e.target.files?.[0] || null,
                            }))
                          }
                          className="text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleWorkingDocumentUpload(m._id)}
                          disabled={uploadingWorkingDocFor === m._id}
                          className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                          {uploadingWorkingDocFor === m._id
                            ? 'Uploading...'
                            : m.status === 'rejected' || m.status === 'revision-requested'
                              ? 'Upload Revised Document & Resubmit'
                              : 'Upload Working Document'}
                        </button>
                      </div>
                    </div>
                  )}

                  {m.status === 'accepted' && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-gray-700 mb-2">
                        After approval, upload final PDF for searchable publication.
                      </p>
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) =>
                            setSelectedDocs((prev) => ({
                              ...prev,
                              [m._id]: e.target.files?.[0] || null,
                            }))
                          }
                          className="text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleFinalDocumentUpload(m._id)}
                          disabled={uploadingDocFor === m._id}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
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
