import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paperAPI } from '../services/api';
import { Paper } from '../types';
import { useAuthStore } from '../utils/authStore';

export default function PaperViewPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = useAuthStore((state) => state.user);
  const isGuest = !user;

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const data = await paperAPI.getById(String(id));
        setPaper(data);
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
      {/* Public nav header shown only when not logged in */}
      {isGuest && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/papers" className="text-lg font-bold text-indigo-700">NexusJournal</Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                Log In
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Register
              </Link>
            </div>
          </div>
        </header>
      )}
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded">
              Original Research
            </span>
            {paper.journal?.name && (
              <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded">
                {paper.journal.name}
              </span>
            )}
            {paper.publicationYear && (
              <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded">
                {paper.publicationYear}
              </span>
            )}
            {paper.isOpenAccess && (
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">Open Access</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-5 leading-snug">{paper.title}</h1>

          {/* Authors with affiliation numbers */}
          {paper.authors?.length > 0 && (() => {
            // Deduplicate affiliations
            const affiliations: string[] = [];
            paper.authors.forEach((a) => {
              if (a.affiliation && !affiliations.includes(a.affiliation)) {
                affiliations.push(a.affiliation);
              }
            });
            return (
              <div className="mb-5">
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                  {paper.authors.map((author, index: number) => {
                    const affIdx = author.affiliation ? affiliations.indexOf(author.affiliation) + 1 : null;
                    return (
                      <span key={index} className="text-sm text-gray-800">
                        <span className="font-medium">{author.name}</span>
                        {affIdx !== null && affiliations.length > 1 && (
                          <sup className="text-indigo-600 text-xs ml-0.5">{affIdx}</sup>
                        )}
                        {author.orcid && (
                          <a
                            href={`https://orcid.org/${author.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-[10px] text-emerald-600 hover:underline"
                          >
                            ORCID
                          </a>
                        )}
                      </span>
                    );
                  })}
                </div>
                {affiliations.length > 0 && (
                  <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
                    {affiliations.map((aff, i) => (
                      <p key={i}>
                        {affiliations.length > 1 && <sup className="mr-0.5">{i + 1}</sup>}
                        {aff}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Keywords */}
          {paper.keywords?.length > 0 && (
            <div className="mb-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mr-2">Keywords:</span>
              {paper.keywords.map((kw: string, i: number) => (
                <span key={i} className="inline-block text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 mr-1.5 mb-1">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Meta row: published date + DOI */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
            {paper.publishedAt && (
              <span>Published: <strong className="text-gray-700">{new Date(paper.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            )}
            {paper.doi && (
              <span>
                DOI:{' '}
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-600 hover:underline"
                >
                  https://doi.org/{paper.doi}
                </a>
              </span>
            )}
            {paper.journal?.issn && (
              <span>ISSN: <strong className="text-gray-700">{paper.journal.issn}</strong></span>
            )}
          </div>

          {/* PDF / Source buttons */}
          {(paper.urls?.pdf || paper.urls?.landing) && (
            <div className="flex flex-wrap gap-3 mt-5">
              {paper.urls?.pdf && (
                <a
                  href={paper.urls.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                >
                  ⬇ Download PDF
                </a>
              )}
              {paper.urls?.landing && (
                <a
                  href={paper.urls.landing}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-indigo-300 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50"
                >
                  View Source Publication ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* Abstract */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Abstract</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{paper.abstract || 'No abstract available.'}</p>
        </div>

        {/* How to cite */}
        {(paper.doi || paper.authors?.length > 0) && (() => {
          const authorStr = paper.authors?.map((a) => a.name).join(', ') || '';
          const year = paper.publicationYear || (paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : '');
          const journalName = paper.journal?.name || 'NexusJournal';
          const doi = paper.doi;
          const url = doi ? `https://doi.org/${doi}` : (paper.urls?.landing || '');

          const printCitation = `${authorStr}. ${paper.title}. ${journalName}. ${year}${doi ? `. doi:${doi}` : ''}.`;
          const urlCitation = `${authorStr}. ${paper.title}. ${journalName}. ${year}. Available from: ${url}`;

          return (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">How to Cite this Article</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Print</p>
                  <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-3 font-mono leading-relaxed select-all">
                    {printCitation}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">URL</p>
                  <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-3 font-mono leading-relaxed select-all break-all">
                    {urlCitation}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}