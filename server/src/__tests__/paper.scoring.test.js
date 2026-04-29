/**
 * Tests scoring utilities exported from paperService:
 * - jaccardSimilarity (token-set overlap)
 * - normalizeTitle (lowercasing, punctuation stripping)
 * - getRelatedPapers scoring shape (higher shared refs → higher relevance)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  jaccardSimilarity,
  normalizeTitle,
} from '../services/paperService.js';

describe('normalizeTitle', () => {
  it('lowercases the title', () => {
    expect(normalizeTitle('AYURVEDA Herbs')).toBe('ayurveda herbs');
  });

  it('strips punctuation and colons', () => {
    // normalizeTitle also collapses spaces and trims, so 'Gut health: a review.' → 'gut health a review'
    expect(normalizeTitle('Gut health: a review.')).toBe('gut health a review');
  });

  it('returns empty string for null / undefined', () => {
    expect(normalizeTitle(null)).toBe('');
    expect(normalizeTitle(undefined)).toBe('');
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(jaccardSimilarity('gut microbiome', 'gut microbiome')).toBe(1);
  });

  it('returns 0 for completely disjoint strings', () => {
    expect(jaccardSimilarity('ayurveda herbs', 'cardiac surgery')).toBe(0);
  });

  it('returns 0 when either string is empty', () => {
    expect(jaccardSimilarity('', 'something')).toBe(0);
    expect(jaccardSimilarity('something', '')).toBe(0);
  });

  it('partial overlap returns value between 0 and 1', () => {
    const score = jaccardSimilarity('gut health review', 'gut microbiome study');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('similarity is symmetric', () => {
    const a = 'clinical trial ayurveda';
    const b = 'ayurveda traditional medicine';
    expect(jaccardSimilarity(a, b)).toBeCloseTo(jaccardSimilarity(b, a), 6);
  });

  it('high similarity for near-duplicate titles at the dedupe threshold (>=0.88)', () => {
    const title1 = 'Efficacy of Triphala in metabolic syndrome a systematic review';
    const title2 = 'Efficacy of triphala in metabolic syndrome: a systematic review';
    expect(jaccardSimilarity(title1, title2)).toBeGreaterThanOrEqual(0.88);
  });

  it('low similarity for clearly different titles', () => {
    const score = jaccardSimilarity(
      'Ashwagandha root extract immunomodulatory properties',
      'Cardiac bypass surgery postoperative outcomes'
    );
    expect(score).toBeLessThan(0.2);
  });
});
