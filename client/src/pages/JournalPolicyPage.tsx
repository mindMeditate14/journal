import { Link } from 'react-router-dom';

export default function JournalPolicyPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Nav ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/papers" className="text-lg font-bold text-indigo-700 tracking-tight">
            TradMed International
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
            <Link to="/about" className="hover:text-indigo-700">About</Link>
            <Link to="/editorial-board" className="hover:text-indigo-700">Editorial Board</Link>
            <Link to="/journal-policy" className="text-indigo-700 font-semibold">Journal Policy</Link>
            <Link to="/papers" className="hover:text-indigo-700">Papers</Link>
            <Link to="/register" className="bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition text-xs font-semibold">
              Submit Research
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-900 to-violet-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1 rounded-full inline-block mb-4">
            TradMed International
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Journal Policy</h1>
          <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed">
            Publication ethics, copyright, open access licence, and publishing policies
            of TradMed International.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* ── Publication Details Block ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-5 border-l-4 border-indigo-600 pl-4">
            Publisher Information
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Journal Title', 'TradMed International'],
                  ['Publisher', 'Mind Meditate Resources'],
                  ['Publisher Address', 'H-07-03, Jalan Blok H, Pusat Komersial Dataran Ecohill, Jalan Ecohill 1/2, Semenyih, 43500 Semenyih, Selangor, Malaysia'],
                  ['Country of Publication', 'Malaysia'],
                  ['Publication Medium', 'Online (Electronic)'],
                  ['Publication Frequency', 'Continuous publication — articles published online upon acceptance'],
                  ['Language', 'English'],
                  ['ISSN (Online)', 'Pending registration with Perpustakaan Negara Malaysia'],
                  ['First Published', '2026'],
                  ['Journal Website', 'https://tradmedint.com'],
                  ['Contact', 'editor@tradmedint.com'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-t border-gray-100 first:border-t-0">
                    <td className="px-5 py-3 font-semibold text-gray-600 w-2/5 bg-gray-50 text-xs uppercase tracking-wide">{label}</td>
                    <td className="px-5 py-3 text-gray-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Open Access Policy ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Open Access Policy
          </h2>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-3 text-gray-700 text-sm leading-relaxed">
            <p>
              TradMed International is a fully <strong>open-access journal</strong>. All articles are freely
              available online immediately upon publication, without any subscription fee or access barrier.
            </p>
            <p>
              Published articles are licensed under the{' '}
              <strong>Creative Commons Attribution 4.0 International (CC BY 4.0)</strong> licence. Under this
              licence, readers are free to read, download, copy, distribute, print, search, or link to the full
              texts of articles, provided appropriate credit is given to the original authors and source.
            </p>
            <p>
              TradMed International charges <strong>no Article Processing Charges (APC)</strong>. There are no
              submission fees, no publication fees, and no access fees to authors or readers.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-emerald-300 text-emerald-700 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-emerald-50 transition"
              >
                🔓 CC BY 4.0 Licence →
              </a>
            </div>
          </div>
        </section>

        {/* ── Copyright ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Copyright Policy
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Authors who publish in TradMed International <strong>retain copyright</strong> of their work.
              By submitting an article, authors grant TradMed International the right to publish, reproduce,
              and distribute the article under the CC BY 4.0 open-access licence.
            </p>
            <p>
              Authors confirm that the submitted work is original, has not been previously published elsewhere,
              and is not under consideration for publication in another journal. Where the work includes
              third-party content (e.g. figures, tables), authors are responsible for obtaining appropriate
              permissions.
            </p>
            <p className="font-semibold">
              © {year} The respective authors. Published by Mind Meditate Resources under CC BY 4.0.
            </p>
          </div>
        </section>

        {/* ── Peer Review ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Peer Review Process
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              All submitted manuscripts undergo <strong>double-blind peer review</strong>. Both authors and
              reviewers remain anonymous throughout the review process. Each manuscript is assessed by at least
              two independent reviewers with expertise in the relevant subject area.
            </p>
            <p>
              Manuscripts are evaluated for scientific rigour, originality, clarity, methodology, and
              contribution to the field. The Editor-in-Chief makes the final publication decision based on
              reviewer recommendations.
            </p>
            <p>
              TradMed International follows the publication ethics guidelines of the{' '}
              <strong>Committee on Publication Ethics (COPE)</strong>. Plagiarism, data fabrication, and
              duplicate submission constitute grounds for immediate rejection and retraction.
            </p>
          </div>
        </section>

        {/* ── Archiving ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Digital Archiving &amp; DOI
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Published articles are deposited with <strong>Zenodo</strong> (operated by CERN, Geneva,
              Switzerland), ensuring long-term preservation and permanent accessibility. Each article receives
              a unique <strong>Digital Object Identifier (DOI)</strong> via Zenodo upon publication.
            </p>
            <p>
              DOI prefix: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 text-xs">10.5281/zenodo.*</code>
            </p>
          </div>
        </section>

        {/* ── Corrections & Retractions ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Corrections &amp; Retractions
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Authors who identify errors in their published work should contact the editorial office promptly.
              Significant errors may result in a published correction notice or, in serious cases, retraction
              in accordance with COPE guidelines.
            </p>
          </div>
        </section>

        {/* ── Conflict of Interest ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Conflict of Interest &amp; Funding Disclosure
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed">
            <p>
              Authors must disclose any financial or non-financial conflicts of interest and all funding sources
              that may have influenced the research. Disclosure statements are published with each article.
            </p>
          </div>
        </section>

        {/* ── Privacy ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Privacy Statement
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed">
            <p>
              Names and email addresses submitted to TradMed International are used exclusively for the stated
              purposes of this journal and will not be made available for any other purpose or shared with
              any third party, in accordance with Malaysia's Personal Data Protection Act 2010 (PDPA).
            </p>
          </div>
        </section>

      </div>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 text-sm mt-10">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-white">TradMed International</span>
          <div className="flex gap-5 text-xs">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/editorial-board" className="hover:text-white">Editorial Board</Link>
            <Link to="/journal-policy" className="hover:text-white">Journal Policy</Link>
            <Link to="/papers" className="hover:text-white">Papers</Link>
          </div>
          <span className="text-xs text-slate-500">© {year} Mind Meditate Resources. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
