import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { DISCIPLINES, METHODOLOGIES } from '../constants/manuscriptOptions';

export default function PublishedPapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJournal, setFilterJournal] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterMethodology, setFilterMethodology] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [papersRes, journalsRes] = await Promise.all([
          apiClient.get('/manuscripts/published', { params: { limit: 100 } }),
          apiClient.get('/journals', { params: { limit: 100 } })
        ]);
        setPapers(papersRes.data?.manuscripts || []);
        setJournals(journalsRes.data?.journals || []);
      } catch (error) {
        console.error('Failed to load papers', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPapers = papers.filter(paper => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      paper.title?.toLowerCase().includes(searchLower) ||
      paper.abstract?.toLowerCase().includes(searchLower) ||
      paper.keywords?.some((k: string) => k.toLowerCase().includes(searchLower));
    
    const matchesJournal = !filterJournal || paper.journalId?._id === filterJournal;
    const matchesDiscipline = !filterDiscipline || paper.discipline === filterDiscipline;
    const matchesMethodology = !filterMethodology || paper.methodology === filterMethodology;

    return matchesSearch && matchesJournal && matchesDiscipline && matchesMethodology;
  });

  const clearFilters = () => {
    setSearch('');
    setFilterJournal('');
    setFilterDiscipline('');
    setFilterMethodology('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading research papers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-700 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Published Research</h1>
          <p className="text-indigo-200 text-lg">Discover peer-reviewed research from our journals</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              
              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Title, keyword..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Journal Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal</label>
                <select
                  value={filterJournal}
                  onChange={(e) => setFilterJournal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Journals</option>
                  {journals.map(j => (
                    <option key={j._id} value={j._id}>{j.title}</option>
                  ))}
                </select>
              </div>

              {/* Discipline Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                <select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Disciplines</option>
                  {DISCIPLINES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Methodology Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Methodology</label>
                <select
                  value={filterMethodology}
                  onChange={(e) => setFilterMethodology(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Methodologies</option>
                  {METHODOLOGIES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="w-full text-sm text-indigo-600 hover:text-indigo-800"
              >
                Clear all filters
              </button>

              <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                {filteredPapers.length} papers found
              </div>
            </div>
          </div>

          {/* Papers Grid */}
          <div className="flex-1">
            {filteredPapers.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">No papers match your filters.</p>
                <button onClick={clearFilters} className="mt-4 text-indigo-600 hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPapers.map(paper => (
                  <div key={paper._id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link 
                          to={`/papers/${paper._id}`}
                          className="text-xl font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {paper.title}
                        </Link>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {paper.journalId?.title && (
                            <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              {paper.journalId.title}
                            </span>
                          )}
                          {paper.discipline && (
                            <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {paper.discipline}
                            </span>
                          )}
                          {paper.methodology && (
                            <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {paper.methodology.replace('-', ' ')}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mt-3 line-clamp-3">
                          {paper.abstract}
                        </p>

                        {paper.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {paper.keywords.slice(0, 5).map((kw: string, i: number) => (
                              <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded">
                                {kw}
                              </span>
                            ))}
                            {paper.keywords.length > 5 && (
                              <span className="text-xs text-gray-400">+{paper.keywords.length - 5} more</span>
                            )}
                          </div>
                        )}

                        {paper.authors?.[0] && (
                          <p className="text-sm text-gray-500 mt-3">
                            By: {paper.authors.map((a: any) => a.name).join(', ')}
                          </p>
                        )}
                      </div>

                      <Link 
                        to={`/papers/${paper._id}`}
                        className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-shrink-0"
                      >
                        Read More
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}