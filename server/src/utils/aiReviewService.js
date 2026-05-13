import { GoogleGenAI } from '@google/genai';
import logger from './logger.js';

const SYSTEM_PROMPT = `You are an expert academic peer reviewer for TradMed International, a journal specialising in traditional medicine, integrative health, and ethnomedicine research. Your role is to provide a structured, impartial pre-screening review of submitted manuscripts.

Evaluate the manuscript on five dimensions, each scored 1–10:
1. Methodology — rigour, reproducibility, appropriate study design
2. Clarity — writing quality, logical structure, abstract accuracy
3. Originality — novelty of contribution, differentiation from existing literature
4. Completeness — all required sections present, adequate references, ethical statement
5. Ethics & Citations — proper citation of sources, no obvious plagiarism signals, ethics compliance where applicable

Return ONLY valid JSON matching this exact schema (no markdown, no explanation outside the JSON):
{
  "overallScore": <number 1-10>,
  "recommendation": "<accept|minor-revisions|major-revisions|reject>",
  "summary": "<2-3 sentence executive summary of the paper and your overall assessment>",
  "methodology": { "score": <1-10>, "comments": "<specific feedback>" },
  "clarity": { "score": <1-10>, "comments": "<specific feedback>" },
  "originality": { "score": <1-10>, "comments": "<specific feedback>" },
  "completeness": { "score": <1-10>, "comments": "<specific feedback>" },
  "ethicsAndCitations": { "score": <1-10>, "comments": "<specific feedback>" },
  "keyStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "keyWeaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "suggestedActions": ["<action 1>", "<action 2>", "<action 3>"]
}`;

/**
 * Run AI peer review on a manuscript.
 * Returns the parsed report object, or throws on failure.
 */
export async function runAiReview(manuscript) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const ai = new GoogleGenAI({ apiKey });

  // Build the content to review — use what's available
  const authorNames = (manuscript.authors || []).map(a => a.name).join(', ');
  const keywords = (manuscript.keywords || []).join(', ');

  const userContent = `
MANUSCRIPT TITLE: ${manuscript.title}
AUTHORS: ${authorNames || 'Not specified'}
KEYWORDS: ${keywords || 'Not specified'}
DISCIPLINES: ${(manuscript.disciplines || []).join(', ') || 'Not specified'}

ABSTRACT:
${manuscript.abstract || '(No abstract provided)'}

${manuscript.body ? `FULL TEXT:\n${manuscript.body.substring(0, 8000)}` : ''}
`.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userContent,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });

  const raw = response.text?.trim() || '';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const report = JSON.parse(cleaned);

  // Validate required fields
  if (typeof report.overallScore !== 'number' || !report.recommendation) {
    throw new Error('AI returned incomplete report structure');
  }

  return report;
}

/**
 * Run AI review and persist result on the manuscript document.
 * Call this fire-and-forget (non-blocking) after submission.
 */
export async function runAndSaveAiReview(manuscript) {
  try {
    logger.info(`🤖 Starting AI review for ${manuscript.submissionId}`);
    const report = await runAiReview(manuscript);
    manuscript.aiReviewReport = {
      ...report,
      generatedAt: new Date(),
      status: 'done',
    };
    await manuscript.save();
    logger.info(`✅ AI review done for ${manuscript.submissionId} — score: ${report.overallScore}/10 (${report.recommendation})`);
  } catch (err) {
    logger.warn(`⚠️ AI review failed for ${manuscript.submissionId}: ${err.message}`);
    try {
      manuscript.aiReviewReport = { status: 'failed', generatedAt: new Date() };
      await manuscript.save();
    } catch (_) {}
  }
}
