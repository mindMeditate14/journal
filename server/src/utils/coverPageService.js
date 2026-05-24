/**
 * coverPageService.js
 * Prepends a branded Traditional Medicine International cover page to a manuscript PDF.
 * Uses pdf-lib to create and merge pages.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

// Resolve uploads dir from server cwd
function uploadsRoot() {
  return path.resolve(process.cwd(), '../uploads/manuscripts');
}

// Convert hex colour string (#4338ca) to pdf-lib rgb (0–1 scale)
function hex(h) {
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/** Wrap text to fit within maxWidth given a font + size */
function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build a branded cover page PDF and prepend it to the manuscript PDF.
 * @param {object} paper - Paper document from MongoDB
 * @returns {Buffer} merged PDF bytes
 */
export async function buildCoverPdf(paper) {
  // ── Resolve the manuscript PDF from disk ──────────────────────────────
  const pdfUrl = paper.urls?.pdf || '';
  let manuscriptBytes = null;

  if (pdfUrl) {
    // url is absolute like https://journal.mind-meditate.com/uploads/manuscripts/file.pdf
    // extract the path component after the domain
    const urlPath = pdfUrl.replace(/^https?:\/\/[^/]+/, '');
    if (urlPath.startsWith('/uploads/manuscripts/')) {
      const fileName = path.basename(urlPath);
      const diskPath = path.join(uploadsRoot(), fileName);
      if (fs.existsSync(diskPath)) {
        manuscriptBytes = fs.readFileSync(diskPath);
        logger.info(`Cover PDF: read manuscript from ${diskPath}`);
      }
    }
  }

  // ── Prepare metadata ─────────────────────────────────────────────────
  const title = paper.title || 'Untitled';
  const authors = (paper.authors || []).map(a => a.name).filter(Boolean).join(', ') || 'Unknown Author';
  const affiliations = [...new Set((paper.authors || []).map(a => a.affiliation).filter(Boolean))].join('; ');
  const doi = paper.doi || '';
  const doiUrl = doi ? `https://doi.org/${doi}` : '';
  const pubDate = paper.publishedAt
    ? new Date(paper.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const journalName = paper.journal?.name || 'Traditional Medicine International';
  const keywords = (paper.keywords || []).join(', ');
  const abstract = paper.abstract || '';

  // ── Create cover page ────────────────────────────────────────────────
  const coverDoc = await PDFDocument.create();
  const page = coverDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await coverDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await coverDoc.embedFont(StandardFonts.Helvetica);
  const fontObl  = await coverDoc.embedFont(StandardFonts.HelveticaOblique);

  const indigo   = hex('#4338ca');
  const indigoDk = hex('#1e1b4b');
  const gray7    = hex('#374151');
  const gray5    = hex('#6b7280');
  const gray3    = hex('#d1d5db');
  const white    = rgb(1, 1, 1);

  const margin = 48;
  const contentW = width - margin * 2;

  // ── Header bar ───────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: indigo });

  page.drawText('Traditional Medicine International', {
    x: margin, y: height - 42,
    size: 18, font: fontBold, color: white,
  });
  page.drawText('Open Access · Peer Reviewed', {
    x: margin, y: height - 60,
    size: 9, font: fontReg, color: rgb(0.78, 0.8, 1),
  });

  // ── Journal label ────────────────────────────────────────────────────
  let cursor = height - 100;
  page.drawText(journalName.toUpperCase(), {
    x: margin, y: cursor,
    size: 8, font: fontBold, color: indigo,
  });
  cursor -= 4;
  page.drawRectangle({ x: margin, y: cursor, width: contentW, height: 1, color: gray3 });
  cursor -= 22;

  // ── Title ─────────────────────────────────────────────────────────────
  const titleLines = wrapText(title, fontBold, 17, contentW);
  for (const line of titleLines) {
    page.drawText(line, { x: margin, y: cursor, size: 17, font: fontBold, color: indigoDk });
    cursor -= 22;
  }
  cursor -= 6;

  // ── Authors ───────────────────────────────────────────────────────────
  const authorLines = wrapText(authors, fontBold, 11, contentW);
  for (const line of authorLines) {
    page.drawText(line, { x: margin, y: cursor, size: 11, font: fontBold, color: gray7 });
    cursor -= 15;
  }
  cursor -= 4;

  // ── Affiliations ──────────────────────────────────────────────────────
  if (affiliations) {
    const affLines = wrapText(affiliations, fontObl, 9.5, contentW);
    for (const line of affLines) {
      page.drawText(line, { x: margin, y: cursor, size: 9.5, font: fontObl, color: gray5 });
      cursor -= 13;
    }
    cursor -= 4;
  }

  // ── Divider ───────────────────────────────────────────────────────────
  cursor -= 4;
  page.drawRectangle({ x: margin, y: cursor, width: contentW, height: 1, color: gray3 });
  cursor -= 16;

  // ── Published / DOI meta ──────────────────────────────────────────────
  if (pubDate) {
    page.drawText('Published:', { x: margin, y: cursor, size: 9, font: fontBold, color: gray5 });
    page.drawText(pubDate,      { x: margin + 60, y: cursor, size: 9, font: fontReg, color: gray7 });
    cursor -= 14;
  }
  if (doi) {
    page.drawText('DOI:',      { x: margin, y: cursor, size: 9, font: fontBold, color: gray5 });
    page.drawText(doiUrl,      { x: margin + 60, y: cursor, size: 9, font: fontReg, color: indigo });
    cursor -= 14;
  }
  cursor -= 6;

  // ── Abstract ─────────────────────────────────────────────────────────
  if (abstract) {
    cursor -= 4;
    page.drawRectangle({ x: margin, y: cursor, width: contentW, height: 1, color: gray3 });
    cursor -= 16;
    page.drawText('ABSTRACT', { x: margin, y: cursor, size: 8, font: fontBold, color: gray5 });
    cursor -= 14;
    const absLines = wrapText(abstract.substring(0, 1200), fontReg, 9.5, contentW);
    for (const line of absLines) {
      if (cursor < 120) break; // don't overflow page
      page.drawText(line, { x: margin, y: cursor, size: 9.5, font: fontReg, color: gray7 });
      cursor -= 13;
    }
    cursor -= 6;
  }

  // ── Keywords ─────────────────────────────────────────────────────────
  if (keywords && cursor > 120) {
    cursor -= 4;
    page.drawRectangle({ x: margin, y: cursor, width: contentW, height: 1, color: gray3 });
    cursor -= 14;
    page.drawText('KEYWORDS  ', { x: margin, y: cursor, size: 8, font: fontBold, color: gray5 });
    const kwLines = wrapText(keywords, fontReg, 9.5, contentW);
    for (const line of kwLines) {
      if (cursor < 100) break;
      page.drawText(line, { x: margin, y: cursor, size: 9.5, font: fontReg, color: gray7 });
      cursor -= 13;
    }
    cursor -= 4;
  }

  // ── Footer ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: hex('#f5f3ff') });
  page.drawText('© Traditional Medicine International · Open Access · This work is licensed under CC BY 4.0', {
    x: margin, y: 20, size: 7.5, font: fontReg, color: gray5,
  });
  if (doiUrl) {
    page.drawText(doiUrl, { x: margin, y:8, size: 7, font: fontReg, color: indigo });
  }

  const coverBytes = await coverDoc.save();

  // ── Merge cover + manuscript ──────────────────────────────────────────
  if (!manuscriptBytes) {
    // No manuscript PDF on disk — return cover page only
    logger.warn(`Cover PDF: manuscript file not found for paper ${paper._id}, returning cover only`);
    return Buffer.from(coverBytes);
  }

  const merged = await PDFDocument.create();

  // Copy cover page
  const coverSrc = await PDFDocument.load(coverBytes);
  const [coverPage] = await merged.copyPages(coverSrc, [0]);
  merged.addPage(coverPage);

  // Copy all manuscript pages
  const manuSrc = await PDFDocument.load(manuscriptBytes);
  const manuPages = await merged.copyPages(manuSrc, manuSrc.getPageIndices());
  for (const p of manuPages) merged.addPage(p);

  merged.setTitle(title);
  merged.setAuthor(authors);
  merged.setCreator('Traditional Medicine International');
  merged.setProducer('Traditional Medicine International Journal Platform');

  const mergedBytes = await merged.save();
  return Buffer.from(mergedBytes);
}
