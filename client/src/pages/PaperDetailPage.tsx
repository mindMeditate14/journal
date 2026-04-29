import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { paperAPI } from '../services/api';
import { Paper, PaperGraph } from '../types';

export default function PaperDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [related, setRelated] = useState<Paper[]>([]);
  const [graph, setGraph] = useState<PaperGraph | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPaper = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [paperData, relatedData, graphData] = await Promise.all([
          paperAPI.getById(id),
          paperAPI.getRelated(id, 8),
          paperAPI.getGraph(id, 20),
        ]);
        setPaper(paperData);
        setRelated(relatedData);
        setGraph(graphData);
      } catch (error) {
        toast.error('Failed to load paper details');
      } finally {
        setLoading(false);
      }
    };

    loadPaper();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Loading paper...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Paper not found.</p>
        <button
          onClick={() => navigate('/search')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/search')}
          className="mb-6 text-indigo-600 hover:underline"
        >
          ← Back to Search
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900">{paper.title}</h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
            <span>📅 {paper.publicationYear || 'N/A'}</span>
            <span>📖 {paper.journal?.name || 'Unknown journal'}</span>
            <span>🔎 {paper.citationsCount || 0} citations</span>
            <span>📚 {paper.referencesCount || 0} references</span>
            {paper.isOpenAccess && (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Open Access</span>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">Authors</h2>
            <p className="text-gray-700 mt-2">
              {paper.authors?.length
                ? paper.authors.map((author) => author.name).join(', ')
                : 'Unknown'}
            </p>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">Abstract</h2>
            <p className="text-gray-700 mt-2 whitespace-pre-wrap">
              {paper.abstract || 'No abstract available.'}
            </p>
          </div>

          {paper.keywords?.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Keywords</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {paper.keywords.map((kw) => (
                  <span key={kw} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {paper.urls?.landing && (
              <a
                href={paper.urls.landing}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View Source
              </a>
            )}
            {paper.urls?.pdf && (
              <a
                href={paper.urls.pdf}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Open PDF
              </a>
            )}
            {paper.doi && (
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                DOI Link
              </a>
            )}
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900">Citation/Reference Graph</h2>
            {graph ? (
              <div className="mt-3">
                <div className="text-sm text-gray-600">
                  References in graph: {graph.summary.referencesInGraph} | Citations in graph: {graph.summary.citationsInGraph}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">References</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {graph.nodes
                        .filter((node) => node.role === 'reference')
                        .slice(0, 20)
                        .map((node) => (
                          <div key={node.id} className="text-sm text-gray-700 border rounded p-2">
                            <div className="font-medium">{node.title}</div>
                            <div className="text-xs text-gray-500">{node.publicationYear || 'N/A'}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Citations</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {graph.nodes
                        .filter((node) => node.role === 'citation')
                        .slice(0, 20)
                        .map((node) => (
                          <div key={node.id} className="text-sm text-gray-700 border rounded p-2">
                            <div className="font-medium">{node.title}</div>
                            <div className="text-xs text-gray-500">{node.publicationYear || 'N/A'}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No graph data available.</p>
            )}
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900">Related Papers</h2>
            {related.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No related papers found yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {related.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => navigate(`/papers/${item._id}`)}
                    className="w-full text-left border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.journal?.name || 'Unknown journal'} | {item.publicationYear || 'N/A'} | score {Number(item.relevanceScore || 0).toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
