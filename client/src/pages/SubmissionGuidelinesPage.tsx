import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';

export default function SubmissionGuidelinesPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Nav (guests only — sidebar replaces when logged in) ── */}
      {!user && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/papers" className="text-lg font-bold text-indigo-700 tracking-tight">
              Traditional Medicine International
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
              <Link to="/about" className="hover:text-indigo-700">About</Link>
              <Link to="/editorial-board" className="hover:text-indigo-700">Editorial Board</Link>
              <Link to="/journal-policy" className="hover:text-indigo-700">Journal Policy</Link>
              <Link to="/publication-ethics" className="hover:text-indigo-700">Publication Ethics</Link>
              <Link to="/submission-guidelines" className="text-indigo-700 font-semibold">Submit Guidelines</Link>
              <Link to="/papers" className="hover:text-indigo-700">Papers</Link>
              <Link to="/register" className="bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition text-xs font-semibold">
                Submit Research
              </Link>
            </nav>
          </div>
        </header>
      )}

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-900 to-violet-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1 rounded-full inline-block mb-4">
            Traditional Medicine International
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Submission Guidelines</h1>
          <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed">
            Information for authors on scope, article types, manuscript preparation,
            and the submission process for Traditional Medicine International.
          </p>
          <div className="mt-6">
            <Link
              to="/register"
              className="inline-block bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 transition text-sm"
            >
              Submit Your Manuscript →
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">

        {/* ── Quick Summary ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Article Processing Charge', value: 'Up to USD 150' },
            { label: 'Peer Review', value: 'Double-blind' },
            { label: 'Review Time', value: '4–8 weeks' },
            { label: 'Language', value: 'English' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className="font-bold text-indigo-700 text-sm">{value}</p>
            </div>
          ))}
        </section>

        {/* ── Scope ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Scope &amp; Aims
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Traditional Medicine International (TMI) publishes original research, reviews, and case studies
              in the fields of traditional, complementary, and integrative medicine. The journal particularly
              welcomes work aligned with systems recognised under the <strong>Malaysian T&amp;CM framework</strong>{' '}
              (Ministry of Health), <strong>Ministry of AYUSH</strong> (India), and global ethnomedicine traditions.
            </p>
            <p>
              Submissions should advance the scientific understanding, standardisation, safety evaluation,
              or clinical application of traditional medicine modalities. The journal does not consider
              submissions that are purely clinical case reports without a traditional/integrative medicine
              focus.
            </p>
          </div>
        </section>

        {/* ── Article Types ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Article Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                type: 'Original Research Article',
                desc: 'Reports of new experimental or observational research. Must include Introduction, Methods, Results, and Discussion (IMRaD structure). No word limit, but conciseness is encouraged.',
              },
              {
                type: 'Review Article',
                desc: 'Comprehensive, critical review of a topic. Systematic reviews and meta-analyses are particularly welcomed and should follow PRISMA guidelines. Narrative reviews should have a clear framework.',
              },
              {
                type: 'Case Report',
                desc: 'Clinically significant cases illustrating a novel traditional/integrative medicine intervention or outcome. Must include patient consent and follow CARE reporting guidelines.',
              },
              {
                type: 'Short Communication',
                desc: 'Preliminary findings or focused observations of scientific interest. Max 2,500 words, 1 table or figure, 20 references.',
              },
              {
                type: 'Commentary / Editorial',
                desc: 'Expert perspective on a published article or emerging topic in traditional medicine. By invitation or submission. Max 1,500 words.',
              },
              {
                type: 'Letter to the Editor',
                desc: 'Response to recently published TMI articles or brief scientific observations. Max 600 words, 5 references, 1 author affiliation.',
              },
            ].map(({ type, desc }) => (
              <div key={type} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{type}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Manuscript Preparation ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Manuscript Preparation
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5 text-sm text-gray-700 leading-relaxed">

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">File Format</h3>
              <p>Submit the manuscript as a <strong>PDF file</strong>. The system will extract text for AI pre-screening. A separate Word (.docx) version may be requested during revision.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Language &amp; Style</h3>
              <p>Manuscripts must be written in <strong>clear, standard English</strong>. Non-native English speakers are encouraged to have manuscripts reviewed by a native speaker or language editing service before submission. The journal does not offer language editing.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Title Page</h3>
              <p>Include: (1) full title, (2) names and institutional affiliations of all authors, (3) corresponding author name, email, and ORCID iD (if available), (4) word count, (5) number of tables and figures.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Abstract</h3>
              <p>Structured abstract of <strong>250–300 words</strong> for original research, with sections: Background, Methods, Results, Conclusions. Unstructured abstracts (100–200 words) are acceptable for reviews and commentaries. Do not cite references in the abstract.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Keywords</h3>
              <p>Provide <strong>4–8 keywords</strong> that are not already present in the title. Use MeSH (Medical Subject Headings) terms where possible.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Structure (IMRaD)</h3>
              <p>Original research should follow: <strong>Introduction · Methods · Results · Discussion · Conclusion</strong>. Include subheadings where appropriate. The Methods section must provide sufficient detail to allow replication.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Figures &amp; Tables</h3>
              <p>All figures and tables must be cited in the text in order. Provide captions that are self-explanatory. Figures must be at least 300 DPI. Tables should be formatted in simple borders without colour fills for accessibility.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">References</h3>
              <p>Use <strong>Vancouver style</strong> (numbered, in order of citation). References should be cited as superscript numbers in the text. Include DOIs where available. Examples:</p>
              <div className="bg-gray-50 rounded-lg p-4 mt-2 text-xs font-mono text-gray-600 space-y-1">
                <p>1. Rajenthiran M, Bala S. Siddha medicine formulations in metabolic syndrome. Trad Med Int. 2026;1(5):1. doi:10.5281/zenodo.XXXXXXX</p>
                <p>2. World Health Organization. WHO global report on traditional and complementary medicine. Geneva: WHO; 2019.</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Supplementary Sections Required</h3>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li><strong>Acknowledgements:</strong> funding sources, technical assistance, AI tool use disclosure</li>
                <li><strong>Funding Statement:</strong> include grant numbers and funding body names</li>
                <li><strong>Conflict of Interest Statement:</strong> disclose or state "The authors declare no conflict of interest"</li>
                <li><strong>Data Availability Statement:</strong> state where data can be accessed or explain why data is restricted</li>
                <li><strong>Ethical Approval:</strong> include committee name, reference number, and confirmation of informed consent (if applicable)</li>
              </ul>
            </div>

          </div>
        </section>

        {/* ── Submission Process ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Submission Process
          </h2>
          <ol className="space-y-4">
            {[
              { step: '1', title: 'Create an Account', desc: 'Register at tradmedint.com. Select "Author" as your role. You only need to do this once.' },
              { step: '2', title: 'Complete Your Profile', desc: 'Add your institutional affiliation and area of expertise to your author profile before submitting.' },
              { step: '3', title: 'Submit the Manuscript', desc: 'Upload your PDF, fill in the title, abstract, keywords, author details, and article type through the online submission form.' },
              { step: '4', title: 'AI Pre-screening', desc: 'An automated pre-review checks for scope fit, structure completeness, and basic quality indicators. You will receive a Pre-Review Report within minutes. This does not replace peer review.' },
              { step: '5', title: 'Editorial Screening', desc: 'The Editor-in-Chief screens the submission for scope and quality before assigning to peer reviewers. This typically takes 1–3 working days.' },
              { step: '6', title: 'Double-blind Peer Review', desc: 'At least two independent reviewers assess the manuscript. Reviewer identities and author identities are concealed. Review typically takes 4–8 weeks.' },
              { step: '7', title: 'Decision &amp; Revision', desc: 'Possible decisions: Accept, Minor Revision, Major Revision, or Reject. For revisions, authors must respond to all reviewer comments and resubmit within the stated deadline.' },
              { step: '8', title: 'Publication', desc: 'Accepted manuscripts are published online-first with a DOI. Articles are assigned to a volume and issue upon publication.' },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{step}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-0.5" dangerouslySetInnerHTML={{ __html: title }} />
                  <p className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: desc }} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Checklist ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Pre-submission Checklist
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                'The manuscript has not been submitted elsewhere and is not under review at another journal',
                'All authors meet the authorship criteria and have approved the final version',
                'The abstract is structured (250–300 words for original research)',
                '4–8 keywords are provided',
                'References are in Vancouver style with DOIs where available',
                'All figures are at least 300 DPI and cited in order',
                'Ethics committee approval and informed consent details are included (where applicable)',
                'Funding, conflict of interest, and data availability statements are included',
                'AI tool use (if any) is disclosed in the Acknowledgements',
                'The PDF is complete and all pages are readable',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded border-2 border-indigo-300 inline-block" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Ready to Submit?</h3>
          <p className="text-indigo-100 text-sm max-w-lg mx-auto mb-5">
            Create a free author account and submit your manuscript for peer review.
            APC up to USD 150 — discounts and waivers available on request.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-50 transition text-sm"
          >
            Create Account &amp; Submit →
          </Link>
        </section>

      </div>

      {/* ── Footer (guests only — sidebar provides footer when logged in) ── */}
      {!user && (
        <footer className="bg-slate-900 text-slate-400 text-sm mt-16">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-bold text-white">Traditional Medicine International</span>
            <div className="flex gap-5 text-xs flex-wrap justify-center">
              <Link to="/about" className="hover:text-white">About</Link>
              <Link to="/editorial-board" className="hover:text-white">Editorial Board</Link>
              <Link to="/journal-policy" className="hover:text-white">Journal Policy</Link>
              <Link to="/publication-ethics" className="hover:text-white">Publication Ethics</Link>
              <Link to="/submission-guidelines" className="hover:text-white">Submit Guidelines</Link>
              <Link to="/papers" className="hover:text-white">Papers</Link>
            </div>
            <span className="text-xs text-slate-500">© {new Date().getFullYear()} Mind Meditate Resources. All rights reserved.</span>
          </div>
        </footer>
      )}
    </div>
  );
}
