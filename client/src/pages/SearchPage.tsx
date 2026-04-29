import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ingestAPI, paperAPI } from '../services/api';
import { IngestRun, Paper } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../utils/authStore';

export default function SearchPage() {
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestQuery, setIngestQuery] = useState('ayurveda');
  const [ingestPerPage, setIngestPerPage] = useState(10);
  const [ingestPages, setIngestPages] = useState(3);
  const [includeReferencedWorks, setIncludeReferencedWorks] = useState(true);
  const [maxReferencedPerWork, setMaxReferencedPerWork] = useState(5);
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string>('');
  const [ingestRuns, setIngestRuns] = useState<IngestRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const runSearch = async (targetPage = 1) => {
    setLoading(true);
    setHasSearched(true);

    try {
      const data = await paperAPI.search(
        query,
        {
          yearFrom: yearFrom ? Number(yearFrom) : undefined,
          yearTo: yearTo ? Number(yearTo) : undefined,
          openAccess: openAccessOnly || undefined,
          source: source || undefined,
        },
        targetPage,
        limit
      );

      setResults(data.papers);
      setTotal(data.total);
      setPage(data.page);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(1);
  };

  const handleIngest = async () => {
    if (ingesting) return;
    setIngesting(true);
    setIngestStatus('Starting ingest...');
    try {
      const data = await ingestAPI.openAlexBatch({
        query: ingestQuery || 'ayurveda',
        page: 1,
        perPage: ingestPerPage,
        pages: ingestPages,
        includeReferencedWorks,
        maxReferencedPerWork,
      });

      setIngestStatus(
        `Done. pages=${data.pagesProcessed}/${data.pagesRequested}, upserted=${data.upserted}, modified=${data.modified}, refInserted=${data.referencedInserted || 0}, refUpdated=${data.referencedUpdated || 0}`
      );
      toast.success('Ingest batch completed');
      await loadIngestRuns();
      await runSearch(1);
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Ingest failed';
      setIngestStatus(msg);
      toast.error(msg);
    } finally {
      setIngesting(false);
    }
  };

  const loadIngestRuns = async () => {
    if (user?.role !== 'admin') return;

    setLoadingRuns(true);
    try {
      const runs = await ingestAPI.getRuns('openalex', 12);
      setIngestRuns(runs);
    } catch (error) {
      toast.error('Failed to load ingest history');
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleRetryRun = async (runId: string) => {
    if (retryingRunId) return;
    setRetryingRunId(runId);
    try {
      const data = await ingestAPI.retryRun(runId);
      toast.success(`Retry succeeded — ingested ${data.ingested ?? 0}`);
      await loadIngestRuns();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Retry failed');
    } finally {
      setRetryingRunId(null);
    }
  };

  useEffect(() => {
    runSearch(1);
  }, [limit]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadIngestRuns();
    }
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Search Papers</h1>
        <p className="text-gray-600 mb-8">
          Discover scholarly articles across indexed sources.
        </p>

        {user?.role === 'admin' && (
          <div className="mb-8 bg-white rounded-lg shadow p-4 border border-indigo-100">
            <h2 className="text-lg font-semibold text-gray-900">Admin Ingest (OpenAlex)</h2>
            <p className="text-sm text-gray-600 mt-1">Trigger a source batch import and review recent run history.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3">
              <input
                type="text"
                value={ingestQuery}
                onChange={(e) => setIngestQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ingest query"
              />
              <input
                type="number"
                min={1}
                max={50}
                value={ingestPerPage}
                onChange={(e) => setIngestPerPage(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Per page"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={ingestPages}
                onChange={(e) => setIngestPages(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Pages"
              />
              <input
                type="number"
                min={1}
                max={20}
                value={maxReferencedPerWork}
                onChange={(e) =>
                  setMaxReferencedPerWork(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Refs/work"
              />
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeReferencedWorks}
                  onChange={(e) => setIncludeReferencedWorks(e.target.checked)}
                />
                Ingest references
              </label>
              <button
                type="button"
                onClick={handleIngest}
                disabled={ingesting}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {ingesting ? 'Ingesting...' : 'Run Ingest Batch'}
              </button>
              <div className="text-sm text-gray-600 flex items-center md:col-span-6">{ingestStatus || 'Idle'}</div>
            </div>

            <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-800 flex items-center justify-between">
                <span>Recent Ingest Runs</span>
                <button
                  type="button"
                  onClick={loadIngestRuns}
                  disabled={loadingRuns}
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                >
                  {loadingRuns ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">When</th>
                      <th className="text-left px-3 py-2">Query</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Pages</th>
                      <th className="text-left px-3 py-2">Ingested</th>
                      <th className="text-left px-3 py-2">Refs +</th>
                      <th className="text-left px-3 py-2">Refs upd</th>
                      <th className="text-left px-3 py-2">Duration</th>
                      <th className="text-left px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingestRuns.map((run) => (
                      <tr key={run._id} className="border-t border-gray-100">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">{run.query || '-'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              run.status === 'success'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                            title={run.errorMessage || ''}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {run.result.pagesProcessed}/{run.result.pagesRequested}
                        </td>
                        <td className="px-3 py-2">{run.result.ingested}</td>
                        <td className="px-3 py-2">{run.result.referencedInserted}</td>
                        <td className="px-3 py-2">{run.result.referencedUpdated}</td>
                        <td className="px-3 py-2">{Math.round((run.durationMs || 0) / 1000)}s</td>
                        <td className="px-3 py-2">
                          {run.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => handleRetryRun(run._id)}
                              disabled={retryingRunId === run._id}
                              className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50"
                            >
                              {retryingRunId === run._id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!loadingRuns && ingestRuns.length === 0 && (
                      <tr>
                        <td className="px-3 py-3 text-gray-500" colSpan={9}>
                          No ingest history yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSearch} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, topic, author, keyword..."
              className="md:col-span-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="Year from"
              className="px-3 py-3 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder="Year to"
              className="px-3 py-3 border border-gray-300 rounded-lg"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg"
            >
              <option value="">Any source</option>
              <option value="openalex">OpenAlex</option>
              <option value="crossref">Crossref</option>
              <option value="pubmed">PubMed</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(e) => setOpenAccessOnly(e.target.checked)}
              />
              Open access only
            </label>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setYearFrom('');
                setYearTo('');
                setOpenAccessOnly(false);
                setSource('');
                runSearch(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset Filters
            </button>

            <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
              <span>Per page</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>
          </div>
        </form>

        <div className="mb-4 text-sm text-gray-600">
          {loading ? 'Loading results...' : `Found ${total} result${total === 1 ? '' : 's'}`}
        </div>

        <div className="space-y-4">
          {results.map((paper) => (
            <div
              key={paper._id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition"
              onClick={() => navigate(`/papers/${paper._id}`)}
            >
              <h3 className="text-lg font-semibold text-gray-900">{paper.title}</h3>
              <p className="text-gray-600 mt-2 line-clamp-2">{paper.abstract || 'No abstract available.'}</p>
              <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <span>👤 {paper.authors?.[0]?.name || 'Unknown'}</span>
                <span>📖 {paper.journal?.name || 'Unknown journal'}</span>
                <span>📅 {paper.publicationYear || 'N/A'}</span>
                <span>🔎 {paper.citationsCount || 0} citations</span>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {(paper.keywords || paper.topics || []).slice(0, 4).map((kw: string) => (
                  <span
                    key={kw}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {kw}
                  </span>
                ))}
                {paper.isOpenAccess && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                    Open Access
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && !loading && hasSearched && (
          <div className="text-center text-gray-600 py-12">
            <p>No results found. Try a different search.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => runSearch(page - 1)}
              disabled={page <= 1 || loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>

            <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>

            <button
              type="button"
              onClick={() => runSearch(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
