import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function PaperViewPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const response = await apiClient.get(`/manuscripts/published/${id}`);
        setPaper(response.data);
      } catch (err) {
        setError('Paper not found or may have been removed.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPaper();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Paper Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This paper may have been removed or is not publicly available.'}</p>
          <Link to="/papers" className="text-indigo-600 hover:underline">
            ← Back to Published Papers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/papers" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Back to Published Papers
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Paper Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {paper.journalId?.title && (
              <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                {paper.journalId.title}
              </span>
            )}
            {paper.discipline && (
              <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                {paper.discipline}
              </span>
            )}
            {paper.methodology && (
              <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full capitalize">
                {paper.methodology.replace('-', ' ')}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{paper.title}</h1>

          {paper.authors?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Authors</h3>
              <div className="flex flex-wrap gap-4">
                {paper.authors.map((author: any, index: number) => (
                  <div key={index} className="text-gray-900">
                    <span className="font-medium">{author.name}</span>
                    {author.email && <span className="text-gray-500 text-sm ml-2">{author.email}</span>}
                    {author.affiliation && <span className="text-gray-500 text-sm ml-2">({author.affiliation})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {paper.keywords?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {paper.keywords.map((kw: string, i: number) => (
                  <span key={i} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {paper.publishedAt && (
            <p className="text-sm text-gray-500">
              Published: {new Date(paper.publishedAt).toLocaleDateString()}
              {paper.doi && <span className="ml-4">DOI: {paper.doi}</span>}
            </p>
          )}
        </div>

        {/* Abstract */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Abstract</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{paper.abstract}</p>
        </div>

        {/* Full Paper Content */}
        {paper.body && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Full Paper</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {paper.body}
            </div>
          </div>
        )}

        {/* Download Document */}
        {paper.finalDocument?.url && (
          <div className="bg-indigo-50 rounded-lg shadow p-6 mt-6 text-center">
            <p className="text-indigo-700 mb-4">📄 Download full paper document</p>
            <a 
              href={paper.finalDocument.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Download PDF
            </a>
          </div>
        )}

        {/* Citation Info */}
        {paper.doi && (
          <div className="bg-gray-100 rounded-lg p-6 mt-6">
            <h3 className="font-medium text-gray-900 mb-2">Cite this paper:</h3>
            <p className="text-sm text-gray-600 font-mono">
              DOI: {paper.doi}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}