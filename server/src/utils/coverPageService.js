/**
 * coverPageService.js
 * Prepends a branded Traditional Medicine International cover page to a manuscript PDF.
 * Cover page meets Perpustakaan Negara Malaysia (PNM) e-ISSN application requirements.
 * Uses pdf-lib with StandardFonts only (no custom fonts).
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

// ── Publisher constants (update when e-ISSN is assigned) ────────────────────
const PUBLISHER = {
  journalTitle:   'Traditional Medicine International',
  shortTitle:     'Trad. Med. Int.',
  eISSN:          '3154-7443',
  website:        'https://tradmedint.com',
  email:          'editor@tradmedint.com',
  publisherName:  'Mind Meditate Resources',
  address:        'Kuala Lumpur, Malaysia',
  country:        'Malaysia',
  language:       'English',
  frequency:      'Continuous Publication (Rolling)',
  license:        'Creative Commons Attribution 4.0 International (CC BY 4.0)',
  openAccess:     'Gold Open Access — No Article Processing Charges (APC)',
  peerReview:     'Double-blind peer review',
  discipline:     'Traditional, Complementary and Integrative Medicine',
};

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

/** Wrap text to fit within maxWidth given a font + size. Strips control characters. */
function wrapText(text, font, size, maxWidth) {
  // Replace newlines/tabs with spaces, collapse multiple spaces
  const clean = String(text).replace(/[\r\n\t\v\f]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const words = clean.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!word) continue;
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

/** Sanitize a single-line string for pdf-lib drawText (strips control chars) */
function safe(text) {
  return String(text ?? '').replace(/[\r\n\t\v\f\x00-\x1f\x7f]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** Draw a labelled metadata row: "LABEL    value" */
function drawMeta(page, label, value, x, y, labelFont, valueFont, labelColor, valueColor, size = 8.5) {
  page.drawText(safe(label), { x, y, size, font: labelFont, color: labelColor });
  const labelW = labelFont.widthOfTextAtSize(safe(label), size);
  page.drawText(safe(value), { x: x + labelW + 4, y, size, font: valueFont, color: valueColor });
}

/**
 * Build an e-ISSN-compliant branded cover page and prepend it to the manuscript PDF.
 * @param {object} paper - Paper document from MongoDB
 * @returns {Buffer} merged PDF bytes
 */
export async function buildCoverPdf(paper) {

  // ── Resolve the manuscript PDF from disk ──────────────────────────────
  const pdfUrl = paper.urls?.pdf || '';
  let manuscriptBytes = null;

  if (pdfUrl) {
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

  // ── Prepare article metadata ──────────────────────────────────────────
  const title        = paper.title || 'Untitled';
  const authorList   = (paper.authors || []).map(a => a.name).filter(Boolean);
  const authorsStr   = authorList.join(', ') || 'Unknown Author';
  const affSet       = [...new Set((paper.authors || []).map(a => a.affiliation).filter(Boolean))];
  const doi          = paper.doi || '';
  const doiUrl       = doi ? `https://doi.org/${doi}` : '';
  const pubYear      = paper.publicationYear || (paper.publishedAt ? new Date(paper.publishedAt).getFullYear() : '');
  const pubDate      = paper.publishedAt
    ? new Date(paper.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : String(pubYear);
  const receivedDate = paper.receivedAt
    ? new Date(paper.receivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const acceptedDate = paper.acceptedAt
    ? new Date(paper.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const volume       = paper.volume  ? `Volume ${paper.volume}` : '';
  const issue        = paper.issue   ? `Issue ${paper.issue}`   : '';
  const articleNo    = paper.articleNumber || (paper.articleSequence ? `e${paper.articleSequence}` : '');
  const volIssStr    = [volume, issue].filter(Boolean).join(' · ');
  const volIssYear   = [volIssStr, pubYear].filter(Boolean).join(' · ');
  const keywords     = (paper.keywords || []).join('; ');
  const abstract     = paper.abstract || '';
  const docType      = paper.documentType || 'Original Research Article';
  const corrAuthor   = paper.correspondingAuthor?.name || authorList[0] || '';
  const corrEmail    = paper.correspondingAuthor?.email || '';

  // ── Colours ───────────────────────────────────────────────────────────
  const indigo    = hex('#4338ca');   // brand primary
  const indigoDk  = hex('#1e1b4b');   // dark navy for title
  const indigoLt  = hex('#eef2ff');   // very light indigo background
  const teal      = hex('#0f766e');   // accent for section labels
  const gray8     = hex('#1f2937');
  const gray7     = hex('#374151');
  const gray5     = hex('#6b7280');
  const gray3     = hex('#d1d5db');
  const gray1     = hex('#f3f4f6');
  const white     = rgb(1, 1, 1);

  // ── Page setup ────────────────────────────────────────────────────────
  const coverDoc  = await PDFDocument.create();
  const page      = coverDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin    = 45;
  const contentW  = width - margin * 2;

  const fontBold  = await coverDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg   = await coverDoc.embedFont(StandardFonts.Helvetica);
  const fontObl   = await coverDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBObl  = await coverDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 1: MASTHEAD BANNER  (top 80 px — indigo)
  // Required by PNM: Journal title, e-ISSN, website
  // ══════════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: indigo });

  // Left: Journal title
  page.drawText(safe(PUBLISHER.journalTitle.toUpperCase()), {
    x: margin, y: height - 30, size: 14, font: fontBold, color: white,
  });
  page.drawText(safe(PUBLISHER.discipline), {
    x: margin, y: height - 47, size: 8, font: fontReg, color: rgb(0.8, 0.82, 1),
  });
  page.drawText(safe(`e-ISSN: ${PUBLISHER.eISSN}  ·  ${PUBLISHER.website}`), {
    x: margin, y: height - 63, size: 8, font: fontReg, color: rgb(0.75, 0.78, 1),
  });

  // Right: Open Access badge
  const oaText = 'OPEN ACCESS';
  const oaW = fontBold.widthOfTextAtSize(oaText, 8);
  page.drawRectangle({ x: width - margin - oaW - 16, y: height - 52, width: oaW + 16, height: 18, color: rgb(1, 1, 1), opacity: 0.15 });
  page.drawText(oaText, { x: width - margin - oaW - 8, y: height - 47, size: 8, font: fontBold, color: white });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 2: VOLUME / ISSUE / DATE STRIP  (light indigo band)
  // Required by PNM: Volume, Issue number, publication date, frequency
  // ══════════════════════════════════════════════════════════════════════
  const stripY = height - 80;
  page.drawRectangle({ x: 0, y: stripY - 28, width, height: 28, color: indigoLt });

  const stripParts = [volIssYear, `Published: ${pubDate}`, `Frequency: ${PUBLISHER.frequency}`].filter(p => p.trim().replace(/^Published: $/, ''));
  const stripText = safe(stripParts.filter(Boolean).join('   |   '));
  page.drawText(stripText, {
    x: margin, y: stripY - 18, size: 8, font: fontBold, color: indigo,
  });
  // Article number right-aligned
  if (articleNo) {
    const artLabel = `Article No. ${articleNo}`;
    const artW = fontBold.widthOfTextAtSize(artLabel, 8);
    page.drawText(artLabel, { x: width - margin - artW, y: stripY - 18, size: 8, font: fontBold, color: indigo });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 3: JOURNAL BIBLIOGRAPHIC INFO BOX  (two-column)
  // Required by PNM: Publisher details, address, country, language, license
  // ══════════════════════════════════════════════════════════════════════
  let cursor = height - 122;
  const col1x = margin;
  const col2x = margin + contentW / 2 + 6;
  const colW  = contentW / 2 - 6;

  // Box background
  page.drawRectangle({ x: margin, y: cursor - 68, width: contentW, height: 76, color: gray1 });
  page.drawRectangle({ x: margin, y: cursor - 68, width: contentW, height: 76, borderColor: gray3, borderWidth: 0.5 });

  cursor -= 4;

  // Left column — publisher details
  const metaSize = 7.5;
  page.drawText('JOURNAL INFORMATION', { x: col1x + 6, y: cursor - 4, size: 6.5, font: fontBold, color: gray5 });
  cursor -= 16;
  drawMeta(page, 'Publisher:',  PUBLISHER.publisherName, col1x + 6, cursor, fontBold, fontReg, gray5, gray7, metaSize);
  cursor -= 12;
  drawMeta(page, 'Address:',    PUBLISHER.address,       col1x + 6, cursor, fontBold, fontReg, gray5, gray7, metaSize);
  cursor -= 12;
  drawMeta(page, 'Country:',    PUBLISHER.country,       col1x + 6, cursor, fontBold, fontReg, gray5, gray7, metaSize);
  cursor -= 12;
  drawMeta(page, 'Language:',   PUBLISHER.language,      col1x + 6, cursor, fontBold, fontReg, gray5, gray7, metaSize);

  // Right column — access & license
  const colReset = cursor + 36; // back to first row of content
  page.drawText('PUBLICATION DETAILS', { x: col2x + 6, y: colReset + 16, size: 6.5, font: fontBold, color: gray5 });
  drawMeta(page, 'Peer Review:',  PUBLISHER.peerReview,  col2x + 6, colReset,      fontBold, fontReg, gray5, gray7, metaSize);
  drawMeta(page, 'Access:',       PUBLISHER.openAccess,  col2x + 6, colReset - 12, fontBold, fontReg, gray5, gray7, metaSize);
  // wrap license onto 2 lines if needed
  const licLines = wrapText(PUBLISHER.license, fontReg, metaSize, colW - fontBold.widthOfTextAtSize('License: ', metaSize) - 4);
  page.drawText('License: ', { x: col2x + 6, y: colReset - 24, size: metaSize, font: fontBold, color: gray5 });
  const licX = col2x + 6 + fontBold.widthOfTextAtSize('License: ', metaSize) + 2;
  licLines.slice(0, 2).forEach((l, i) => {
    page.drawText(l, { x: licX, y: colReset - 24 - i * 10, size: metaSize, font: fontReg, color: gray7 });
  });

  // Restore cursor below the box
  cursor -= 42;

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 4: ARTICLE HEADER
  // Required by PNM: Document type, article title, all authors + affiliations
  // ══════════════════════════════════════════════════════════════════════
  cursor -= 14;

  // Document type badge
  page.drawText(docType.toUpperCase(), {
    x: margin, y: cursor, size: 7, font: fontBold, color: teal,
  });
  cursor -= 16;

  // Horizontal rule
  page.drawRectangle({ x: margin, y: cursor + 4, width: contentW, height: 0.75, color: indigo });
  cursor -= 6;

  // Article title
  const titleLines = wrapText(title, fontBold, 15, contentW);
  for (const line of titleLines) {
    if (cursor < 80) break;
    page.drawText(line, { x: margin, y: cursor, size: 15, font: fontBold, color: indigoDk });
    cursor -= 20;
  }
  cursor -= 4;

  // Horizontal rule
  page.drawRectangle({ x: margin, y: cursor + 2, width: contentW, height: 0.5, color: gray3 });
  cursor -= 14;

  // Authors
  const authorLines = wrapText(authorsStr, fontBold, 10, contentW);
  for (const line of authorLines) {
    if (cursor < 80) break;
    page.drawText(line, { x: margin, y: cursor, size: 10, font: fontBold, color: gray7 });
    cursor -= 14;
  }
  cursor -= 2;

  // Affiliations (numbered if multiple)
  for (let i = 0; i < affSet.length && cursor > 80; i++) {
    const prefix = affSet.length > 1 ? `${i + 1}  ` : '';
    const affLines = wrapText(affSet[i], fontObl, 8.5, contentW - (affSet.length > 1 ? 10 : 0));
    for (const line of affLines) {
      if (cursor < 80) break;
      page.drawText(prefix + line, { x: margin, y: cursor, size: 8.5, font: fontObl, color: gray5 });
      prefix && (prefix[0] = ''); // only show number on first line
      cursor -= 12;
    }
  }

  // Corresponding author + email
  if (corrAuthor && cursor > 80) {
    cursor -= 4;
    const caLine = corrEmail
      ? `Corresponding author: ${corrAuthor} <${corrEmail}>`
      : `Corresponding author: ${corrAuthor}`;
    const caLines = wrapText(caLine, fontReg, 8, contentW);
    for (const l of caLines) {
      if (cursor < 80) break;
      page.drawText(l, { x: margin, y: cursor, size: 8, font: fontReg, color: gray5 });
      cursor -= 11;
    }
  }
  cursor -= 6;

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 5: ARTICLE DATES + DOI  (meta grid)
  // Required by PNM: Received, accepted, published dates; DOI
  // ══════════════════════════════════════════════════════════════════════
  if (cursor > 120) {
    page.drawRectangle({ x: margin, y: cursor - 1, width: contentW, height: 0.5, color: gray3 });
    cursor -= 14;

    const metaCells = [
      receivedDate && ['Received:', receivedDate],
      acceptedDate && ['Accepted:', acceptedDate],
      pubDate      && ['Published:', pubDate],
      doi          && ['DOI:', doiUrl],
    ].filter(Boolean);

    const cellW = contentW / Math.min(metaCells.length, 3);
    metaCells.forEach((cell, i) => {
      const cx = margin + (i % 3) * cellW;
      const cy = cursor - Math.floor(i / 3) * 22;
      if (cy < 80) return;
      page.drawText(cell[0], { x: cx, y: cy, size: 7.5, font: fontBold, color: gray5 });
      const valLines = wrapText(cell[1], fontReg, 8.5, cellW - 4);
      page.drawText(valLines[0] || '', { x: cx, y: cy - 11, size: 8.5, font: i === 3 ? fontBold : fontReg, color: i === 3 ? indigo : gray8 });
    });
    cursor -= metaCells.length > 3 ? 48 : 26;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 6: ABSTRACT
  // ══════════════════════════════════════════════════════════════════════
  if (abstract && cursor > 130) {
    cursor -= 6;
    page.drawRectangle({ x: margin, y: cursor - 1, width: contentW, height: 0.5, color: gray3 });
    cursor -= 14;
    page.drawText('ABSTRACT', { x: margin, y: cursor, size: 7.5, font: fontBold, color: teal });
    cursor -= 13;

    const absLines = wrapText(abstract.substring(0, 1600), fontReg, 8.5, contentW);
    for (const line of absLines) {
      if (cursor < 100) break;
      page.drawText(line, { x: margin, y: cursor, size: 8.5, font: fontReg, color: gray7 });
      cursor -= 12;
    }
    cursor -= 4;
  }

  // ── Keywords ─────────────────────────────────────────────────────────
  if (keywords && cursor > 100) {
    page.drawRectangle({ x: margin, y: cursor - 1, width: contentW, height: 0.5, color: gray3 });
    cursor -= 13;
    const kwPrefix = 'KEYWORDS: ';
    const kwPrefixW = fontBold.widthOfTextAtSize(kwPrefix, 8);
    page.drawText(kwPrefix, { x: margin, y: cursor, size: 8, font: fontBold, color: teal });
    const kwLines = wrapText(keywords, fontReg, 8, contentW - kwPrefixW);
    page.drawText(kwLines[0] || '', { x: margin + kwPrefixW, y: cursor, size: 8, font: fontObl, color: gray7 });
    if (kwLines[1] && cursor > 90) {
      cursor -= 11;
      page.drawText(kwLines[1], { x: margin, y: cursor, size: 8, font: fontObl, color: gray7 });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 7: FOOTER BAND
  // Required by PNM: Copyright, license, publisher URL, email
  // ══════════════════════════════════════════════════════════════════════
  const footerH = 40;
  page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: indigoDk });

  const copyLine = `\u00a9 ${pubYear || new Date().getFullYear()} ${PUBLISHER.publisherName}. This is an open access article distributed under ${PUBLISHER.license}.`;
  const copyLines = wrapText(copyLine, fontReg, 6.5, contentW);
  copyLines.slice(0, 2).forEach((l, i) => {
    page.drawText(l, { x: margin, y: footerH - 12 - i * 9, size: 6.5, font: fontReg, color: rgb(0.75, 0.78, 1) });
  });
  // Right-align: website | email
  const contactStr = `${PUBLISHER.website}  |  ${PUBLISHER.email}`;
  const contactW = fontReg.widthOfTextAtSize(contactStr, 6.5);
  page.drawText(contactStr, { x: width - margin - contactW, y: footerH - 12, size: 6.5, font: fontReg, color: rgb(0.8, 0.82, 1) });

  const coverBytes = await coverDoc.save();

  // ── Merge cover + manuscript ──────────────────────────────────────────
  if (!manuscriptBytes) {
    logger.warn(`Cover PDF: manuscript file not found for paper ${paper._id}, returning cover only`);
    return Buffer.from(coverBytes);
  }

  const merged = await PDFDocument.create();

  const coverSrc = await PDFDocument.load(coverBytes);
  const [coverPageCopy] = await merged.copyPages(coverSrc, [0]);
  merged.addPage(coverPageCopy);

  const manuSrc   = await PDFDocument.load(manuscriptBytes);
  const manuPages = await merged.copyPages(manuSrc, manuSrc.getPageIndices());
  for (const p of manuPages) merged.addPage(p);

  merged.setTitle(title);
  merged.setAuthor(authorsStr);
  merged.setSubject(PUBLISHER.discipline);
  merged.setKeywords(paper.keywords || []);
  merged.setCreator('Traditional Medicine International');
  merged.setProducer('Traditional Medicine International — tradmedint.com');

  const mergedBytes = await merged.save();
  return Buffer.from(mergedBytes);
}
