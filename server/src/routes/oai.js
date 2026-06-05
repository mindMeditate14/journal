/**
 * OAI-PMH 2.0 endpoint for NexusJournal
 *
 * Supported verbs:
 *   Identify           — repository metadata
 *   ListMetadataFormats — available formats (oai_dc)
 *   ListSets           — not supported (noSetHierarchy error)
 *   ListIdentifiers    — list all record identifiers
 *   ListRecords        — full Dublin Core records for all published papers
 *   GetRecord          — single record by identifier
 *
 * URL:  GET /oai?verb=<Verb>[&identifier=...][&metadataPrefix=oai_dc]
 *
 * MySitasi, DOAJ, and any OAI-PMH harvester can use this endpoint.
 */

import express from 'express';
import Paper from '../models/Paper.js';

const router = express.Router();

const REPO_ID      = 'tradmedint.com';
const BASE_URL     = (process.env.BASE_URL || 'https://tradmedint.com').replace(/\/$/, '');
const OAI_BASE_URL = `${BASE_URL}/oai`;
const REPO_NAME    = 'Traditional Medicine International';
const ADMIN_EMAIL  = 'noreply@tradmedint.com';
const EARLIEST_DATE = '2026-01-01';

// ── helpers ──────────────────────────────────────────────────────────────────

function xmlEscape(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toOaiId(paperId) {
  return `oai:${REPO_ID}:${paperId}`;
}

function fromOaiId(oaiId) {
  // oai:tradmedint.com:<mongoId>
  const parts = (oaiId || '').split(':');
  return parts[parts.length - 1];
}

function isoDate(d) {
  return (d ? new Date(d) : new Date()).toISOString().split('T')[0];
}

function dcRecord(paper) {
  const id     = paper._id.toString();
  const datestamp = isoDate(paper.publishedAt || paper.updatedAt || paper.createdAt);
  const authors = (paper.authors || []).map(a =>
    `      <dc:creator>${xmlEscape(a.name)}${a.affiliation ? ` (${xmlEscape(a.affiliation)})` : ''}</dc:creator>`
  ).join('\n');
  const keywords = (paper.keywords || []).map(k =>
    `      <dc:subject>${xmlEscape(k)}</dc:subject>`
  ).join('\n');
  const topics = (paper.topics || []).map(t =>
    `      <dc:subject>${xmlEscape(t)}</dc:subject>`
  ).join('\n');

  return `    <record>
      <header>
        <identifier>${toOaiId(id)}</identifier>
        <datestamp>${datestamp}</datestamp>
      </header>
      <metadata>
        <oai_dc:dc
          xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
          xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/
            http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
          <dc:title>${xmlEscape(paper.title)}</dc:title>
${authors}
${keywords}
${topics}
          <dc:description>${xmlEscape((paper.abstract || '').substring(0, 2000))}</dc:description>
          <dc:publisher>${xmlEscape(paper.journal?.publisher || 'Mind Meditate Resources')}</dc:publisher>
          <dc:date>${datestamp}</dc:date>
          <dc:type>Journal Article</dc:type>
          <dc:format>application/pdf</dc:format>
          ${paper.doi ? `<dc:identifier>https://doi.org/${xmlEscape(paper.doi)}</dc:identifier>` : ''}
          <dc:identifier>${BASE_URL}/papers/${id}</dc:identifier>
          <dc:source>${xmlEscape(paper.journal?.name || REPO_NAME)}</dc:source>
          ${paper.journal?.issn ? `<dc:source>eISSN:${xmlEscape(paper.journal.issn)}</dc:source>` : '<dc:source>eISSN:3154-7443</dc:source>'}
          <dc:language>${xmlEscape(paper.language || 'English')}</dc:language>
          <dc:rights>Open Access. CC BY 4.0 https://creativecommons.org/licenses/by/4.0/</dc:rights>
        </oai_dc:dc>
      </metadata>
    </record>`;
}

function headerRecord(paper) {
  const id        = paper._id.toString();
  const datestamp = isoDate(paper.publishedAt || paper.updatedAt || paper.createdAt);
  return `    <header>
      <identifier>${toOaiId(id)}</identifier>
      <datestamp>${datestamp}</datestamp>
    </header>`;
}

function oaiEnvelope(verb, requestAttrs, body) {
  const responseDate = new Date().toISOString();
  const attrStr = Object.entries(requestAttrs)
    .map(([k, v]) => `${k}="${xmlEscape(v)}"`)
    .join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
           http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request ${attrStr}>${OAI_BASE_URL}</request>
  ${body}
</OAI-PMH>`;
}

function oaiError(code, message) {
  return `<error code="${code}">${xmlEscape(message)}</error>`;
}

// Only papers that have a publishedAt date are treated as "published" for OAI
async function getPublishedPapers(fromDate, untilDate) {
  const filter = { publishedAt: { $exists: true, $ne: null } };
  if (fromDate)  filter.publishedAt.$gte = new Date(fromDate);
  if (untilDate) filter.publishedAt.$lte = new Date(untilDate + 'T23:59:59Z');
  return Paper.find(filter).sort({ publishedAt: -1 }).lean();
}

// ── verb handlers ─────────────────────────────────────────────────────────────

async function handleIdentify() {
  return `<Identify>
    <repositoryName>${xmlEscape(REPO_NAME)}</repositoryName>
    <baseURL>${OAI_BASE_URL}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>${ADMIN_EMAIL}</adminEmail>
    <earliestDatestamp>${EARLIEST_DATE}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DD</granularity>
    <description>
      <oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier
          http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">
        <scheme>oai</scheme>
        <repositoryIdentifier>${REPO_ID}</repositoryIdentifier>
        <delimiter>:</delimiter>
        <sampleIdentifier>oai:${REPO_ID}:000000000000000000000001</sampleIdentifier>
      </oai-identifier>
    </description>
  </Identify>`;
}

async function handleListMetadataFormats() {
  return `<ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`;
}

async function handleListIdentifiers(from, until, metadataPrefix) {
  if (metadataPrefix && metadataPrefix !== 'oai_dc') {
    return oaiError('cannotDisseminateFormat', 'Only oai_dc is supported');
  }
  const papers = await getPublishedPapers(from, until);
  if (!papers.length) return oaiError('noRecordsMatch', 'No matching records found');
  return `<ListIdentifiers>\n${papers.map(headerRecord).join('\n')}\n  </ListIdentifiers>`;
}

async function handleListRecords(from, until, metadataPrefix) {
  if (metadataPrefix && metadataPrefix !== 'oai_dc') {
    return oaiError('cannotDisseminateFormat', 'Only oai_dc is supported');
  }
  const papers = await getPublishedPapers(from, until);
  if (!papers.length) return oaiError('noRecordsMatch', 'No matching records found');
  return `<ListRecords>\n${papers.map(dcRecord).join('\n')}\n  </ListRecords>`;
}

async function handleGetRecord(identifier, metadataPrefix) {
  if (!identifier) return oaiError('badArgument', 'identifier is required');
  if (metadataPrefix !== 'oai_dc') {
    return oaiError('cannotDisseminateFormat', 'Only oai_dc is supported');
  }
  const mongoId = fromOaiId(identifier);
  let paper;
  try {
    paper = await Paper.findById(mongoId).lean();
  } catch {
    return oaiError('idDoesNotExist', 'The identifier does not exist in this repository');
  }
  if (!paper) return oaiError('idDoesNotExist', 'The identifier does not exist in this repository');
  return `<GetRecord>\n${dcRecord(paper)}\n  </GetRecord>`;
}

// ── main route ────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { verb, identifier, metadataPrefix, from, until } = req.query;

  const requestAttrs = { verb: verb || '' };
  if (metadataPrefix) requestAttrs.metadataPrefix = metadataPrefix;
  if (identifier)    requestAttrs.identifier = identifier;
  if (from)          requestAttrs.from = from;
  if (until)         requestAttrs.until = until;

  let body;

  try {
    switch (verb) {
      case 'Identify':
        body = await handleIdentify();
        break;
      case 'ListMetadataFormats':
        body = await handleListMetadataFormats();
        break;
      case 'ListSets':
        body = oaiError('noSetHierarchy', 'This repository does not support sets');
        break;
      case 'ListIdentifiers':
        body = await handleListIdentifiers(from, until, metadataPrefix || 'oai_dc');
        break;
      case 'ListRecords':
        body = await handleListRecords(from, until, metadataPrefix || 'oai_dc');
        break;
      case 'GetRecord':
        body = await handleGetRecord(identifier, metadataPrefix || 'oai_dc');
        break;
      default:
        body = oaiError('badVerb', verb ? `Illegal OAI verb: ${verb}` : 'verb parameter is required');
    }
  } catch (err) {
    body = oaiError('badArgument', `Internal error: ${err.message}`);
  }

  const xml = oaiEnvelope(verb, requestAttrs, body);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

export default router;
