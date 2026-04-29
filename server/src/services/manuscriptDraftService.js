import pdfParse from 'pdf-parse';

const KEYWORD_SEPARATOR = /,|;|\||•/;

const toTitleCase = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const computeCompletenessScore = ({ title, abstract, body, keywords, authors, journalId }) => {
  let score = 0;
  if (title) score += 20;
  if (abstract) score += 20;
  if (body && body.length >= 500) score += 20;
  if (Array.isArray(keywords) && keywords.length > 0) score += 10;
  if (Array.isArray(authors) && authors.length > 0) score += 20;
  if (journalId) score += 10;
  return Math.min(100, score);
};

const computeValidationState = (score) => {
  if (score >= 80) return 'ready_for_submission';
  if (score >= 50) return 'review_needed';
  return 'incomplete';
};

const normalizeAuthorLine = (line) =>
  line
    .split(/,| and /i)
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => !/abstract|introduction|methods|results|discussion/i.test(name));

const sectionHeadingRegex = /^\s*(abstract|introduction|background|methods|methodology|materials and methods|results|discussion|conclusion|references)\s*:?\s*$/gim;

const extractSectionHeadings = (text = '') => {
  const headings = new Set();
  let match;
  while ((match = sectionHeadingRegex.exec(text)) !== null) {
    headings.add(toTitleCase(match[1]));
  }
  return Array.from(headings);
};

const extractReferences = (text = '') => {
  const refsIndex = text.toLowerCase().indexOf('\nreferences');
  if (refsIndex === -1) return [];
  const refText = text.slice(refsIndex).split('\n').slice(1).join('\n');
  return refText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 15)
    .slice(0, 50);
};

const extractKeywords = (text = '') => {
  const keywordMatch = text.match(/keywords?\s*:?\s*([^\n]+)/i);
  if (!keywordMatch) return [];
  return keywordMatch[1]
    .split(KEYWORD_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const extractDOI = (text = '') => {
  const match = text.match(/10\.\d{4,9}\/[\-._;()/:A-Z0-9]+/i);
  return match ? match[0].toLowerCase() : undefined;
};

const extractAbstract = (text = '') => {
  const abstractStart = text.search(/\babstract\b\s*:?/i);
  if (abstractStart === -1) return '';

  const sliced = text.slice(abstractStart).replace(/^abstract\s*:?\s*/i, '');
  const stopMatch = sliced.search(/\n\s*(keywords?|introduction|background|methods?)\b/i);
  const abstractText = (stopMatch === -1 ? sliced : sliced.slice(0, stopMatch)).trim();
  return abstractText.slice(0, 3000);
};

const inferTitle = (lines = []) => {
  for (const line of lines.slice(0, 20)) {
    const candidate = line.trim();
    if (!candidate) continue;
    if (candidate.length < 12 || candidate.length > 300) continue;
    if (/abstract|keywords|introduction|doi/i.test(candidate)) continue;
    if (/^\d+$/.test(candidate)) continue;
    return candidate;
  }
  return 'Untitled manuscript draft';
};

const inferAuthors = (lines = []) => {
  for (const line of lines.slice(0, 30)) {
    if (!line || line.length < 4 || line.length > 200) continue;
    if (/abstract|keywords|introduction|doi|journal/i.test(line)) continue;
    if (!/[a-z]{2,}\s+[a-z]{2,}/i.test(line)) continue;

    const names = normalizeAuthorLine(line);
    if (names.length > 0 && names.length <= 12) {
      return names.map((name) => ({ name, email: '', affiliation: '', orcid: '' }));
    }
  }

  return [{ name: '', email: '', affiliation: '', orcid: '' }];
};

const inferAffiliations = (text = '') => {
  const matches = text.match(/(university|college|institute|hospital|department|centre|center)[^\n]{0,100}/gi) || [];
  return Array.from(new Set(matches.map((m) => m.trim()))).slice(0, 8);
};

const toBodyFromText = (text = '') => {
  const refsIndex = text.toLowerCase().indexOf('\nreferences');
  const body = refsIndex > 0 ? text.slice(0, refsIndex) : text;
  return body.trim().slice(0, 60000);
};

export const extractPdfMetadata = async ({ buffer, fileName, fileSize }) => {
  const parsed = await pdfParse(buffer);
  const text = (parsed?.text || '').replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const title = inferTitle(lines);
  const authors = inferAuthors(lines);
  const abstract = extractAbstract(text);
  const keywords = extractKeywords(text);
  const references = extractReferences(text);
  const sectionHeadings = extractSectionHeadings(text);
  const doi = extractDOI(text);
  const affiliations = inferAffiliations(text);

  const body = toBodyFromText(text);

  const confidence = {
    title: title ? 0.85 : 0.2,
    authors: authors.length > 0 && authors[0].name ? 0.75 : 0.3,
    abstract: abstract ? 0.8 : 0.2,
    keywords: keywords.length > 0 ? 0.7 : 0.2,
    references: references.length > 0 ? 0.75 : 0.2,
  };

  const warnings = [];
  if (!abstract) warnings.push('Abstract was not confidently detected.');
  if (keywords.length === 0) warnings.push('Keywords were not detected.');
  if (references.length === 0) warnings.push('References section was not detected.');

  return {
    title,
    abstract,
    body,
    keywords,
    authors,
    metadata: {
      affiliations,
      sectionHeadings,
      references,
      citationDetails: {
        doi,
        rawCitation: '',
      },
      correspondingAuthor: {
        name: authors[0]?.name || '',
        email: '',
      },
      extractionConfidence: confidence,
      extractionWarnings: warnings,
    },
    extractionReport: {
      parser: 'pdf-parse',
      fileName,
      fileSize,
      extractedAt: new Date(),
      rawTextPreview: text.slice(0, 1200),
    },
  };
};

export const buildDraftQuality = (draftPayload = {}) => {
  const completenessScore = computeCompletenessScore(draftPayload);
  const validationState = computeValidationState(completenessScore);
  return { completenessScore, validationState };
};

export default {
  extractPdfMetadata,
  buildDraftQuality,
};
