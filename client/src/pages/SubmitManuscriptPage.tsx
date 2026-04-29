import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

type Author = {
  name: string;
  email: string;
  affiliation?: string;
  orcid?: string;
};

export function SubmitManuscriptPage() {
  const { journalId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const draftId = searchParams.get('draftId') || '';

  const [loading, setLoading] = useState(Boolean(draftId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    draftId,
    journalId: journalId || '',
    title: '',
    abstract: '',
    keywords: [] as string[],
    authors: [{ name: '', email: '', affiliation: '', orcid: '' }] as Author[],
    body: '',
    discipline: '',
    methodology: '',
    fundingStatement: '',
    conflictOfInterest: '',
    dataAvailability: '',
    completenessScore: 0,
    validationState: 'incomplete',
  });

  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId) return;

      setLoading(true);
      try {
        const response = await apiClient.get(`/manuscripts/${draftId}`);
        const draft = response.data;

        setFormData((prev) => ({
          ...prev,
          draftId,
          journalId: draft.journalId?._id || draft.journalId || prev.journalId,
          title: (draft.title || '').slice(0, 300),
          abstract: (draft.abstract || '').slice(0, 1000),
          keywords: Array.isArray(draft.keywords) ? draft.keywords : [],
          authors:
            Array.isArray(draft.authors) && draft.authors.length > 0
              ? draft.authors
              : [{ name: '', email: '', affiliation: '', orcid: '' }],
          body: draft.body || '',
          discipline: draft.discipline || '',
          methodology: draft.methodology || '',
          fundingStatement: draft.fundingStatement || '',
          conflictOfInterest: draft.conflictOfInterest || '',
          dataAvailability: draft.dataAvailability || '',
          completenessScore: Number(draft.completenessScore || 0),
          validationState: draft.validationState || 'incomplete',
        }));

        if ((draft.abstract || '').length > 1000) {
          toast('Draft abstract exceeded 1000 chars and was trimmed for submission readiness.', {
            icon: '⚠️',
          });
        }
      } catch (loadError: any) {
        setError(loadError?.response?.data?.error || 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [draftId]);

  const wordCount = useMemo(() => {
    if (!formData.body.trim()) return 0;
    return formData.body.trim().split(/\s+/).length;
  }, [formData.body]);

  const handleField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthorChange = (index: number, field: keyof Author, value: string) => {
    const nextAuthors = [...formData.authors];
    nextAuthors[index] = {
      ...nextAuthors[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, authors: nextAuthors }));
  };

  const addAuthor = () => {
    setFormData((prev) => ({
      ...prev,
      authors: [...prev.authors, { name: '', email: '', affiliation: '', orcid: '' }],
    }));
  };

  const removeAuthor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  const saveDraft = async () => {
    if (!draftId) return;

    try {
      await apiClient.patch(`/manuscripts/${draftId}`, {
        journalId: formData.journalId,
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        authors: formData.authors,
        body: formData.body,
        discipline: formData.discipline,
        methodology: formData.methodology,
        fundingStatement: formData.fundingStatement,
        conflictOfInterest: formData.conflictOfInterest,
        dataAvailability: formData.dataAvailability,
      });
      toast.success('Draft saved');
    } catch (saveError: any) {
      toast.error(saveError?.response?.data?.error || 'Failed to save draft');
    }
  };

  const validateSubmission = () => {
    const cleanTitle = formData.title.trim();
    const cleanAbstract = formData.abstract.trim();
    const cleanBody = formData.body.trim();

    if (!formData.journalId) {
      return 'Select a journal before submitting.';
    }

    if (cleanTitle.length < 10 || cleanTitle.length > 300) {
      return 'Title must be between 10 and 300 characters.';
    }

    if (cleanAbstract.length < 50 || cleanAbstract.length > 1000) {
      return 'Abstract must be between 50 and 1000 characters.';
    }

    if (!Array.isArray(formData.authors) || formData.authors.length === 0) {
      return 'At least one author is required.';
    }

    const hasInvalidAuthor = formData.authors.some((author) => !author.name?.trim() || !author.email?.trim());
    if (hasInvalidAuthor) {
      return 'Each author must include both name and email.';
    }

    if (!formData.discipline.trim()) {
      return 'Discipline is required.';
    }

    if (!formData.methodology.trim()) {
      return 'Methodology is required.';
    }

    if (cleanBody.length < 1000) {
      return `Manuscript body must be at least 1000 characters (current: ${cleanBody.length}).`;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateSubmission();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const journalResponse = await apiClient.get(`/journals/${formData.journalId}`);
      if (journalResponse.data?.isOpen === false) {
        const closedMessage = 'This journal is not accepting submissions right now.';
        setError(closedMessage);
        toast.error(closedMessage);
        setSubmitting(false);
        return;
      }

      const payload = {
        draftId: formData.draftId || undefined,
        journalId: formData.journalId,
        title: formData.title.trim(),
        abstract: formData.abstract.trim(),
        keywords: formData.keywords,
        authors: formData.authors,
        body: formData.body.trim(),
        discipline: formData.discipline.trim(),
        methodology: formData.methodology.trim(),
        fundingStatement: formData.fundingStatement,
        conflictOfInterest: formData.conflictOfInterest,
        dataAvailability: formData.dataAvailability,
      };

      await apiClient.post('/manuscripts', payload);
      toast.success('Manuscript submitted successfully');
      navigate('/dashboard?view=submissions');
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || 'Failed to submit manuscript');
      toast.error(submitError?.response?.data?.error || 'Failed to submit manuscript');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Loading draft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review and Submit Manuscript</h1>
        <p className="text-gray-600 mb-6">
          {formData.draftId
            ? 'This page is draft-aware. Review extracted/generated content before final submission.'
            : 'Fill all required fields and submit.'}
        </p>

        <div className="mb-6 flex gap-3">
          {[1, 2, 3].map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setStep(s)}
              className={`px-4 py-2 rounded-lg border ${
                step === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {s === 1 ? 'Metadata' : s === 2 ? 'Body' : 'Review'}
            </button>
          ))}
          {!!formData.draftId && (
            <button
              type="button"
              onClick={saveDraft}
              className="ml-auto px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50"
            >
              Save Draft
            </button>
          )}
        </div>

        {error && <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Journal ID *</label>
                  <input
                    value={formData.journalId}
                    onChange={(e) => handleField('journalId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Draft Quality</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                    Score: {formData.completenessScore}/100 | State: {formData.validationState}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={formData.title}
                  onChange={(e) => handleField('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  maxLength={300}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Abstract *</label>
                <textarea
                  value={formData.abstract}
                  onChange={(e) => handleField('abstract', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={5}
                  maxLength={1000}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discipline *</label>
                  <input
                    value={formData.discipline}
                    onChange={(e) => handleField('discipline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Methodology *</label>
                  <input
                    value={formData.methodology}
                    onChange={(e) => handleField('methodology', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  value={formData.keywords.join(', ')}
                  onChange={(e) =>
                    handleField(
                      'keywords',
                      e.target.value
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Authors *</p>
                {formData.authors.map((author, index) => (
                  <div key={index} className="grid md:grid-cols-2 gap-3 mb-3 p-3 rounded border border-gray-200">
                    <input
                      value={author.name}
                      onChange={(e) => handleAuthorChange(index, 'name', e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <input
                      type="email"
                      value={author.email}
                      onChange={(e) => handleAuthorChange(index, 'email', e.target.value)}
                      placeholder="Email"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                    <input
                      value={author.affiliation || ''}
                      onChange={(e) => handleAuthorChange(index, 'affiliation', e.target.value)}
                      placeholder="Affiliation"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      value={author.orcid || ''}
                      onChange={(e) => handleAuthorChange(index, 'orcid', e.target.value)}
                      placeholder="ORCID"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.authors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove Author
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addAuthor} className="text-sm text-indigo-700 hover:text-indigo-800">
                  + Add Author
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manuscript Body *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => handleField('body', e.target.value)}
                  rows={18}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">Word count: {wordCount}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <textarea
                  value={formData.fundingStatement}
                  onChange={(e) => handleField('fundingStatement', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Funding statement"
                />
                <textarea
                  value={formData.conflictOfInterest}
                  onChange={(e) => handleField('conflictOfInterest', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Conflict of interest"
                />
                <textarea
                  value={formData.dataAvailability}
                  onChange={(e) => handleField('dataAvailability', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Data availability"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Final Review</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Journal:</strong> {formData.journalId}</p>
                <p><strong>Discipline:</strong> {formData.discipline}</p>
                <p><strong>Methodology:</strong> {formData.methodology}</p>
                <p><strong>Authors:</strong> {formData.authors.map((a) => a.name).filter(Boolean).join(', ')}</p>
                <p><strong>Keywords:</strong> {formData.keywords.join(', ') || 'None'}</p>
                <p><strong>Word count:</strong> {wordCount}</p>
              </div>
              <div className="space-y-2 p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-800">
                <p>Confirm all metadata and manuscript content are accurate.</p>
                <p>Submission will move this draft to editorial workflow.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
