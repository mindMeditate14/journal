# NexusJournal: Author Submission Platform — Implementation Guide

## Overview

This guide outlines the architecture, workflows, and implementation steps to transform NexusJournal from a **discovery platform** into a **full academic publishing platform** with author submissions, peer review, and DOI assignment.

---

## 1. Database Schema Extensions

### 1.1 Manuscript Model

```javascript
// server/src/models/Manuscript.js
const mongoose = require('mongoose');

const ManuscriptSchema = new mongoose.Schema({
  // Identification
  _id: mongoose.Schema.Types.ObjectId,
  journalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journal',
    required: true,
    index: true,
  },
  submissionId: {
    type: String,
    unique: true,
    default: () => `MS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  },

  // Authorship
  authors: [{
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    email: { type: String, required: true },
    affiliation: String,
    orcid: String,
    correspondence: Boolean,
  }],
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Article metadata
  title: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 300,
    index: true,
  },
  abstract: {
    type: String,
    required: true,
    minlength: 100,
    maxlength: 500,
  },
  keywords: [String],
  discipline: {
    type: String,
    enum: ['Ayurveda', 'Medicine', 'Psychology', 'Neuroscience', 'Pharmacology', 
           'Traditional Medicine', 'Health Sciences', 'Other'],
    required: true,
  },
  methodology: {
    type: String,
    enum: ['case-study', 'qualitative', 'quantitative', 'mixed', 'systematic-review', 'meta-analysis'],
    required: true,
  },

  // Manuscript content (full text)
  body: {
    type: String,
    required: true,
    minlength: 5000,
    // Store in GridFS for >16MB files
  },
  bodyFormat: {
    type: String,
    enum: ['markdown', 'html', 'pdf'],
    default: 'markdown',
  },

  // Metadata
  fundingStatement: String,
  conflictOfInterest: String,
  dataAvailability: String,
  codeAvailability: String,
  ethicsApproval: String,
  registeredProtocol: String,

  // Supplementary materials
  supplementaryFiles: [{
    _id: mongoose.Schema.Types.ObjectId,
    filename: String,
    url: String,
    fileType: String,
    uploadedAt: Date,
  }],

  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under-review', 'revision-requested', 'accepted', 'published', 'rejected'],
    default: 'draft',
    index: true,
  },

  // Editorial workflow
  assignedEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  editorNotes: String,
  editorDecision: {
    type: String,
    enum: ['pending', 'accept', 'minor-revisions', 'major-revisions', 'desk-reject', 'reject'],
  },

  // Peer review
  reviews: [{
    _id: mongoose.Schema.Types.ObjectId,
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    score: { type: Number, min: 1, max: 5 },
    recommendation: {
      type: String,
      enum: ['accept', 'minor-revisions', 'major-revisions', 'reject'],
    },
    feedback: String,
    isAnonymous: Boolean,
    submittedAt: Date,
  }],
  revisionRound: { type: Number, default: 0 },
  previousVersions: [{
    manuscriptId: mongoose.Schema.Types.ObjectId,
    revisionNumber: Number,
    submittedAt: Date,
  }],

  // Publication details
  volume: Number,
  issue: Number,
  pages: String, // "123-145"
  doi: String,  // "10.5281/zenodo.7654321"
  publishedAt: Date,

  // Metrics
  metrics: {
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    citations: { type: Number, default: 0 },
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  acceptedAt: Date,
  publishedAt: Date,
}, { timestamps: true });

// Indexes for common queries
ManuscriptSchema.index({ journalId: 1, status: 1 });
ManuscriptSchema.index({ submittedBy: 1 });
ManuscriptSchema.index({ doi: 1 });
ManuscriptSchema.index({ 'authors.email': 1 });

module.exports = mongoose.model('Manuscript', ManuscriptSchema);
```

### 1.2 Journal Model

```javascript
// server/src/models/Journal.js
const JournalSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  
  // Identity
  title: { type: String, required: true, unique: true },
  slug: { type: String, unique: true, lowercase: true },
  description: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Scope and policies
  scope: String,  // Markdown: research areas, topics, scope
  submissionGuidelines: String, // Markdown: how to prepare manuscript
  reviewProcess: {
    type: String,
    enum: ['open', 'single-blind', 'double-blind', 'post-publication'],
    default: 'single-blind',
  },
  peerReviewPeriod: { type: Number, default: 30 }, // days
  
  // Metadata
  issn: String,  // International Standard Serial Number
  doiPrefix: String,  // e.g., "10.5281" if using Zenodo, or institutional
  doiCounter: { type: Number, default: 1000 },
  
  // Team
  editors: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  reviewers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  
  // Status
  isOpen: { type: Boolean, default: true }, // accepting submissions?
  isIndexed: Boolean,  // in Crossref, Google Scholar, etc.
  
  // Metrics
  stats: {
    submissions: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
    acceptanceRate: Number,
    totalCitations: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Journal', JournalSchema);
```

### 1.3 Update User Model

```javascript
// Add to existing User model:
publisher: {
  journals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journal',
    }
  ],
  isPublisher: Boolean,
},

author: {
  manuscripts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manuscript',
    }
  ],
  orcid: String,
},

reviewer: {
  assignedReviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manuscript',
    }
  ],
  reviewsCompleted: { type: Number, default: 0 },
  averageScore: Number,
},
```

---

## 2. API Endpoints

### 2.1 Author Submission Endpoints

```javascript
// server/src/routes/manuscripts.js

// GET /api/journals — list all journals (public)
router.get('/', getJournals);

// GET /api/journals/:id — journal detail (public)
router.get('/:journalId', getJournalDetail);

// GET /api/journals/:id/manuscripts — list published manuscripts for journal (public)
router.get('/:journalId/manuscripts', listPublishedManuscripts);

// POST /api/manuscripts — submit new manuscript (authors)
router.post('/', authMiddleware, submitManuscript);

// GET /api/manuscripts/:id — view manuscript (author, editor, or public if published)
router.get('/:id', viewManuscript);

// PATCH /api/manuscripts/:id — update draft manuscript (author)
router.patch('/:id', authMiddleware, updateManuscriptDraft);

// DELETE /api/manuscripts/:id — withdraw submitted manuscript (author)
router.delete('/:id', authMiddleware, withdrawManuscript);

// POST /api/manuscripts/:id/submit-revision — resubmit after revisions
router.post('/:id/submit-revision', authMiddleware, submitRevision);

// GET /api/manuscripts/:id/reviews — view peer review feedback (author after decision)
router.get('/:id/reviews', authMiddleware, viewReviews);

// GET /api/manuscripts/:id/download-pdf — download published PDF
router.get('/:id/download-pdf', downloadPDF);
```

### 2.2 Editor/Reviewer Endpoints

```javascript
// POST /api/manuscripts/:id/assign-reviewers — assign reviewers (editor)
router.post('/:id/assign-reviewers', authMiddleware, requireRole(['editor']), assignReviewers);

// POST /api/manuscripts/:id/invite-reviewer — send review invitation email
router.post('/:id/invite-reviewer', sendReviewInvitation);

// POST /api/manuscripts/:id/reviews/:reviewId — submit peer review (reviewer)
router.post('/:id/reviews/:reviewId', authMiddleware, submitPeerReview);

// GET /api/manuscripts/:id/editor-dashboard — editor view (editor)
router.get('/:id/editor-dashboard', authMiddleware, requireRole(['editor']), editorDashboard);

// PATCH /api/manuscripts/:id/decision — make editorial decision (editor)
router.patch('/:id/decision', authMiddleware, requireRole(['editor']), makeEditorDecision);

// POST /api/manuscripts/:id/request-revisions — request major/minor revisions
router.post('/:id/request-revisions', authMiddleware, requireRole(['editor']), requestRevisions);

// POST /api/manuscripts/:id/publish — publish manuscript and assign DOI (editor)
router.post('/:id/publish', authMiddleware, requireRole(['editor']), publishManuscript);
```

### 2.3 Journal Management Endpoints

```javascript
// POST /api/journals — create new journal (users)
router.post('/', authMiddleware, createJournal);

// PATCH /api/journals/:id — update journal settings
router.patch('/:id', authMiddleware, requireOwner, updateJournal);

// POST /api/journals/:id/invite-editor — invite editor to journal
router.post('/:id/invite-editor', authMiddleware, requireOwner, inviteEditor);

// DELETE /api/journals/:id/editors/:editorId — remove editor
router.delete('/:id/editors/:editorId', authMiddleware, requireOwner, removeEditor);
```

### 2.4 Author Dashboard Endpoints

```javascript
// GET /api/my-submissions — author's submitted manuscripts
router.get('/me/submissions', authMiddleware, mySubmissions);

// GET /api/my-submissions/:id — detailed view with review status
router.get('/me/submissions/:id', authMiddleware, submissionDetail);

// POST /api/my-submissions/:id/withdraw — withdraw before review starts
router.post('/me/submissions/:id/withdraw', authMiddleware, withdrawSubmission);
```

---

## 3. DOI Assignment Workflow

### 3.1 Zenodo Integration (Recommended for MVP)

```javascript
// server/src/services/doiService.js

const axios = require('axios');

/**
 * Register manuscript with Zenodo and get DOI
 * Zenodo API: https://developers.zenodo.org/
 */
async function registerZenodoDOI(manuscript, journal) {
  const zenodoAPIKey = process.env.ZENODO_API_KEY;
  const zenodoAPI = axios.create({
    baseURL: 'https://zenodo.org/api',
    headers: {
      'Authorization': `Bearer ${zenodoAPIKey}`,
    },
  });

  // Step 1: Create Zenodo record
  const record = await zenodoAPI.post('/deposit/depositions', {
    metadata: {
      title: manuscript.title,
      description: manuscript.abstract,
      creators: manuscript.authors.map(a => ({
        name: a.name,
        affiliation: a.affiliation,
        orcid: a.orcid,
      })),
      keywords: manuscript.keywords,
      license: 'cc-by',  // CC-BY 4.0
      access_right: 'open',
      publication_type: 'article',
      publication_date: new Date().toISOString().split('T')[0],
      communities: [{ identifier: 'ayurveda' }],  // custom community
      references: manuscript.references?.map(r => r.doi).filter(Boolean) || [],
    },
  });

  const recordId = record.data.id;

  // Step 2: Upload manuscript PDF
  const pdfBuffer = await generateManuscriptPDF(manuscript);
  await zenodoAPI.post(
    `/deposit/depositions/${recordId}/files`,
    { file: pdfBuffer },
    { headers: { 'Content-Type': 'application/pdf' } }
  );

  // Step 3: Upload supplementary files
  for (const file of manuscript.supplementaryFiles || []) {
    await zenodoAPI.post(
      `/deposit/depositions/${recordId}/files`,
      { file: file.data },
      { headers: { 'Content-Type': file.fileType } }
    );
  }

  // Step 4: Publish to get DOI
  const published = await zenodoAPI.post(
    `/deposit/depositions/${recordId}/actions/publish`
  );

  const doi = published.data.doi;
  const url = published.data.links.record_html;

  return {
    doi,
    url,
    zenodoId: recordId,
  };
}

/**
 * Register DOI with Crossref (optional, enables richer indexing)
 * Cost: ~$300/year for unlimited deposits
 */
async function registerCrossrefDOI(manuscript, journal, doi) {
  const crossrefUser = process.env.CROSSREF_USERNAME;
  const crossrefPass = process.env.CROSSREF_PASSWORD;

  const xmlPayload = buildCrossrefXML({
    title: manuscript.title,
    authors: manuscript.authors,
    doi,
    journalTitle: journal.title,
    publishedDate: manuscript.publishedAt,
    volume: manuscript.volume,
    issue: manuscript.issue,
    pages: manuscript.pages,
  });

  await axios.post(
    'https://api.crossref.org/v1/deposit/deposit',
    xmlPayload,
    {
      auth: { username: crossrefUser, password: crossrefPass },
      headers: { 'Content-Type': 'application/xml' },
    }
  );

  return { registered: true };
}

module.exports = {
  registerZenodoDOI,
  registerCrossrefDOI,
};
```

### 3.2 Publish Manuscript with DOI

```javascript
// server/src/controllers/manuscriptController.js

async function publishManuscript(req, res, next) {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findById(id)
      .populate('journalId')
      .populate('submittedBy');

    // Validation
    if (manuscript.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted manuscripts can be published' });
    }

    if (!canPublish(manuscript)) {
      return res.status(400).json({
        error: 'Manuscript does not meet publication criteria',
        missing: getValidationErrors(manuscript),
      });
    }

    // Step 1: Generate PDF
    const pdf = await generateManuscriptPDF(manuscript);

    // Step 2: Register with Zenodo
    const { doi, url } = await doiService.registerZenodoDOI(
      manuscript,
      manuscript.journalId
    );

    // Step 3: Register with Crossref (async, non-blocking)
    doiService.registerCrossrefDOI(
      manuscript,
      manuscript.journalId,
      doi
    ).catch(err => logger.error('Crossref registration failed:', err));

    // Step 4: Update manuscript record
    manuscript.status = 'published';
    manuscript.doi = doi;
    manuscript.publishedAt = new Date();
    manuscript.volume = getNextVolume(manuscript.journalId);
    manuscript.issue = 1; // could be auto-assigned
    await manuscript.save();

    // Step 5: Create Paper record for discovery
    await Paper.create({
      title: manuscript.title,
      abstract: manuscript.abstract,
      authors: manuscript.authors.map(a => a.name),
      publishedAt: manuscript.publishedAt,
      doi,
      journal: manuscript.journalId.title,
      sourceProvenance: [{
        source: 'nexusjournal-submission',
        sourceId: manuscript._id,
        journalTitle: manuscript.journalId.title,
      }],
      keywords: manuscript.keywords,
      discipline: manuscript.discipline,
      openAccess: true,
      pdfUrl: url,
      downloadLink: url,
    });

    // Step 6: Notify authors
    await notifyAuthorsPublished(manuscript);

    res.json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        title: manuscript.title,
        doi,
        url,
        publishedAt: manuscript.publishedAt,
      },
    });

  } catch (error) {
    next(error);
  }
}

function canPublish(manuscript) {
  return (
    manuscript.title && manuscript.title.length > 10 &&
    manuscript.abstract && manuscript.abstract.length > 100 &&
    manuscript.authors && manuscript.authors.length > 0 &&
    manuscript.authors.every(a => a.name && a.email) &&
    manuscript.body && manuscript.body.length > 5000 &&
    manuscript.discipline &&
    !hasPlagiarism(manuscript) &&  // Turnitin integration
    !hasAccessibilityIssues(manuscript)
  );
}

module.exports = { publishManuscript };
```

---

## 4. Submission Form (Client)

### 4.1 Multi-Step Wizard

```typescript
// client/src/pages/ManuscriptSubmission.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { parseYAML } from '../utils/yamlParser';

export const ManuscriptSubmissionWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [journal, setJournal] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [metadata, setMetadata] = useState({});

  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleMarkdownPaste = async (content: string) => {
    try {
      const parsed = parseYAML(content);
      setMetadata(parsed.frontmatter);
      setMarkdown(content);
      setStep(3);
    } catch (error) {
      toast.error('Failed to parse YAML. Check template format.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Submit Your Manuscript</h1>

      {step === 1 && (
        <Step1SelectJournal 
          onSelect={(j) => { setJournal(j); setStep(2); }}
        />
      )}

      {step === 2 && (
        <Step2UploadManuscript
          journal={journal}
          onPaste={handleMarkdownPaste}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3ReviewMetadata
          metadata={metadata}
          markdown={markdown}
          journal={journal}
          onSubmit={submitManuscript}
        />
      )}
    </div>
  );
};
```

### 4.2 Metadata Extraction

```typescript
// client/src/utils/yamlParser.ts

export function parseYAML(markdown: string) {
  const matches = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!matches) {
    throw new Error('No YAML frontmatter found. Check template format.');
  }

  const yaml = matches[1];
  const frontmatter = {};

  // Simple YAML parser (or use 'js-yaml' library)
  const lines = yaml.split('\n');
  let current = null;

  for (const line of lines) {
    if (line.startsWith('  - ')) {
      // Array item
      if (Array.isArray(frontmatter[current])) {
        frontmatter[current].push(line.replace('  - ', ''));
      }
    } else if (line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (value && !value.startsWith('[')) {
        frontmatter[key] = value;
        current = key;
      } else {
        frontmatter[key] = [];
        current = key;
      }
    }
  }

  const body = markdown.replace(matches[0], '').trim();

  return { frontmatter, body };
}
```

---

## 5. Accessibility Implementation

### 5.1 WCAG 2.1 Checklist

```typescript
// client/src/components/AccessibilityChecklist.tsx

export function validateManuscriptAccessibility(manuscript) {
  const issues = [];

  // Check 1: Alt text for all figures
  const figuresWithoutAlt = manuscript.body.match(/!\[]\(/g) || [];
  if (figuresWithoutAlt.length > 0) {
    issues.push('Figures must have descriptive alt text: ![description](url)');
  }

  // Check 2: Semantic headings
  const headingNesting = manuscript.body.match(/^###+/gm);
  if (!validateHeadingNesting(headingNesting)) {
    issues.push('Heading structure must be sequential (h1 → h2 → h3, no skips)');
  }

  // Check 3: Tables have headers
  const tableRowsWithoutHeader = (manuscript.body.match(/^\|.*\|$/gm) || [])
    .filter((row, i) => i === 0 && !row.includes('---'));
  if (tableRowsWithoutHeader.length > 0) {
    issues.push('All tables must have header rows with separators');
  }

  // Check 4: PDF will be accessible
  if (manuscript.bodyFormat === 'pdf') {
    issues.push('⚠️ PDF accessibility: ensure source PDF is tagged and searchable');
  }

  // Check 5: Lists are properly formatted
  if (!validateListFormatting(manuscript.body)) {
    issues.push('Use proper list formatting: - item or 1. item');
  }

  return {
    passesAccessibility: issues.length === 0,
    issues,
    warnings: [],
  };
}

export function generateAccessiblePDF(manuscript) {
  // Use pdf-lib or similar to create tagged PDF
  // Ensure:
  // 1. All text is selectable
  // 2. Headings marked with roles
  // 3. Figure descriptions included
  // 4. Logical reading order
  // 5. Metadata (title, author, subject) filled
}
```

### 5.2 Manuscript Viewer with A11y

```typescript
// client/src/components/ManuscriptViewer.tsx

export const AccessibleManuscriptViewer: React.FC = ({ manuscript }) => {
  return (
    <article
      role="article"
      aria-label={`Article: ${manuscript.title}`}
      className="max-w-3xl mx-auto prose prose-lg"
    >
      {/* Header */}
      <header role="banner">
        <h1 id="main-title" className="text-4xl font-bold">
          {manuscript.title}
        </h1>
        
        <section aria-labelledby="authors-heading" className="mt-4">
          <h2 id="authors-heading" className="sr-only">Authors</h2>
          <ul aria-label="Author list">
            {manuscript.authors.map((author, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="font-semibold">{author.name}</span>
                {author.orcid && (
                  <a 
                    href={`https://orcid.org/${author.orcid}`}
                    aria-label={`ORCID profile for ${author.name}`}
                  >
                    <img src="/orcid-logo.png" alt="ORCID" width="16" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* DOI */}
        {manuscript.doi && (
          <p className="text-sm text-gray-600 mt-2">
            DOI: <a href={`https://doi.org/${manuscript.doi}`}>{manuscript.doi}</a>
          </p>
        )}
      </header>

      {/* Abstract */}
      <section aria-labelledby="abstract-heading" className="bg-blue-50 p-4 rounded">
        <h2 id="abstract-heading">Abstract</h2>
        <p>{manuscript.abstract}</p>
      </section>

      {/* Main content */}
      <section aria-labelledby="main-content">
        <h2 id="main-content" className="sr-only">Article Content</h2>
        <MarkdownRenderer 
          markdown={manuscript.body}
          // Ensure figures have alt text
          figureRenderer={(src, alt) => (
            <figure role="img" aria-label={alt || 'Article figure'}>
              <img src={src} alt={alt || 'Article figure'} />
            </figure>
          )}
        />
      </section>

      {/* References */}
      <section aria-labelledby="references-heading">
        <h2 id="references-heading">References</h2>
        <ol>
          {manuscript.references?.map((ref, i) => (
            <li key={i}>
              {ref.text}
              {ref.doi && (
                <a href={`https://doi.org/${ref.doi}`}> [{ref.doi}]</a>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Supplementary */}
      {manuscript.supplementaryFiles?.length > 0 && (
        <section aria-labelledby="supplementary-heading">
          <h2 id="supplementary-heading">Supplementary Materials</h2>
          <ul>
            {manuscript.supplementaryFiles.map(file => (
              <li key={file._id}>
                <a 
                  href={file.url}
                  download={file.filename}
                  aria-label={`Download supplementary file: ${file.filename}`}
                >
                  {file.filename}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cite widget */}
      <CiteWidget manuscript={manuscript} />
    </article>
  );
};
```

---

## 6. Publishing Best Practices

### 6.1 Editorial Workflow State Machine

```
┌─────────────┐
│    Draft    │  Author creates manuscript
└──────┬──────┘
       │ Author submits
       ↓
┌─────────────────┐
│    Submitted    │  Desk review by editor
└────┬──────┬─────┘
     │      │
  REJECT    DESK-REVIEW-PASS
     │              │
     ↓              ↓
┌──────────┐    ┌─────────────┐
│ Rejected │    │ Under-Review│  Peer reviews assigned
└──────────┘    └────┬─────┬──┘
                     │     │
                  MAJOR   MINOR
                   REV     REV
                     │     │
                     ↓     ↓
            ┌──────────────────────┐
            │ Revision-Requested   │  Author revises & resubmits
            └────┬──────┬──────┬───┘
                 │      │      │
                 │    REJECT  MAJOR
                 │      │      REV
                 ↓      ↓      ↓
            ┌────────┐ ┌──────────┐
            │ Reject │ │Revision 2│
            └────────┘ └──────────┘
                      │      │
                   MINOR    ACCEPT
                    REV       │
                      │       ↓
                      └──────→┌────────┐
                              │Accepted│
                              └───┬────┘
                                  │ Editor approves
                                  ↓
                            ┌──────────────┐
                            │  Published   │  DOI assigned
                            └──────────────┘
```

### 6.2 Peer Review Types

```javascript
// server/src/utils/reviewProcesses.js

const REVIEW_PROCESSES = {
  'open': {
    name: 'Open Peer Review',
    description: 'Reviewer names and reviews visible to authors and public',
    revealerNames: true,
    revealReviews: true,
    timeline: 30, // days
  },
  'single-blind': {
    name: 'Single-Blind',
    description: 'Authors do not know reviewers, but reviewers know authors',
    revealerNames: false,
    revealReviews: true,
    timeline: 30,
  },
  'double-blind': {
    name: 'Double-Blind',
    description: 'Neither authors nor reviewers know each other identities',
    revealerNames: false,
    revealReviews: false,
    timeline: 45,
  },
  'post-publication': {
    name: 'Post-Publication Peer Review',
    description: 'Publish immediately, review comments added afterwards',
    revealerNames: true,
    revealReviews: true,
    timeline: 0,
  },
};

async function inviteReviewers(manuscript, journal) {
  const reviewType = REVIEW_PROCESSES[journal.reviewProcess];
  
  // Find suitable reviewers (based on expertise, past reviews)
  const reviewers = await findReviewers(
    manuscript.keywords,
    journal.reviewers
  );

  // Send personalized invitations with timeline
  for (const reviewer of reviewers) {
    await sendReviewInvitation({
      reviewer,
      manuscript,
      deadline: Date.now() + (reviewType.timeline * 24 * 60 * 60 * 1000),
      anonymous: !reviewType.revealerNames,
    });
  }
}

module.exports = { REVIEW_PROCESSES, inviteReviewers };
```

---

## 7. Implementation Roadmap

### **Month 1: Core Infrastructure**
- [ ] Database schemas (Manuscript, Journal, extend User)
- [ ] Submission form (multi-step wizard)
- [ ] Markdown parser + YAML metadata extraction
- [ ] Basic author dashboard ("My Submissions")
- [ ] API endpoints (submit, list, view)

### **Month 2: Editorial Workflow**
- [ ] Editor dashboard with submissions list
- [ ] Assign reviewers, send invitations
- [ ] Peer review form
- [ ] Decision panel (Accept/Reject/Revisions)
- [ ] Email notifications (automated)

### **Month 3: DOI + Publishing**
- [ ] Zenodo integration
- [ ] Crossref integration (optional)
- [ ] Publish endpoint (generate PDF, assign DOI)
- [ ] Index published articles into Paper collection
- [ ] Citation widget (BibTeX, APA, etc.)

### **Month 4: Accessibility + Polish**
- [ ] WCAG 2.1 audit
- [ ] Accessible PDF generation
- [ ] Screen reader testing
- [ ] Author guidelines + templates
- [ ] Help center + FAQs

### **Month 5: Advanced Features** (optional)
- [ ] Collaboration tools (co-author comments)
- [ ] Version control (track revisions)
- [ ] Analytics dashboard (views, citations, downloads)
- [ ] Recommend reviewers (ML-based)
- [ ] Plagiarism check (Turnitin API)

---

## 8. Configuration & Environment

```bash
# .env (server)

# Zenodo DOI
ZENODO_API_KEY=your-zenodo-api-key
ZENODO_SANDBOX=false  # true for testing

# Crossref (optional)
CROSSREF_USERNAME=your-username
CROSSREF_PASSWORD=your-password
CROSSREF_DEPOSITOR_NAME="NexusJournal"

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@nexusjournal.org
SMTP_PASS=your-app-password

# Plagiarism check (optional)
TURNITIN_API_KEY=xxx

# Feature flags
ENABLE_PEER_REVIEW=true
ENABLE_DOI_REGISTRATION=true
ENABLE_CROSSREF=false  # until subscribed
```

---

## 9. Quick Start (MVP)

To launch NexusJournal as a publishing platform:

1. **Week 1-2:** Deploy Manuscript + Journal models, build submission form
2. **Week 3:** Add editor dashboard, peer review flow
3. **Week 4:** Integrate Zenodo, publish endpoint
4. **Launch:** Soft launch with 2-3 pilot journals, invite beta editors

**Success metrics:**
- 10+ journal creators by month 2
- 50+ submitted manuscripts in first month
- 80%+ publication rate (low barrier to entry initially)
- Average review time < 30 days

---

## Key Takeaways

✅ **Authors:** Simple submission → rich metadata → broad discovery  
✅ **Editors:** Peer review workflow → editorial decisions → publication  
✅ **Readers:** Find, cite, download → DOI → indexed in Google Scholar  
✅ **Accessibility:** WCAG 2.1 compliant, open access, CC-BY license  
✅ **Publishing Standards:** DOI assignment, Crossref indexing, established peer review

This architecture makes NexusJournal competitive with platforms like **Open Journals**, **Scholastica**, **Plos One**, while maintaining lower operational costs by leveraging Zenodo (free) and community-driven peer review.
