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
  const [draftCount, setDraftCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all | draft | submitted | under-review | etc.
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
            // Fetch ALL manuscripts in one call
            const response = await apiClient.get('/manuscripts', {
              params: { page: 1, limit: 100 },
            });
        
            const allManuscripts = response.data?.manuscripts || [];
        
            // Calculate counts
            const drafts = allManuscripts.filter((m: any) => m.status === 'draft');
            const published = allManuscripts.filter((m: any) => m.status === 'published');
        
            setDraftCount(drafts.length);
            setPublishedCount(published.length);

            // Combine all for display, prioritized: draft → submitted → published
            setSubmissions(allManuscripts);
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

  /** Edit a draft manuscript */
  const handleEditDraft = (manuscriptId: string) => {
    navigate(`/manuscripts/${manuscriptId}/edit`);
  };

  /** Navigate to manuscript generation from practice data */
  const handleEditPracticeManuscript = (manuscriptId: string, practiceDataId?: string) => {
    if (practiceDataId) {
      navigate(`/practice-data/${practiceDataId}/generate-manuscript`);
    } else {
      navigate(`/manuscripts/${manuscriptId}/edit`);
    }
  };

    /** Delete a draft manuscript */
  const handleDeleteManuscript = async (manuscriptId: string, title: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title || 'this manuscript'}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(manuscriptId);
    try {
      await manuscriptAPI.delete(manuscriptId);
      toast.success('Manuscript deleted');
      await refreshSubmissions();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete manuscript');
    } finally {
      setDeletingId(null);
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


        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Projects</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{projects.length}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Drafts</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">{draftCount}</p>
            <p className="text-xs text-gray-500 mt-1">Manuscripts in progress</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Submitted</h3>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {submissions.filter((s) => ['submitted', 'under-review', 'revision-requested', 'accepted'].includes(s.status)).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Under review</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Published</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{publishedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Successfully published</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">My Projects</h2>
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

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-6">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">My Submissions</h2>
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
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded capitalize font-medium ${m.status === 'draft' ? 'bg-purple-100 text-purple-800' : m.status === 'published' ? 'bg-green-100 text-green-800' : m.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {String(m.status || 'draft').replace('-', ' ')}
                        </span>
                      </div>

                      {m.status === 'draft' && (
                        <p className="text-sm text-purple-700 mt-1">
                          Draft not yet submitted — edit below to continue
                        </p>
                      )}

                      <p className="text-sm text-gray-600 mt-1">
                        {m.journalId?.title ? `Journal: ${m.journalId.title}` : m.status === 'draft' ? 'No journal selected yet' : 'Journal: Unspecified'}
                      </p>

                      {m.status !== 'draft' && m.submittedAt && (
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(m.submittedAt).toLocaleString()}
                        </p>
                      )}

                      {m.status === 'draft' && m.createdAt && (
                        <p className="text-sm text-gray-500">
                          Created: {new Date(m.createdAt).toLocaleString()}
                        </p>
                      )}

                      {m.submissionId && (
                        <p className="text-sm text-gray-600">Submission ID: {m.submissionId}</p>
                      )}

                      {m.editorNotes && (
                        <p className="text-sm text-amber-700 mt-1">Editor note: {m.editorNotes}</p>
                      )}

                      {(m.workingDocument?.url || m.finalDocument?.url) && (
                        <div className="flex gap-3 mt-2">
                          {m.workingDocument?.url && (
                            <a
                              href={m.workingDocument.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-indigo-700 underline"
                            >
                              📄 Working document
                            </a>
                          )}
                          {m.finalDocument?.url && (
                            <a
                              href={m.finalDocument.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-emerald-700 underline"
                            >
                              📑 Final PDF
                            </a>
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

                    {/* Actions Column */}
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {m.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate(`/manuscripts/${m._id}/edit`)}
                            className="px-3 py-1.5 text-white text-sm rounded-lg hover:opacity-90 bg-indigo-600"
                          >
                            ✏️ Edit Draft
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await apiClient.post('/manuscripts', { draftId: m._id });
                                toast.success('Manuscript submitted for review!');
                                await refreshSubmissions();
                              } catch (error: any) {
                                toast.error(error?.response?.data?.error || 'Failed to submit');
                              }
                            }}
                            className="px-3 py-1.5 text-white text-sm rounded-lg hover:opacity-90 bg-emerald-600"
                          >
                            📤 Submit Now
                          </button>
                        </>
                      )}
                      {m.status === 'revision-requested' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/manuscripts/${m._id}/revision`)}
                          className="px-3 py-1.5 text-white text-sm rounded-lg hover:opacity-90 bg-amber-600"
                        >
                          ✏️ Revise
                        </button>
                      )}
                      {m.status === 'submitted' && (
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-600 text-sm rounded-lg text-center">
                          Awaiting Review
                        </span>
                      )}
                      {m.status === 'under-review' && (
                        <span className="px-3 py-1.5 bg-amber-100 text-amber-600 text-sm rounded-lg text-center">
                          Under Review
                        </span>
                      )}
                      {m.status === 'accepted' && (
                        <span className="px-3 py-1.5 bg-green-100 text-green-600 text-sm rounded-lg text-center">
                          Approved
                        </span>
                      )}
                      {(m.status === 'draft' || m.status === 'revision-requested' || m.status === 'submitted' || m.status === 'under-review') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteManuscript(m._id, m.title)}
                          disabled={deletingId === m._id}
                          className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === m._id ? 'Deleting...' : '🗑 Delete'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Working document upload for submitted/under-review */}
                  {(m.status === 'submitted' || m.status === 'under-review' || m.status === 'revision-requested' || m.status === 'accepted') && (
                    <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-gray-700 mb-2">
                        Upload editable Word/PDF working document so reviewer/editor can annotate and request corrections.
                        {m.status === 'revision-requested'
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
                          className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm"
                        >
                          {uploadingWorkingDocFor === m._id
                            ? 'Uploading...'
                            : m.status === 'revision-requested'
                              ? 'Upload Revised & Resubmit'
                              : 'Upload Working Document'}
                        </button>
                      </div>
                    </div>
                  )}

                  {m.status === 'accepted' && (
                    <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-gray-700 mb-2">
                        Upload final PDF for searchable publication.
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
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
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
