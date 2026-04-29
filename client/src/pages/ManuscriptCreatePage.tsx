import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { manuscriptAPI } from '../services/api';

type JournalOption = { _id: string; title: string; isOpen?: boolean };
type ProjectOption = { _id: string; title: string };

type EntryPath = 'pdf' | 'structured' | 'clinical';

const defaultAuthor = { name: '', email: '', affiliation: '', orcid: '' };

const buildStructuredBody = (input: {
  objective: string;
  methods: string;
  findings: string;
  limitations: string;
}) => {
  return [
    '## Introduction',
    input.objective || 'Describe the background and motivation.',
    '',
    '## Methods',
    input.methods || 'Describe methodology, sample, and analysis workflow.',
    '',
    '## Results',
    input.findings || 'Summarize key findings and key figures.',
    '',
    '## Discussion',
    'Interpret findings and compare with prior literature.',
    '',
    '## Limitations',
    input.limitations || 'Describe design, sample, or measurement limitations.',
    '',
    '## Conclusion',
    'State main contribution and next steps.',
    '',
    '## References',
  ].join('\n');
};

const buildClinicalBody = (input: {
  condition: string;
  intervention: string;
  outcome: string;
  notes: string;
}) => {
  return [
    '## Introduction',
    `Clinical context for ${input.condition || 'the condition'} and rationale for the case report.`,
    '',
    '## Case Presentation',
    `Condition: ${input.condition || 'N/A'}\nIntervention: ${input.intervention || 'N/A'}`,
    '',
    '## Outcomes',
    input.outcome || 'Describe primary and secondary outcomes.',
    '',
    '## Discussion',
    input.notes || 'Clinical implications, differential interpretation, and evidence links.',
    '',
    '## Conclusion',
    'Summary of clinical relevance and follow-up recommendations.',
    '',
    '## References',
  ].join('\n');
};

export default function ManuscriptCreatePage() {
  const navigate = useNavigate();

  const [entryPath, setEntryPath] = useState<EntryPath>('pdf');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [journals, setJournals] = useState<JournalOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [journalId, setJournalId] = useState('');
  const [projectId, setProjectId] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [structuredInput, setStructuredInput] = useState({
    title: '',
    abstract: '',
    keywords: '',
    discipline: '',
    methodology: '',
    objective: '',
    methods: '',
    findings: '',
    limitations: '',
    authors: [{ ...defaultAuthor }],
  });

  const [clinicalInput, setClinicalInput] = useState({
    title: '',
    abstract: '',
    keywords: '',
    discipline: 'Medicine',
    methodology: 'case-study',
    condition: '',
    intervention: '',
    outcome: '',
    notes: '',
    authors: [{ ...defaultAuthor }],
  });

  const openJournals = useMemo(() => journals.filter((j) => j.isOpen !== false), [journals]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [journalResponse, projectResponse] = await Promise.all([
          apiClient.get('/journals/search', { params: { q: '', page: 1, limit: 100, isOpen: true } }),
          apiClient.get('/workspace/projects'),
        ]);

        setJournals(journalResponse.data?.journals || []);
        setProjects(projectResponse.data || []);
      } catch (error) {
        toast.error('Failed to load journals/projects');
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const ensureJournalSelected = () => {
    if (!journalId) {
      toast.error('Select a journal before creating a draft');
      return false;
    }
    return true;
  };

  const navigateToSubmission = (createdDraftId: string, selectedJournalId: string) => {
    navigate(`/journals/${selectedJournalId}/submit?draftId=${createdDraftId}`);
  };

  const handlePdfCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureJournalSelected()) return;
    if (!pdfFile) {
      toast.error('Upload a PDF file first');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('journalId', journalId);
      if (projectId) formData.append('projectId', projectId);

      const response = await apiClient.post('/manuscripts/drafts/from-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const draftId = response.data?.manuscript?._id;
      if (!draftId) throw new Error('Draft id missing from response');

      toast.success('Draft created from PDF. Review and submit next.');
      navigateToSubmission(draftId, journalId);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create PDF draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStructuredCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureJournalSelected()) return;

    setSubmitting(true);
    try {
      let generatedBody = buildStructuredBody(structuredInput);
      let generatedKeywords = structuredInput.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      let sectionHeadings: string[] = [];

      try {
        const aiResponse = await manuscriptAPI.generateStructuredDraft({
          title: structuredInput.title,
          abstract: structuredInput.abstract,
          discipline: structuredInput.discipline,
          methodology: structuredInput.methodology,
          objective: structuredInput.objective,
          methods: structuredInput.methods,
          findings: structuredInput.findings,
          limitations: structuredInput.limitations,
        });

        if (aiResponse?.draft?.body) {
          generatedBody = aiResponse.draft.body;
        }
        if (Array.isArray(aiResponse?.draft?.keywords) && aiResponse.draft.keywords.length > 0) {
          generatedKeywords = aiResponse.draft.keywords;
        }
        if (Array.isArray(aiResponse?.draft?.sectionHeadings)) {
          sectionHeadings = aiResponse.draft.sectionHeadings;
        }
      } catch {
        toast('AI draft generation unavailable, using template draft.', { icon: '⚠️' });
      }

      const payload = {
        journalId,
        projectId: projectId || undefined,
        sourcePath: 'ai_wizard',
        title: structuredInput.title,
        abstract: structuredInput.abstract,
        keywords: generatedKeywords,
        discipline: structuredInput.discipline,
        methodology: structuredInput.methodology,
        authors: structuredInput.authors,
        body: generatedBody,
        metadata: {
          extractionWarnings: ['Generated from structured input; verify every section before submission.'],
          sectionHeadings,
        },
      };

      const response = await apiClient.post('/manuscripts/drafts', payload);
      const draftId = response.data?.manuscript?._id;
      if (!draftId) throw new Error('Draft id missing from response');

      toast.success('Structured draft created. Review and submit next.');
      navigateToSubmission(draftId, journalId);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create structured draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClinicalCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureJournalSelected()) return;

    setSubmitting(true);
    try {
      let generatedBody = buildClinicalBody(clinicalInput);
      let generatedKeywords = clinicalInput.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      let sectionHeadings: string[] = ['Introduction', 'Case Presentation', 'Outcomes', 'Discussion', 'Conclusion', 'References'];

      try {
        const aiResponse = await manuscriptAPI.generateClinicalDraft({
          title: clinicalInput.title,
          abstract: clinicalInput.abstract,
          discipline: clinicalInput.discipline,
          methodology: clinicalInput.methodology,
          condition: clinicalInput.condition,
          intervention: clinicalInput.intervention,
          outcome: clinicalInput.outcome,
          notes: clinicalInput.notes,
        });

        if (aiResponse?.draft?.body) {
          generatedBody = aiResponse.draft.body;
        }
        if (Array.isArray(aiResponse?.draft?.keywords) && aiResponse.draft.keywords.length > 0) {
          generatedKeywords = aiResponse.draft.keywords;
        }
        if (Array.isArray(aiResponse?.draft?.sectionHeadings) && aiResponse.draft.sectionHeadings.length > 0) {
          sectionHeadings = aiResponse.draft.sectionHeadings;
        }
      } catch {
        toast('AI clinical drafting unavailable, using template draft.', { icon: '⚠️' });
      }

      const payload = {
        journalId,
        projectId: projectId || undefined,
        sourcePath: 'clinical_case',
        title: clinicalInput.title,
        abstract: clinicalInput.abstract,
        keywords: generatedKeywords,
        discipline: clinicalInput.discipline,
        methodology: clinicalInput.methodology,
        authors: clinicalInput.authors,
        body: generatedBody,
        metadata: {
          extractionWarnings: ['Generated from clinical case input; verify patient and intervention details.'],
          sectionHeadings,
        },
      };

      const response = await apiClient.post('/manuscripts/drafts', payload);
      const draftId = response.data?.manuscript?._id;
      if (!draftId) throw new Error('Draft id missing from response');

      toast.success('Clinical draft created. Review and submit next.');
      navigateToSubmission(draftId, journalId);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create clinical draft');
    } finally {
      setSubmitting(false);
    }
  };

  const updateAuthor = (
    scope: 'structured' | 'clinical',
    index: number,
    field: 'name' | 'email' | 'affiliation' | 'orcid',
    value: string
  ) => {
    if (scope === 'structured') {
      const nextAuthors = [...structuredInput.authors];
      nextAuthors[index][field] = value;
      setStructuredInput((prev) => ({ ...prev, authors: nextAuthors }));
      return;
    }

    const nextAuthors = [...clinicalInput.authors];
    nextAuthors[index][field] = value;
    setClinicalInput((prev) => ({ ...prev, authors: nextAuthors }));
  };

  if (loadingOptions) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Loading manuscript creation options...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Manuscript</h1>
          <p className="text-gray-600 mt-2">
            Choose one path, generate a draft, then review and submit.
          </p>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Journal *</label>
              <select
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select journal</option>
                {openJournals.map((journal) => (
                  <option key={journal._id} value={journal._id}>
                    {journal.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project (optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setEntryPath('pdf')}
            className={`p-4 rounded-lg border text-left ${
              entryPath === 'pdf' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="font-semibold text-gray-900">Upload Existing PDF</h3>
            <p className="text-sm text-gray-600 mt-1">Extract metadata and create a draft automatically.</p>
          </button>
          <button
            type="button"
            onClick={() => setEntryPath('structured')}
            className={`p-4 rounded-lg border text-left ${
              entryPath === 'structured' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="font-semibold text-gray-900">Generate from Structured Input</h3>
            <p className="text-sm text-gray-600 mt-1">Guide the system with objectives, methods, and findings.</p>
          </button>
          <button
            type="button"
            onClick={() => setEntryPath('clinical')}
            className={`p-4 rounded-lg border text-left ${
              entryPath === 'clinical' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
          >
            <h3 className="font-semibold text-gray-900">Generate from Clinical Cases</h3>
            <p className="text-sm text-gray-600 mt-1">Build a case-report draft from condition and intervention details.</p>
          </button>
        </div>

        {entryPath === 'pdf' && (
          <form onSubmit={handlePdfCreate} className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Path 1: Upload Existing PDF</h2>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating Draft...' : 'Create Draft From PDF'}
            </button>
          </form>
        )}

        {entryPath === 'structured' && (
          <form onSubmit={handleStructuredCreate} className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Path 2: Structured Input</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={structuredInput.title}
                onChange={(e) => setStructuredInput((p) => ({ ...p, title: e.target.value }))}
                placeholder="Manuscript title"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                value={structuredInput.keywords}
                onChange={(e) => setStructuredInput((p) => ({ ...p, keywords: e.target.value }))}
                placeholder="Keywords (comma separated)"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <textarea
              value={structuredInput.abstract}
              onChange={(e) => setStructuredInput((p) => ({ ...p, abstract: e.target.value }))}
              placeholder="Abstract"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={structuredInput.discipline}
                onChange={(e) => setStructuredInput((p) => ({ ...p, discipline: e.target.value }))}
                placeholder="Discipline"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                value={structuredInput.methodology}
                onChange={(e) => setStructuredInput((p) => ({ ...p, methodology: e.target.value }))}
                placeholder="Methodology"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <textarea
              value={structuredInput.objective}
              onChange={(e) => setStructuredInput((p) => ({ ...p, objective: e.target.value }))}
              placeholder="Objective"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <textarea
              value={structuredInput.methods}
              onChange={(e) => setStructuredInput((p) => ({ ...p, methods: e.target.value }))}
              placeholder="Methods summary"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <textarea
              value={structuredInput.findings}
              onChange={(e) => setStructuredInput((p) => ({ ...p, findings: e.target.value }))}
              placeholder="Main findings"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <textarea
              value={structuredInput.limitations}
              onChange={(e) => setStructuredInput((p) => ({ ...p, limitations: e.target.value }))}
              placeholder="Limitations"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Primary Author</p>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={structuredInput.authors[0].name}
                  onChange={(e) => updateAuthor('structured', 0, 'name', e.target.value)}
                  placeholder="Author name"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="email"
                  value={structuredInput.authors[0].email}
                  onChange={(e) => updateAuthor('structured', 0, 'email', e.target.value)}
                  placeholder="Author email"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating Draft...' : 'Create Structured Draft'}
            </button>
          </form>
        )}

        {entryPath === 'clinical' && (
          <form onSubmit={handleClinicalCreate} className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Path 3: Clinical Case Draft</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={clinicalInput.title}
                onChange={(e) => setClinicalInput((p) => ({ ...p, title: e.target.value }))}
                placeholder="Case report title"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                value={clinicalInput.keywords}
                onChange={(e) => setClinicalInput((p) => ({ ...p, keywords: e.target.value }))}
                placeholder="Keywords (comma separated)"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <textarea
              value={clinicalInput.abstract}
              onChange={(e) => setClinicalInput((p) => ({ ...p, abstract: e.target.value }))}
              placeholder="Case abstract"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <div className="grid md:grid-cols-3 gap-4">
              <input
                value={clinicalInput.condition}
                onChange={(e) => setClinicalInput((p) => ({ ...p, condition: e.target.value }))}
                placeholder="Condition"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                value={clinicalInput.intervention}
                onChange={(e) => setClinicalInput((p) => ({ ...p, intervention: e.target.value }))}
                placeholder="Intervention"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                value={clinicalInput.outcome}
                onChange={(e) => setClinicalInput((p) => ({ ...p, outcome: e.target.value }))}
                placeholder="Primary outcome"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <textarea
              value={clinicalInput.notes}
              onChange={(e) => setClinicalInput((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Clinical interpretation and notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Primary Author</p>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={clinicalInput.authors[0].name}
                  onChange={(e) => updateAuthor('clinical', 0, 'name', e.target.value)}
                  placeholder="Author name"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="email"
                  value={clinicalInput.authors[0].email}
                  onChange={(e) => updateAuthor('clinical', 0, 'email', e.target.value)}
                  placeholder="Author email"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating Draft...' : 'Create Clinical Draft'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
