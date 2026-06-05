import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/authStore';

interface BoardMember {
  name: string;
  title: string;
  specialty?: string;
  institution: string;
  institution2?: string;
  country: string;
  role?: string;
}

const EDITOR_IN_CHIEF: BoardMember = {
  name: 'Professor Dr. M. Rajantheran',
  title: 'Director, AIMST Centre for Indian Culture and Tamil Civilization',
  institution: 'AIMST University, Bedong, Kedah',
  country: 'Malaysia',
  role: 'Editor-in-Chief',
};

const FOUNDING_EDITOR: BoardMember = {
  name: 'Ts. Dr. Sivabalan Vellasamy, Ed.D.',
  title: 'Researcher in Education, Holistic Science & Human Development',
  institution: 'Vice President, Malaysian Indian Siddha and Ayurveda Association (MISAA)',
  institution2: 'President, Malaysian Skills and Social Development Association (PPKSM)',
  country: 'Malaysia',
  role: 'Founding Editorial Board Member',
};

const BOARD_MEMBERS: BoardMember[] = [
  {
    name: 'Dr. Bala Sundaram Muthuvenkatachalam',
    title: 'Associate Professor, Faculty of Medicine',
    institution: 'AIMST University, Bedong, Kedah',
    country: 'Malaysia',
  },
  {
    name: 'Dr. Rajesh Ramasamy, PhD',
    title: 'Associate Professor, Immunology Unit, Department of Pathology',
    specialty: 'PhD — Imperial College London',
    institution: 'Faculty of Medicine and Health Sciences, Universiti Putra Malaysia (UPM)',
    country: 'Serdang, Selangor, Malaysia',
  },
];

function MemberCard({ member, highlight, accent }: { member: BoardMember; highlight?: boolean; accent?: 'indigo' | 'violet' }) {
  const badgeCls = accent === 'violet'
    ? 'bg-violet-600 text-white'
    : 'bg-indigo-600 text-white';
  const cardCls = highlight
    ? accent === 'violet' ? 'bg-violet-50 border-violet-200' : 'bg-indigo-50 border-indigo-200'
    : 'bg-white border-gray-200';
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${cardCls}`}>
      {member.role && (
        <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-3 ${badgeCls}`}>
          {member.role}
        </span>
      )}
      <h3 className="font-bold text-gray-900 text-base">{member.name}</h3>
      <p className="text-sm text-indigo-700 font-medium mt-0.5">{member.title}</p>
      {member.specialty && (
        <p className="text-xs text-violet-600 font-medium mt-0.5">{member.specialty}</p>
      )}
      <p className="text-sm text-gray-600 mt-1">{member.institution}</p>
      {member.institution2 && (
        <p className="text-sm text-gray-600 mt-0.5">{member.institution2}</p>
      )}
      <p className="text-xs text-gray-400 mt-1">📍 {member.country}</p>
    </div>
  );
}

export default function EditorialBoardPage() {
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
              <Link to="/about" className="hover:text-indigo-700">About</Link>
              <Link to="/editorial-board" className="text-indigo-700 font-semibold">Editorial Board</Link>
              <Link to="/journal-policy" className="hover:text-indigo-700">Journal Policy</Link>            <Link to="/publication-ethics" className="hover:text-indigo-700">Publication Ethics</Link>
            <Link to="/submission-guidelines" className="hover:text-indigo-700">Submit Guidelines</Link>              <Link to="/papers" className="hover:text-indigo-700">Papers</Link>
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Editorial Board</h1>
          <p className="text-indigo-200 text-lg max-w-2xl leading-relaxed">
            Traditional Medicine International is guided by an editorial team of experts in traditional, complementary,
            and integrative medicine from Malaysia, India, and the international community.
          </p>
        </div>
      </section>

      {/* ── Journal Masthead Strip ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-gray-500">
          <span><span className="font-semibold text-gray-700">Publisher:</span> Mind Meditate Resources, Malaysia</span>
          <span><span className="font-semibold text-gray-700">First Published:</span> 2026</span>
          <span><span className="font-semibold text-gray-700">Frequency:</span> Continuous (online-first)</span>
          <span><span className="font-semibold text-gray-700">e-ISSN:</span> 3154-7443</span>
          <span><span className="font-semibold text-gray-700">Licence:</span> CC BY 4.0 &middot; No APC</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* ── Founding Editor ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 border-l-4 border-violet-600 pl-4">
            Founding Editor
          </h2>
          <MemberCard member={FOUNDING_EDITOR} highlight accent="violet" />
        </section>

        {/* ── Editor-in-Chief ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 border-l-4 border-indigo-600 pl-4">
            Editor-in-Chief
          </h2>
          <MemberCard member={EDITOR_IN_CHIEF} highlight />
        </section>

        {/* ── Editorial Board ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 border-l-4 border-indigo-600 pl-4">
            Editorial Board Members
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BOARD_MEMBERS.map((m) => (
              <MemberCard key={m.name} member={m} />
            ))}
          </div>
        </section>



        {/* ── Join Board CTA ── */}
        <section className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Interested in Joining the Editorial Board?</h3>
          <p className="text-indigo-100 text-sm max-w-lg mx-auto mb-5">
            We invite qualified researchers and practitioners in traditional and complementary medicine to
            apply for editorial board membership. Board members contribute to peer review assignment and
            journal quality assurance.
          </p>
          <a
            href="mailto:editor@tradmedint.com?subject=Editorial Board Application — Traditional Medicine International"
            className="inline-block bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-50 transition text-sm"
          >
            Apply via Email →
          </a>
        </section>

      </div>

      {/* ── Footer (guests only — sidebar provides footer when logged in) ── */}
      {!user && (
        <footer className="bg-slate-900 text-slate-400 text-sm mt-10">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-bold text-white">Traditional Medicine International</span>
            <div className="flex gap-5 text-xs">
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
