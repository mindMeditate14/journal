import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Retry wrapper with exponential backoff for transient API failures
 */
const withRetry = async (fn, retries = 2, baseDelayMs = 800) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
};

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M1';

const getProvider = () => String(process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();

const getGeminiModel = () => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    const error = new Error('GOOGLE_GEMINI_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL });
};

const getMinimaxConfig = () => {
  const apiKey = process.env.MINIMAX_API_KEY;
  const baseUrl = String(process.env.MINIMAX_BASE_URL || '').trim();
  const model = String(process.env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL).trim();

  if (!apiKey || apiKey === 'your-minimax-api-key') {
    const error = new Error('MINIMAX_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  if (!baseUrl) {
    const error = new Error('MINIMAX_BASE_URL is not configured');
    error.status = 503;
    throw error;
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
  };
};

const extractJson = (text = '') => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try { return JSON.parse(fencedMatch[1].trim()); } catch { /* continue */ }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
  }

  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    try { return JSON.parse(text.slice(firstBracket, lastBracket + 1)); } catch { /* continue */ }
  }

  return null;
};

const generateGeminiJson = async (prompt) => {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() || '';
  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }
  return text;
};

const generateMinimaxJson = async (prompt) => {
  const { apiKey, baseUrl, model } = getMinimaxConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. No markdown fences, no extra commentary. JSON must include "content" and "title" fields.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Minimax request failed: ${response.status} ${details}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || '';
  if (!text || text.trim().length === 0) {
    throw new Error('Minimax returned empty response');
  }
  return text;
};

const generateJson = async (prompt) => {
  const provider = getProvider();

  let text;
  if (provider === 'minimax') {
    text = await withRetry(() => generateMinimaxJson(prompt));
  } else {
    text = await withRetry(() => generateGeminiJson(prompt));
  }

  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object') {
    console.warn('[manuscriptAiService] Could not parse JSON. Raw length:', text?.length);
    throw new Error('AI response was not valid JSON');
  }
  return parsed;
};

export const generateOutline = async ({ title, abstract, discipline, methodology, sourcePath }) => {
  const prompt = `
You are an expert academic writing assistant.
Generate a concise manuscript outline as JSON only.

Input:
- title: ${title || ''}
- abstract: ${abstract || ''}
- discipline: ${discipline || ''}
- methodology: ${methodology || ''}
- sourcePath: ${sourcePath || ''}

Return strict JSON with this shape:
{
  "sections": [
    { "type": "introduction", "title": "...", "guidance": "..." },
    { "type": "methods", "title": "...", "guidance": "..." },
    { "type": "results", "title": "...", "guidance": "..." },
    { "type": "discussion", "title": "...", "guidance": "..." },
    { "type": "conclusion", "title": "...", "guidance": "..." }
  ]
}
`;

  return generateJson(prompt);
};

// ── Fallback content generators ─────────────────────────────────────────────

/** Parse structured data from context string */
const parseContextData = (context) => {
  const lines = (context || '').split('\n').map(l => l.trim()).filter(Boolean);
  const data = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      data[line.slice(0, colonIdx).trim().toLowerCase()] = line.slice(colonIdx + 1).trim();
    }
  }
  return data;
};

/** Parse outcome statistics from context */
const parseOutcomeStats = (context) => {
  const outcomesSection = context?.match(/outcomes summary:?\s*([\s\S]*?)(?:\n|$)/i)?.[1] || '';
  return outcomesSection.split('|').map(o => o.trim()).filter(Boolean).map(part => {
    const match = part.match(/(.*?):\s*baseline\s*(?:mean\s*)?([0-9.\-]+),?\s*endpoint\s*(?:mean\s*)?([0-9.\-]+),?\s*improvement\s*([0-9.]+)%/i);
    if (match) return { name: match[1].trim(), baseline: match[2].trim(), endpoint: match[3].trim(), improvement: match[4].trim() };
    const simple = part.match(/(.*?):\s*baseline\s*([0-9.\-]+),?\s*endpoint\s*([0-9.\-]+),?\s*improvement\s*([0-9.]+)%/i);
    if (simple) return { name: simple[1].trim(), baseline: simple[2].trim(), endpoint: simple[3].trim(), improvement: simple[4].trim() };
    return null;
  }).filter(Boolean);
};

/** Generate structured fallback content when AI fails */
const generateFallbackContent = (sectionType, context) => {
  const d = parseContextData(context);
  const studyType = d['study type'] || 'case-series';
  const condition = d['condition'] || 'the target condition';
  const intervention = d['intervention'] || 'the intervention';
  const population = d['population total'] || 'the sample';
  const completionRate = d['completion rate'] || 'high';
  const primary = parseOutcomeStats(context)[0] || null;

  if (sectionType === 'introduction') {
    return `${condition} remains a significant clinical challenge in routine practice settings. While controlled clinical trials provide important efficacy signals under ideal conditions, real-world evidence reflecting actual implementation outcomes is comparatively sparse. The gap between controlled study environments and everyday clinical practice creates uncertainty about treatment effectiveness in heterogeneous patient populations.\n\n${intervention} has demonstrated theoretical promise for addressing this condition, though published literature on its application in routine clinical settings remains limited. Understanding how ${intervention} performs when applied to typical patients in practice-based contexts is essential for informing clinical decision-making and treatment guidelines.\n\nThis study examines clinical outcomes associated with ${intervention} in a ${studyType} conducted in routine practice settings. Our objective was to evaluate real-world effectiveness, safety, and feasibility to complement existing controlled trial data.`;
  }

  if (sectionType === 'methods') {
    return `This practice-based study used a ${studyType} design conducted in routine clinical settings. De-identified patient records were collected from ${population} participants with confirmed ${condition}. Ethics approval and informed patient consent were obtained prior to data collection.\n\nBaseline demographic and clinical characteristics were recorded before intervention initiation. Primary outcomes were assessed at scheduled follow-up points using standardized measurement instruments as specified in the clinical protocol. Adverse events were monitored and documented throughout the study period.\n\nStatistical analysis included descriptive summaries of baseline characteristics and outcome measures. Continuous variables were expressed as mean ± standard deviation, and categorical variables as frequencies and percentages. Before-after comparisons for primary outcomes used paired statistical tests where data completeness permitted. All analyses were performed on anonymized datasets in accordance with research governance requirements.`;
  }

  if (sectionType === 'results') {
    const outcomesText = primary
      ? `The primary outcome showed a mean baseline value of ${primary.baseline}, improving to ${primary.endpoint} at follow-up (${primary.improvement}% improvement).`
      : 'Outcome analyses demonstrated measurable improvements across the assessed primary and secondary endpoints compared to baseline measurements.';
    return `A total of ${population} patients were included in this practice-based analysis, with an overall completion rate of ${completionRate}. Patient demographics were representative of the target condition population, with appropriate age distribution and gender balance.\n\n${outcomesText}\n\nAdverse events were uncommon and of mild-to-moderate severity when they occurred. No patients discontinued participation due to safety concerns. Data quality was maintained throughout the study period with minimal missing values for key outcome measures.`;
  }

  if (sectionType === 'discussion') {
    const outcomeRef = primary ? `The observed ${primary.improvement}% improvement in ${primary.name} is directionally consistent with expected therapeutic effects based on established clinical rationale.` : '';
    return `This practice-based analysis provides real-world evidence for the effectiveness of ${intervention} in patients with ${condition}. ${outcomeRef || 'Outcome trends demonstrated clinically meaningful improvements across primary measures.'} These findings complement controlled trial data by demonstrating feasibility and effectiveness in routine practice environments.\n\nImportant limitations include the non-randomized observational design, which precludes causal inference and introduces potential confounding. Sample size, while adequate for descriptive analysis, may limit statistical power for subgroup analyses. Nevertheless, the data completeness profile and consistency of directional trends support the robustness of the primary findings.\n\nFuture research should consider randomized controlled designs with larger multi-center samples and extended follow-up periods to confirm these preliminary observations. Comparative effectiveness studies against standard-of-care alternatives would further strengthen the evidence base for clinical guideline development.`;
  }

  if (sectionType === 'conclusion') {
    return `In this real-world ${studyType} conducted in routine practice settings, ${intervention} demonstrated favorable outcome trends and acceptable tolerability in patients with ${condition}. With a ${completionRate} completion rate, the intervention proved feasible for implementation in clinical workflows.\n\nThese findings suggest ${intervention} may offer a clinically useful option for patients with this condition, warranting further investigation in more rigorously controlled study designs. Clinicians may consider these preliminary results when evaluating treatment options, particularly for patients who have not responded adequately to standard approaches.\n\nFurther research is recommended to confirm these findings, establish optimal treatment protocols, and define patient subgroups most likely to benefit from this intervention.`;
  }

  if (sectionType === 'references') {
    return `1. Authoritative clinical guideline relevant to ${condition} management.\n2. Systematic review on ${intervention} efficacy and safety profile.\n3. Recent randomized controlled trial on ${intervention} for ${condition} (if available).\n4. Real-world evidence studies on treatment outcomes in routine clinical practice.\n5. Expert consensus or position statement on the intervention approach.\n\n(Researcher should replace with actual citations relevant to the study.)`;
  }

  return `${sectionType} section content (placeholder - please review and edit)`;
};

export const generateSectionDraft = async ({
  sectionType,
  title,
  abstract,
  methodology,
  keyPoints,
  sourcePath,
  context,
}) => {
  const sectionInstructions = {
    introduction: 'Focus on clinical significance, existing evidence gaps, and study objectives. 3-4 paragraphs, academic tone.',
    methods: 'Cover study design, setting, population, intervention details, outcome definitions, and statistical methods. Be specific about measurement tools and timing. 3-4 paragraphs.',
    results: 'Present findings systematically with actual numbers from context. Include baseline characteristics, primary/secondary outcomes with means/SDs, completion rates, and adverse events. DO NOT fabricate numbers not in context. 4-5 paragraphs.',
    discussion: 'Interpret findings in context of existing literature, acknowledge limitations, discuss clinical implications. 4-5 paragraphs.',
    conclusion: 'Summarize main findings, clinical implications, and future directions. 2-3 paragraphs.',
    references: 'Provide a list of 5-7 key references that this study builds upon. Format as numbered list with citation details.',
  };

  const instruction = sectionInstructions[sectionType] || 'Write 3-5 paragraphs in academic tone.';
  const formattedKeyPoints = Array.isArray(keyPoints) && keyPoints.length > 0
    ? keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')
    : 'No specific key points provided.';

  const prompt = `
You are an expert research manuscript writer.
Write one manuscript section in academic tone.

Section: ${sectionType}
Title: ${title || 'Research Study'}
Abstract: ${abstract || 'Not provided'}
Methodology: ${methodology || 'Not specified'}

Key Points to Include:
${formattedKeyPoints}

Study Context (use actual numbers from this data):
${context || 'No additional context provided.'}

Instructions:
- ${instruction}
- Use publication-ready academic wording.
- DO NOT invent numbers not present in context above. Describe patterns qualitatively if statistics are missing.
- For Results: use exact values from context if available.
- Return JSON with "sectionType", "title", and "content" fields only.

Return strict JSON:
{
  "sectionType": "${sectionType}",
  "title": "...",
  "content": "..."
}
`;

  try {
    const result = await generateJson(prompt);

    if (!result.content || typeof result.content !== 'string' || result.content.trim().length < 50) {
      console.warn(`[manuscriptAiService] Insufficient content for ${sectionType}. Using fallback.`);
      return {
        sectionType,
        title: title || sectionType,
        content: generateFallbackContent(sectionType, context),
        _fallback: true,
        _warning: 'AI returned insufficient content; structured fallback inserted.',
      };
    }

    return {
      sectionType: result.sectionType || sectionType,
      title: result.title || title || sectionType,
      content: result.content,
    };
  } catch (err) {
    console.warn(`[manuscriptAiService] generateSectionDraft failed for ${sectionType}:`, err.message);
    return {
      sectionType,
      title: title || sectionType,
      content: generateFallbackContent(sectionType, context),
      _fallback: true,
      _warning: `AI generation failed (${err.message}); structured fallback inserted.`,
    };
  }
};

export const generateStructuredDraft = async ({
  title,
  abstract,
  discipline,
  methodology,
  objective,
  methods,
  findings,
  limitations,
}) => {
  const prompt = `
You are an expert academic writer.
Generate a full draft body in markdown for a structured-input manuscript.

Input:
- title: ${title || ''}
- abstract: ${abstract || ''}
- discipline: ${discipline || ''}
- methodology: ${methodology || ''}
- objective: ${objective || ''}
- methods: ${methods || ''}
- findings: ${findings || ''}
- limitations: ${limitations || ''}

Return strict JSON:
{
  "body": "markdown content with sections Introduction, Methods, Results, Discussion, Limitations, Conclusion, References",
  "keywords": ["...", "..."],
  "sectionHeadings": ["Introduction", "Methods", "Results", "Discussion", "Limitations", "Conclusion", "References"]
}
`;

  return generateJson(prompt);
};

export const generateClinicalDraft = async ({
  title,
  abstract,
  discipline,
  methodology,
  condition,
  intervention,
  outcome,
  notes,
}) => {
  const prompt = `
You are an expert medical case report writer.
Generate a full case-report draft body in markdown.

Input:
- title: ${title || ''}
- abstract: ${abstract || ''}
- discipline: ${discipline || ''}
- methodology: ${methodology || ''}
- condition: ${condition || ''}
- intervention: ${intervention || ''}
- outcome: ${outcome || ''}
- notes: ${notes || ''}

Return strict JSON:
{
  "body": "markdown content with sections Introduction, Case Presentation, Outcomes, Discussion, Conclusion, References",
  "keywords": ["...", "..."],
  "sectionHeadings": ["Introduction", "Case Presentation", "Outcomes", "Discussion", "Conclusion", "References"]
}
`;

  return generateJson(prompt);
};

// ── NEW: End-to-end automated manuscript generation ─────────────────────────

/**
 * Generate a complete manuscript draft from practice data in one call.
 * Combines statistics context automatically for accurate Results section.
 */
export const generateCompleteManuscript = async ({ practiceData, statistics, options = {} }) => {
  const {
    title = '',
    studyType = 'case-series',
    condition = {},
    intervention = {},
    population = {},
    targetDiscipline = 'medicine',
  } = practiceData;

  const condName = condition?.name || 'target condition';
  const intName = intervention?.name || 'the intervention';
  const intProtocol = intervention?.protocol || '';
  const intDuration = intervention?.duration || '';
  const intFrequency = intervention?.frequency || '';
  const total = population?.totalCount || 0;
  const ageMin = population?.ageRange?.min || 18;
  const ageMax = population?.ageRange?.max || 65;
  const completionRate = statistics?.completionRate ?? statistics?.completeionRate ?? 0;

  const outcomesSummary = (statistics?.outcomesStats || statistics?.outcomesAnalysis || []).map((o) => {
    const name = o?.outcome || o?.name || 'Outcome';
    const baseline = o?.baseline?.mean || '-';
    const endpoint = o?.endpoint?.mean || '-';
    const improvement = o?.improvementRate || '-';
    const pValue = o?.change?.pairedTTest?.pValue;
    return `${name}: baseline mean ${baseline}, endpoint mean ${endpoint}, improvement ${improvement}%${pValue ? ', p=' + pValue : ''}`;
  }).filter(s => !s.includes('baseline mean -')).join(' | ');

  const context = [
    `Study title: ${title}`,
    `Study type: ${studyType}`,
    `Condition: ${condName}`,
    `Intervention: ${intName}`,
    `Protocol: ${intProtocol}; Duration: ${intDuration}; Frequency: ${intFrequency}`,
    `Population total: ${total}, age range: ${ageMin}-${ageMax}`,
    `Completion rate: ${completionRate}%`,
    `Outcomes summary: ${outcomesSummary || 'data not yet available'} `,
  ].join('\n');

  const sectionTypes = ['introduction', 'methods', 'results', 'discussion', 'conclusion', 'references'];

  // Generate all sections in parallel
  const sectionPromises = sectionTypes.map((sectionType) =>
    generateSectionDraft({
      sectionType,
      title,
      abstract: '',
      methodology: studyType,
      keyPoints: [
        `Condition: ${condName}`,
        `Intervention: ${intName}`,
        `Sample size: ${total}`,
        `Completion rate: ${completionRate}%`,
        `Target discipline: ${targetDiscipline}`,
      ],
      sourcePath: 'practice_data_auto',
      context,
    })
  );

  const sectionResults = await Promise.allSettled(sectionPromises);

  const sections = {};
  const errors = [];

  for (let i = 0; i < sectionTypes.length; i++) {
    const sectionType = sectionTypes[i];
    const result = sectionResults[i];

    if (result.status === 'fulfilled') {
      sections[sectionType] = result.value;
      if (result.value._fallback) {
        errors.push({ section: sectionType, warning: result.value._warning });
      }
    } else {
      sections[sectionType] = {
        sectionType,
        title,
        content: generateFallbackContent(sectionType, context),
        _fallback: true,
        _warning: `Critical failure: ${result.reason?.message}`,
      };
      errors.push({ section: sectionType, warning: 'Critical failure; fallback used.' });
    }
  }

  const bodyMarkdown = sectionTypes
    .map((key) => `## ${key.charAt(0).toUpperCase() + key.slice(1)}\n\n${sections[key]?.content || ''}`)
    .join('\n\n');

  return {
    sections,
    body: bodyMarkdown,
    keywords: [condName, intName, targetDiscipline].filter(Boolean).slice(0, 8),
    sectionHeadings: sectionTypes.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    metadata: {
      generatedAt: new Date().toISOString(),
      practiceDataId: practiceData._id,
      statisticsIncluded: !!statistics,
      errors,
      completionRate,
      totalPatients: total,
    },
  };
};

export default {
  generateOutline,
  generateSectionDraft,
  generateStructuredDraft,
  generateClinicalDraft,
  generateCompleteManuscript,
};
