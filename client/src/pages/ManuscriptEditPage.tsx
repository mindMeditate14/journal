import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { manuscriptAPI } from '../services/api';
import { useAuthStore } from '../utils/authStore';
import { ManuscriptExporter } from '../utils/manuscriptExporter';

type SectionKey = 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'references';

const SECTION_ORDER: SectionKey[] = ['introduction', 'methods', 'results', 'discussion', 'conclusion', 'references'];
const SECTION_LABELS: Record<SectionKey, string> = {
  introduction: 'Introduction', methods: 'Methods', results: 'Results',
  discussion: 'Discussion', conclusion: 'Conclusion', references: 'References',
};

export default function ManuscriptEditPage() {
  const { manuscriptId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sectionBusy, setSectionBusy] = useState<Record<SectionKey, boolean>>(
    Object.fromEntries(SECTION_ORDER.map((k) => [k, false])) as Record<SectionKey, boolean>
  );

  const [manuscript, setManuscript] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [journalId, setJournalId] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [methodology, setMethodology] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [sections, setSections] = useState<Record<SectionKey, string>>(
    Object.fromEntries(SECTION_ORDER.map((k) => [k, ''])) as Record<SectionKey, string>
  );
  const [journals, setJournals] = useState<any[]>([]);

  useEffect(() => {
    if (!manuscriptId) { navigate('/dashboard'); return; }
    const load = async () => {
      try {
        const [msResp, jResp] = await Promise.all([
          apiClient.get(`/manuscripts/${manuscriptId}`),
          apiClient.get('/journals/search', { params: { q: '', page: 1, limit: 100, isOpen: true } }),
        ]);
        const ms = msResp.data;
        setManuscript(ms);
        setTitle(ms.title || '');
        setAbstract(ms.abstract || '');
        setJournalId(ms.journalId?._id || ms.journalId || '');
        setDiscipline(ms.discipline || '');
        setMethodology(ms.methodology || '');
        setKeywordsText(Array.isArray(ms.keywords) ? ms.keywords.join(', ') : (ms.keywords || ''));
        setJournals(jResp.data?.journals || []);

        // Parse body into sections
        if (ms.body) {
          const pattern = /^##\s+(\w+)\s*\n\n([\s\S]*?)(?=\n\n## |$)/gm;
          let match;
          const parsed: Partial<Record<SectionKey, string>> = {};
          while ((match = pattern.exec(ms.body)) !== null) {
            const key = match[1].toLowerCase() as SectionKey;
            if (key in SECTION_LABELS) parsed[key] = match[2].trim();
          }
          setSections((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.error || 'Failed to load manuscript');
        navigate('/dashboard');
      } finally { setLoading(false); }
    };
    load();
  }, [manuscriptId, navigate]);

  const generateSection = async (key: SectionKey) => {
    try {
      setSectionBusy((p) => ({ ...p, [key]: true }));
      const response = await manuscriptAPI.generateSection({
        sectionType: key, title, abstract, methodology, sourcePath: manuscript?.sourcePath || 'manual',
        keyPoints: [], context: '',
      });
      const content = response?.section?.content || '';
      if (!content) { toast.error(`No content generated for ${SECTION_LABELS[key]}`); return; }
      setSections((p) => ({ ...p, [key]: content }));
      toast.success(`${SECTION_LABELS[key]} generated`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || `Failed to generate ${SECTION_LABELS[key]}`);
    } finally { setSectionBusy((p) => ({ ...p, [key]: false })); }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    const body = SECTION_ORDER.map((k) => `## ${SECTION_LABELS[k]}\n\n${sections[k] || ''}`).join('\n\n');
    const keywords = keywordsText.split(',').map((k) => k.trim()).filter(Boolean);

    setSaving(true);
    try {
      await manuscriptAPI.update(manuscriptId!, {
        title: title.trim(), abstract: abstract.trim(), body, keywords,
        discipline, methodology, journalId: journalId || undefined,
      });
      toast.success('Manuscript saved');
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!journalId) { toast.error('Select a journal before submitting'); return; }
    if (!abstract.trim()) { toast.error('Abstract is required'); return; }
    await handleSave();
    setPublishing(true);
    try {
      await apiClient.post(`/manuscripts/${manuscriptId}/submit`);
      toast.success('Manuscript submitted!');
      navigate('/dashboard');
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Submit failed'); }
    finally { setPublishing(false); }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html' | 'markdown') => {
    const baseName = title.replace(/\s+/g, '_').toLowerCase().substring(0, 50) || 'manuscript';
    const keywords = keywordsText.split(',').map((k) => k.trim()).filter(Boolean);
    const exportData = { title, abstract, sections, keywords, studyType: manuscript?.studyType, discipline, methodology,
      authors: [{ name: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || user?.email || 'Author', affiliation: user?.profile?.affiliation || '', email: user?.email || '' }],
    };
    try {
      if (format === 'pdf') await ManuscriptExporter.exportPDF(exportData, `${baseName}.pdf`);
      else if (format === 'docx') ManuscriptExporter.exportDOCX(exportData, `${baseName}.doc`);
      else if (format === 'html') await ManuscriptExporter.exportHTML(exportData, `${baseName}.html`);
      else ManuscriptExporter.exportMarkdown(exportData, `${baseName}.md`);
      toast.success(`${format.toUpperCase()} exported`);
    } catch { toast.error('Export failed'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-8"><p className="text-gray-600">Loading manuscript...</p></div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Manuscript</h1>
            <p className="text-gray-600">Review, edit, and submit your manuscript</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 text-sm">← Back to Dashboard</button>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Manuscript Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
              <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Journal</label>
              <select value={journalId} onChange={(e) => setJournalId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select journal</option>
                {journals.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
              <input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
              <input value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Methodology</label>
              <input value={methodology} onChange={(e) => setMethodology(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm font-semibold text-gray-600 mr-1 py-1">Export:</span>
              {(['pdf', 'docx', 'html', 'markdown'] as const).map((fmt) => (
                <button key={fmt} onClick={() => handleExport(fmt)}
                  className="text-sm bg-gray-50 text-gray-700 px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-100">
                  {fmt === 'pdf' ? 'PDF' : fmt === 'docx' ? 'Word' : fmt === 'html' ? 'HTML' : 'MD'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {(manuscript?.status === 'draft' || manuscript?.status === 'revision-requested') && (
                <button onClick={handleSubmit} disabled={publishing} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {publishing ? 'Submitting...' : 'Submit for Review'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {SECTION_ORDER.map((key) => (
              <section key={key} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{SECTION_LABELS[key]}</h3>
                  <button onClick={() => generateSection(key)} disabled={sectionBusy[key]}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
                    {sectionBusy[key] ? 'Generating...' : `Generate ${SECTION_LABELS[key]}`}
                  </button>
                </div>
                <textarea value={sections[key]} onChange={(e) => setSections((p) => ({ ...p, [key]: e.target.value }))}
                  rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  placeholder={`Write or generate ${SECTION_LABELS[key]}...`} />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}