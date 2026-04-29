/**
 * Standardized options for manuscript discipline and methodology
 * Used across manuscript creation, submission, and filtering
 */

export const DISCIPLINES = [
  { value: 'medicine', label: 'Medicine' },
  { value: 'ayurveda', label: 'Ayurveda' },
  { value: 'homeopathy', label: 'Homeopathy' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'public-health', label: 'Public Health' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'physiology', label: 'Physiology' },
  { value: 'pharmacology', label: 'Pharmacology' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'allied-health', label: 'Allied Health' },
  { value: 'general', label: 'General/Other' },
];

export const METHODOLOGIES = [
  { value: 'case-report', label: 'Case Report' },
  { value: 'case-series', label: 'Case Series' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'systematic-review', label: 'Systematic Review' },
  { value: 'meta-analysis', label: 'Meta-Analysis' },
  { value: 'rct', label: 'RCT (Randomized Controlled Trial)' },
  { value: 'cohort-study', label: 'Cohort Study' },
  { value: 'cross-sectional', label: 'Cross-Sectional Study' },
  { value: 'qualitative', label: 'Qualitative Study' },
  { value: 'mixed-methods', label: 'Mixed Methods' },
  { value: 'literature-review', label: 'Literature Review' },
  { value: 'opinion-commentary', label: 'Opinion/Commentary' },
  { value: 'external-submission', label: 'External Submission' },
];

export const getDisciplineLabel = (value: string): string => {
  return DISCIPLINES.find((d) => d.value === value)?.label || value;
};

export const getMethodologyLabel = (value: string): string => {
  return METHODOLOGIES.find((m) => m.value === value)?.label || value;
};
