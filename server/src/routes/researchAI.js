import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authMiddleware, researcherMiddleware } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

const SYSTEM_PROMPT = `You are a biostatistics expert helping traditional medicine researchers (Ayurvedic, Siddha, TCM, herbal medicine) choose the right statistical test.

A researcher will describe their study in plain English. Respond with ONLY a valid JSON object — no markdown, no code fences. Follow this EXACT schema:
{
  "test": "one of: descriptive-stats|shapiro-wilk|independent-t-test|paired-t-test|one-way-anova|mann-whitney-u|wilcoxon|kruskal-wallis|pearson-correlation|spearman-correlation|chi-square|linear-regression|logistic-regression|cronbach-alpha|efa|cfa",
  "testName": "full human-readable test name",
  "rationale": "2-3 plain-English sentences explaining why this test suits their study",
  "dataInput": {
    "type": "one of: paired|two-groups|multi-groups|correlation|categories|items|descriptive|unsupported",
    "labels": ["column or group label 1", "column or group label 2"],
    "instructions": "plain English: exactly what data to enter, one row per patient, what each value represents",
    "sampleSizeMin": 15,
    "sampleSizeRecommended": 30,
    "example": "4-6 lines of realistic example data in the exact input format"
  }
}

Type rules:
- paired: same patients measured before AND after (two numbers per row: before, after)
- two-groups: two different independent groups (format per line: GroupName: v1, v2, v3)
- multi-groups: three or more independent groups (same format as two-groups)
- correlation: two continuous variables (two numbers per row: x, y)
- categories: two categorical variables — contingency table (first row = column headers, first column = row label)
- items: questionnaire scale reliability (each row = one participant, columns = item scores)
- descriptive: summary stats only (format per line: VariableName: v1, v2, v3)
- unsupported: regression or factor analysis — requires SPSS, cannot compute here

For regression/factor analysis, set type="unsupported" and explain SPSS is required in instructions.`;

/**
 * POST /api/research-ai/recommend
 * Body: { question: string }
 * Returns AI-structured test recommendation.
 */
router.post('/recommend', authMiddleware, researcherMiddleware, async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 10) {
      return res.status(400).json({ error: 'Please describe your research study (at least 10 characters).' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured. Please contact the administrator.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question.trim().substring(0, 1200),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const raw = (response.text ?? '').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.warn('Research AI: could not parse JSON', { raw: raw.substring(0, 300) });
      return res.status(500).json({ error: 'AI returned an unreadable response. Please try again.' });
    }

    if (!parsed.test || !parsed.dataInput?.type) {
      return res.status(500).json({ error: 'AI returned an incomplete recommendation. Please try again.' });
    }

    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

export default router;
