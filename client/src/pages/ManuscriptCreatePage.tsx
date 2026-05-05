import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { DISCIPLINES, METHODOLOGIES } from '../constants/manuscriptOptions';
import manuscriptTemplateFile from '../assets/Template.docx?url';

type JournalOption = { _id: string; title: string; isOpen?: boolean };
type AuthorInput = { name: string; email: string; affiliation: string };

const EMPTY_AUTHOR: AuthorInput = { name: '', email: '', affiliation: '' };

export default function ManuscriptCreatePage() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState<JournalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [journalId, setJournalId] = useState('');
  const [journalSearch, setJournalSearch] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [body, setBody] = useState('');
  const [keywords, setKeywords] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [methodology, setMethodology] = useState('');
  const [authors, setAuthors] = useState<AuthorInput[]>([{ ...EMPTY_AUTHOR }]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const filteredJournals = useMemo(() => {
    const openJournals = journals.filter((journal) => journal.isOpen !== false);
    if (!journalSearch.trim()) {
      return openJournals;
    }

    const search = journalSearch.toLowerCase();
    return openJournals.filter((journal) => journal.title.toLowerCase().includes(search));
  }, [journals, journalSearch]);

  useEffect(() => {
    const loadJournals = async () => {
      try {
        const response = await apiClient.get('/journals/search', {
          params: { q: '', page: 1, limit: 100, isOpen: true },
        });
        setJournals(response.data?.journals || []);
      } catch {
        toast.error('Failed to load journals');
      } finally {
        setLoading(false);
      }
    };

    loadJournals();
  }, []);

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

  const createPayload = () => {
    const normalizedAuthors = authors
      .map((author) => ({
        name: author.name.trim(),
        email: author.email.trim(),
        affiliation: author.affiliation.trim(),
      }))
      .filter((author) => author.name || author.email || author.affiliation);

    return {
      journalId,
      title: title.trim(),
      abstract: abstract.trim(),
      body: body.trim() || abstract.trim(),
      keywords: keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      discipline: discipline || 'General',
      methodology: methodology || 'external-submission',
      authors: normalizedAuthors.length > 0 ? normalizedAuthors : [{ name: 'Anonymous', email: '', affiliation: '' }],
    };
  };

  const createManuscript = async () => {
    if (!journalId) {
      toast.error('Please select a target journal');
      return null;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return null;
    }
    if (!abstract.trim()) {
      toast.error('Abstract is required');
      return null;
    }

    try {
      const response = await apiClient.post('/manuscripts/drafts', createPayload());
      const draftId = response.data?.manuscript?._id;

      if (draftId && documentFile) {
        const formData = new FormData();
        formData.append('document', documentFile);
        await apiClient.post(`/manuscripts/${draftId}/working-document`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return draftId;
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create manuscript');
      return null;
    }
  };

  const handleSaveDraft = async (event: FormEvent) => {
    event.preventDefault();
    setSavingDraft(true);
    try {
      const draftId = await createManuscript();
      if (draftId) {
        toast.success('Draft saved');
        navigate('/dashboard');
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const draftId = await createManuscript();
      if (draftId) {
        await apiClient.post('/manuscripts', { draftId });
        toast.success('Manuscript submitted for review');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to submit manuscript');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Submit New Manuscript</h1>
          <p className="text-gray-600 mb-4">Save a draft if the paper is incomplete, or submit immediately when it is ready for editorial review.</p>

          {/* Step indicator */}
          <div className="flex items-center gap-0 mb-8 overflow-x-auto">
            {['Target Journal', 'Paper Details', 'Classification', 'Authors', 'Document'].map((step, i, arr) => (
              <div key={step} className="flex items-center shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">{i + 1}</span>
                  <span className="text-xs font-medium text-indigo-700 whitespace-nowrap">{step}</span>
                </div>
                {i < arr.length - 1 && <div className="w-6 h-px bg-gray-300 mx-1" />}
              </div>
            ))}
          </div>

          {/* Template download */}
          <div className="flex items-center gap-3 mb-8 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-amber-700 text-sm font-medium">Manuscript template available:</span>
            <a
              href={manuscriptTemplateFile}
              download="NexusJournal-Manuscript-Template.docx"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline"
            >
              Download Template (.docx)
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Target Journal</h2>
              <input
                type="text"
                value={journalSearch}
                onChange={(event) => setJournalSearch(event.target.value)}
                placeholder="Filter journals by title"
                className="w-full px-4 py-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={journalId}
                onChange={(event) => setJournalId(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select a journal --</option>
                {filteredJournals.map((journal) => (
                  <option key={journal._id} value={journal._id}>
                    {journal.title}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-2">{filteredJournals.length} journals available</p>
            </div>

            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Paper Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Enter paper title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
                  <textarea
                    value={abstract}
                    onChange={(event) => setAbstract(event.target.value)}
                    placeholder="Enter paper abstract"
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Paper Content</label>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Paste your manuscript body here if you are not uploading a working document"
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Classification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                  <select
                    value={discipline}
                    onChange={(event) => setDiscipline(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select discipline</option>
                    {DISCIPLINES.map((disciplineOption) => (
                      <option key={disciplineOption.value} value={disciplineOption.value}>
                        {disciplineOption.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Methodology</label>
                  <select
                    value={methodology}
                    onChange={(event) => setMethodology(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select methodology</option>
                    {METHODOLOGIES.map((methodologyOption) => (
                      <option key={methodologyOption.value} value={methodologyOption.value}>
                        {methodologyOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                {keywords.trim() ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean).map((keyword) => (
                      <span key={keyword} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-b pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">4. Researchers / Authors</h2>
                <button
                  type="button"
                  onClick={addAuthor}
                  className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-100"
                >
                  Add Author
                </button>
              </div>
              <div className="space-y-4">
                {authors.map((author, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Author {index + 1}</span>
                      {authors.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeAuthor(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={author.name}
                          onChange={(event) => updateAuthor(index, 'name', event.target.value)}
                          placeholder="Full name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={author.email}
                          onChange={(event) => updateAuthor(index, 'email', event.target.value)}
                          placeholder="author@email.com"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation / Institution</label>
                      <input
                        type="text"
                        value={author.affiliation}
                        onChange={(event) => updateAuthor(index, 'affiliation', event.target.value)}
                        placeholder="University or organization name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b pb-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">5. Working Document</h2>
                <a
                  href={manuscriptTemplateFile}
                  download="NexusJournal_Manuscript_Template.docx"
                  className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-100"
                >
                  Download Journal Template (.docx)
                </a>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="application/pdf,.doc,.docx"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {documentFile ? <p className="mt-3 text-sm text-indigo-700">Selected: {documentFile.name}</p> : null}
                <p className="text-xs text-gray-500 mt-2">Upload a PDF, DOC, or DOCX file to preserve the full manuscript document.</p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || submitting}
                className="flex-1 bg-gray-700 text-white px-6 py-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-semibold text-lg"
              >
                {savingDraft ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                disabled={savingDraft || submitting}
                className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-lg"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}