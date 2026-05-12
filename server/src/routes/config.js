import express from 'express';
import Settings from '../models/Settings.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Default items — used as seed if nothing is in DB yet
const DEFAULT_DISCIPLINES = [
  { value: 'medicine', label: 'Medicine', order: 0 },
  { value: 'ayurveda', label: 'Ayurveda', order: 1 },
  { value: 'homeopathy', label: 'Homeopathy', order: 2 },
  { value: 'nursing', label: 'Nursing', order: 3 },
  { value: 'public-health', label: 'Public Health', order: 4 },
  { value: 'psychology', label: 'Psychology', order: 5 },
  { value: 'physiology', label: 'Physiology', order: 6 },
  { value: 'pharmacology', label: 'Pharmacology', order: 7 },
  { value: 'nutrition', label: 'Nutrition', order: 8 },
  { value: 'allied-health', label: 'Allied Health', order: 9 },
  { value: 'general', label: 'General/Other', order: 10 },
];

const DEFAULT_METHODOLOGIES = [
  { value: 'case-report', label: 'Case Report', order: 0 },
  { value: 'case-series', label: 'Case Series', order: 1 },
  { value: 'case-study', label: 'Case Study', order: 2 },
  { value: 'systematic-review', label: 'Systematic Review', order: 3 },
  { value: 'meta-analysis', label: 'Meta-Analysis', order: 4 },
  { value: 'rct', label: 'RCT (Randomized Controlled Trial)', order: 5 },
  { value: 'cohort-study', label: 'Cohort Study', order: 6 },
  { value: 'cross-sectional', label: 'Cross-Sectional Study', order: 7 },
  { value: 'qualitative', label: 'Qualitative Study', order: 8 },
  { value: 'mixed-methods', label: 'Mixed Methods', order: 9 },
  { value: 'literature-review', label: 'Literature Review', order: 10 },
  { value: 'opinion-commentary', label: 'Opinion/Commentary', order: 11 },
  { value: 'external-submission', label: 'External Submission', order: 12 },
];

async function getSettingsItems(key, defaults) {
  let doc = await Settings.findOne({ key }).lean();
  if (!doc || !doc.items || doc.items.length === 0) {
    return defaults;
  }
  return doc.items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ── Public: GET /api/config/classifications ───────────────────────────────────
router.get('/classifications', async (req, res, next) => {
  try {
    const [disciplines, methodologies] = await Promise.all([
      getSettingsItems('disciplines', DEFAULT_DISCIPLINES),
      getSettingsItems('methodologies', DEFAULT_METHODOLOGIES),
    ]);
    res.json({ disciplines, methodologies });
  } catch (err) {
    next(err);
  }
});

// ── Admin: PUT /api/config/disciplines ────────────────────────────────────────
router.put('/disciplines', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    const cleaned = items
      .filter(i => i.value?.trim() && i.label?.trim())
      .map((i, idx) => ({ value: i.value.trim(), label: i.label.trim(), order: idx }));

    await Settings.findOneAndUpdate(
      { key: 'disciplines' },
      { key: 'disciplines', items: cleaned },
      { upsert: true, new: true }
    );
    res.json({ success: true, items: cleaned });
  } catch (err) {
    next(err);
  }
});

// ── Admin: PUT /api/config/methodologies ─────────────────────────────────────
router.put('/methodologies', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    const cleaned = items
      .filter(i => i.value?.trim() && i.label?.trim())
      .map((i, idx) => ({ value: i.value.trim(), label: i.label.trim(), order: idx }));

    await Settings.findOneAndUpdate(
      { key: 'methodologies' },
      { key: 'methodologies', items: cleaned },
      { upsert: true, new: true }
    );
    res.json({ success: true, items: cleaned });
  } catch (err) {
    next(err);
  }
});

export default router;
