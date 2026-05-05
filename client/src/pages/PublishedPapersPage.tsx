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
    } catch {
      toast.error('Unable to load published papers');
      setPapers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPapers(1, ''); }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadPapers(1, query.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top nav (guests only) ── */}
      {isGuest && (
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-indigo-700">NexusJournal</span>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-700">Sign In</Link>
              <Link to="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-colors">
                Submit Research
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white overflow-hidden">
        {/* Decorative background rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          {/* Journal label */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1 rounded-full">
              Open Access · Peer Reviewed
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 max-w-3xl">
            NexusJournal of<br className="hidden md:block" /> Traditional Medicine
          </h1>
          <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed mb-10">
            A multidisciplinary platform publishing rigorous research in Ayurveda, Siddha, and integrated traditional healthcare sciences.
          </p>

          {/* Search bar */}
          <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, keyword, author…"
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/25 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:bg-white/20 focus:border-white/50 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-white text-indigo-800 font-semibold rounded-xl hover:bg-indigo-50 transition disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-8 mt-10 text-sm text-indigo-200">
            <div>
              <span className="text-3xl font-bold text-white">{total > 0 ? total : '—'}</span>
              <span className="ml-2">Published articles</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-white">100%</span>
              <span className="ml-2">Open Access</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-white">Double</span>
              <span className="ml-2">Blind review</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scope strip ── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-800 mr-2">Focus areas:</span>
          {['Ayurveda', 'Siddha Medicine', 'Herbal Pharmacology', 'Clinical Trials', 'Ethnobotany', 'Integrative Health'].map((tag) => (
            <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* ── Articles ── */}
      <section className="max-w-7xl mx-auto px-6 py-10">

        {/* Section heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {query ? `Results for "${query}"` : 'Latest Articles'}
            </h2>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {total} article{total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); loadPapers(1, ''); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              ✕ Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-500">Try a different keyword or browse all articles.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {papers.map((paper) => (
                <article
                  key={paper._id}
                  onClick={() => navigate(`/papers/${paper._id}`)}
                  className="group bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  {/* Coloured top accent */}
                  <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />

                  <div className="p-6">
                    {/* Badges row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        Original Research
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                        Open Access
                      </span>
                      {paper.publicationYear && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                          {paper.publicationYear}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 leading-snug mb-2 transition-colors line-clamp-2">
                      {paper.title}
                    </h3>

                    {/* Authors */}
                    {paper.authors?.length > 0 && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                        {paper.authors.map((a) => a.name).join(', ')}
                      </p>
                    )}

                    {/* Abstract */}
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4">
                      {paper.abstract || 'No abstract available.'}
                    </p>

                    {/* Keywords */}
                    {paper.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {paper.keywords.slice(0, 4).map((kw, i) => (
                          <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400 truncate max-w-[60%]">
                        {paper.journal?.name || 'NexusJournal'}
                        {paper.doi && (
                          <> · <a
                            href={`https://doi.org/${paper.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >DOI</a></>
                        )}
                      </span>
                      <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-800 whitespace-nowrap">
                        Read →
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => loadPapers(page - 1)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => loadPapers(page + 1)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Submit CTA ── */}
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to publish your research?</h3>
            <p className="text-indigo-100 max-w-lg">
              NexusJournal welcomes original research, case studies, and reviews in traditional medicine and integrative healthcare.
            </p>
          </div>
          {isGuest ? (
            <Link
              to="/register"
              className="shrink-0 px-7 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition text-sm whitespace-nowrap"
            >
              Create Account →
            </Link>
          ) : (
            <Link
              to="/manuscripts/create"
              className="shrink-0 px-7 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition text-sm whitespace-nowrap"
            >
              Submit Manuscript →
            </Link>
          )}
        </div>
      </section>

      {/* ── AYUSH Alignment ── */}
      <section className="bg-amber-50 border-t border-amber-100">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start gap-10">
          {/* Left — AYUSH badge */}
          <div className="shrink-0 flex flex-col items-center gap-2 min-w-[120px]">
            <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
              🌿
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 text-center">AYUSH Aligned</span>
          </div>
          {/* Right — description */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aligned with India's Ministry of AYUSH
            </h3>
            <p className="text-gray-700 leading-relaxed mb-3 max-w-3xl">
              NexusJournal supports the research objectives of the{' '}
              <strong>Ministry of AYUSH</strong> (Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy),
              Government of India. Our editorial scope — spanning Ayurveda, Siddha medicine, herbal pharmacology,
              and integrative health — directly serves the mission of the{' '}
              <strong>National AYUSH Mission</strong> to promote evidence-based traditional medicine research,
              standardisation, and global dissemination.
            </p>
            <p className="text-sm text-gray-500 max-w-3xl">
              NexusJournal is an independent academic platform and is not officially affiliated with or endorsed by
              the Ministry of AYUSH. We align with its research priorities and welcome submissions that advance
              AYUSH sciences through rigorous peer-reviewed study.
            </p>
            <a
              href="https://ayush.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline"
            >
              Learn about the Ministry of AYUSH →
            </a>
          </div>
        </div>
      </section>

      {/* ── Open Data & Indexing Transparency ── */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
            Open Scholarly Data Sources
          </p>
          <p className="text-center text-sm text-gray-500 max-w-2xl mx-auto mb-10">
            Bibliographic metadata on this platform is sourced from publicly available open-access scholarly
            databases. All copyright in the original works remains with the respective authors and publishers.
            NexusJournal does not host, reproduce, or claim ownership of any third-party content.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: 'OpenAlex',
                description: 'Open index of 250M+ scholarly works',
                badge: 'CC0 Public Domain',
                url: 'https://openalex.org',
                color: 'bg-blue-50 border-blue-100',
                badgeColor: 'bg-blue-100 text-blue-700',
              },
              {
                name: 'CrossRef',
                description: 'Official DOI registration agency for research',
                badge: 'DOI Metadata',
                url: 'https://crossref.org',
                color: 'bg-indigo-50 border-indigo-100',
                badgeColor: 'bg-indigo-100 text-indigo-700',
              },
              {
                name: 'PubMed Central',
                description: 'NIH free full-text archive of biomedical literature',
                badge: 'Open Access',
                url: 'https://pmc.ncbi.nlm.nih.gov',
                color: 'bg-emerald-50 border-emerald-100',
                badgeColor: 'bg-emerald-100 text-emerald-700',
              },
              {
                name: 'Semantic Scholar',
                description: 'AI-powered research discovery by Allen Institute',
                badge: 'Open Research Graph',
                url: 'https://semanticscholar.org',
                color: 'bg-violet-50 border-violet-100',
                badgeColor: 'bg-violet-100 text-violet-700',
              },
            ].map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col gap-2 p-5 rounded-xl border ${src.color} hover:shadow-sm transition-shadow group`}
              >
                <span className="font-bold text-gray-900 group-hover:text-indigo-700 text-sm">{src.name}</span>
                <span className="text-xs text-gray-500 leading-relaxed flex-1">{src.description}</span>
                <span className={`inline-flex self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${src.badgeColor}`}>
                  {src.badge}
                </span>
              </a>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8 max-w-2xl mx-auto">
            Indexing is done via the OpenAlex API which aggregates metadata from CrossRef, PubMed, Semantic Scholar,
            DOAJ, and other open repositories under open licences. Each article card links to its original source.
          </p>
        </div>
      </section>

      {/* ── Partner Section ── */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-10">Official Partner</p>
          <div className="flex flex-col md:flex-row items-center gap-10 bg-gradient-to-r from-indigo-50 via-white to-violet-50 border border-indigo-100 rounded-2xl p-8 md:p-10 shadow-sm">
            <a href="https://misaa.my" target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img
                src={MisaaLogo}
                alt="MISAA — Malaysian Indian Siddha Ayurveda Association"
                className="h-28 w-auto object-contain drop-shadow-sm"
              />
            </a>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Partner Organisation</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Malaysian Indian Siddha Ayurveda Association
                <span className="ml-2 text-indigo-600">(MISAA)</span>
              </h3>
              <p className="text-gray-600 leading-relaxed mb-5 max-w-2xl">
                MISAA is Malaysia's leading body for preserving, promoting, and advancing the practice of Ayurveda and Siddha medicine.
                Dedicated to education, research, and authentic practice of Traditional Indian Medicine (TIM), MISAA bridges
                ancient healing wisdom with modern healthcare — partnering with government agencies, NGOs, and practitioners
                across Malaysia and Southeast Asia.
              </p>
              <a
                href="https://misaa.my"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Visit misaa.my →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-white text-base">NexusJournal</span>
            <span className="ml-3 text-slate-500">of Traditional Medicine</span>
          </div>
          <div className="flex gap-6 text-xs">
            <span>ISSN (Online): Pending</span>
            <span>·</span>
            <span>Double-blind peer review</span>
            <span>·</span>
            <span>Open Access</span>
          </div>
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} NexusJournal. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}