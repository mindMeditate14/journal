import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { DISCIPLINES, METHODOLOGIES } from '../constants/manuscriptOptions';

type JournalOption = { _id: string; title: string; isOpen?: boolean };

export default function ManuscriptCreatePage() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState<JournalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [journalId, setJournalId] = useState('');
  const [journalSearch, setJournalSearch] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [body, setBody] = useState('');
  const [keywords, setKeywords] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [methodology, setMethodology] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorAffiliation, setAuthorAffiliation] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const filteredJournals = useMemo(() => {
    if (!journalSearch.trim()) return journals.filter(j => j.isOpen !== false);
    const search = journalSearch.toLowerCase();
    return journals.filter(j => 
      j.isOpen !== false && j.title.toLowerCase().includes(search)
    );
  }, [journals, journalSearch]);

  useEffect(() => {
    const loadJournals = async () => {
      try {
        const response = await apiClient.get('/journals/search', { 
          params: { q: '', page: 1, limit: 100, isOpen: true } 
        });
        setJournals(response.data?.journals || []);
      } catch (error) {
        toast.error('Failed to load journals');
      } finally {
        setLoading(false);
      }
    };
    loadJournals();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!journalId) {
      toast.error('Please select a target journal');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!abstract.trim()) {
      toast.error('Abstract is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        journalId,
        title: title.trim(),
        abstract: abstract.trim(),
        body: body.trim() || abstract.trim(),
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        discipline: discipline || 'General',
        methodology: methodology || 'external-submission',
        authors: [{
          name: authorName.trim() || 'Anonymous',
          email: authorEmail.trim() || '',
          affiliation: authorAffiliation.trim() || '',
        }],
      };

      const response = await apiClient.post('/manuscripts/drafts', payload);
      const draftId = response.data?.manuscript?._id;
      
      if (draftId) {
        // If PDF uploaded, upload it
        if (pdfFile) {
          const formData = new FormData();
          formData.append('document', pdfFile);
          await apiClient.post(`/manuscripts/${draftId}/working-document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        
        toast.success('Manuscript submitted successfully!');
        navigate(`/manuscripts/${draftId}/edit`);
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
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit New Manuscript</h1>
          <p className="text-gray-600 mb-8">Fill in the details below to submit your paper for review.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Target Journal */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Target Journal *</h2>
              <select
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
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

            {/* Paper Details */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Paper Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter paper title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abstract *</label>
                  <textarea
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    placeholder="Enter paper abstract (summary)"
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Paper Content</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Paste your full paper content here (or upload PDF below)"
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can paste the full text here or upload a PDF below</p>
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Classification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select discipline</option>
                    {DISCIPLINES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Methodology</label>
                  <select
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select methodology</option>
                    {METHODOLOGIES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Author Information */}
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Author Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation / Institution</label>
                <input
                  type="text"
                  value={authorAffiliation}
                  onChange={(e) => setAuthorAffiliation(e.target.value)}
                  placeholder="University or organization name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* PDF Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document (Optional)</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="application/pdf,.doc,.docx"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {pdfFile && (
                  <p className="mt-2 text-sm text-indigo-600">📄 {pdfFile.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">Upload PDF, DOC, or DOCX file</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white px-6 py-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}