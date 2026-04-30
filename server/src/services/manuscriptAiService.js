import { GoogleGenerativeAI } from '@google/generative-ai';

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
    return JSON.parse(fencedMatch[1]);
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(text);
};

const generateGeminiJson = async (prompt) => {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  return result?.response?.text?.() || '';
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
          content: 'Return valid JSON only. No markdown fences, no extra commentary.',
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
  return payload?.choices?.[0]?.message?.content || '';
};

const generateJson = async (prompt) => {
  const provider = getProvider();
  let text = '';

  if (provider === 'minimax') {
    text = await generateMinimaxJson(prompt);
  } else {
    text = await generateGeminiJson(prompt);
  }

  return extractJson(text);
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

export const generateSectionDraft = async ({
  sectionType,
  title,
  abstract,
  methodology,
  keyPoints,
  sourcePath,
  context,
}) => {
  const prompt = `
You are an expert research manuscript writer.
Write one manuscript section in academic tone.

Input:
- sectionType: ${sectionType}
- title: ${title || ''}
- abstract: ${abstract || ''}
- methodology: ${methodology || ''}
- sourcePath: ${sourcePath || ''}
- keyPoints: ${JSON.stringify(keyPoints || [])}
- context: ${context || ''}

Rules:
- 3 to 6 paragraphs.
- Concrete and publication-ready wording.
- No bullet list unless sectionType is references.

Return strict JSON:
{
  "sectionType": "${sectionType}",
  "title": "...",
  "content": "..."
}
`;

  return generateJson(prompt);
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

export default {
  generateOutline,
  generateSectionDraft,
  generateStructuredDraft,
  generateClinicalDraft,
};
