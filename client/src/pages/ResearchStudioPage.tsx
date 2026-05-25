import { useState, useMemo, useEffect, useRef } from 'react';
import {
  FlaskConical, BookOpen, MessageSquare, CheckSquare,
  ChevronRight, ChevronDown, ChevronUp, Search,
  AlertCircle, CheckCircle, Info, Lightbulb, ArrowLeft, Sparkles,
  BarChart2, Loader2, RefreshCw, FileText, Download, Plus
} from 'lucide-react';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale,
  ScatterController, PointElement, LineController, LineElement,
  Tooltip, Legend
} from 'chart.js';
import apiClient from '../api/client';
import data from '../data/statisticalTests.json';

Chart.register(BarController, BarElement, CategoryScale, LinearScale,
  ScatterController, PointElement, LineController, LineElement, Tooltip, Legend);

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'finder' | 'library' | 'interpret' | 'checklist' | 'analysis';

interface Test {
  id: string;
  name: string;
  altName?: string;
  category: string;
  tier: number;
  tierLabel: string;
  purpose: string;
  whenToUse: string;
  dataType: string;
  minSampleSize: number;
  assumptions: string[];
  tradMedExample: string;
  spssPath: string;
  keyOutputs: { name: string; meaning: string }[];
  interpretationNote: string;
  nonParametricAlt?: string | null;
  parametricVersion?: string | null;
  tags: string[];
}

interface ChecklistPhase {
  phase: string;
  color: string;
  items: string[];
}

const tests = data.tests as Test[];
const categories = data.categories as { id: string; label: string; color: string }[];
const checklist = data.researchChecklist as ChecklistPhase[];
const interpretGuide = data.interpretationGuide as Record<string, any>;
const wizardTree = data.wizardTree as Record<string, Record<string, any>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tierColors: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-purple-100 text-purple-800',
};

const catColors: Record<string, string> = {
  comparison:  'bg-blue-50 border-blue-200 text-blue-700',
  relationship:'bg-green-50 border-green-200 text-green-700',
  prediction:  'bg-purple-50 border-purple-200 text-purple-700',
  reliability: 'bg-amber-50 border-amber-200 text-amber-700',
  validity:    'bg-rose-50 border-rose-200 text-rose-700',
  normality:   'bg-slate-50 border-slate-200 text-slate-700',
  descriptive: 'bg-teal-50 border-teal-200 text-teal-700',
};

const phaseColors: Record<string, { border: string; bg: string; badge: string }> = {
  indigo: { border: 'border-indigo-400', bg: 'bg-indigo-50',   badge: 'bg-indigo-600 text-white' },
  blue:   { border: 'border-blue-400',   bg: 'bg-blue-50',     badge: 'bg-blue-600 text-white' },
  cyan:   { border: 'border-cyan-400',   bg: 'bg-cyan-50',     badge: 'bg-cyan-600 text-white' },
  violet: { border: 'border-violet-400', bg: 'bg-violet-50',   badge: 'bg-violet-600 text-white' },
  rose:   { border: 'border-rose-400',   bg: 'bg-rose-50',     badge: 'bg-rose-600 text-white' },
};

function getTestById(id: string) {
  return tests.find(t => t.id === id);
}

// ─── Test Card (Simple-First Design) ─────────────────────────────────────────

function TestCard({ test, highlight }: { test: Test; highlight?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);
  const guide = SIMPLE_GUIDE[test.id];
  const catStyle = catColors[test.category] ?? 'bg-gray-50 border-gray-200 text-gray-700';
  const hasVisual = !!VisualConcept({ testId: test.id });

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${highlight ? 'border-indigo-400 shadow-lg' : 'border-gray-200'}`}>

      {/* ── Header bar ── */}
      <div className={`px-4 pt-4 pb-3 ${highlight ? 'bg-indigo-50' : 'bg-white'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{guide?.emoji ?? '📌'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-bold text-gray-900 text-base leading-tight">{test.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierColors[test.tier]}`}>
                {test.tierLabel}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${catStyle}`}>
                {categories.find(c => c.id === test.category)?.label ?? test.category}
              </span>
            </div>
            {test.altName && (
              <p className="text-xs text-gray-400 italic mb-1">Also called: {test.altName}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Plain English explanation (always visible) ── */}
      {guide && (
        <div className="px-4 pb-4 bg-white space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">
              📖 In plain English
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{guide.simpleExplanation}</p>
          </div>

          {/* ── Analogy ── */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">
              💡 Think of it like this
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">{guide.analogy}</p>
          </div>

          {/* ── Visual diagram ── */}
          {hasVisual && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                📊 Visual example
              </p>
              <VisualConcept testId={test.id} />
            </div>
          )}

          {/* ── Traditional Medicine Example (always visible) ── */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5">
            <div className="flex items-start gap-2">
              <Lightbulb size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Real research example</p>
                <p className="text-sm text-indigo-800 leading-relaxed">{test.tradMedExample}</p>
              </div>
            </div>
          </div>

          {/* ── Toggle for technical details ── */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-colors"
          >
            <span>{showDetails ? 'Hide' : 'Show'} SPSS steps & technical details</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* ── Technical details (collapsible) ── */}
          {showDetails && (
            <div className="space-y-3 border-t border-gray-100 pt-3">

              {/* When to use (technical) */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">When exactly to use this test</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{test.whenToUse}</p>
              </div>

              {/* Data type */}
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data type required</h4>
                <p className="text-sm text-gray-700">{test.dataType}</p>
              </div>

              {/* Assumptions */}
              {test.assumptions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Requirements to check before running this test</h4>
                  <ul className="space-y-1.5">
                    {test.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Outputs */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">What to look for in SPSS output</h4>
                <div className="space-y-1.5">
                  {test.keyOutputs.map((o, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-gray-800">{o.name}</span>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{o.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SPSS Path */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">SPSS menu path — click exactly these menus</h4>
                <code className="text-xs bg-gray-900 text-green-400 px-3 py-2 rounded-lg block leading-relaxed whitespace-pre-wrap">
                  {test.spssPath}
                </code>
              </div>

              {/* Interpretation note */}
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">{test.interpretationNote}</p>
                </div>
              </div>

              {/* Related tests */}
              {(test.nonParametricAlt || test.parametricVersion) && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {test.nonParametricAlt && (
                    <p>⚠️ If data is NOT normal, use instead: <strong className="text-gray-700">{getTestById(test.nonParametricAlt)?.name}</strong></p>
                  )}
                  {test.parametricVersion && (
                    <p>ℹ️ Parametric version (for normal data): <strong className="text-gray-700">{getTestById(test.parametricVersion)?.name}</strong></p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fallback if no guide entry */}
      {!guide && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600">{test.purpose}</p>
        </div>
      )}
    </div>
  );
}

// ─── Test Finder (Wizard) ─────────────────────────────────────────────────────

type WizardStep = 'goal' | 'groupCount' | 'paired' | 'normalPaired' | 'normalIndep' | 'normalGroups' | 'relType' | 'normalRel' | 'predType' | 'valType' | 'result';

interface WizardAnswer { step: WizardStep; label: string; value: string }

// ─── Simple Guide — plain English for healers with no statistics background ──

const SIMPLE_GUIDE: Record<string, { emoji: string; simpleExplanation: string; analogy: string; visualType: string }> = {
  'descriptive-stats': {
    emoji: '📊',
    simpleExplanation: 'Before anything else, count and describe your patients. How many were in the study? Average age? How many were women? Think of this as the "patient profile" at the start of every case note — it MUST be done first before any other test.',
    analogy: '🩺 Think of it like a doctor\'s first check-up. Before treating a patient, the doctor records: name, age, weight, blood pressure. Descriptive statistics does the same thing for your entire dataset.',
    visualType: 'summary',
  },
  'shapiro-wilk': {
    emoji: '🔍',
    simpleExplanation: 'Before choosing your statistical test, you must check if your data follows a "bell-curve" shape. Some tests only work correctly with certain data shapes. This quick check tells you which path to take — like checking the weather before deciding how to travel.',
    analogy: '🛣️ Think of it like checking the road before driving. If the road is clear (p > 0.05) → take the highway (use T-Test, ANOVA). If there is a problem (p < 0.05) → take the safer side road (use Mann-Whitney, Kruskal-Wallis).',
    visualType: 'normality',
  },
  'independent-t-test': {
    emoji: '⚖️',
    simpleExplanation: 'You gave herbal treatment to Group A (30 patients) and nothing to Group B (30 different patients). After 4 weeks, you measured their pain. This test asks: "Was the pain difference between the two groups REAL — or just a lucky coincidence?" If p < 0.05, the difference is REAL.',
    analogy: '🌿 Imagine two farms. Farm A uses your herbal fertiliser. Farm B uses plain water. After harvest, you compare the crop yield. The T-Test asks: "Did the herbal fertiliser REALLY make a difference, or did Farm A just get lucky with the weather?"',
    visualType: 'comparison',
  },
  'paired-t-test': {
    emoji: '🔄',
    simpleExplanation: 'You measure PAIN in the SAME 30 patients BEFORE your Ayurvedic treatment, then AFTER 8 weeks of treatment. Did they get better? This test checks: "Is the improvement REAL, or could it just be natural recovery?" Same people, two measurements.',
    analogy: '⚖️ Imagine weighing the SAME patient before and after a 3-month herbal weight loss programme. If they lost weight, you want to know: "Did your remedy REALLY cause this, or did their weight just change naturally?" The Paired T-Test gives you the answer.',
    visualType: 'prepost',
  },
  'one-way-anova': {
    emoji: '🏆',
    simpleExplanation: 'You have THREE groups of patients: Group A (Siddha treatment), Group B (Ayurveda treatment), Group C (no treatment). You want to compare all three AT ONCE. ANOVA tells you if at least one group is significantly better. Then a follow-up test tells you WHICH one.',
    analogy: '🎭 Think of it like a healer\'s competition with 3 participants. ANOVA is the judge who says: "Yes, there IS a real winner here" or "No, they all performed the same." But ANOVA does NOT say WHO won — you need a post-hoc test (Tukey/Bonferroni) for that.',
    visualType: 'threegroups',
  },
  'mann-whitney-u': {
    emoji: '🛡️',
    simpleExplanation: 'This is the SAFER version of the T-Test. Use this instead of the T-Test when: (1) your group has LESS than 30 patients, OR (2) patients rated things on a 1–5 scale (Likert), OR (3) you are not sure if the data is normally shaped. It still compares two groups — just more safely.',
    analogy: '📊 Instead of comparing exact marks (68%, 72%, 85%...), this test ranks everyone from best to worst (1st, 2nd, 3rd...) and compares the rankings. Ranking is fairer when group sizes are small or scores are uneven.',
    visualType: 'comparison',
  },
  'wilcoxon': {
    emoji: '🛡️',
    simpleExplanation: 'This is the SAFER version of the Paired T-Test for before-and-after studies. Use this when measuring the SAME patients before and after treatment, but: (1) your group has less than 30 patients, OR (2) patients answered on a 1–5 rating scale.',
    analogy: '⚖️ Same idea as weighing patients before and after treatment — but using a gentler method that works even when the scale is not perfectly accurate or the group is small.',
    visualType: 'prepost',
  },
  'kruskal-wallis': {
    emoji: '🛡️',
    simpleExplanation: 'This is the SAFER version of ANOVA for 3+ groups. Use this when comparing three or more groups but the groups are small (less than 30 each), or patients answered on a 1–5 rating scale. Same idea as ANOVA — just uses rankings instead of exact numbers.',
    analogy: '🏆 Same as the ANOVA healer competition, but the judge ranks all participants together (1st, 2nd, 3rd...) instead of comparing exact scores. Fairer for small groups or rating-scale data.',
    visualType: 'threegroups',
  },
  'pearson-correlation': {
    emoji: '🔗',
    simpleExplanation: 'Do patients who attend MORE sessions get BETTER results? Correlation answers this question. The result (called r) is a number between −1 and +1. If r = +0.8, it means YES, strongly connected. If r = 0.0, there is NO connection at all. Both variables must be continuous numbers.',
    analogy: '📚 Think of the connection between study hours and exam scores. Students who study MORE tend to score HIGHER — that is a positive correlation (r close to +1). In your clinic: do patients who come more often heal faster?',
    visualType: 'correlation',
  },
  'spearman-correlation': {
    emoji: '🔗',
    simpleExplanation: 'This is the SAME as Pearson Correlation but works better with RATING SCALES (1=Strongly Disagree to 5=Strongly Agree). If your questionnaire uses Likert scales, ALWAYS use Spearman instead of Pearson. The interpretation of r is identical.',
    analogy: '📋 Same as checking if "more study hours = higher score", but using rank positions (1st, 2nd, 3rd) instead of exact numbers. Perfect for questionnaire rating scales.',
    visualType: 'correlation',
  },
  'chi-square': {
    emoji: '🔲',
    simpleExplanation: 'This tests if two CATEGORIES are connected. Example: Is GENDER (male/female) connected to TREATMENT PREFERENCE (Ayurveda/TCM/Conventional)? Do women prefer Ayurveda more than men do? Chi-Square gives you the answer for category questions.',
    analogy: '📋 Imagine a tally chart: you mark which treatment each male/female patient chose. Chi-Square checks whether the pattern in that tally is REAL or just random chance. "Do women really choose Ayurveda more, or did it just happen that way in this sample?"',
    visualType: 'categories',
  },
  'linear-regression': {
    emoji: '🎯',
    simpleExplanation: 'This builds a PREDICTION FORMULA using your data. Example: Can you predict a patient\'s wellness score from their age + number of sessions attended + diet quality? Regression gives you a formula like: Wellness = (2.1 × sessions) + (0.3 × diet) − (0.1 × age) + 10. Very useful for writing your Discussion section.',
    analogy: '🌤️ Like a weather forecast formula. Meteorologists use temperature + humidity + wind speed to PREDICT tomorrow\'s rain. Regression does the same: it uses your patient factors to PREDICT their health outcome.',
    visualType: 'prediction',
  },
  'logistic-regression': {
    emoji: '✅',
    simpleExplanation: 'This predicts a YES or NO outcome. Example: Based on a patient\'s age, dosage, and treatment type, WILL they recover (Yes) or NOT recover (No)? It gives you the probability. Very commonly required by medical journals for clinical studies.',
    analogy: '🌧️ Like predicting whether it will RAIN tomorrow (Yes/No) based on temperature + clouds + humidity. Logistic regression predicts yes/no health outcomes based on patient characteristics.',
    visualType: 'prediction',
  },
  'cronbach-alpha': {
    emoji: '📏',
    simpleExplanation: 'If you have a questionnaire with 10 questions all measuring "how much the patient improved", Cronbach\'s Alpha checks: "Do all 10 questions consistently agree with each other?" If a patient felt a lot of improvement, they should answer HIGH on all questions, not high on some and low on others. Target: 0.70 or above.',
    analogy: '🌡️ Imagine 5 different thermometers measuring the same patient\'s temperature. If all 5 show ~37°C, they are CONSISTENT (high Alpha ✓). If they show 35°C, 38°C, 36°C, 40°C — they are UNRELIABLE (low Alpha ✗). Your questionnaire should be like the consistent thermometers.',
    visualType: 'questionnaire',
  },
  'test-retest': {
    emoji: '📅',
    simpleExplanation: 'Give the SAME questionnaire to the SAME 30 patients today, then again 2 weeks later WITHOUT any treatment in between. If the scores are similar both times, your questionnaire is STABLE and trustworthy. This proves your tool measures the construct reliably over time.',
    analogy: '⚖️ Like testing a weighing scale with a known 5kg weight today, and then again next week. If it always shows 5.0kg, the scale is reliable. If it shows 4.8kg one week and 5.3kg the next — the scale is broken. Your questionnaire should behave like a reliable scale.',
    visualType: 'prepost',
  },
  'efa': {
    emoji: '🔎',
    simpleExplanation: 'You have 30 questions in your NEW questionnaire, but you do not yet know which questions belong together. EFA automatically DISCOVERS hidden groups. It might find that Q1–Q10 all measure "Physical Wellness", Q11–Q20 measure "Mental Wellness", and Q21–Q30 measure "Spiritual Wellness" — WITHOUT you telling it in advance.',
    analogy: '🧺 Like sorting a mixed basket of fruits WITHOUT any labels. The computer automatically groups them: apples together, oranges together, mangoes together — based on their similarities. EFA does the same with your questionnaire items.',
    visualType: 'questionnaire',
  },
  'cfa': {
    emoji: '✔️',
    simpleExplanation: 'You ALREADY designed your questionnaire with 3 sections: Physical, Mental, and Spiritual Wellness. CFA checks: "Does my actual patient data CONFIRM this structure?" It tells you how well your original design matches reality. Required for high-quality instrument validation papers.',
    analogy: '📚 Like building a bookshelf with 3 sections (Fiction, Science, History) and then checking: "Did all the books end up in the RIGHT section?" CFA checks whether your questionnaire\'s planned structure actually works in practice.',
    visualType: 'questionnaire',
  },
  'effect-size': {
    emoji: '📐',
    simpleExplanation: 'A test might say "YES, there IS a statistically significant difference!" — but the actual difference could be TINY and practically useless. Effect size tells you HOW BIG the real-world difference is. Example: treatment reduced pain from 6.0 to 5.9 out of 10. Technically significant — but is a 0.1 change worth anything to a patient?',
    analogy: '📢 Like a product claiming "Clinically proven to reduce weight!" — but the actual loss was only 100 grams. Technically true, but practically meaningless. Effect size stops you from being impressed by technically-true but practically-useless results.',
    visualType: 'effectsize',
  },
};

// ─── Visual Diagram Components ───────────────────────────────────────────────

function BarChart({ bars }: { bars: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-400', violet: 'bg-violet-400', green: 'bg-green-400',
    gray: 'bg-gray-300', red: 'bg-red-300', amber: 'bg-amber-400',
  };
  return (
    <div className="flex items-end justify-center gap-4 h-24 mt-1">
      {bars.map((bar, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-700">{bar.value}</span>
          <div className="w-14 bg-gray-100 rounded-t-lg h-16 flex items-end overflow-hidden">
            <div
              className={`w-full rounded-t-lg ${colorMap[bar.color] ?? 'bg-indigo-400'} transition-all`}
              style={{ height: `${(bar.value / maxVal) * 100}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-600 leading-tight w-16">{bar.label}</p>
        </div>
      ))}
    </div>
  );
}

function PrePostArrow({ before, after }: { before: { label: string; value: number }; after: { label: string; value: number } }) {
  const improved = after.value < before.value;
  return (
    <div className="flex items-center justify-center gap-3 my-2">
      <div className="text-center">
        <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center text-2xl font-bold text-red-700">{before.value}</div>
        <p className="text-xs text-gray-500 mt-1 w-16 leading-tight">{before.label}</p>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl">→</span>
        <span className="text-xs text-gray-400">treatment</span>
      </div>
      <div className="text-center">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${improved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{after.value}</div>
        <p className="text-xs text-gray-500 mt-1 w-16 leading-tight">{after.label}</p>
      </div>
      <div className="text-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${improved ? 'bg-green-500' : 'bg-blue-500'}`}>
          {improved ? '✓' : '~'}
        </div>
        <p className="text-xs mt-1 text-gray-500">{improved ? 'Better!' : 'Stable'}</p>
      </div>
    </div>
  );
}

function CorrelationDots({ direction }: { direction: 'positive' | 'negative' }) {
  const dots = direction === 'positive'
    ? [{ x: 8, y: 72 }, { x: 20, y: 60 }, { x: 35, y: 45 }, { x: 48, y: 34 }, { x: 62, y: 22 }, { x: 75, y: 12 }]
    : [{ x: 8, y: 12 }, { x: 20, y: 22 }, { x: 35, y: 36 }, { x: 48, y: 48 }, { x: 62, y: 60 }, { x: 75, y: 72 }];
  return (
    <div className="relative bg-gray-50 border border-gray-200 rounded-lg" style={{ height: '90px', width: '100%' }}>
      <span className="absolute bottom-1 left-2 text-xs text-gray-400">Low</span>
      <span className="absolute bottom-1 right-2 text-xs text-gray-400">High</span>
      <span className="absolute top-1 left-2 text-xs text-gray-400">{direction === 'positive' ? '⬇ Low' : '⬆ High'}</span>
      {dots.map((d, i) => (
        <div key={i} className="absolute w-3 h-3 bg-indigo-500 rounded-full"
          style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)' }} />
      ))}
      <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-gray-500">
        {direction === 'positive' ? '📈 More of one = More of the other (Positive r)' : '📉 More of one = Less of the other (Negative r)'}
      </div>
    </div>
  );
}

function QuestionnaireFlow({ items, construct }: { items: string[]; construct: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1.5 flex-1">
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 leading-tight">{item}</div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        {items.slice(0, 4).map((_, i) => <span key={i} className="text-gray-400 text-xs">→</span>)}
      </div>
      <div className="bg-indigo-600 text-white rounded-xl px-3 py-4 text-xs font-bold text-center leading-tight max-w-[80px]">{construct}</div>
    </div>
  );
}

function PredictionFlow({ predictors, outcome }: { predictors: string[]; outcome: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1.5 flex-1">
        {predictors.map((p, i) => (
          <div key={i} className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 text-xs text-purple-700">{p}</div>
        ))}
      </div>
      <span className="text-gray-400 text-lg">→</span>
      <div className="bg-purple-600 text-white rounded-xl px-3 py-4 text-xs font-bold text-center leading-tight max-w-[80px]">{outcome}</div>
    </div>
  );
}

function EffectSizeRuler() {
  const sizes = [
    { label: 'Small', desc: 'd = 0.2', note: 'Barely noticeable to patients', color: 'bg-yellow-200', width: '25%' },
    { label: 'Medium', desc: 'd = 0.5', note: 'Noticeable difference', color: 'bg-orange-300', width: '50%' },
    { label: 'Large', desc: 'd = 0.8+', note: 'Very clear impact on patients', color: 'bg-red-400', width: '100%' },
  ];
  return (
    <div className="space-y-2">
      {sizes.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-14 font-medium">{s.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className={`h-full rounded-full ${s.color}`} style={{ width: s.width }} />
          </div>
          <span className="text-xs text-gray-400 w-24">{s.note}</span>
        </div>
      ))}
    </div>
  );
}

function NormalityRoad() {
  return (
    <div className="flex gap-3 text-center">
      <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3">
        <div className="text-2xl mb-1">🛣️</div>
        <div className="text-xs font-bold text-green-700">p &gt; 0.05</div>
        <div className="text-xs text-green-600 mt-1">Data IS normal → Use T-Test, ANOVA, Pearson</div>
      </div>
      <div className="flex items-center text-gray-400 font-bold text-lg">or</div>
      <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div className="text-2xl mb-1">🏔️</div>
        <div className="text-xs font-bold text-amber-700">p &lt; 0.05</div>
        <div className="text-xs text-amber-600 mt-1">Data NOT normal → Use Mann-Whitney, Kruskal-Wallis, Spearman</div>
      </div>
    </div>
  );
}

function SummaryCards() {
  return (
    <div className="grid grid-cols-2 gap-2 text-center text-xs">
      {[
        { icon: '👤', label: 'How many patients?', val: 'Count (N)' },
        { icon: '📅', label: 'Average age?', val: 'Mean ± SD' },
        { icon: '⚥', label: 'Gender split?', val: 'Frequency (%)' },
        { icon: '📊', label: 'Score range?', val: 'Min / Max' },
      ].map((c, i) => (
        <div key={i} className="bg-teal-50 border border-teal-100 rounded-xl p-2.5">
          <div className="text-lg mb-0.5">{c.icon}</div>
          <div className="text-gray-600 leading-tight">{c.label}</div>
          <div className="font-bold text-teal-700 mt-0.5">{c.val}</div>
        </div>
      ))}
    </div>
  );
}

function CategoryTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 text-xs">
      <table className="w-full text-center">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-1.5 px-2 font-semibold text-gray-500"></th>
            <th className="py-1.5 px-2 font-semibold text-indigo-700">Ayurveda</th>
            <th className="py-1.5 px-2 font-semibold text-indigo-700">TCM</th>
            <th className="py-1.5 px-2 font-semibold text-indigo-700">Conventional</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-100">
            <td className="py-1.5 px-2 font-medium text-gray-600">Female</td>
            <td className="py-1.5 px-2 text-green-700 font-bold">28</td>
            <td className="py-1.5 px-2">14</td>
            <td className="py-1.5 px-2">8</td>
          </tr>
          <tr className="border-t border-gray-100 bg-gray-50">
            <td className="py-1.5 px-2 font-medium text-gray-600">Male</td>
            <td className="py-1.5 px-2">12</td>
            <td className="py-1.5 px-2">18</td>
            <td className="py-1.5 px-2 text-blue-700 font-bold">20</td>
          </tr>
        </tbody>
      </table>
      <div className="bg-amber-50 px-3 py-1.5 text-amber-700 text-center">
        Chi-Square asks: "Is this pattern REAL or just random?"
      </div>
    </div>
  );
}

function VisualConcept({ testId }: { testId: string }) {
  if (testId === 'independent-t-test' || testId === 'mann-whitney-u') {
    return <BarChart bars={[
      { label: '🌿 With Treatment', value: 78, color: 'indigo' },
      { label: '❌ No Treatment', value: 42, color: 'gray' },
    ]} />;
  }
  if (testId === 'one-way-anova' || testId === 'kruskal-wallis') {
    return <BarChart bars={[
      { label: '🌿 Siddha', value: 82, color: 'indigo' },
      { label: '🪷 Ayurveda', value: 68, color: 'violet' },
      { label: '❌ Control', value: 44, color: 'gray' },
    ]} />;
  }
  if (testId === 'paired-t-test' || testId === 'wilcoxon') {
    return <PrePostArrow before={{ label: 'Before Treatment', value: 7 }} after={{ label: 'After Treatment', value: 3 }} />;
  }
  if (testId === 'test-retest') {
    return <PrePostArrow before={{ label: 'Week 1 Score', value: 72 }} after={{ label: 'Week 3 Score', value: 74 }} />;
  }
  if (testId === 'pearson-correlation' || testId === 'spearman-correlation') {
    return <CorrelationDots direction="positive" />;
  }
  if (testId === 'chi-square') {
    return <CategoryTable />;
  }
  if (testId === 'cronbach-alpha' || testId === 'efa' || testId === 'cfa') {
    return <QuestionnaireFlow
      items={['Q1: I feel better 😊', 'Q2: My pain reduced', 'Q3: Energy improved', 'Q4: I sleep better']}
      construct={testId === 'cronbach-alpha' ? 'Reliability Score' : testId === 'efa' ? 'Hidden Factors' : 'Confirmed Structure'}
    />;
  }
  if (testId === 'linear-regression' || testId === 'logistic-regression') {
    return <PredictionFlow
      predictors={['Treatment sessions', 'Patient age', 'Diet quality']}
      outcome={testId === 'logistic-regression' ? 'Recovered? Yes/No' : 'Wellness Score'}
    />;
  }
  if (testId === 'effect-size') {
    return <EffectSizeRuler />;
  }
  if (testId === 'shapiro-wilk' || testId === 'levene-test') {
    return <NormalityRoad />;
  }
  if (testId === 'descriptive-stats') {
    return <SummaryCards />;
  }
  return null;
}

// ─── Wizard Questions (simplified for healers) ───────────────────────────────

const wizardQuestions: Record<WizardStep, { question: string; sub?: string; options: { value: string; label: string; icon: string; desc?: string }[] }> = {
  goal: {
    question: 'What is the MAIN question you want to answer in your research?',
    sub: 'Do not worry about statistics yet — just think about what you want to find out about your patients.',
    options: [
      { value: 'compare',      label: 'Did my treatment WORK?',          icon: '🌿', desc: 'Compare patients who received treatment vs. those who did not (or compare different treatments)' },
      { value: 'relationship', label: 'Are two things CONNECTED?',        icon: '🔗', desc: 'e.g., Do patients who come more often heal faster? Are older patients harder to treat?' },
      { value: 'predict',      label: 'What PREDICTS a patient\'s outcome?', icon: '🎯', desc: 'e.g., Which combination of age, diet, and sessions best predicts who will recover?' },
      { value: 'validate',     label: 'Is my QUESTIONNAIRE reliable?',    icon: '📋', desc: 'Check if your survey questions are consistent and trustworthy before using them in research' },
      { value: 'describe',     label: 'Describe WHO my patients are',     icon: '📊', desc: 'Count and summarise: average age, gender split, health scores — before any other analysis' },
    ]
  },
  groupCount: {
    question: 'How many patient GROUPS are you comparing?',
    sub: 'A "group" is a set of patients who received the same treatment or condition.',
    options: [
      { value: '2',  label: '2 groups',          icon: '2️⃣', desc: 'e.g., herbal treatment group vs. no-treatment (control) group' },
      { value: '3+', label: '3 or more groups',  icon: '3️⃣', desc: 'e.g., Siddha treatment vs. Ayurveda vs. no treatment (3 groups)' },
    ]
  },
  paired: {
    question: 'Are these the SAME patients measured twice, or DIFFERENT patients in each group?',
    sub: '',
    options: [
      { value: 'yes', label: 'SAME patients — measured BEFORE and AFTER treatment', icon: '🔄', desc: 'You measured the same 30 patients at the start and again after treatment' },
      { value: 'no',  label: 'DIFFERENT patients — each group has different people',  icon: '👥', desc: 'Group A has 30 patients who got treatment. Group B has 30 DIFFERENT patients who got nothing.' },
    ]
  },
  normalPaired: {
    question: 'Did you check if your data follows a "bell-curve" shape?',
    sub: 'In SPSS: Analyze → Descriptive Statistics → Explore → Plots → tick "Normality plots with tests". Look at the Shapiro-Wilk p-value. If you have more than 30 patients in each group, choose "Not sure" — it is usually fine.',
    options: [
      { value: 'yes',    label: 'Yes — Shapiro-Wilk p > 0.05 (normal data)',             icon: '✅', desc: 'Your data is normal-shaped → use the standard test' },
      { value: 'no',     label: 'No — Shapiro-Wilk p < 0.05 (skewed/uneven data)',       icon: '❌', desc: 'Your data is not normal → use the safer non-parametric test' },
      { value: 'unsure', label: "Not sure / I haven't checked / Less than 30 patients", icon: '❓', desc: 'When unsure, always choose the safer non-parametric test' },
    ]
  },
  normalIndep: {
    question: 'Did you check if your data follows a "bell-curve" shape?',
    sub: 'In SPSS: Analyze → Descriptive Statistics → Explore → Plots → tick "Normality plots with tests". Look at the Shapiro-Wilk p-value. If you have more than 30 patients in each group, choose "Not sure" — it is usually fine.',
    options: [
      { value: 'yes',    label: 'Yes — Shapiro-Wilk p > 0.05 (normal data)',             icon: '✅', desc: 'Your data is normal-shaped → use the standard test' },
      { value: 'no',     label: 'No — Shapiro-Wilk p < 0.05 (skewed/uneven data)',       icon: '❌', desc: 'Your data is not normal → use the safer non-parametric test' },
      { value: 'unsure', label: "Not sure / I haven't checked / Less than 30 patients", icon: '❓', desc: 'When unsure, always choose the safer non-parametric test' },
    ]
  },
  normalGroups: {
    question: 'Did you check if your data follows a "bell-curve" shape in each group?',
    options: [
      { value: 'yes',    label: 'Yes — data is approximately normal',      icon: '✅', desc: 'Use the standard parametric test' },
      { value: 'no',     label: 'No — data is skewed or uneven',            icon: '❌', desc: 'Use the safer non-parametric test' },
      { value: 'unsure', label: "Not sure / Groups have less than 30 each", icon: '❓', desc: 'When unsure, always choose the safer option' },
    ]
  },
  relType: {
    question: 'What type of information are the two variables you are comparing?',
    sub: 'Think about HOW the data is recorded for each variable.',
    options: [
      { value: 'both-continuous',  label: 'Both are measured as NUMBERS',       icon: '📈', desc: 'e.g., "Number of sessions attended" and "Pain score 0–100". Both are actual numbers.' },
      { value: 'both-categorical', label: 'Both are CATEGORIES (labels)',        icon: '🏷️', desc: 'e.g., Gender (Male/Female) and Treatment type (Ayurveda/TCM/Conventional)' },
      { value: 'mixed',            label: 'One is a RATING SCALE (1–5 or 1–10)', icon: '🔢', desc: 'e.g., Satisfaction rated 1–5. Use this for Likert scale questionnaire data.' },
    ]
  },
  normalRel: {
    question: 'Are both of your variables normally distributed (bell-curve shaped)?',
    options: [
      { value: 'yes',    label: 'Yes — both follow a normal distribution', icon: '✅' },
      { value: 'no',     label: 'No — at least one is skewed',             icon: '❌' },
      { value: 'unsure', label: "Not sure (or using Likert scales)",       icon: '❓', desc: 'When in doubt, the safer non-parametric Spearman is the better choice' },
    ]
  },
  predType: {
    question: 'What are you trying to PREDICT?',
    options: [
      { value: 'continuous', label: 'A NUMBER score or measurement',       icon: '📊', desc: 'e.g., Predict a patient\'s final pain score, or blood glucose level, or wellness rating' },
      { value: 'binary',     label: 'A YES or NO outcome',                  icon: '✅', desc: 'e.g., Will the patient recover? Yes or No. Did the treatment work? Yes or No.' },
    ]
  },
  valType: {
    question: 'What exactly do you want to check about your questionnaire?',
    options: [
      { value: 'reliability', label: 'RELIABILITY — Are my questions consistent?',        icon: '📏', desc: 'Cronbach\'s Alpha: Do patients who scored high on Q1 also score high on Q2, Q3...?' },
      { value: 'factors',     label: 'FACTOR STRUCTURE — How do my questions group?',     icon: '🔎', desc: 'EFA/CFA: Which questions naturally belong together? Does my design actually work?' },
      { value: 'full',        label: 'BOTH — Full questionnaire validation (recommended)', icon: '⭐', desc: 'Reliability + Factor structure. Required for publishing a new measurement tool.' },
    ]
  },
  result: { question: '', options: [] }
};

function TestFinder() {
  const [history, setHistory] = useState<WizardAnswer[]>([]);
  const [currentStep, setCurrentStep] = useState<WizardStep>('goal');
  const [results, setResults] = useState<string[]>([]);

  const handleSelect = (value: string) => {
    const q = wizardQuestions[currentStep];
    const label = q.options.find(o => o.value === value)?.label ?? value;
    const newHistory = [...history, { step: currentStep, label: q.question, value: label }];
    setHistory(newHistory);

    // Navigate wizard tree
    const node = wizardTree[currentStep]?.[value];
    if (!node) return;
    if (node.result) {
      setResults(node.result);
      setCurrentStep('result');
    } else if (node.next) {
      setCurrentStep(node.next as WizardStep);
    }
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setResults([]);
    if (newHistory.length === 0) {
      setCurrentStep('goal');
    } else {
      setCurrentStep(history[history.length - 1].step);
    }
  };

  const handleReset = () => {
    setHistory([]);
    setCurrentStep('goal');
    setResults([]);
  };

  const q = wizardQuestions[currentStep];
  const recommendedTests = results.map(id => getTestById(id)).filter(Boolean) as Test[];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress breadcrumb */}
      {history.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center text-xs text-gray-500">
          {history.map((h, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="bg-gray-100 rounded px-2 py-0.5 text-gray-600 max-w-[200px] truncate">{h.value}</span>
              {i < history.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
            </span>
          ))}
        </div>
      )}

      {currentStep !== 'result' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              {history.length + 1}
            </span>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Step {history.length + 1}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-1">{q.question}</h2>
          {q.sub && <p className="text-sm text-gray-500 mb-5 leading-relaxed">{q.sub}</p>}
          {!q.sub && <div className="mb-4" />}

          <div className="space-y-2">
            {q.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full text-left border border-gray-200 rounded-xl p-3.5 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800 group-hover:text-indigo-700">{opt.label}</div>
                    {opt.desc && <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <button onClick={handleBack} className="mt-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft size={13} />
              Go back
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-green-600" />
              <h2 className="font-semibold text-green-800">
                {recommendedTests.length === 1 ? 'Recommended Statistical Test' : 'Recommended Statistical Tests'}
              </h2>
            </div>
            <p className="text-sm text-green-700">
              Based on your answers, here {recommendedTests.length === 1 ? 'is the' : 'are the'} most appropriate test{recommendedTests.length > 1 ? 's' : ''} for your study.
            </p>
          </div>

          {recommendedTests.map((test, i) => (
            <TestCard key={test.id} test={test} highlight={i === 0} />
          ))}

          <button
            onClick={handleReset}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            Start over — find a different test
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Test Library ─────────────────────────────────────────────────────────────

function TestLibrary() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = tests;
    if (activeCat !== 'all') list = list.filter(t => t.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.altName ?? '').toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }
    return list;
  }, [search, activeCat]);

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tests... (e.g., ANOVA, correlation, reliability)"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCat('all')}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${activeCat === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
        >
          All ({tests.length})
        </button>
        {categories.map(cat => {
          const count = tests.filter(t => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${activeCat === cat.id ? 'bg-indigo-600 text-white border-indigo-600' : `border ${catColors[cat.id]} hover:opacity-80`}`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tests found for "{search}"</p>
          </div>
        ) : (
          filtered.map(test => <TestCard key={test.id} test={test} />)
        )}
      </div>
    </div>
  );
}

// ─── Interpretation Helper ────────────────────────────────────────────────────

type InterpretType = 'p-value' | 'cronbach-alpha' | 'pearson-r' | 'kmo';

const interpretOptions: { value: InterpretType; label: string; placeholder: string; min: number; max: number; step: number }[] = [
  { value: 'p-value',        label: 'p-value (Significance)',                  placeholder: 'e.g., 0.03',  min: 0, max: 1,   step: 0.001 },
  { value: 'cronbach-alpha', label: "Cronbach's Alpha (Internal Consistency)",  placeholder: 'e.g., 0.82',  min: 0, max: 1,   step: 0.01  },
  { value: 'pearson-r',      label: "Pearson r / Spearman ρ (Correlation)",     placeholder: 'e.g., 0.65',  min: -1, max: 1,  step: 0.01  },
  { value: 'kmo',            label: 'KMO Value (Factor Analysis Adequacy)',      placeholder: 'e.g., 0.75',  min: 0, max: 1,   step: 0.01  },
];

function getInterpretation(type: InterpretType, raw: string): { level: string; color: string; text: string } | null {
  const val = parseFloat(raw);
  if (isNaN(val)) return null;
  const guide = interpretGuide[type];
  if (!guide) return null;

  const absVal = Math.abs(val);
  const thresholds = guide.thresholds as any[];

  if (type === 'p-value') {
    for (const t of thresholds) {
      if (val <= t.max) {
        return { level: t.level, color: t.color, text: t.text };
      }
    }
    return thresholds[thresholds.length - 1];
  }

  if (type === 'cronbach-alpha' || type === 'kmo') {
    for (const t of [...thresholds].reverse()) {
      if (val >= t.min) {
        return { level: t.level, color: t.color, text: t.text.replace('{value}', val.toFixed(2)) };
      }
    }
    return { ...thresholds[thresholds.length - 1], text: thresholds[thresholds.length - 1].text.replace('{value}', val.toFixed(2)) };
  }

  if (type === 'pearson-r') {
    // Handle negative correlations
    const direction = val < 0 ? 'negative' : 'positive';
    for (const t of [...thresholds].reverse()) {
      if (absVal >= t.min) {
        const base = t.text.replace('{value}', val.toFixed(2));
        const dirText = direction === 'negative'
          ? base.replace('positive', 'negative').replace('increases, the other increases', 'increases, the other decreases')
          : base;
        return { level: t.level + (direction === 'negative' ? ' (Negative)' : ' (Positive)'), color: t.color, text: dirText };
      }
    }
  }

  return null;
}

const interpretBgColors: Record<string, string> = {
  green: 'bg-green-50 border-green-200 text-green-800',
  blue:  'bg-blue-50 border-blue-200 text-blue-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  red:   'bg-red-50 border-red-200 text-red-800',
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
};

const interpretBadgeColors: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  blue:  'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-700',
  red:   'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
};

function InterpretHelper() {
  const [type, setType] = useState<InterpretType>('p-value');
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const opt = interpretOptions.find(o => o.value === type)!;
  const result = submitted && value ? getInterpretation(type, value) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleTypeChange = (v: InterpretType) => {
    setType(v);
    setValue('');
    setSubmitted(false);
  };

  // What each value type means in plain English
  const typeGuide: Record<InterpretType, { q: string; hint: string }> = {
    'p-value': {
      q: 'What is a p-value?',
      hint: 'The p-value tells you: "How likely is it that my result happened just by LUCK?" A p-value BELOW 0.05 means the result is REAL (not luck). A p-value ABOVE 0.05 means we cannot be sure.'
    },
    'cronbach-alpha': {
      q: "What is Cronbach's Alpha?",
      hint: "Alpha tells you: 'Are my questionnaire questions consistent with each other?' A score of 0.70 or above means the questionnaire is reliable enough to use in research. It ranges from 0 to 1."
    },
    'pearson-r': {
      q: 'What is a correlation coefficient?',
      hint: "The r value tells you how strongly two things are connected. It ranges from −1 to +1. Close to +1 = strongly connected in the same direction. Close to 0 = no connection. Close to −1 = one goes up when the other goes down."
    },
    'kmo': {
      q: 'What is KMO?',
      hint: 'KMO (Kaiser-Meyer-Olkin) tells you whether your questionnaire data is suitable for Factor Analysis. It ranges from 0 to 1. You need at least 0.60 to proceed. Above 0.80 is ideal.'
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Intro box */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">💻</span>
          <div>
            <p className="font-semibold text-indigo-800 mb-1">How to use this tool</p>
            <p className="text-sm text-indigo-700 leading-relaxed">
              After running a test in SPSS, you will see numbers in the output table.
              Select what type of number it is below, type in the value, and this tool will
              tell you exactly what it means — in plain English, ready to paste into your paper.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">

        {/* Type selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Step 1 — What number do you want to understand?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {interpretOptions.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleTypeChange(o.value)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${type === o.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* What this value means (educational) */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-600 mb-1">{typeGuide[type].q}</p>
          <p className="text-xs text-amber-800 leading-relaxed">{typeGuide[type].hint}</p>
        </div>

        {/* Value input */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Step 2 — Type in your number from SPSS
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={value}
              onChange={e => { setValue(e.target.value); setSubmitted(false); }}
              placeholder={opt.placeholder}
              min={opt.min}
              max={opt.max}
              step={opt.step}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Explain it →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Valid range for {opt.label}: {opt.min} to {opt.max}
          </p>
        </div>
      </form>

      {/* Result */}
      {result && (
        <div className={`border-2 rounded-2xl p-5 space-y-4 ${interpretBgColors[result.color] ?? 'bg-gray-50 border-gray-200'}`}>

          {/* Level badge */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {result.color === 'green' ? '✅' : result.color === 'blue' ? '🔵' : result.color === 'amber' ? '⚠️' : result.color === 'red' ? '❌' : 'ℹ️'}
            </span>
            <div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider ${interpretBadgeColors[result.color] ?? 'bg-gray-100 text-gray-700'}`}>
                {result.level}
              </span>
              <p className="text-xs text-gray-500 mt-1">Your value: <strong>{value}</strong></p>
            </div>
          </div>

          {/* Plain English explanation */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">What this means</p>
            <p className="text-sm leading-relaxed">{result.text}</p>
          </div>

          {/* Ready-to-use sentence */}
          <div className="border-t border-current border-opacity-20 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-current opacity-70" />
              <p className="text-xs font-semibold opacity-80">Copy this sentence into your Results section:</p>
            </div>
            <div className="bg-white/60 rounded-xl px-4 py-3 text-sm font-medium italic leading-relaxed border border-current border-opacity-10">
              {type === 'p-value' && (
                parseFloat(value) < 0.05
                  ? `"The result was statistically significant (p = ${value}), indicating that the finding is unlikely to be due to chance."`
                  : `"The result was not statistically significant (p = ${value}), suggesting insufficient evidence to reject the null hypothesis."`
              )}
              {type === 'cronbach-alpha' && `"The scale demonstrated ${result.level.toLowerCase()} internal consistency reliability (α = ${value}), ${parseFloat(value) >= 0.70 ? 'meeting' : 'falling below'} the recommended threshold of 0.70."`}
              {type === 'pearson-r' && `"A ${result.level.split('(')[0].trim().toLowerCase()} relationship was found between the two variables (r = ${value}), indicating ${Math.abs(parseFloat(value)) < 0.2 ? 'little to no' : parseFloat(value) > 0 ? 'a positive' : 'a negative'} association."`}
              {type === 'kmo' && `"Sampling adequacy was ${result.level.toLowerCase()} (KMO = ${value}), ${parseFloat(value) >= 0.60 ? 'indicating the data was suitable for factor analysis.' : 'which does not meet the minimum threshold of 0.60 required for factor analysis.'}"`}
            </div>
          </div>
        </div>
      )}

      {submitted && !result && value && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ Please check your value. The valid range for {opt.label} is {opt.min} to {opt.max}.
        </div>
      )}
    </div>
  );
}

// ─── Research Checklist ───────────────────────────────────────────────────────

function ResearchChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalItems = checklist.reduce((sum, p) => sum + p.items.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const getPhaseProgress = (phase: ChecklistPhase) => {
    const done = phase.items.filter((_, i) => checked[`${phase.phase}-${i}`]).length;
    return { done, total: phase.items.length };
  };

  return (
    <div className="space-y-5">
      {/* Overall progress */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Overall Progress</h3>
          <span className="text-2xl font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{doneItems} of {totalItems} tasks complete</p>
      </div>

      {/* Phases */}
      {checklist.map(phase => {
        const colors = phaseColors[phase.color] ?? phaseColors.indigo;
        const { done, total } = getPhaseProgress(phase);
        const isComplete = done === total;

        return (
          <div key={phase.phase} className={`border-l-4 rounded-r-2xl ${colors.border} ${colors.bg} overflow-hidden`}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isComplete && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
                  <h3 className="font-semibold text-gray-800 text-sm">{phase.phase}</h3>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                  {done}/{total}
                </span>
              </div>

              <div className="space-y-2">
                {phase.items.map((item, i) => {
                  const key = `${phase.phase}-${i}`;
                  const isDone = checked[key] ?? false;
                  return (
                    <label
                      key={key}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5 transition-all ${isDone ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}
                        onClick={() => toggle(key)}
                      >
                        {isDone && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                      </div>
                      <span
                        className={`text-sm leading-relaxed transition-colors ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}
                        onClick={() => toggle(key)}
                      >
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-400 text-center pb-4">
        Progress is saved in this browser session. For a fresh start, reload the page.
      </p>
    </div>
  );
}

// ─── Analysis Lab ─────────────────────────────────────────────────────────────

// ── Statistical math helpers ──────────────────────────────────────────────────

function lnGamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 100; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}

function ibeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * betacf(a, b, x) / a
    : 1 - bt * betacf(b, a, 1 - x) / b;
}

function pFromT(t: number, df: number): number {
  return ibeta(df / 2, 0.5, df / (df + t * t));
}

function pFromF(F: number, df1: number, df2: number): number {
  return ibeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * F));
}

function gammaSeriesP(a: number, x: number): number {
  let ap = a, del = 1 / a, sum = del;
  for (let n = 1; n <= 200; n++) {
    ap++; del *= x / ap; sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaCFP(a: number, x: number): number {
  const FPMIN = 1e-30;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

function gammaP(a: number, x: number): number {
  if (x < 0) return 0; if (x === 0) return 0;
  return x < a + 1 ? gammaSeriesP(a, x) : 1 - gammaCFP(a, x);
}

function pFromChiSq(chi2: number, df: number): number {
  return 1 - gammaP(df / 2, chi2 / 2);
}

function mean(arr: number[]) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function variance(arr: number[]) {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}
function std(arr: number[]) { return Math.sqrt(variance(arr)); }
function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── Test runner interfaces ────────────────────────────────────────────────────

interface StatResult {
  testName: string;
  statLabel: string;
  statValue: number;
  pValue: number;
  df?: string;
  effectSize?: number;
  effectLabel: string;
  extraRows: [string, string][];
  sig: boolean;
  interpretation: string;
  paperSentence: string;
  chartType: 'bar' | 'scatter' | 'table' | 'none';
  chartLabels: string[];
  chartDatasets: { label: string; data: number[]; color: string }[];
  scatterPoints?: { x: number; y: number }[];
}

interface Recommendation {
  test: string;
  testName: string;
  rationale: string;
  dataInput: {
    type: 'paired' | 'two-groups' | 'multi-groups' | 'correlation' | 'categories' | 'items' | 'descriptive' | 'unsupported';
    labels: string[];
    instructions: string;
    sampleSizeMin: number;
    sampleSizeRecommended: number;
    example: string;
  };
}

const FIELD_CATEGORIES: { label: string; fields: string[] }[] = [
  { label: 'Demographics', fields: ['Age', 'Gender', 'BMI', 'Weight (kg)', 'Height (cm)'] },
  { label: 'Vital Signs', fields: ['Blood Pressure Systolic (mmHg)', 'Blood Pressure Diastolic (mmHg)', 'Heart Rate (bpm)', 'Body Temperature (°C)', 'SpO2 (%)'] },
  { label: 'Lab Values', fields: ['Fasting Blood Glucose (mg/dL)', 'HbA1c (%)', 'Total Cholesterol (mg/dL)', 'Triglycerides (mg/dL)', 'Hemoglobin (g/dL)'] },
  { label: 'Clinical Scores', fields: ['Pain Score (VAS 0–10)', 'Stress Score (PSS)', 'Anxiety Score (GAD-7)', 'Depression Score (PHQ-9)', 'Quality of Life Score', 'Sleep Quality Score', 'Energy Level Score', 'Symptom Severity Score'] },
  { label: 'Study Design', fields: ['Treatment Group', 'Treatment Duration (weeks)', 'Dosage (mg)', 'Visit Number', 'Time Point'] },
  { label: 'Traditional Medicine', fields: ['Prakruti/Constitution Type', 'Herbal Formula Dosage', 'Number of Treatment Sessions', 'Symptom Improvement (%)', 'Patient Satisfaction Score'] },
];

const CHART_COLORS = [
  'rgba(99,102,241,0.8)', 'rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)',
  'rgba(239,68,68,0.8)', 'rgba(139,92,246,0.8)', 'rgba(14,165,233,0.8)',
];

// ── Statistical test runners ──────────────────────────────────────────────────

function runPairedTTest(before: number[], after: number[], l1: string, l2: string): StatResult {
  const n = before.length;
  const diffs = before.map((v, i) => v - after[i]);
  const d_bar = mean(diffs);
  const s_d = std(diffs);
  const t = d_bar / (s_d / Math.sqrt(n));
  const p = pFromT(Math.abs(t), n - 1);
  const cohenD = Math.abs(d_bar) / s_d;
  const effectLabel = cohenD < 0.2 ? 'negligible' : cohenD < 0.5 ? 'small' : cohenD < 0.8 ? 'medium' : 'large';
  return {
    testName: 'Paired Samples T-Test',
    statLabel: 't', statValue: parseFloat(t.toFixed(4)),
    pValue: parseFloat(p.toFixed(4)), df: `${n - 1}`,
    effectSize: parseFloat(cohenD.toFixed(3)), effectLabel: `Cohen's d = ${cohenD.toFixed(2)} (${effectLabel})`,
    extraRows: [
      ['Mean difference', `${d_bar.toFixed(3)} (${l1} − ${l2})`],
      ['Std Dev of differences', s_d.toFixed(3)],
      [`${l1} mean`, mean(before).toFixed(3)],
      [`${l2} mean`, mean(after).toFixed(3)],
      ['n (pairs)', `${n}`],
    ],
    sig: p < 0.05,
    interpretation: p < 0.05
      ? `There is a statistically significant difference between ${l1} and ${l2} (p = ${p.toFixed(3)}). The ${d_bar > 0 ? 'pre-treatment' : 'post-treatment'} scores were significantly higher.`
      : `There is no statistically significant difference between ${l1} and ${l2} (p = ${p.toFixed(3)}).`,
    paperSentence: `A paired-samples t-test indicated a ${p < 0.05 ? '' : 'non-'}significant difference between ${l1} (M = ${mean(before).toFixed(2)}, SD = ${std(before).toFixed(2)}) and ${l2} (M = ${mean(after).toFixed(2)}, SD = ${std(after).toFixed(2)}), t(${n - 1}) = ${t.toFixed(2)}, p = ${p.toFixed(3)}, Cohen's d = ${cohenD.toFixed(2)}.`,
    chartType: 'bar',
    chartLabels: [l1, l2],
    chartDatasets: [{ label: 'Group Mean', data: [mean(before), mean(after)], color: CHART_COLORS[0] }],
  };
}

function runIndependentTTest(g1: number[], g2: number[], l1: string, l2: string): StatResult {
  const n1 = g1.length, n2 = g2.length;
  const m1 = mean(g1), m2 = mean(g2), v1 = variance(g1), v2 = variance(g2);
  const t = (m1 - m2) / Math.sqrt(v1 / n1 + v2 / n2);
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const p = pFromT(Math.abs(t), df);
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohenD = Math.abs(m1 - m2) / sp;
  const effectLabel = cohenD < 0.2 ? 'negligible' : cohenD < 0.5 ? 'small' : cohenD < 0.8 ? 'medium' : 'large';
  return {
    testName: "Independent Samples T-Test (Welch's)",
    statLabel: 't', statValue: parseFloat(t.toFixed(4)),
    pValue: parseFloat(p.toFixed(4)), df: `${df.toFixed(1)}`,
    effectSize: parseFloat(cohenD.toFixed(3)), effectLabel: `Cohen's d = ${cohenD.toFixed(2)} (${effectLabel})`,
    extraRows: [
      [`${l1} mean ± SD`, `${m1.toFixed(3)} ± ${std(g1).toFixed(3)} (n=${n1})`],
      [`${l2} mean ± SD`, `${m2.toFixed(3)} ± ${std(g2).toFixed(3)} (n=${n2})`],
    ],
    sig: p < 0.05,
    interpretation: p < 0.05
      ? `There is a statistically significant difference between ${l1} and ${l2} (p = ${p.toFixed(3)}).`
      : `There is no statistically significant difference between ${l1} and ${l2} (p = ${p.toFixed(3)}).`,
    paperSentence: `An independent-samples t-test (Welch's) revealed a ${p < 0.05 ? '' : 'non-'}significant difference between ${l1} (M = ${m1.toFixed(2)}, SD = ${std(g1).toFixed(2)}) and ${l2} (M = ${m2.toFixed(2)}, SD = ${std(g2).toFixed(2)}), t(${df.toFixed(1)}) = ${t.toFixed(2)}, p = ${p.toFixed(3)}, Cohen's d = ${cohenD.toFixed(2)}.`,
    chartType: 'bar',
    chartLabels: [l1, l2],
    chartDatasets: [{ label: 'Group Mean', data: [m1, m2], color: CHART_COLORS[0] }],
  };
}

function runANOVA(groups: { name: string; values: number[] }[]): StatResult {
  const k = groups.length;
  const N = groups.reduce((s, g) => s + g.values.length, 0);
  const allVals = groups.flatMap(g => g.values);
  const grandMean = mean(allVals);
  const SS_between = groups.reduce((s, g) => s + g.values.length * (mean(g.values) - grandMean) ** 2, 0);
  const SS_within = groups.reduce((s, g) => s + g.values.reduce((a, v) => a + (v - mean(g.values)) ** 2, 0), 0);
  const df1 = k - 1, df2 = N - k;
  const MS_b = SS_between / df1, MS_w = SS_within / df2;
  const F = MS_b / MS_w;
  const p = pFromF(F, df1, df2);
  const eta2 = SS_between / (SS_between + SS_within);
  const effectLabel = eta2 < 0.01 ? 'negligible' : eta2 < 0.06 ? 'small' : eta2 < 0.14 ? 'medium' : 'large';
  return {
    testName: 'One-Way ANOVA',
    statLabel: 'F', statValue: parseFloat(F.toFixed(4)),
    pValue: parseFloat(p.toFixed(4)), df: `${df1}, ${df2}`,
    effectSize: parseFloat(eta2.toFixed(3)), effectLabel: `η² = ${eta2.toFixed(3)} (${effectLabel})`,
    extraRows: [
      ['SS between groups', SS_between.toFixed(3)],
      ['SS within groups', SS_within.toFixed(3)],
      ['MS between', MS_b.toFixed(3)],
      ['MS within', MS_w.toFixed(3)],
      ...groups.map(g => [`${g.name} M ± SD`, `${mean(g.values).toFixed(2)} ± ${std(g.values).toFixed(2)} (n=${g.values.length})`] as [string, string]),
    ],
    sig: p < 0.05,
    interpretation: p < 0.05
      ? `There is a statistically significant difference among the ${k} groups, F(${df1},${df2}) = ${F.toFixed(2)}, p = ${p.toFixed(3)}, η² = ${eta2.toFixed(3)} (${effectLabel} effect). Post-hoc tests (Tukey or Bonferroni) are recommended to identify which pairs differ.`
      : `There is no statistically significant difference among the ${k} groups, F(${df1},${df2}) = ${F.toFixed(2)}, p = ${p.toFixed(3)}.`,
    paperSentence: `A one-way ANOVA revealed a ${p < 0.05 ? '' : 'non-'}significant effect of group on the outcome variable, F(${df1}, ${df2}) = ${F.toFixed(2)}, p = ${p.toFixed(3)}, η² = ${eta2.toFixed(3)}.`,
    chartType: 'bar',
    chartLabels: groups.map(g => g.name),
    chartDatasets: [{ label: 'Group Mean', data: groups.map(g => mean(g.values)), color: CHART_COLORS[0] }],
  };
}

function runPearson(x: number[], y: number[], lx: string, ly: string): StatResult {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
  const den = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) * y.reduce((s, v) => s + (v - my) ** 2, 0));
  const r = num / den;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = pFromT(Math.abs(t), n - 2);
  const r2 = r * r;
  const effectLabel = Math.abs(r) < 0.1 ? 'negligible' : Math.abs(r) < 0.3 ? 'small' : Math.abs(r) < 0.5 ? 'medium' : 'large';
  return {
    testName: 'Pearson Correlation',
    statLabel: 'r', statValue: parseFloat(r.toFixed(4)),
    pValue: parseFloat(p.toFixed(4)), df: `${n - 2}`,
    effectSize: parseFloat(r2.toFixed(3)), effectLabel: `r² = ${r2.toFixed(3)} (${effectLabel})`,
    extraRows: [
      ['Coefficient of determination (r²)', r2.toFixed(4)],
      ['n (pairs)', `${n}`],
    ],
    sig: p < 0.05,
    interpretation: p < 0.05
      ? `There is a statistically significant ${r > 0 ? 'positive' : 'negative'} correlation between ${lx} and ${ly} (r = ${r.toFixed(3)}, p = ${p.toFixed(3)}). ${lx} ${r > 0 ? 'increases' : 'decreases'} as ${ly} ${r > 0 ? 'increases' : 'decreases'}.`
      : `There is no statistically significant correlation between ${lx} and ${ly} (r = ${r.toFixed(3)}, p = ${p.toFixed(3)}).`,
    paperSentence: `A Pearson correlation revealed a ${p < 0.05 ? '' : 'non-'}significant ${r > 0 ? 'positive' : 'negative'} relationship between ${lx} and ${ly}, r(${n - 2}) = ${r.toFixed(2)}, p = ${p.toFixed(3)}, r² = ${r2.toFixed(2)}.`,
    chartType: 'scatter',
    chartLabels: [lx, ly],
    chartDatasets: [],
    scatterPoints: x.map((v, i) => ({ x: v, y: y[i] })),
  };
}

function runChiSquare(table: number[][], rowLabels: string[], colLabels: string[]): StatResult {
  const R = table.length, C = table[0].length;
  const rowSums = table.map(row => row.reduce((s, v) => s + v, 0));
  const colSums = colLabels.map((_, c) => table.reduce((s, row) => s + row[c], 0));
  const N = rowSums.reduce((s, v) => s + v, 0);
  let chi2 = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const E = rowSums[r] * colSums[c] / N;
      if (E > 0) chi2 += (table[r][c] - E) ** 2 / E;
    }
  const df = (R - 1) * (C - 1);
  const p = pFromChiSq(chi2, df);
  const cramerV = Math.sqrt(chi2 / (N * Math.min(R - 1, C - 1)));
  const effectLabel = cramerV < 0.1 ? 'negligible' : cramerV < 0.3 ? 'small' : cramerV < 0.5 ? 'medium' : 'large';
  return {
    testName: 'Chi-Square Test of Independence',
    statLabel: 'χ²', statValue: parseFloat(chi2.toFixed(4)),
    pValue: parseFloat(p.toFixed(4)), df: `${df}`,
    effectSize: parseFloat(cramerV.toFixed(3)), effectLabel: `Cramér's V = ${cramerV.toFixed(3)} (${effectLabel})`,
    extraRows: [
      ['N (total)', `${N}`],
      ['Rows × Columns', `${R} × ${C}`],
    ],
    sig: p < 0.05,
    interpretation: p < 0.05
      ? `There is a statistically significant association between the two categorical variables, χ²(${df}) = ${chi2.toFixed(2)}, p = ${p.toFixed(3)}, Cramér's V = ${cramerV.toFixed(3)} (${effectLabel} effect).`
      : `There is no statistically significant association between the two categorical variables, χ²(${df}) = ${chi2.toFixed(2)}, p = ${p.toFixed(3)}.`,
    paperSentence: `A chi-square test of independence indicated a ${p < 0.05 ? '' : 'non-'}significant association between the variables, χ²(${df}, N = ${N}) = ${chi2.toFixed(2)}, p = ${p.toFixed(3)}, Cramér's V = ${cramerV.toFixed(2)}.`,
    chartType: 'bar',
    chartLabels: colLabels,
    chartDatasets: table.map((row, i) => ({ label: rowLabels[i], data: row, color: CHART_COLORS[i % CHART_COLORS.length] })),
  };
}

function runCronbach(matrix: number[][]): StatResult {
  const n = matrix.length;
  const k = matrix[0].length;
  const itemVars = Array.from({ length: k }, (_, j) => variance(matrix.map(row => row[j])));
  const totals = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const totalVar = variance(totals);
  const sumItemVars = itemVars.reduce((s, v) => s + v, 0);
  const alpha = (k / (k - 1)) * (1 - sumItemVars / totalVar);
  const effectLabel = alpha < 0.5 ? 'poor' : alpha < 0.6 ? 'unacceptable' : alpha < 0.7 ? 'questionable' : alpha < 0.8 ? 'acceptable' : alpha < 0.9 ? 'good' : 'excellent';
  return {
    testName: "Cronbach's Alpha",
    statLabel: 'α', statValue: parseFloat(alpha.toFixed(4)),
    pValue: NaN, df: undefined,
    effectSize: undefined, effectLabel: `α = ${alpha.toFixed(3)} (${effectLabel} reliability)`,
    extraRows: [
      ['Number of items (k)', `${k}`],
      ['Number of participants', `${n}`],
      ['Sum of item variances', sumItemVars.toFixed(3)],
      ['Total score variance', totalVar.toFixed(3)],
    ],
    sig: alpha >= 0.7,
    interpretation: alpha >= 0.7
      ? `The scale has acceptable internal consistency (α = ${alpha.toFixed(3)}, ${effectLabel}). The items consistently measure the same underlying construct.`
      : `The scale has ${effectLabel} internal consistency (α = ${alpha.toFixed(3)}). Consider revising or removing items to improve reliability.`,
    paperSentence: `Internal consistency was assessed using Cronbach's alpha. The ${k}-item scale demonstrated ${effectLabel} reliability (α = ${alpha.toFixed(2)}).`,
    chartType: 'bar',
    chartLabels: Array.from({ length: k }, (_, i) => `Item ${i + 1}`),
    chartDatasets: [{ label: 'Item Variance', data: itemVars.map(v => parseFloat(v.toFixed(3))), color: CHART_COLORS[0] }],
  };
}

function runDescriptive(vars: { name: string; values: number[] }[]): StatResult {
  const rows: [string, string][] = [];
  for (const v of vars) {
    const m = mean(v.values), s = std(v.values), med = median(v.values);
    const sorted = [...v.values].sort((a, b) => a - b);
    rows.push([v.name, `M=${m.toFixed(2)}, SD=${s.toFixed(2)}, Mdn=${med.toFixed(2)}, Min=${sorted[0]}, Max=${sorted[sorted.length - 1]}, n=${v.values.length}`]);
  }
  return {
    testName: 'Descriptive Statistics',
    statLabel: 'M', statValue: parseFloat(mean(vars[0].values).toFixed(4)),
    pValue: NaN, df: undefined, effectSize: undefined, effectLabel: '',
    extraRows: rows,
    sig: false,
    interpretation: `Descriptive statistics computed for ${vars.length} variable(s). See the table above for mean, standard deviation, median, and range.`,
    paperSentence: vars.map(v => {
      const m = mean(v.values), s = std(v.values);
      return `${v.name}: M = ${m.toFixed(2)}, SD = ${s.toFixed(2)}, n = ${v.values.length}`;
    }).join('; ') + '.',
    chartType: 'bar',
    chartLabels: vars.map(v => v.name),
    chartDatasets: [{ label: 'Mean', data: vars.map(v => parseFloat(mean(v.values).toFixed(3))), color: CHART_COLORS[0] }],
  };
}

// ── Data parser ───────────────────────────────────────────────────────────────

function parseNumbers(str: string): number[] {
  return str.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
}

/** Returns true if a line looks like a CSV/TSV header (contains non-numeric cells). */
function isHeaderLine(line: string): boolean {
  return line.split(/[,\t]+/).some(c => c.trim() !== '' && isNaN(Number(c.trim())));
}

/** Drop the first line if it appears to be a header row. */
function skipHeader(lines: string[]): string[] {
  if (lines.length > 0 && isHeaderLine(lines[0])) return lines.slice(1);
  return lines;
}

// ── CSV template generator ────────────────────────────────────────────────────

function generateCsvTemplate(rec: Recommendation, fields: string[]): string {
  const type = rec.dataInput.type;
  const labels = rec.dataInput.labels ?? [];
  const primary = fields[0] ?? labels[0] ?? 'Value';
  const secondary = fields[1] ?? labels[1] ?? fields[0] ?? 'Value 2';
  const rows: string[] = [];

  if (type === 'paired') {
    const l1 = labels[0] ?? `${primary} (Before)`;
    const l2 = labels[1] ?? `${primary} (After)`;
    rows.push(`${l1},${l2}`);
    [[28,22],[31,25],[26,19],[33,28],[29,23],[35,27],[24,18],[30,24],[27,21],[32,26]].forEach(r => rows.push(r.join(',')));
  } else if (type === 'two-groups' || type === 'multi-groups') {
    const groupNames = labels.length >= 2 ? labels : type === 'multi-groups' ? ['Treatment A','Treatment B','Control'] : ['Treatment','Control'];
    rows.push(`Group,${primary}`);
    const sampleVals = [[78,82,75,90,68,85,79,88,72,83],[45,52,49,61,43,58,47,55,51,48],[62,67,71,58,65,70,64,69,66,72]];
    groupNames.forEach((g, gi) => sampleVals[gi % sampleVals.length].forEach(v => rows.push(`${g},${v}`)));
  } else if (type === 'correlation') {
    rows.push(`${primary},${secondary}`);
    [[22,110],[25,125],[28,135],[31,140],[24,115],[27,130],[30,138],[23,112],[26,128],[29,132],[32,145],[21,108]].forEach(r => rows.push(r.join(',')));
  } else if (type === 'categories') {
    const cols = labels.length >= 2 ? labels.slice(0,3) : ['Category A','Category B','Category C'];
    const rLabels = ['Group 1','Group 2'];
    rows.push(`,${cols.join(',')}`);
    rLabels.forEach((r, ri) => rows.push(`${r},${cols.map((_,ci) => (ri===0?[28,14,8]:[12,18,20])[ci]).join(',')}` ));
  } else if (type === 'items') {
    const k = Math.min(Math.max(labels.length, 5), 10);
    const itemLabels = Array.from({length: k}, (_, i) => labels[i] ?? `Item ${i+1}`);
    rows.push(`Participant,${itemLabels.join(',')}`);
    [[4,3,5,4,3],[5,4,5,5,4],[3,3,4,3,2],[4,4,4,5,4],[5,5,4,4,5],[2,3,3,2,3],[4,3,4,4,3],[5,4,5,4,4],[3,4,3,3,4],[4,5,4,5,4]]
      .forEach((row, i) => rows.push(`P${String(i+1).padStart(3,'0')},${Array.from({length:k},(_,j)=>row[j%5]).join(',')}`));
  } else {
    const varLabels = fields.length > 0 ? fields.slice(0,4) : labels.slice(0,4).length > 0 ? labels.slice(0,4) : ['Variable 1','Variable 2'];
    rows.push(`Participant,${varLabels.join(',')}`);
    [[72,120,28,85],[68,118,25,82],[75,125,31,88],[80,130,35,90],[66,115,24,78],[73,122,29,84],[77,128,33,87],[70,119,27,81],[74,123,30,86],[69,117,26,80]]
      .forEach((row, i) => rows.push(`P${String(i+1).padStart(3,'0')},${varLabels.map((_,vi)=>row[vi%row.length]).join(',')}`));
  }
  return rows.join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function runAnalysis(raw: string, rec: Recommendation): StatResult {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const type = rec.dataInput.type;
  const labels = rec.dataInput.labels ?? [];

  if (type === 'paired') {
    const dataLines = skipHeader(lines);
    const pairs = dataLines.map(l => l.split(/[,\t]+/).map(s => Number(s.trim())));
    const valid = pairs.filter(p => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]));
    if (valid.length < 3) throw new Error('Need at least 3 valid rows (before, after).');
    return runPairedTTest(valid.map(p => p[0]), valid.map(p => p[1]), labels[0] ?? 'Before', labels[1] ?? 'After');
  }

  if (type === 'two-groups' || type === 'multi-groups') {
    const groups: { name: string; values: number[] }[] = [];
    // Try colon format first: "GroupName: v1, v2, v3"
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const name = line.slice(0, colonIdx).trim();
      const values = parseNumbers(line.slice(colonIdx + 1));
      if (values.length > 0) groups.push({ name, values });
    }
    // Fall back to tabular format: Group,Value (one row per observation)
    if (groups.length < 2) {
      const dataLines = skipHeader(lines);
      const groupMap: Record<string, number[]> = {};
      for (const line of dataLines) {
        const cells = line.split(/[,\t]+/);
        if (cells.length < 2) continue;
        const gName = cells[0].trim();
        const val = Number(cells[1].trim());
        if (gName && !isNaN(val)) { if (!groupMap[gName]) groupMap[gName] = []; groupMap[gName].push(val); }
      }
      groups.length = 0;
      for (const [name, values] of Object.entries(groupMap)) if (values.length > 0) groups.push({ name, values });
    }
    if (groups.length < 2) throw new Error('Each group should be on its own line: GroupName: v1, v2, v3  — or use the downloaded template format.');
    if (groups.some(g => g.values.length < 3)) throw new Error('Each group needs at least 3 values.');
    return groups.length === 2
      ? runIndependentTTest(groups[0].values, groups[1].values, groups[0].name, groups[1].name)
      : runANOVA(groups);
  }

  if (type === 'correlation') {
    const dataLines = skipHeader(lines);
    const pairs = dataLines.map(l => l.split(/[,\t]+/).map(s => Number(s.trim())));
    const valid = pairs.filter(p => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]));
    if (valid.length < 5) throw new Error('Need at least 5 valid x, y pairs.');
    return runPearson(valid.map(p => p[0]), valid.map(p => p[1]), labels[0] ?? 'X', labels[1] ?? 'Y');
  }

  if (type === 'categories') {
    const header = lines[0].split(',').slice(1).map(s => s.trim()).filter(Boolean);
    const rows: { label: string; values: number[] }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',');
      const label = cells[0].trim();
      const values = cells.slice(1).map(v => Number(v.trim()));
      if (!values.some(isNaN) && values.length > 0) rows.push({ label, values });
    }
    if (rows.length < 2 || header.length < 2) throw new Error('Need at least a 2×2 table. First row = column headers, first column = row labels.');
    return runChiSquare(rows.map(r => r.values), rows.map(r => r.label), header);
  }

  if (type === 'items') {
    const dataLines = skipHeader(lines);
    const matrix = dataLines.map(l => {
      const cells = l.split(/[,\t]+/).map(s => s.trim());
      const startIdx = isNaN(Number(cells[0])) ? 1 : 0; // skip participant ID column
      return cells.slice(startIdx).map(Number);
    });
    const k = matrix[0]?.length ?? 0;
    const valid = matrix.filter(row => row.length === k && !row.some(isNaN));
    if (valid.length < 5 || k < 2) throw new Error('Need at least 5 participants and 2 items. Each row = one participant, columns = item scores.');
    return runCronbach(valid);
  }

  if (type === 'descriptive') {
    const vars: { name: string; values: number[] }[] = [];
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const name = line.slice(0, colonIdx).trim();
        const values = parseNumbers(line.slice(colonIdx + 1));
        if (values.length > 0) vars.push({ name, values });
      } else {
        const values = parseNumbers(line);
        if (values.length > 0) vars.push({ name: 'Variable', values });
      }
    }
    // Try tabular format: Participant,Var1,Var2,... (columns = variables)
    if (vars.length === 0 || (vars.length === 1 && vars[0].name === 'Variable')) {
      const firstCells = lines[0]?.split(/[,\t]+/).map(s => s.trim()) ?? [];
      if (firstCells.some(c => c !== '' && isNaN(Number(c)))) {
        const headers = firstCells;
        const dataLines = lines.slice(1);
        const columns: number[][] = headers.map(() => []);
        for (const line of dataLines) {
          const cells = line.split(/[,\t]+/).map(s => s.trim());
          const startIdx = isNaN(Number(cells[0])) ? 1 : 0;
          headers.forEach((_, i) => {
            const val = Number(cells[startIdx + i]);
            if (!isNaN(val)) columns[i].push(val);
          });
        }
        vars.length = 0;
        headers.forEach((h, i) => { if (columns[i].length > 0) vars.push({ name: h, values: columns[i] }); });
      }
    }
    if (vars.length === 0) throw new Error('No valid data found. Format: VariableName: v1, v2, v3 — or use the downloaded template.');
    return runDescriptive(vars);
  }

  throw new Error('Unsupported test type — please use SPSS for this analysis.');
}

// ── AnalysisLab Component ─────────────────────────────────────────────────────

function AnalysisLab() {
  type LabStep = 'describe' | 'data' | 'results';
  const [step, setStep] = useState<LabStep>('describe');
  const [question, setQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [rawData, setRawData] = useState('');
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<StatResult | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<InstanceType<typeof Chart> | null>(null);

  // Destroy chart on unmount
  useEffect(() => () => { chartInst.current?.destroy(); }, []);

  // Render chart whenever result changes
  useEffect(() => {
    if (!result || !chartRef.current) return;
    chartInst.current?.destroy();
    chartInst.current = null;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (result.chartType === 'bar') {
      chartInst.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: result.chartLabels,
          datasets: result.chartDatasets.map(d => ({
            label: d.label, data: d.data, backgroundColor: d.color, borderRadius: 6,
          })),
        },
        options: {
          responsive: true,
          plugins: { legend: { display: result.chartDatasets.length > 1 } },
          scales: { y: { beginAtZero: false } },
        },
      });
    } else if (result.chartType === 'scatter' && result.scatterPoints) {
      chartInst.current = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: `${result.chartLabels[0]} vs ${result.chartLabels[1]}`,
            data: result.scatterPoints,
            backgroundColor: 'rgba(99,102,241,0.6)',
            pointRadius: 5,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: result.chartLabels[0] ?? 'X' } },
            y: { title: { display: true, text: result.chartLabels[1] ?? 'Y' } },
          },
        },
      });
    }
  }, [result]);

  async function handleAskAI() {
    if (question.trim().length < 10) {
      setAiError('Please describe your study in at least a sentence.');
      return;
    }
    setAiLoading(true); setAiError('');
    try {
      const res = await apiClient.post('/research-ai/recommend', { question: question.trim() });
      const data = (res as any).data ?? res;
      setRec(data);
      setRawData(data.dataInput?.example ?? '');
      setStep('data');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'AI request failed. Please try again.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }

  function handleRunAnalysis() {
    if (!rec) return;
    setParseError('');
    try {
      const r = runAnalysis(rawData, rec);
      setResult(r);
      setStep('results');
    } catch (e: any) {
      setParseError(e.message ?? 'Could not parse your data. Please check the format.');
    }
  }

  function handleReset() {
    setStep('describe'); setQuestion(''); setRec(null);
    setRawData(''); setResult(null); setParseError(''); setAiError('');
    chartInst.current?.destroy(); chartInst.current = null;
  }

  // ── Step 1: Describe ──────────────────────────────────────────────────────
  if (step === 'describe') return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold text-sm">
          <Sparkles size={16} /> Step 1 of 3 — Describe your study
        </div>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          Tell the AI what your study is about in plain English. No need to mention test names — just describe
          what you measured, who your participants are, and what you want to find out.
        </p>
        <textarea
          value={question}
          onChange={e => { setQuestion(e.target.value); setAiError(''); }}
          placeholder="e.g. I gave 30 patients Ashwagandha tablets for 8 weeks and measured their stress score before and after using the PSS questionnaire. I want to know if the treatment significantly reduced stress."
          className="w-full border border-gray-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[120px]"
        />
        {aiError && (
          <div className="mt-3 flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{aiError}</span>
          </div>
        )}
        <button
          onClick={handleAskAI}
          disabled={aiLoading}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {aiLoading ? <><Loader2 size={16} className="animate-spin" /> Thinking…</> : <><Sparkles size={16} /> Ask AI →</>}
        </button>
      </div>

      {/* Example prompts */}
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Example questions you can ask:</p>
        <div className="space-y-2">
          {[
            'I compared blood pressure in 25 patients before and after 12 weeks of Siddha herbal treatment.',
            'I want to see if there is a relationship between BMI and fasting blood glucose in my patients.',
            'I have 3 groups: Ayurveda treatment, conventional medicine, and control. I measured pain scores after 4 weeks.',
            'I want to test if my 10-item wellness questionnaire is reliable (internally consistent).',
          ].map(q => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="w-full text-left text-sm text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 rounded-lg px-4 py-2.5 transition-colors"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 2: Enter Data ────────────────────────────────────────────────────
  if (step === 'data' && rec) return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => setStep('describe')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={14} /> Back to study description
      </button>

      {/* Recommendation card */}
      <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 text-indigo-700 rounded-xl p-2 flex-shrink-0"><BarChart2 size={20} /></div>
          <div>
            <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Recommended Test</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{rec.testName}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{rec.rationale}</p>
          </div>
        </div>
      </div>

      {/* Unsupported tests */}
      {rec.dataInput.type === 'unsupported' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-2">This test requires SPSS</h4>
              <p className="text-sm text-amber-700 leading-relaxed">{rec.dataInput.instructions}</p>
              <button
                onClick={() => { handleReset(); }}
                className="mt-4 text-sm text-amber-700 underline hover:text-amber-900"
              >
                Try a different study description
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Sample size guidance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{rec.dataInput.sampleSizeMin}</div>
              <div className="text-xs text-amber-600 mt-1">Minimum participants</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{rec.dataInput.sampleSizeRecommended}</div>
              <div className="text-xs text-green-600 mt-1">Recommended participants</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2">
              <Info size={14} /> How to enter your data
            </div>
            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">{rec.dataInput.instructions}</p>
          </div>

          {/* Data input */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FileText size={14} /> Step 2 of 3 — Paste your data
            </div>
            <textarea
              value={rawData}
              onChange={e => { setRawData(e.target.value); setParseError(''); }}
              className="w-full font-mono text-xs border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[160px] resize-y"
              placeholder="Paste or type your data here…"
            />
            {parseError && (
              <div className="mt-2 flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleRunAnalysis}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            <BarChart2 size={16} /> Run Analysis →
          </button>
        </>
      )}
    </div>
  );

  // ── Step 3: Results ───────────────────────────────────────────────────────
  if (step === 'results' && result) return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div className={`rounded-2xl p-5 flex items-start gap-4 ${result.sig ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
        {result.sig
          ? <CheckCircle size={28} className="text-green-500 flex-shrink-0 mt-0.5" />
          : <AlertCircle size={28} className="text-gray-400 flex-shrink-0 mt-0.5" />}
        <div>
          <div className="font-bold text-gray-900 text-base mb-1">{result.testName} — {result.sig ? 'Statistically Significant' : 'Not Significant'}</div>
          <p className="text-sm text-gray-600 leading-relaxed">{result.interpretation}</p>
        </div>
      </div>

      {/* Stats table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Results
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="px-5 py-3 text-gray-500 font-medium w-1/2">{result.statLabel}</td>
              <td className="px-5 py-3 font-mono font-semibold text-gray-900">{isNaN(result.statValue) ? '—' : result.statValue}</td>
            </tr>
            {result.df && <tr className="hover:bg-gray-50"><td className="px-5 py-3 text-gray-500 font-medium">df</td><td className="px-5 py-3 font-mono text-gray-900">{result.df}</td></tr>}
            {!isNaN(result.pValue) && (
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-500 font-medium">p-value</td>
                <td className="px-5 py-3 font-mono font-semibold">
                  <span className={result.pValue < 0.05 ? 'text-green-700' : 'text-gray-700'}>
                    {result.pValue < 0.001 ? '< .001' : result.pValue.toFixed(3)}
                    {result.pValue < 0.05 ? ' ✓ sig.' : ' n.s.'}
                  </span>
                </td>
              </tr>
            )}
            {result.effectLabel && (
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-500 font-medium">Effect size</td>
                <td className="px-5 py-3 font-mono text-gray-900">{result.effectLabel}</td>
              </tr>
            )}
            {result.extraRows.map(([label, val]) => (
              <tr key={label} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-500">{label}</td>
                <td className="px-5 py-3 font-mono text-gray-700 text-xs">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paper sentence */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm mb-2">
          <Lightbulb size={14} /> Ready-to-use sentence for your paper
        </div>
        <p className="text-sm text-gray-800 leading-relaxed font-medium">{result.paperSentence}</p>
        <button
          onClick={() => navigator.clipboard?.writeText(result.paperSentence)}
          className="mt-3 text-xs text-violet-600 hover:text-violet-800 underline"
        >
          Copy to clipboard
        </button>
      </div>

      {/* Chart */}
      {(result.chartType === 'bar' || result.chartType === 'scatter') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Chart</div>
          <canvas ref={chartRef} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => { setStep('data'); setResult(null); chartInst.current?.destroy(); chartInst.current = null; }}
          className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} /> Edit data & re-run
        </button>
        <button
          onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Sparkles size={14} /> New analysis
        </button>
      </div>
    </div>
  );

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const tabs: { id: Tab; label: string; icon: typeof FlaskConical; desc: string }[] = [
  { id: 'finder',    label: 'Find My Test',        icon: FlaskConical,  desc: 'Answer 3–4 simple questions about your study → get the exact test you need' },
  { id: 'library',   label: 'Learn All Tests',      icon: BookOpen,      desc: 'Browse every statistical test with plain-English explanations and visual examples' },
  { id: 'interpret', label: 'What Does This Mean?', icon: MessageSquare, desc: 'Copy a number from your SPSS output → get a sentence ready to paste into your paper' },
  { id: 'checklist', label: 'My Research Progress', icon: CheckSquare,   desc: 'Tick off tasks as you go — from study design all the way to journal submission' },
  { id: 'analysis',  label: 'Analysis Lab',         icon: BarChart2,     desc: 'Describe your study → AI picks the right test → paste your data → get instant results & charts' },
];

export default function ResearchStudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('finder');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-violet-900 text-white px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            TradMedInt · Research Studio
          </div>
          <h1 className="text-3xl font-extrabold mb-3">Research & Publication Guide</h1>
          <p className="text-indigo-200 text-base max-w-2xl leading-relaxed mb-5">
            Designed for traditional medicine practitioners, Siddha healers, Ayurvedic doctors, TCM practitioners,
            and wellness researchers — <strong className="text-white">no mathematics background required.</strong>
          </p>
          {/* Quick start steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
            {[
              { step: '1', icon: '🔍', label: 'Find your test', color: 'bg-indigo-700' },
              { step: '2', icon: '📖', label: 'Learn what it means', color: 'bg-violet-700' },
              { step: '3', icon: '💻', label: 'Run it in SPSS', color: 'bg-purple-700' },
              { step: '4', icon: '✍️', label: 'Write your results', color: 'bg-fuchsia-700' },
            ].map(s => (
              <div key={s.step} className={`${s.color} bg-opacity-60 rounded-xl px-3 py-2.5 text-center`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xs font-semibold text-white/90">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide gap-1 py-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tab description */}
        <div className="mb-6">
          {tabs.filter(t => t.id === activeTab).map(t => (
            <div key={t.id} className="flex items-start gap-2 text-sm text-gray-500">
              <Info size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <p>{t.desc}</p>
            </div>
          ))}
        </div>

        {activeTab === 'finder'    && <TestFinder />}
        {activeTab === 'library'   && <TestLibrary />}
        {activeTab === 'interpret' && <InterpretHelper />}
        {activeTab === 'checklist' && <ResearchChecklist />}
        {activeTab === 'analysis'  && <AnalysisLab />}
      </div>
    </div>
  );
}
