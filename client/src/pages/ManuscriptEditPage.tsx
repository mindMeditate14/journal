import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { useAuthStore } from '../utils/authStore';
import { ManuscriptExporter } from '../utils/manuscriptExporter';
import { useClassifications } from '../hooks/useClassifications';
import manuscriptTemplateFile from '../assets/Template.docx?url';

type AuthorInput = { name: string; email: string; affiliation: string };

const EMPTY_AUTHOR: AuthorInput = { name: '', email: '', affiliation: '' };

export default function ManuscriptEditPage() {
  const { manuscriptId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { disciplines, methodologies } = useClassifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [manuscript, setManuscript] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [methodology, setMethodology] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [authors, setAuthors] = useState<AuthorInput[]>([{ ...EMPTY_AUTHOR }]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (!manuscriptId) {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      try {
        const manuscriptResponse = await apiClient.get(`/manuscripts/${manuscriptId}`);

        const nextManuscript = manuscriptResponse.data;
        setManuscript(nextManuscript);
        setTitle(nextManuscript.title || '');
        setAbstract(nextManuscript.abstract || '');
        setDiscipline(nextManuscript.discipline || '');
        setMethodology(nextManuscript.methodology || '');
        setKeywordsText(Array.isArray(nextManuscript.keywords) ? nextManuscript.keywords.join(', ') : nextManuscript.keywords || '');
        setAuthors(Array.isArray(nextManuscript.authors) && nextManuscript.authors.length > 0 ? nextManuscript.authors : [{ ...EMPTY_AUTHOR }]);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to load manuscript');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [manuscriptId, navigate]);

  const refreshManuscript = async () => {
    if (!manuscriptId) {
      return;
    }
    const response = await apiClient.get(`/manuscripts/${manuscriptId}`);
    const nextManuscript = response.data;
    setManuscript(nextManuscript);
    setKeywordsText(Array.isArray(nextManuscript.keywords) ? nextManuscript.keywords.join(', ') : nextManuscript.keywords || '');
    setAuthors(Array.isArray(nextManuscript.authors) && nextManuscript.authors.length > 0 ? nextManuscript.authors : [{ ...EMPTY_AUTHOR }]);
  };

  const updateAuthor = (index: number, key: keyof AuthorInput, value: string) => {
    setAuthors((current) =>
      current.map((author, authorIndex) =>
        authorIndex === index ? { ...author, [key]: value } : author
      )
    );
  };

  const addAuthor = () => {
    setAuthors((current) => [...current, { ...EMPTY_AUTHOR }]);
  };

  const removeAuthor = (index: number) => {
    setAuthors((current) => (current.length === 1 ? current : current.filter((_, authorIndex) => authorIndex !== index)));
  };

  const buildExportData = () => {
    const keywords = keywordsText.split(',').map((keyword) => keyword.trim()).filter(Boolean);
    const exportAuthors = authors
      .map((author) => ({
        name: author.name.trim(),
        email: author.email.trim(),
        affiliation: author.affiliation.trim(),
      }))
      .filter((author) => author.name || author.email || author.affiliation);

    return {
      title,
      abstract,
      keywords,
      discipline,
      methodology,
      studyType: manuscript?.studyType,
      authors: exportAuthors.length > 0
        ? exportAuthors
        : [{
            name: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || user?.email || 'Author',
            affiliation: user?.profile?.affiliation || '',
            email: user?.email || '',
          }],
    };
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return false;
    }

    const normalizedAuthors = authors
      .map((author) => ({
        name: author.name.trim(),
        email: author.email.trim(),
        affiliation: author.affiliation.trim(),
      }))
      .filter((author) => author.name || author.email || author.affiliation);

    setSaving(true);
    try {
      await apiClient.patch(`/manuscripts/${manuscriptId}`, {
        title: title.trim(),
        abstract: abstract.trim(),
        keywords: keywordsText.split(',').map((keyword) => keyword.trim()).filter(Boolean),
        discipline,
        methodology,
        authors: normalizedAuthors.length > 0 ? normalizedAuthors : [{ name: 'Anonymous', email: '', affiliation: '' }],
      });
      await refreshManuscript();
      toast.success('Manuscript saved');
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!abstract.trim()) {
      toast.error('Abstract is required');
      return;
    }

    const saved = await handleSave();
    if (!saved) {
      return;
    }

    setPublishing(true);
    try {
      await apiClient.post('/manuscripts', { draftId: manuscriptId });
      toast.success('Manuscript submitted');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Submit failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!documentFile) {
      toast.error('Select a document first');
      return;
    }

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      await apiClient.post(`/manuscripts/${manuscriptId}/working-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentFile(null);
      await refreshManuscript();
      toast.success('Document uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Document upload failed');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html' | 'markdown') => {
    const baseName = title.replace(/\s+/g, '_').toLowerCase().substring(0, 50) || 'manuscript';
    const exportData = buildExportData();

    try {
      if (format === 'pdf') {
        await ManuscriptExporter.exportPDF(exportData, `${baseName}.pdf`);
      } else if (format === 'docx') {
        ManuscriptExporter.exportDOCX(exportData, `${baseName}.doc`);
      } else if (format === 'html') {
        await ManuscriptExporter.exportHTML(exportData, `${baseName}.html`);
      } else {
        ManuscriptExporter.exportMarkdown(exportData, `${baseName}.md`);
      }
      toast.success(`${format.toUpperCase()} exported`);
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8"><p className="text-gray-600">Loading manuscript...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Manuscript</h1>
            <p className="text-gray-600">Update metadata, authors, keywords, and the working document before submission.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 text-sm">← Back to Dashboard</button>
        </div>

        {/* Editorial decision + reviewer feedback panel */}
        {(manuscript?.editorDecision || (Array.isArray(manuscript?.reviews) && manuscript.reviews.some((r: any) => r.submittedAt))) && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
              <h2 className="text-base font-semibold text-amber-900">Review Outcome</h2>
              <p className="text-xs text-amber-700 mt-0.5">Read all reviewer comments carefully before revising your manuscript.</p>
            </div>

            {manuscript?.editorDecision && (
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Editor Decision</p>
                <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${
                  manuscript.editorDecision === 'accept' ? 'bg-green-100 text-green-800' :
                  ['minor-revisions','major-revisions'].includes(manuscript.editorDecision) ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {String(manuscript.editorDecision).replace(/-/g, ' ')}
                </span>
                {manuscript.editorNotes && (
                  <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <span className="font-medium">Editor notes:</span> {manuscript.editorNotes}
                  </p>
                )}
                {manuscript.revisionRound > 1 && (
                  <p className="text-xs text-gray-500 mt-1">Revision round {manuscript.revisionRound}</p>
                )}
              </div>
            )}

            {Array.isArray(manuscript?.reviews) && manuscript.reviews.some((r: any) => r.submittedAt) && (
              <div className="divide-y divide-gray-100">
                {manuscript.reviews.filter((r: any) => r.submittedAt).map((r: any, i: number) => (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">Reviewer {i + 1}</span>
                      {r.score != null && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                          Score: {r.score}/5
                        </span>
                      )}
                      {r.recommendation && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          r.recommendation === 'accept' ? 'bg-green-100 text-green-700' :
                          r.recommendation === 'reject' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {String(r.recommendation).replace(/-/g, ' ')}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.feedback && (
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 whitespace-pre-line">
                        {r.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
              <textarea value={abstract} onChange={(event) => setAbstract(event.target.value)} rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
              <select value={discipline} onChange={(event) => setDiscipline(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select discipline</option>
                {disciplines.map((disciplineOption) => (
                  <option key={disciplineOption.value} value={disciplineOption.value}>{disciplineOption.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Methodology / Article Type</label>
              <select value={methodology} onChange={(event) => setMethodology(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select methodology</option>
                {methodologies.map((methodologyOption) => (
                  <option key={methodologyOption.value} value={methodologyOption.value}>{methodologyOption.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
              <input value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              {keywordsText.trim() ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {keywordsText.split(',').map((keyword) => keyword.trim()).filter(Boolean).map((keyword) => (
                    <span key={keyword} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{keyword}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Researchers / Authors</h2>
              <button type="button" onClick={addAuthor} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-100">Add Author</button>
            </div>
            <div className="space-y-4">
              {authors.map((author, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Author {index + 1}</span>
                    {authors.length > 1 ? (
                      <button type="button" onClick={() => removeAuthor(index)} className="text-sm text-red-600 hover:text-red-700">Remove</button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input value={author.name} onChange={(event) => updateAuthor(index, 'name', event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input value={author.email} onChange={(event) => updateAuthor(index, 'email', event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation / Institution</label>
                    <input value={author.affiliation} onChange={(event) => updateAuthor(index, 'affiliation', event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">Working Document</h2>
              <a
                href={manuscriptTemplateFile}
                download="TradMedInt_Manuscript_Template.docx"
                className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-100"
              >
                Download Journal Template (.docx)
              </a>
            </div>
            {manuscript?.workingDocument?.url ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-green-800">Working document available</p>
                  <p className="text-xs text-green-700">
                    {manuscript?.workingDocument?.uploadedAt ? `Uploaded ${new Date(manuscript.workingDocument.uploadedAt).toLocaleString()}` : 'Document uploaded'}
                  </p>
                </div>
                <a href={manuscript.workingDocument.url} target="_blank" rel="noreferrer" className="text-sm bg-green-100 text-green-800 px-3 py-1.5 rounded hover:bg-green-200">
                  View document
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No working document uploaded yet.</p>
            )}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <input
                type="file"
                accept="application/pdf,.doc,.docx"
                onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <button
                type="button"
                onClick={handleDocumentUpload}
                disabled={!documentFile || uploadingDocument}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploadingDocument ? 'Uploading...' : 'Upload document'}
              </button>
            </div>
            {documentFile ? <p className="text-sm text-indigo-700">Selected: {documentFile.name}</p> : null}
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-semibold text-gray-600 py-1">Export:</span>
              {(['pdf', 'docx', 'html', 'markdown'] as const).map((format) => (
                <button key={format} onClick={() => handleExport(format)} className="text-sm bg-gray-50 text-gray-700 px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-100">
                  {format === 'pdf' ? 'PDF' : format === 'docx' ? 'Word' : format === 'html' ? 'HTML' : 'MD'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {(manuscript?.status === 'draft' || manuscript?.status === 'revision-requested') ? (
                <button onClick={handleSubmit} disabled={publishing} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {publishing ? 'Submitting...' : 'Submit for Review'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}