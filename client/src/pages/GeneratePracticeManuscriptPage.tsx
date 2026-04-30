import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import { journalAPI, manuscriptAPI } from '../services/api';
import { useAuthStore } from '../utils/authStore';
import PDFGenerator from '../utils/pdfGenerator';

type JournalOption = { _id: string; title: string; isOpen?: boolean };

type SectionKey =
  | 'introduction'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references';

const SECTION_ORDER: SectionKey[] = [
  'introduction',
  'methods',
  'results',
  'discussion',
  'conclusion',
  'references',
];

const SECTION_LABELS: Record<SectionKey, string> = {
  introduction: 'Introduction',
  methods: 'Methods',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  references: 'References',
};

interface PracticeData {
  _id: string;
  title: string;
  description?: string;
  studyType?: string;
  condition?: { name?: string; description?: string };
  intervention?: {
    name?: string;
    description?: string;
    protocol?: string;
    duration?: string;
    frequency?: string;
  };
  population?: { totalCount?: number; ageRange?: { min?: number; max?: number }; demographics?: string };
  outcomes?: Array<{ name?: string; type?: string; unit?: string; measurementMethod?: string; isPrimary?: boolean }>;
  literatureContext?: { targetDiscipline?: string; targetMethodology?: string };
  manuscriptStatus?: string;
  statistics?: {
    completionRate?: number;
    completeionRate?: number;
    outcomesStats?: any[];
    adverseEvents?: any;
  };
}

const safe = (value: unknown) => (value === undefined || value === null ? '' : String(value));

export default function GeneratePracticeManuscriptPage() {
  const { practiceDataId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
  const [journals, setJournals] = useState<JournalOption[]>([]);

  const [journalId, setJournalId] = useState('');
  const [title, setTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [discipline, setDiscipline] = useState('medicine');
  const [methodology, setMethodology] = useState('case-series');
  const [keywordsText, setKeywordsText] = useState('');

  const [sectionBusy, setSectionBusy] = useState<Record<SectionKey, boolean>>({
    introduction: false,
    methods: false,
    results: false,
    discussion: false,
    conclusion: false,
    references: false,
  });

  const [sections, setSections] = useState<Record<SectionKey, string>>({
    introduction: '',
    methods: '',
    results: '',
    discussion: '',
    conclusion: '',
    references: '',
  });

  const completionRate = useMemo(() => {
    if (!practiceData?.statistics) return 0;
    return Number(practiceData.statistics.completionRate ?? practiceData.statistics.completeionRate ?? 0);
  }, [practiceData]);

  const keywords = useMemo(
    () =>
      keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    [keywordsText]
  );

  const openJournals = useMemo(() => journals.filter((j) => j.isOpen !== false), [journals]);

  const buildContext = () => {
    const outcomesSummary = (practiceData?.statistics?.outcomesStats || [])
      .map((outcome: any) => {
        const name = safe(outcome?.outcome);
        const baselineMean = safe(outcome?.baseline?.mean);
        const endpointMean = safe(outcome?.endpoint?.mean);
        const improvementRate = safe(outcome?.improvementRate);
        const pValue = safe(outcome?.change?.pairedTTest?.pValue);
        return `${name}: baseline mean ${baselineMean}, endpoint mean ${endpointMean}, improvement ${improvementRate}%, p=${pValue}`;
      })
      .join(' | ');

    return [
      `Study title: ${safe(practiceData?.title)}`,
      `Study type: ${safe(practiceData?.studyType)}`,
      `Condition: ${safe(practiceData?.condition?.name)} - ${safe(practiceData?.condition?.description)}`,
      `Intervention: ${safe(practiceData?.intervention?.name)} - ${safe(practiceData?.intervention?.description)}`,
      `Protocol: ${safe(practiceData?.intervention?.protocol)}; Duration: ${safe(practiceData?.intervention?.duration)}; Frequency: ${safe(practiceData?.intervention?.frequency)}`,
      `Population total: ${safe(practiceData?.population?.totalCount)}, age range: ${safe(practiceData?.population?.ageRange?.min)}-${safe(practiceData?.population?.ageRange?.max)}`,
      `Completion rate: ${completionRate}%`,
      `Outcomes summary: ${outcomesSummary}`,
    ].join('\n');
  };

  const defaultAbstractFromData = (data: PracticeData) => {
    const condition = safe(data.condition?.name) || 'target condition';
    const intervention = safe(data.intervention?.name) || 'clinical intervention';
    const total = Number(data.population?.totalCount || 0);
    return `Background: Real-world evidence for ${condition} is limited in routine practice settings. Objective: To evaluate outcomes of ${intervention} in a ${safe(data.studyType || 'case-series')} cohort. Methods: We analyzed de-identified clinical data from ${total || 'multiple'} patients with baseline and follow-up outcomes. Results: Preliminary analyses indicate measurable improvements across primary outcomes with a completion rate of ${Number(data.statistics?.completionRate ?? data.statistics?.completeionRate ?? 0)}%. Conclusion: This practice-based cohort suggests ${intervention} may provide clinically meaningful benefit; further controlled studies are recommended.`;
  };

  const hydrateInitialState = (data: PracticeData) => {
    setTitle(`${safe(data.title)} - Manuscript Draft`);
    setAbstractText(defaultAbstractFromData(data));
    setDiscipline(safe(data.literatureContext?.targetDiscipline) || 'medicine');
    setMethodology(safe(data.literatureContext?.targetMethodology) || safe(data.studyType) || 'case-series');

    const outcomeKeywords = (data.outcomes || []).map((o) => safe(o.name)).filter(Boolean);
    const initialKeywords = [safe(data.condition?.name), safe(data.intervention?.name), ...outcomeKeywords]
      .filter(Boolean)
      .slice(0, 8);
    setKeywordsText(initialKeywords.join(', '));
  };

  useEffect(() => {
    const load = async () => {
      if (!practiceDataId) {
        toast.error('Missing practice data id');
        navigate('/practice-data/create');
        return;
      }

      try {
        setLoading(true);
        const [practiceResponse, journalResponse] = await Promise.all([
          apiClient.get(`/practice-data/${practiceDataId}`),
          journalAPI.search('', { isOpen: true }, 1, 100),
        ]);

        const pd = practiceResponse.data as PracticeData;
        setPracticeData(pd);
        setJournals(journalResponse?.journals || []);
        hydrateInitialState(pd);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to load manuscript generation data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [practiceDataId, navigate]);

  const generateSection = async (sectionType: SectionKey) => {
    if (!practiceData) return;

    const fallbackContent = (): string => {
      const condition = safe(practiceData.condition?.name) || 'the target condition';
      const intervention = safe(practiceData.intervention?.name) || 'the intervention';
      const sampleSize = Number(practiceData.population?.totalCount || 0);
      const outcomeNames = (practiceData.outcomes || []).map((o) => safe(o.name)).filter(Boolean);
      const primaryOutcome = outcomeNames[0] || 'the primary outcome';
      const outcomesSummary = (practiceData.statistics?.outcomesStats || [])
        .map((o: any) => {
          const name = safe(o?.outcome);
          const baseline = safe(o?.baseline?.mean);
          const endpoint = safe(o?.endpoint?.mean);
          const improvement = safe(o?.improvementRate);
          return `${name}: baseline ${baseline}, endpoint ${endpoint}, improvement ${improvement}%`;
        })
        .filter(Boolean)
        .join('; ');

      if (sectionType === 'methods') {
        return `This practice-based study evaluated ${intervention} in patients with ${condition}. We used a ${safe(practiceData.studyType) || 'case-series'} design with de-identified clinical data from ${sampleSize || 'a defined'} participants. Baseline and follow-up measurements were collected for ${outcomeNames.join(', ') || 'key outcomes'}.

Patient data were analyzed descriptively, including completion rate and outcome-level change from baseline to endpoint. Continuous outcomes were summarized using mean and standard deviation, and paired comparisons were assessed when data completeness allowed. All analyses were conducted on anonymized records in line with local research governance procedures.`;
      }

      if (sectionType === 'results') {
        return `A total of ${sampleSize || 'multiple'} patients were included in the analysis, with an overall completion rate of ${completionRate}%. The intervention was associated with measurable changes across assessed outcomes.

Key findings included ${outcomesSummary || 'improvement trends from baseline to endpoint across primary outcomes'}. The most clinically relevant change was observed in ${primaryOutcome}. No major data integrity concerns were identified in the analyzed cohort.`;
      }

      if (sectionType === 'discussion') {
        return `This practice-based analysis suggests that ${intervention} may provide clinically meaningful benefit for ${condition}, with improvements observed in ${primaryOutcome} and related outcomes. The observed changes are directionally consistent with expected therapeutic effects in real-world settings.

Interpretation should consider the non-randomized, observational nature of the dataset and potential residual confounding. Nevertheless, the completeness profile and outcome trends support the feasibility of translating this protocol into routine care pathways.

Future studies should include larger multi-center samples, longer follow-up, and comparative control strategies to strengthen causal inference and external validity.`;
      }

      if (sectionType === 'introduction') {
        return `${condition} remains a meaningful clinical challenge in routine practice. While controlled studies provide efficacy signals, there is ongoing need for real-world evidence that reflects implementation realities.

This manuscript examines outcomes associated with ${intervention} in a practice-based cohort, with focus on clinical relevance, feasibility, and translational value for day-to-day care.`;
      }

      if (sectionType === 'conclusion') {
        return `In this real-world cohort, ${intervention} was associated with favorable outcome trends and acceptable completion. These findings support continued evaluation in larger and more controlled study designs.`;
      }

      return `1. Authoritative guideline relevant to ${condition}.
2. Key review article on ${intervention} and outcome mechanisms.
3. Recent real-world evidence studies for ${primaryOutcome}.`;
    };

    try {
      setSectionBusy((prev) => ({ ...prev, [sectionType]: true }));

      const keyPoints = [
        `Condition: ${safe(practiceData.condition?.name)}`,
        `Intervention: ${safe(practiceData.intervention?.name)}`,
        `Sample size: ${safe(practiceData.population?.totalCount)}`,
        `Completion rate: ${completionRate}%`,
      ];

      const response = await manuscriptAPI.generateSection({
        sectionType,
        title,
        abstract: abstractText,
        methodology,
        sourcePath: 'clinical_case',
        keyPoints,
        context: buildContext(),
      });

      const content = response?.section?.content || '';
      if (!content) {
        toast.error(`No content generated for ${SECTION_LABELS[sectionType]}`);
        return;
      }

      setSections((prev) => ({ ...prev, [sectionType]: content }));
      toast.success(`${SECTION_LABELS[sectionType]} generated`);
    } catch (error: any) {
      const backup = fallbackContent();
      setSections((prev) => ({ ...prev, [sectionType]: backup }));
      toast.error(
        error?.response?.data?.error ||
          `AI generation failed for ${SECTION_LABELS[sectionType]}. A structured draft was inserted; please review/edit.`
      );
    } finally {
      setSectionBusy((prev) => ({ ...prev, [sectionType]: false }));
    }
  };

  const generateAllSections = async () => {
    setGeneratingAll(true);
    try {
      for (const sectionType of SECTION_ORDER) {
        await generateSection(sectionType);
      }
    } finally {
      setGeneratingAll(false);
    }
  };

  const bodyMarkdown = useMemo(() => {
    return SECTION_ORDER.map((key) => `## ${SECTION_LABELS[key]}\n\n${sections[key] || ''}`).join('\n\n');
  }, [sections]);

  const saveAsDraft = async () => {
    if (!practiceData) return;
    if (!journalId) {
      toast.error('Select target journal first');
      return;
    }
    if (!title.trim() || !abstractText.trim()) {
      toast.error('Title and abstract are required');
      return;
    }

    try {
      setSavingDraft(true);
      const payload = {
        sourcePath: 'clinical_case',
        journalId,
        title: title.trim(),
        abstract: abstractText.trim(),
        body: bodyMarkdown,
        keywords,
        discipline,
        methodology,
        authors: [
          {
            name: `${safe(user?.profile?.firstName)} ${safe(user?.profile?.lastName)}`.trim() || user?.email || 'Author',
            email: user?.email || '',
            affiliation: user?.profile?.affiliation || '',
            orcid: '',
          },
        ],
        metadata: {
          extractionWarnings: [`Generated from practice data ${practiceData._id}. Review all sections before submission.`],
          sectionHeadings: SECTION_ORDER.map((key) => SECTION_LABELS[key]),
        },
      };

      const response = await manuscriptAPI.createDraft(payload);
      const draftId = response?.manuscript?._id;
      if (!draftId) {
        toast.error('Draft was created but draft id is missing');
        return;
      }

      toast.success('Draft saved. Continue to submission review.');
      navigate(`/journals/${journalId}/submit?draftId=${draftId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save manuscript draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const exportPdf = async () => {
    if (!practiceData) return;

    try {
      setExportingPdf(true);
      await PDFGenerator.exportToPDF(
        {
          title,
          condition: {
            name: safe(practiceData.condition?.name),
            description: safe(practiceData.condition?.description),
          },
          intervention: {
            name: safe(practiceData.intervention?.name),
            description: safe(practiceData.intervention?.description),
          },
          population: {
            totalCount: Number(practiceData.population?.totalCount || 0),
            ageRange: {
              min: Number(practiceData.population?.ageRange?.min || 0),
              max: Number(practiceData.population?.ageRange?.max || 0),
            },
          },
          outcomes: practiceData.outcomes || [],
          statistics: {
            completionRate,
            outcomesStats: practiceData.statistics?.outcomesStats || [],
          },
          studyType: safe(practiceData.studyType),
        },
        `${title.replace(/\s+/g, '_').toLowerCase() || 'practice_manuscript'}.pdf`
      );
      toast.success('PDF export started');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Loading manuscript generation workspace...</p>
      </div>
    );
  }

  if (!practiceData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">Practice data not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Generate Manuscript from Practice Data</h1>
          <p className="text-gray-600">
            AI-assisted drafting with manual editing. Generate section by section, review, then save as draft for journal submission.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-sm text-gray-700">
              <strong>Source study:</strong> {practiceData.title}
            </div>
            <div className="text-sm text-gray-700">
              <strong>Status:</strong> {practiceData.manuscriptStatus || 'collecting'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Submission Metadata</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Journal *</label>
              <select
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select journal</option>
                {openJournals.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
              <input
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Methodology</label>
              <input
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
              <input
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abstract *</label>
            <textarea
              value={abstractText}
              onChange={(e) => setAbstractText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={generateAllSections}
              disabled={generatingAll}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generatingAll ? 'Generating All...' : 'Generate All Sections'}
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={exportingPdf}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {exportingPdf ? 'Preparing PDF...' : 'Export PDF'}
            </button>
            <button
              type="button"
              onClick={saveAsDraft}
              disabled={savingDraft}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingDraft ? 'Saving...' : 'Save Draft and Continue'}
            </button>
          </div>

          <div className="space-y-6">
            {SECTION_ORDER.map((key) => (
              <section key={key} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{SECTION_LABELS[key]}</h3>
                  <button
                    type="button"
                    onClick={() => generateSection(key)}
                    disabled={sectionBusy[key]}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sectionBusy[key] ? 'Generating...' : `Generate ${SECTION_LABELS[key]}`}
                  </button>
                </div>
                <textarea
                  value={sections[key]}
                  onChange={(e) => setSections((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  placeholder={`Write or generate ${SECTION_LABELS[key]}...`}
                />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
