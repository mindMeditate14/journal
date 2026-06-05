import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';

export default function PublicationEthicsPage() {
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
              <Link to="/publication-ethics" className="text-indigo-700 font-semibold">Publication Ethics</Link>
              <Link to="/submission-guidelines" className="hover:text-indigo-700">Submit Guidelines</Link>
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Publication Ethics</h1>
          <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed">
            Traditional Medicine International is committed to the highest standards of publication ethics
            and follows the guidelines of the Committee on Publication Ethics (COPE).
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">

        {/* ── COPE Commitment ── */}
        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex gap-4">
          <div className="shrink-0 mt-0.5">
            <span className="inline-block w-10 h-10 rounded-full bg-indigo-600 text-white text-lg flex items-center justify-center font-bold">C</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">COPE Member Commitment</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Traditional Medicine International adheres to the principles and best practice guidelines of the{' '}
              <strong>Committee on Publication Ethics (COPE)</strong>. All parties — authors, editors, reviewers,
              and the publisher — are expected to uphold these standards.
              See <a href="https://publicationethics.org" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">publicationethics.org</a>.
            </p>
          </div>
        </section>

        {/* ── Authors ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Duties of Authors
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Originality &amp; Plagiarism</h3>
              <p>Authors must ensure that submitted work is entirely original. Any use of others' work must be properly cited. Plagiarism, self-plagiarism (duplicate submission), and data falsification/fabrication in any form constitute serious ethical violations and will result in immediate rejection and may be reported to the author's institution.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Authorship</h3>
              <p>All listed authors must have made a genuine intellectual contribution to the research (conception, design, execution, interpretation, or writing). Individuals who contributed technically or administratively should be acknowledged but not listed as authors. Guest authorship and ghost authorship are not permitted.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Concurrent Submission</h3>
              <p>Authors must not submit the same manuscript simultaneously to more than one journal. Manuscripts under review at Traditional Medicine International must not be submitted elsewhere until the review process is concluded.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Conflicts of Interest &amp; Funding</h3>
              <p>All financial or non-financial relationships that could be perceived as a conflict of interest must be disclosed at submission. All funding sources that supported the research must be stated in the manuscript.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Data Accuracy &amp; Integrity</h3>
              <p>Authors should retain raw data related to their submitted manuscript and must be prepared to provide access to such data upon editorial request. Fabrication or manipulation of research data constitutes scientific misconduct.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Errors in Published Work</h3>
              <p>Authors who discover a significant error in their published article are obligated to notify the editorial office promptly. The journal will issue a correction notice or, if necessary, a retraction in accordance with COPE guidelines.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Informed Consent &amp; Ethical Approval</h3>
              <p>Studies involving human subjects or animals must confirm that appropriate ethical approval was obtained from a recognised ethics committee. Informed consent must be obtained from all human participants. Details of the approving body and reference number must be stated in the Methods section.</p>
            </div>
          </div>
        </section>

        {/* ── Editors ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Duties of Editors
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Fair Evaluation</h3>
              <p>Manuscripts are evaluated solely on their scientific merit, regardless of the authors' race, gender, religious belief, ethnicity, citizenship, or political views. Editors will not disclose any information about submitted manuscripts to anyone other than the corresponding author, reviewers, or the publisher.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Confidentiality</h3>
              <p>Editors must not use unpublished information in a submitted manuscript for their own research without written permission from the authors.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Conflicts of Interest</h3>
              <p>Editors will recuse themselves from handling manuscripts where they have a conflict of interest (e.g. collaborative, competitive, or personal relationship with the author). Such manuscripts will be assigned to another member of the editorial board.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Decision to Publish</h3>
              <p>The editor's decision to accept or reject a manuscript is final and based on the manuscript's importance, originality, clarity, and relevance to the journal's scope. The editor may be guided by the policies of the journal and constrained by applicable legal requirements regarding defamation, copyright infringement, and plagiarism.</p>
            </div>
          </div>
        </section>

        {/* ── Reviewers ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Duties of Reviewers
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Confidentiality</h3>
              <p>All manuscripts received for review must be treated as confidential documents. Reviewers must not share the manuscript or discuss its contents with others without prior authorisation from the editor.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Objectivity</h3>
              <p>Reviews should be conducted objectively. Personal criticism of the author is inappropriate. Reviewers should express their views clearly with supporting arguments.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Conflicts of Interest</h3>
              <p>Reviewers must decline review assignments where they have a conflict of interest, and must disclose to the editor any such conflicts that may arise during review. They should not accept manuscripts where they have a competitive, collaborative, or other relationship with the author.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Timeliness</h3>
              <p>Reviewers who do not feel qualified or are unable to review in a timely manner should notify the editor promptly so that alternative reviewers can be assigned.</p>
            </div>
          </div>
        </section>

        {/* ── Misconduct ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Handling Misconduct &amp; Complaints
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Suspected cases of research or publication misconduct — including plagiarism, data fabrication,
              duplicate submission, authorship disputes, or undisclosed conflicts — should be reported to the
              editorial office at{' '}
              <a href="mailto:editor@tradmedint.com" className="text-indigo-600 hover:underline">editor@tradmedint.com</a>.
            </p>
            <p>
              Complaints will be investigated in accordance with COPE's flowcharts and guidance. The journal
              reserves the right to contact authors' institutions, funding bodies, or other relevant parties
              if a serious breach of ethics is confirmed. Retracted articles are clearly marked and remain
              accessible with a retraction notice.
            </p>
            <p>
              Authors, reviewers, or readers who believe they have identified misconduct or have a complaint
              regarding editorial decisions may write to the Editor-in-Chief. If the concern relates to the
              Editor-in-Chief, it should be addressed to the publisher at{' '}
              <a href="mailto:editor@tradmedint.com" className="text-indigo-600 hover:underline">editor@tradmedint.com</a>.
            </p>
          </div>
        </section>

        {/* ── AI Use Policy ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Generative AI Use Policy
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-gray-700 leading-relaxed space-y-3">
            <p>
              Authors may use generative AI tools (e.g. ChatGPT, Copilot) solely to improve the language and
              readability of their manuscript. AI tools may not be used to generate, fabricate, or materially
              create scientific content, analyses, data, conclusions, or references.
            </p>
            <p>
              AI tools cannot be listed as an author. Where AI assistance was used for language editing,
              authors must disclose this in the Acknowledgements section, specifying the tool used and the
              nature of assistance.
            </p>
            <p>
              The authors remain fully responsible for the integrity, originality, and accuracy of all content
              in the submitted manuscript.
            </p>
          </div>
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
