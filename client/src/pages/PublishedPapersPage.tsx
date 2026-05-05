import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { paperAPI } from '../services/api';
import { Paper } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../utils/authStore';
import MisaaLogo from '../assets/logo.png';

export default function PublishedPapersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isGuest = !user;

  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const loadPapers = async (targetPage = 1, targetQuery = query) => {
    setLoading(true);
    try {
      const data = await paperAPI.search(targetQuery, {}, targetPage, limit);
      setPapers(Array.isArray(data.papers) ? data.papers : []);
      setTotal(Number(data.total) || 0);
      setPage(Number(data.page) || targetPage);
    } catch (error) {
      toast.error('Unable to load published papers');
      setPapers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers(1, '');
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadPapers(1, query.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public nav header shown only when not logged in */}
      {isGuest && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-lg font-bold text-indigo-700">NexusJournal</span>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Register
              </Link>
            </div>
          </div>
        </header>
      )}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Published Papers</h1>
          <p className="text-gray-600 mt-2">Browse indexed literature and open a paper detail view.</p>
        </div>

        <form onSubmit={onSearch} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, abstract, keyword, author..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-600">Loading papers...</div>
        ) : papers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900">No papers found</h2>
            <p className="text-gray-600 mt-2">Try another keyword or clear filters.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{total} article{total !== 1 ? 's' : ''} found</p>
            <div className="flex flex-col gap-0 divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
              {papers.map((paper) => (
                <article
                  key={paper._id}
                  className="bg-white px-6 py-5 hover:bg-indigo-50/40 transition-colors"
                >
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      Original Research
                    </span>
                    {paper.isOpenAccess && (
                      <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Open Access
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2
                    className="text-base font-semibold text-gray-900 leading-snug cursor-pointer hover:text-indigo-700 mb-1"
                    onClick={() => navigate(`/papers/${paper._id}`)}
                  >
                    {paper.title}
                  </h2>

                  {/* Authors */}
                  {paper.authors?.length > 0 && (
                    <p className="text-sm text-gray-600 mb-1">
                      {paper.authors.map((a) => a.name).join(', ')}
                    </p>
                  )}

                  {/* Journal + Year + DOI */}
                  <p className="text-xs text-gray-400 mb-2">
                    <span className="font-medium text-gray-500">{paper.journal?.name || 'NexusJournal'}</span>
                    {paper.publicationYear ? ` • ${paper.publicationYear}` : ''}
                    {paper.doi && (
                      <> • <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        DOI: {paper.doi}
                      </a></>
                    )}
                  </p>

                  {/* Keywords */}
                  {paper.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {paper.keywords.slice(0, 5).map((kw, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Abstract snippet */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {paper.abstract || 'No abstract available.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate(`/papers/${paper._id}`)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Read Article →
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => loadPapers(page - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => loadPapers(page + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Partner Section */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Official Partner</p>
          <div className="flex flex-col md:flex-row items-center gap-8 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-2xl p-8 shadow-sm">
            <a href="https://misaa.my" target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <img
                src={MisaaLogo}
                alt="MISAA — Malaysian Indian Siddha Ayurveda Association"
                className="h-24 w-auto object-contain"
              />
            </a>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Malaysian Indian Siddha Ayurveda Association
                <span className="ml-2 text-indigo-600">(MISAA)</span>
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                MISAA is Malaysia's leading body for preserving, promoting, and advancing the practice of Ayurveda and Siddha medicine.
                Dedicated to education, research, and authentic practice of Traditional Indian Medicine (TIM), MISAA bridges
                ancient healing wisdom with modern healthcare — partnering with government agencies, NGOs, and practitioners
                across Malaysia and Southeast Asia.
              </p>
              <a
                href="https://misaa.my"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Visit misaa.my →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}