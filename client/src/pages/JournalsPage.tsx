import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

export interface Journal {
  _id: string;
  title: string;
  issn?: string;
  publisher?: string;
  url?: string;
  isOpen?: boolean;
  journal?: {
    publisher?: string;
    url?: string;
  };
  createdAt: string;
}

export default function JournalsPage() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newJournal, setNewJournal] = useState({
    title: '',
    issn: '',
    publisher: '',
    url: '',
  });

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      const response = await apiClient.get('/journals/search?q=&page=1&limit=50');
      setJournals(response.data?.journals || response.data?.items || response.data || []);
    } catch (error) {
      toast.error('Failed to load journals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournal.title.trim()) {
      toast.error('Journal title is required');
      return;
    }

    try {
      await apiClient.post('/journals', {
        title: newJournal.title,
        issn: newJournal.issn || undefined,
        publisher: newJournal.publisher || undefined,
        url: newJournal.url || undefined,
      });

      toast.success('Journal created and now visible in the list.');
      setNewJournal({ title: '', issn: '', publisher: '', url: '' });
      setShowCreate(false);
      fetchJournals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create journal');
    }
  };

  const handleSubmitToJournal = (journalId: string) => {
    navigate(`/journals/${journalId}/submit`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Journals</h1>
            <p className="text-gray-600 mt-2">Manage journals and open manuscript workflows</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manuscripts/create')}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              Create Manuscript
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              {showCreate ? 'Cancel' : 'Create Journal'}
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Journal</h2>
            <form onSubmit={handleCreateJournal}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Journal Title *
                  </label>
                  <input
                    type="text"
                    value={newJournal.title}
                    onChange={(e) => setNewJournal({ ...newJournal, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Nature Medicine"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISSN (optional)
                  </label>
                  <input
                    type="text"
                    value={newJournal.issn}
                    onChange={(e) => setNewJournal({ ...newJournal, issn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 1078-8956"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publisher (optional)
                  </label>
                  <input
                    type="text"
                    value={newJournal.publisher}
                    onChange={(e) => setNewJournal({ ...newJournal, publisher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Nature Publishing Group"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website (optional)
                  </label>
                  <input
                    type="url"
                    value={newJournal.url}
                    onChange={(e) => setNewJournal({ ...newJournal, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Create Journal
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading journals...</p>
          </div>
        ) : journals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No journals found yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create the first journal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journals.map((journal) => (
              <div key={journal._id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{journal.title}</h3>
                {journal.issn && (
                  <p className="text-sm text-gray-600 mb-1">ISSN: {journal.issn}</p>
                )}
                {(journal.publisher || journal.journal?.publisher) && (
                  <p className="text-sm text-gray-600 mb-1">Publisher: {journal.publisher || journal.journal?.publisher}</p>
                )}
                <p className="text-xs text-gray-500 mb-3">
                  {journal.isOpen === false ? 'Closed for submissions' : 'Open for submissions'}
                </p>
                <button
                  onClick={() => handleSubmitToJournal(journal._id)}
                  disabled={journal.isOpen === false}
                  className="w-full mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  {journal.isOpen === false ? 'Submissions Closed' : 'Submit Manuscript'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
