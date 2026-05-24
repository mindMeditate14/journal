import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paperAPI } from '../services/api';
import { Paper } from '../types';
import { useAuthStore } from '../utils/authStore';

type ViewMode = 'abstract' | 'fulltext' | 'pdf';
type CiteFmt = 'apa' | 'vancouver' | 'bibtex' | 'ris';

function fmtDate(d: string | Date | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildCitations(paper: Paper, publisherDisplay: string) {
  const authors = paper.authors ?? [];
  const year = paper.publicationYear || (paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : 'n.d.');
  const doi = paper.doi ?? '';
  const doiUrl = doi ? `https://doi.org/${doi}` : '';
  const journal = publisherDisplay;
  const vol = paper.volume;
  const iss = paper.issue;
  const seq = paper.articleSequence;
  // e.g. "1(5)" or just the journal name if no volume
  const volIss = vol ? (iss ? `${vol}(${iss})` : `${vol}`) : '';
  const artRef = seq ? `Article ${seq}` : '';

  // APA
  const apaAuthors = authors.map((a) => {
    const parts = a.name.trim().split(/\s+/);
    const last = parts[0];
    const initials = parts.slice(1).map((p) => p[0] + '.').join(' ');
    return initials ? `${last}, ${initials}` : last;
  }).join(', ');
  const apaVolPart = volIss ? `, ${volIss}${artRef ? `, ${artRef}` : ''}` : '';
  const apa = `${apaAuthors} (${year}). ${paper.title}. ${journal}${apaVolPart}${doi ? `. ${doiUrl}` : ''}.`;

  // Vancouver
  const vanAuthors = authors.map((a) => {
    const parts = a.name.trim().split(/\s+/);
    const last = parts[0];
    const initials = parts.slice(1).map((p) => p[0]).join('');
    return `${last} ${initials}`;
  }).join(', ');
  const vanVolPart = volIss ? `;${volIss}${seq ? `:e${seq}` : ''}` : '';
  const vancouver = `${vanAuthors}. ${paper.title}. ${journal}. ${year}${vanVolPart}${doi ? `. doi: ${doi}` : ''}.`;

  // BibTeX
  const bibKey = `${(authors[0]?.name.split(/\s+/)[0] ?? 'unknown').toLowerCase()}${year}`;
  const bibAuthors = authors.map((a) => {
    const parts = a.name.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]}, ${parts.slice(1).join(' ')}` : parts[0];
  }).join(' and ');
  const bibtex = `@article{${bibKey},\n  title   = {${paper.title}},\n  author  = {${bibAuthors}},\n  journal = {${journal}},\n  year    = {${year}}${vol ? `,\n  volume  = {${vol}}` : ''}${iss ? `,\n  number  = {${iss}}` : ''}${seq ? `,\n  pages   = {e${seq}}` : ''}${doi ? `,\n  doi     = {${doi}}` : ''}${paper.articleNumber ? `,\n  note    = {${paper.articleNumber}}` : ''}\n}`;

  // RIS
  const risAuthors = authors.map((a) => `AU  - ${a.name}`).join('\n');
  const ris = `TY  - JOUR\nTI  - ${paper.title}\n${risAuthors}\nJO  - ${journal}\nPY  - ${year}${vol ? `\nVL  - ${vol}` : ''}${iss ? `\nIS  - ${iss}` : ''}${seq ? `\nSP  - e${seq}` : ''}${doi ? `\nDO  - ${doi}\nUR  - ${doiUrl}` : ''}${paper.keywords?.length ? '\n' + paper.keywords.map((k) => `KW  - ${k}`).join('\n') : ''}\nER  -`;

  return { apa, vancouver, bibtex, ris };
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PaperViewPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('abstract');
  const [citeFmt, setCiteFmt] = useState<CiteFmt>('apa');
  const [citationCopied, setCitationCopied] = useState(false);
  const [citedBy, setCitedBy] = useState<Paper[]>([]);
  const user = useAuthStore((state) => state.user);
  const isGuest = !user;

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const data = await paperAPI.getById(String(id));
        setPaper(data);
        // Fire-and-forget cited-by (non-blocking)
        paperAPI.getCitedBy(String(id)).then(setCitedBy).catch(() => {});
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading article…</p>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Paper Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This paper may have been removed or is not publicly available.'}</p>
          <Link to="/papers" className="text-indigo-600 hover:underline">← Back to Published Papers</Link>
        </div>
      </div>
    );
  }

  const isOurPublication = paper.sourceProvenance?.some((p) => p.source === 'manual');
  const publisherDisplay = isOurPublication
    ? 'Traditional Medicine International'
    : paper.journal?.publisher || paper.journal?.name || 'Traditional Medicine International';

  // Deduplicate affiliations
  const affiliations: string[] = [];
  paper.authors?.forEach((a) => {
    if (a.affiliation && !affiliations.includes(a.affiliation)) affiliations.push(a.affiliation);
  });

  const year = paper.publicationYear || (paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : '');
  const doi = paper.doi;
  const doiUrl = doi ? `https://doi.org/${doi}` : '';
  const pubDateStr = fmtDate(paper.publishedAt) || (year ? String(year) : '');
  const receivedDateStr = fmtDate(paper.receivedAt);
  const acceptedDateStr = fmtDate(paper.acceptedAt);
  const articleType = paper.documentType || paper.topics?.[0] || 'Research Article';
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const citations = buildCitations(paper, publisherDisplay);
  const activeCitation = citations[citeFmt];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCitationCopied(true);
      setTimeout(() => setCitationCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* ── Guest sticky nav ── */}
      {isGuest && (
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/papers" className="flex items-center gap-2">
                  <span className="text-lg font-bold text-indigo-700">Traditional Medicine International</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/about" className="hidden md:block text-sm font-medium text-gray-600 hover:text-indigo-700">About</Link>
              <Link to="/editorial-board" className="hidden md:block text-sm font-medium text-gray-600 hover:text-indigo-700">Editorial Board</Link>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-700">Log In</Link>
              <Link to="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition">
                Submit Research
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm text-gray-500 flex items-center gap-1.5">
            <Link to="/papers" className="hover:text-indigo-600 transition">Published Papers</Link>
            <span className="text-gray-300">›</span>
            <span className="text-gray-700 truncate max-w-sm md:max-w-xl">{paper.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ══════════════════════════════════════
              Main Article Column
          ══════════════════════════════════════ */}
          <main className="lg:flex-1 min-w-0">

            {/* Journal header banner */}
            <div className={`rounded-t-xl px-6 py-3.5 flex items-center justify-between ${isOurPublication ? 'bg-indigo-700' : 'bg-slate-700'}`}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white tracking-wide">{publisherDisplay}</span>
                {isOurPublication && (
                  <span className="text-xs bg-white/15 border border-white/25 text-white px-2.5 py-0.5 rounded-full">
                    Open Access · Peer Reviewed
                  </span>
                )}
                {!isOurPublication && paper.isOpenAccess && (
                  <span className="text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-2.5 py-0.5 rounded-full">
                    Open Access
                  </span>
                )}
              </div>
              {paper.journal?.issn && (
                <span className="text-xs text-white/60 font-mono hidden sm:block">ISSN {paper.journal.issn}</span>
              )}
            </div>

            {/* Article header card */}
            <div className="bg-white border-x border-gray-200 px-6 md:px-10 pt-8 pb-7">

              {/* Article type + year badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded">
                  {articleType}
                </span>
                {paper.publicationYear && (
                  <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded">
                    {paper.publicationYear}
                  </span>
                )}
                {paper.isOpenAccess && !isOurPublication && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                    Open Access
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-6">
                {paper.title}
              </h1>

              {/* Authors */}
              {paper.authors?.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3">
                    {paper.authors.map((author, idx) => {
                      const affIdx = author.affiliation ? affiliations.indexOf(author.affiliation) + 1 : null;
                      return (
                        <span key={idx} className="text-sm text-gray-800 flex items-center gap-1">
                          <span className="font-semibold text-indigo-700">{author.name}</span>
                          {affIdx !== null && affiliations.length > 1 && (
                            <sup className="text-gray-400 text-xs">{affIdx}</sup>
                          )}
                          {author.orcid && (
                            <a
                              href={`https://orcid.org/${author.orcid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-0.5 inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition"
                            >
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.516.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.435h2.297c3.272 0 3.872-2.484 3.872-3.722 0-2.016-1.284-3.713-3.878-3.713h-2.291z" />
                              </svg>
                              ORCID
                            </a>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {affiliations.length > 0 && (
                    <div className="text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-3">
                      {affiliations.map((aff, i) => (
                        <p key={i}>
                          {affiliations.length > 1 && (
                            <sup className="text-gray-400 mr-1">{i + 1}</sup>
                          )}
                          {aff}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Published + DOI meta row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 border-t border-gray-100 pt-5">
                {pubDateStr && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Published <strong className="text-gray-700">{pubDateStr}</strong></span>
                  </div>
                )}
                {doiUrl && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs font-semibold uppercase">DOI</span>
                    <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-indigo-600 hover:underline">
                      {doiUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── View mode tabs ── */}
            <div className="bg-white border-x border-t border-gray-200 flex gap-0">
              <button
                onClick={() => setViewMode('abstract')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === 'abstract'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Abstract
              </button>
              {(paper.sections?.length > 0 || paper.body) && (
                <button
                  onClick={() => setViewMode('fulltext')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    viewMode === 'fulltext'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Full Text (HTML)
                </button>
              )}
              {paper.urls?.pdf && (
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    viewMode === 'pdf'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  PDF
                </button>
              )}
            </div>

            {/* ── Abstract panel ── */}
            {viewMode === 'abstract' && (
              <div className="bg-white border-x border-b border-gray-200 rounded-b-xl px-6 md:px-10 py-7 space-y-7">
                {/* Abstract */}
                <section>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Abstract</h2>
                  <p className="text-gray-800 leading-[1.8] text-[15px] whitespace-pre-wrap">
                    {paper.abstract || 'No abstract available.'}
                  </p>
                </section>

                {/* Keywords */}
                {paper.keywords?.length > 0 && (
                  <section className="border-t border-gray-100 pt-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Keywords</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {paper.keywords.map((kw, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Corresponding Author */}
                {paper.correspondingAuthor?.name && (
                  <section className="border-t border-gray-100 pt-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Corresponding Author</h2>
                    <p className="text-sm text-gray-800 font-medium">{paper.correspondingAuthor.name}</p>
                    {paper.correspondingAuthor.email && (
                      <a href={`mailto:${paper.correspondingAuthor.email}`} className="text-xs text-indigo-600 hover:underline">
                        {paper.correspondingAuthor.email}
                      </a>
                    )}
                  </section>
                )}

                {/* Funding */}
                {paper.fundingStatement && (
                  <section className="border-t border-gray-100 pt-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Funding</h2>
                    <p className="text-sm text-gray-700 leading-relaxed">{paper.fundingStatement}</p>
                  </section>
                )}

                {/* Conflict of Interest */}
                {paper.conflictOfInterest && (
                  <section className="border-t border-gray-100 pt-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Conflict of Interest</h2>
                    <p className="text-sm text-gray-700 leading-relaxed">{paper.conflictOfInterest}</p>
                  </section>
                )}

                {/* Data Availability */}
                {paper.dataAvailability && (
                  <section className="border-t border-gray-100 pt-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Data Availability Statement</h2>
                    <p className="text-sm text-gray-700 leading-relaxed">{paper.dataAvailability}</p>
                  </section>
                )}

                {/* References — numbered list if captured, count otherwise */}
                {(paper.references?.length > 0 || paper.referencesCount > 0) && (
                  <section className="border-t border-gray-100 pt-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">References</h2>
                    {paper.references && paper.references.length > 0 ? (
                      <ol className="space-y-2">
                        {paper.references.map((ref, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                            <span className="shrink-0 text-gray-400 font-mono text-xs mt-0.5 w-5 text-right">{i + 1}.</span>
                            <span>{ref}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-gray-600">
                        This article cites <strong className="text-gray-800">{paper.referencesCount}</strong> reference{paper.referencesCount !== 1 ? 's' : ''}.
                        {paper.urls?.landing && (
                          <a href={paper.urls.landing} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 hover:underline">
                            View at source ↗
                          </a>
                        )}
                      </p>
                    )}
                  </section>
                )}
              </div>
            )}

            {/* ── Full Text HTML panel ── */}
            {viewMode === 'fulltext' && (paper.sections?.length > 0 || paper.body) && (
              <div className="bg-white border-x border-b border-gray-200 rounded-b-xl px-6 md:px-10 py-7 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Text</h2>
                  {paper.urls?.pdf && (
                    <button
                      onClick={() => setViewMode('pdf')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View PDF
                    </button>
                  )}
                </div>

                {/* Publisher attribution */}
                {isOurPublication && (
                  <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2">
                    <span className="font-bold">Traditional Medicine International</span>
                    <span className="text-indigo-400">·</span>
                    <span>Open Access · Peer Reviewed · CC BY 4.0</span>
                  </div>
                )}

                {/* Sections-based rendering */}
                {paper.sections && paper.sections.length > 0 ? (
                  <div className="space-y-8">
                    {[...paper.sections]
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((section, i) => (
                        <section key={i}>
                          {section.title && (
                            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100">
                              {section.title}
                            </h3>
                          )}
                          <div className="text-[15px] text-gray-800 leading-[1.9] whitespace-pre-wrap">
                            {section.content}
                          </div>
                        </section>
                      ))}
                  </div>
                ) : paper.body ? (
                  /* Body fallback */
                  <div className="text-[15px] text-gray-800 leading-[1.9] whitespace-pre-wrap">{paper.body}</div>
                ) : null}

                {/* Inline references */}
                {paper.references && paper.references.length > 0 && (
                  <section className="border-t-2 border-gray-200 pt-6">
                    <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4">References</h3>
                    <ol className="space-y-2">
                      {paper.references.map((ref, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                          <span className="shrink-0 text-gray-400 font-mono text-xs mt-0.5 w-5 text-right">{i + 1}.</span>
                          <span>{ref}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {paper.keywords?.length > 0 && (
                  <div className="border-t border-gray-100 pt-5">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Keywords</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {paper.keywords.map((kw, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PDF Viewer panel ── */}
            {viewMode === 'pdf' && paper.urls?.pdf && (
              <div className="bg-white border-x border-b border-gray-200 rounded-b-xl overflow-hidden">
                {/* Branded PDF header */}
                <div className="bg-indigo-700 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">Traditional Medicine International</span>
                    <span className="text-xs text-indigo-300">·</span>
                    <span className="text-xs text-indigo-200 truncate max-w-xs">{paper.title}</span>
                  </div>
                  <a
                    href={`/api/papers/${paper._id}/download`}
                    download
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-white px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </a>
                </div>
                <iframe
                  src={paper.urls.pdf}
                  title={paper.title}
                  className="w-full"
                  style={{ height: '80vh', minHeight: 600 }}
                />
              </div>
            )}
          </main>

          {/* ══════════════════════════════════════
              Sidebar
          ══════════════════════════════════════ */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">

            {/* Downloads */}
            {(paper.urls?.pdf || paper.urls?.landing) && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Downloads</h3>
                <div className="space-y-2">
                  {paper.urls?.pdf && (
                    <a
                      href={`/api/papers/${paper._id}/download`}
                      download
                      className="flex items-center gap-2.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition w-full"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </a>
                  )}
                  {paper.urls?.pdf && (
                    <button
                      onClick={() => setViewMode('pdf')}
                      className="flex items-center gap-2.5 px-4 py-2.5 border border-indigo-200 text-indigo-700 bg-indigo-50 text-sm font-medium rounded-lg hover:bg-indigo-100 transition w-full"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      View PDF
                    </button>
                  )}
                  {(paper.sections?.length > 0 || paper.body) && (
                    <button
                      onClick={() => setViewMode('fulltext')}
                      className="flex items-center gap-2.5 px-4 py-2.5 border border-indigo-200 text-indigo-700 bg-indigo-50 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition w-full"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      HTML
                    </button>
                  )}
                  {!isOurPublication && paper.urls?.landing && (
                    <a
                      href={paper.urls.landing}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition w-full"
                    >
                      <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View at Source ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Article Information */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Article Information</h3>
              <dl className="space-y-3 text-sm">
                {paper.documentType && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Document Type</dt>
                    <dd className="text-gray-800 font-medium">{paper.documentType}</dd>
                  </div>
                )}
                {paper.language && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Language</dt>
                    <dd className="text-gray-800">{paper.language}</dd>
                  </div>
                )}
                {paper.articleNumber && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Article Number</dt>
                    <dd className="font-mono text-xs text-gray-700">{paper.articleNumber}</dd>
                  </div>
                )}
                {/* Volume / Issue / Article sequence */}
                {paper.volume && (
                  <div className="border-t border-gray-100 pt-3">
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Published In</dt>
                    <dd className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Volume</span>
                        <span className="text-gray-800 font-semibold">{paper.volume}</span>
                      </div>
                      {paper.issue && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-xs">Issue</span>
                          <span className="text-gray-800 font-semibold">
                            {paper.issue}&nbsp;
                            <span className="text-gray-400 font-normal text-xs">
                              ({new Date(0, paper.issue - 1).toLocaleString('en', { month: 'short' })} {paper.publicationYear})
                            </span>
                          </span>
                        </div>
                      )}
                      {paper.articleSequence && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-xs">Article</span>
                          <span className="text-gray-800 font-semibold">{paper.articleSequence}</span>
                        </div>
                      )}
                    </dd>
                  </div>
                )}
                {/* Dates timeline */}
                {(receivedDateStr || acceptedDateStr || pubDateStr) && (
                  <div className="border-t border-gray-100 pt-3">
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Dates</dt>
                    <dd className="space-y-1.5">
                      {receivedDateStr && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                          <div><span className="text-gray-400">Received</span><br /><span className="text-gray-700 font-medium">{receivedDateStr}</span></div>
                        </div>
                      )}
                      {acceptedDateStr && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                          <div><span className="text-gray-400">Accepted</span><br /><span className="text-gray-700 font-medium">{acceptedDateStr}</span></div>
                        </div>
                      )}
                      {pubDateStr && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <div><span className="text-gray-400">Published</span><br /><span className="text-gray-700 font-medium">{pubDateStr}</span></div>
                        </div>
                      )}
                    </dd>
                  </div>
                )}
                {doi && (
                  <div className="border-t border-gray-100 pt-3">
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">DOI</dt>
                    <dd>
                      <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-indigo-600 hover:underline break-all">
                        {doi}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Publisher</dt>
                  <dd className="text-gray-800 font-medium">{publisherDisplay}</dd>
                </div>
                {paper.journal?.name && !isOurPublication && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Journal</dt>
                    <dd className="text-gray-800">{paper.journal.name}</dd>
                  </div>
                )}
                {paper.journal?.issn && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">ISSN (Online)</dt>
                    <dd className="font-mono text-xs text-gray-700">{paper.journal.issn}</dd>
                  </div>
                )}
                {isOurPublication && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Peer Review</dt>
                    <dd className="text-gray-800">Double-blind</dd>
                  </div>
                )}
                {paper.citationsCount > 0 && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Citations</dt>
                    <dd className="text-gray-800 font-semibold">{paper.citationsCount}</dd>
                  </div>
                )}
                {paper.referencesCount > 0 && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">References</dt>
                    <dd className="text-gray-800 font-semibold">{paper.referencesCount}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Citation Network */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Citation Network</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[10px] uppercase tracking-widest text-gray-400">Cited By</dt>
                  <dd className="text-gray-800 font-semibold">{citedBy.length}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[10px] uppercase tracking-widest text-gray-400">References</dt>
                  <dd className="text-gray-800 font-semibold">{paper.references?.length || paper.referencesCount || 0}</dd>
                </div>
              </dl>
              {citedBy.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                      Used in Traditional Medicine International
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {citedBy.map((cp) => (
                      <li key={String(cp._id)} className="text-xs">
                        <a
                          href={`/papers/${cp._id}`}
                          className="text-indigo-600 hover:underline line-clamp-2 leading-snug"
                        >
                          {cp.title}
                        </a>
                        {cp.publicationYear && (
                          <span className="text-gray-400 ml-1">({cp.publicationYear})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* How to Cite — multi-format */}
            {(doi || paper.authors?.length > 0) && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Cite This Article</h3>
                {/* Format tabs */}
                <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-0.5">
                  {(['apa', 'vancouver', 'bibtex', 'ris'] as CiteFmt[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setCiteFmt(fmt)}
                      className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-colors ${
                        citeFmt === fmt ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {fmt === 'bibtex' ? 'BibTeX' : fmt === 'ris' ? 'RIS' : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed select-all break-words whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {activeCitation}
                </pre>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => copyToClipboard(activeCitation)}
                    className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition flex items-center justify-center gap-1.5"
                  >
                    {citationCopied ? <><span className="text-emerald-600">✓</span> Copied!</> : <>⧉ Copy</>}
                  </button>
                  {citeFmt === 'ris' && (
                    <button
                      onClick={() => downloadFile(activeCitation, `${paper._id}.ris`, 'application/x-research-info-systems')}
                      className="flex-1 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"
                    >
                      ↓ .ris
                    </button>
                  )}
                  {citeFmt === 'bibtex' && (
                    <button
                      onClick={() => downloadFile(activeCitation, `${paper._id}.bib`, 'text/x-bibtex')}
                      className="flex-1 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"
                    >
                      ↓ .bib
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Share</h3>
              <div className="flex gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(paper.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition text-gray-700"
                >
                  𝕏
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition text-gray-700"
                >
                  in
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(paper.title)}&body=${encodeURIComponent(`I thought you'd find this article interesting:\n\n${paper.title}\n\n${pageUrl}`)}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition text-gray-700"
                >
                  ✉
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(pageUrl); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition text-gray-700"
                  title="Copy link"
                >
                  🔗
                </button>
              </div>
            </div>

            {/* Open Access / License */}
            {paper.isOpenAccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🔓</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700">Open Access</h3>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Free to read, share, and adapt with attribution under Creative Commons CC BY 4.0.
                </p>
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  View CC BY 4.0 License →
                </a>
              </div>
            )}

            {/* Guest CTA */}
            {isGuest && (
              <div className="bg-indigo-600 text-white rounded-xl p-5">
                <h3 className="text-sm font-bold mb-1">Publish with Traditional Medicine International</h3>
                <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                  Submit your traditional or integrative medicine research to our open-access peer-reviewed platform.
                </p>
                <Link
                  to="/register"
                  className="block text-center text-xs font-bold bg-white text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  Submit Research →
                </Link>
              </div>
            )}
          </aside>

        </div>
      </div>

      {/* ── Footer (guests only — sidebar provides footer when logged in) ── */}
      {isGuest && (
        <footer className="bg-slate-900 text-slate-400 text-sm mt-10">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-bold text-white">Traditional Medicine International</span>
            <div className="flex gap-5 text-xs">
              <Link to="/about" className="hover:text-white">About</Link>
              <Link to="/editorial-board" className="hover:text-white">Editorial Board</Link>
              <Link to="/journal-policy" className="hover:text-white">Journal Policy</Link>
              <Link to="/papers" className="hover:text-white">Papers</Link>
            </div>
            <span className="text-xs text-slate-500">© {new Date().getFullYear()} Mind Meditate Resources. All rights reserved.</span>
          </div>
        </footer>
      )}
    </div>
  );
}