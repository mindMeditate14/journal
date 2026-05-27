import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';

export default function AboutPage() {
  const user = useAuthStore((state) => state.user);
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Nav (guests only — sidebar replaces this when logged in) ── */}
      {!user && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/papers" className="text-lg font-bold text-indigo-700 tracking-tight">
              Traditional Medicine International
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
              <Link to="/about" className="text-indigo-700 font-semibold">About</Link>
              <Link to="/editorial-board" className="hover:text-indigo-700">Editorial Board</Link>
              <Link to="/journal-policy" className="hover:text-indigo-700">Journal Policy</Link>
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
            Open Access · Peer Reviewed · Est. 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About Traditional Medicine International</h1>
          <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed">
            A global open-access academic journal dedicated to advancing evidence-based research in
            traditional, complementary, and integrative medicine.
          </p>
        </div>
      </section>

      {/* ── Journal Masthead Strip ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-gray-500">
          <span><span className="font-semibold text-gray-700">Publisher:</span> Mind Meditate Resources, Malaysia</span>
          <span><span className="font-semibold text-gray-700">First Published:</span> 2026</span>
          <span><span className="font-semibold text-gray-700">Frequency:</span> Continuous (online-first)</span>
          <span><span className="font-semibold text-gray-700">e-ISSN:</span> Pending registration &mdash; <a href="/journal-policy" className="text-indigo-600 hover:underline">Journal Policy</a></span>
          <span><span className="font-semibold text-gray-700">Licence:</span> CC BY 4.0 &middot; No APC</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* ── Aims & Scope ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Aims &amp; Scope
          </h2>
          <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed space-y-4">
            <p>
              <strong>Traditional Medicine International</strong> is an online, open-access, peer-reviewed academic journal
              published continuously by <strong>Mind Meditate Resources</strong>, Malaysia. The journal provides
              an international platform for the publication of original research, review articles, case studies,
              and systematic reviews in the fields of traditional, complementary, and integrative medicine.
            </p>
            <p>
              The journal serves a global community of practitioners, researchers, clinicians, and academicians
              with a particular focus on systems recognised under the <strong>Traditional and Complementary
              Medicine (T&amp;CM)</strong> framework of the Malaysian Ministry of Health (KKM), including
              Malay traditional medicine, traditional Chinese medicine (TCM), and traditional Indian medicine
              (Ayurveda and Siddha). The journal also aligns with the research objectives of the
              <strong> Ministry of AYUSH</strong> (Ayurveda, Yoga &amp; Naturopathy, Unani, Siddha, and
              Homeopathy), Government of India.
            </p>
            <p>
              Traditional Medicine International welcomes submissions that contribute to the scientific understanding,
              standardisation, safety evaluation, and clinical application of traditional medicine modalities.
              The journal is committed to rigorous double-blind peer review and adheres to international
              publication ethics standards (COPE).
            </p>
          </div>
        </section>

        {/* ── Focus Areas ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-5 border-l-4 border-indigo-600 pl-4">
            Subject Coverage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { area: 'Ayurveda & Siddha Medicine', desc: 'Classical formulations, clinical trials, pharmacognosy, and Panchakarma therapies.' },
              { area: 'Herbal & Plant Medicine', desc: 'Ethnobotany, phytochemistry, herbal pharmacology, and medicinal plant documentation.' },
              { area: 'Traditional Malay Medicine', desc: 'Jamu, Bomoh practices, indigenous Malaysian healing traditions, and Malay herbalism.' },
              { area: 'Traditional Chinese Medicine', desc: 'Acupuncture, Chinese herbal medicine, qigong, and TCM clinical research.' },
              { area: 'Integrative & Complementary Health', desc: 'Evidence-based integration of traditional medicine with conventional healthcare systems.' },
              { area: 'Unani & Homeopathy', desc: 'Research aligned with AYUSH modalities, dosage standardisation, and pharmacovigilance.' },
              { area: 'Clinical Trials & Safety', desc: 'Randomised controlled trials, systematic reviews, meta-analyses in T&CM.' },
              { area: 'Health Policy & Education', desc: 'T&CM regulation, practitioner training, national and international health policy.' },
            ].map(({ area, desc }) => (
              <div key={area} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">{area}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Target Audience ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            Target Audience
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
            <li>Registered T&amp;CM practitioners under the Malaysian Traditional and Complementary Medicine Act (Act 775)</li>
            <li>Researchers and academicians in traditional medicine, pharmacognosy, and integrative health sciences</li>
            <li>AYUSH practitioners and researchers in India and South/Southeast Asia</li>
            <li>Medical professionals interested in evidence-based complementary therapies</li>
            <li>Health policymakers and regulatory bodies overseeing T&amp;CM practice</li>
            <li>Postgraduate students in traditional medicine and natural health sciences</li>
          </ul>
        </section>

        {/* ── Publication Info ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-5 border-l-4 border-indigo-600 pl-4">
            Publication Information
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Journal Title', 'Traditional Medicine International'],
                  ['Journal Website', 'https://tradmedint.com'],
                  ['Contact', 'editor@tradmedint.com'],
                  ['Publication Medium', 'Online (Open Access)'],
                  ['Publication Model', 'Continuous publication (articles published as accepted)'],
                  ['Article Processing Charges', 'None — fully open access, no APC'],
                  ['Peer Review', 'Double-blind'],
                  ['Language', 'English'],
                  ['First Year of Publication', '2026'],
                  ['ISSN (Online)', 'Pending registration'],
                  ['Open Access Licence', 'Creative Commons Attribution 4.0 International (CC BY 4.0)'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-t border-gray-100 first:border-t-0">
                    <td className="px-5 py-3 font-semibold text-gray-600 w-1/3 bg-gray-50">{label}</td>
                    <td className="px-5 py-3 text-gray-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 px-5 pb-4 mt-2 leading-relaxed">
              Published by <strong className="text-gray-500">Mind Meditate Resources</strong>,
              H-07-03, Jalan Blok H, Pusat Komersial Dataran Ecohill, Jalan Ecohill 1/2,
              Semenyih, 43500 Semenyih, Selangor, Malaysia.
            </p>
          </div>
        </section>

        {/* ── Preface / Foreword ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-indigo-600 pl-4">
            From the Founding Editorial Board Member
          </h2>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-gray-700 leading-relaxed space-y-3 text-sm italic">
            <p>
              Traditional medicine represents thousands of years of accumulated knowledge — a living inheritance
              shared across cultures and generations. Yet the scientific community has only begun to systematically
              document, evaluate, and validate these healing traditions through rigorous research methodology.
            </p>
            <p>
              Traditional Medicine International was founded to bridge this gap. We believe that traditional medicine deserves
              a dedicated, credible, open-access publishing platform that serves both the practitioner community
              and the global research ecosystem. By making all content freely accessible, we ensure that advances
              in traditional medicine science reach practitioners, policymakers, and patients regardless of
              institutional affiliation or geography.
            </p>
            <p>
              We invite researchers, clinicians, and scholars to contribute their work and join us in building
              an evidence base that honours the depth of traditional healing knowledge while advancing it through
              the tools of modern science.
            </p>
            <p className="not-italic font-semibold text-gray-900 mt-4">
              Ts. Dr. Sivabalan Vellasamy, Ed.D.<br />
              <span className="font-normal text-gray-600 text-xs">Founding Editorial Board Member, Traditional Medicine International</span>
            </p>
          </div>
        </section>

        {/* ── About the Founding Member ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-violet-600 pl-4">
            About the Founding Editorial Board Member
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              <strong>Ts. Dr. Sivabalan Vellasamy, Ed.D.</strong> holds a Doctorate in Education and brings
              interdisciplinary expertise spanning holistic science, traditional medicine research, human
              development, and technology-integrated education. He currently serves as <strong>Vice President
              of the Malaysian Indian Siddha and Ayurveda Association (MISAA)</strong> and <strong>President
              of the Malaysian Skills and Social Development Association (PPKSM)</strong> — roles that place
              him at the intersection of traditional medicine advocacy, practitioner development, and
              community-centred research.
            </p>
            <p>
              He is the author of <strong>five books on Yogic Science and holistic human development</strong>,
              contributing to the growing body of literature that bridges classical wisdom traditions with
              contemporary scientific frameworks. His work emphasises the importance of contextualising
              traditional knowledge within evidence-based research methodology — a conviction that directly
              informs the editorial mission of this journal.
            </p>
            <p>
              Dr. Sivabalan is also the creator of <strong>Archetiq</strong>, an applied holistic science
              platform that maps individual personality archetypes, developmental tendencies, and life
              alignment pathways — a practical expression of the principles that underlie integrative
              human development research.
            </p>
            <p>
              His founding of <em>Traditional Medicine International</em> reflects a long-held belief that
              traditional healing knowledge — practised across millennia and carried by living communities —
              deserves a credible, open, and rigorously peer-reviewed publication home that serves both
              scholars and practitioners alike.
            </p>
          </div>
        </section>

      </div>

      {/* ── Footer (guests only — sidebar provides footer when logged in) ── */}
      {!user && (
        <footer className="bg-slate-900 text-slate-400 text-sm mt-16">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
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
