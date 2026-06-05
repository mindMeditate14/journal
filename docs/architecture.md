# NexusJournal — Architecture

## Overview

NexusJournal (deployed as the **TradMed International** journal platform) is a full-stack academic journal management system. It handles manuscript submission, AI-assisted review, peer review, publication to Zenodo, and academic discoverability (Google Scholar).

---

## Stack

| Layer | Technology |
|---|---|
| **Client** | React 19 + TypeScript (strict) + Vite 6 + Tailwind CSS |
| **Server** | Node.js 20.20.0, Express 5, ES Modules (`"type": "module"`) |
| **Database** | MongoDB (`journal_db`) via Mongoose |
| **AI** | Google Gemini (`@google/genai`) |
| **PDF generation** | `pdf-lib` (server-side cover page) · `html2pdf.js` (client-side AI review PDF) |
| **DOI / Archive** | Zenodo REST API |
| **Harvesting** | OAI-PMH 2.0 (`/oai`) — Dublin Core, used by MySitasi / DOAJ |
| **Email** | Nodemailer + local Postfix relay (`noreply@tradmedint.com`, port 25, no auth) |
| **Process manager** | PM2 (`nexusjournal`, port **5005**) |
| **Web server** | Nginx (reverse proxy + static SPA) |

---

## Infrastructure

| Item | Value |
|---|---|
| VPS | `root@76.13.211.100` |
| SSH key | `~/.ssh/kvm4-hostinger` (key auth only, no password) |
| Server files | `/opt/nexusjournal/server/` |
| Built client | `/opt/nexusjournal/public/` |
| Uploaded manuscripts | `/opt/nexusjournal/uploads/manuscripts/` (persistent, outside public) |
| Domain | `https://tradmedint.com` (migrated May 2026) |
| PM2 process | `nexusjournal` (id 5) |
| MongoDB connection | `mongodb://finscan_admin:<pass>@localhost:27017/journal_db?authSource=admin` |

---

## Directory Structure

```
server/src/
  index.js                  Entry point — Express app, middleware, Scholar routes, sitemap
  config/
    database.js             MongoDB connection
  middleware/
    auth.js                 JWT verify, requireRole()
    errorHandler.js         Global error + 404 handlers
    rateLimiter.js
  models/
    User.js                 Roles: admin, editor, researcher, reviewer, practitioner, reader
    Manuscript.js           Full manuscript lifecycle
    Journal.js              Journal record (owner, title, ISSN)
    Paper.js                Published paper discovery record ($text indexed)
    CaseStudy.js
    ClinicalEvidence.js
    PracticeData.js
    Reference.js
    ResearchProject.js
    IngestRun.js
    Settings.js
  routes/                   One file per /api/<prefix> + /oai
    auth.js                 /api/auth
    manuscripts.js          /api/manuscripts
    papers.js               /api/papers
    journals.js             /api/journals
    admin.js                /api/admin (admin-only)
    config.js               /api/config/classifications
    ingest.js               /api/ingest
    workspace.js            /api/workspace
    practiceData.js         /api/practice-data
    passwordReset.js        /api/password-reset
    oai.js                  /oai (OAI-PMH 2.0 — public, no auth)
  controllers/
    manuscriptController.js  ~1700 lines — core business logic
    paperController.js       Paper discovery + branded PDF download
    journalController.js
    authController.js
    adminController.js
  services/
    zenodoService.js         Zenodo deposit + publish API
    emailService.js
    aiService.js
  utils/
    coverPageService.js      pdf-lib A4 branded cover page (TradMed International)
    logger.js
    alerter.js               5xx rate alerter
  jobs/
    scheduledIngest.js       Cron: background paper ingestion from OpenAlex

client/src/
  App.tsx                   Routes + ProtectedRoute
  api/
    client.ts               Axios wrapper — all API calls go through here
  pages/
    LoginPage.tsx, RegisterPage.tsx, ForgotPasswordPage.tsx, ResetPasswordPage.tsx
    DashboardPage.tsx
    SearchPage.tsx
    PublishedPapersPage.tsx     Landing page — public paper listing
    PaperViewPage.tsx           Public paper detail + PDF viewer + download
    AboutPage.tsx               Journal info, publisher address, e-ISSN
    EditorialBoardPage.tsx      Editor-in-Chief + board members
    JournalPolicyPage.tsx       Journal scope and policy details
    PublicationEthicsPage.tsx   COPE-aligned ethics policy (route: /publication-ethics)
    SubmissionGuidelinesPage.tsx Submission instructions (route: /submission-guidelines)
    ManuscriptCreatePage.tsx
    ManuscriptEditPage.tsx
    ManuscriptRevisionPage.tsx
    SubmitManuscriptPage.tsx
    EditorDashboardPage.tsx  Editor/admin manuscript management + AI review PDF
    PeerReviewPage.tsx
    MyReviewsPage.tsx
    AdminPage.tsx            Admin: manuscripts tab (edit all fields) + classifications
    AdminUsersPage.tsx       Admin: user role management
    PaperDetailPage.tsx      Internal paper management
    NewProjectPage.tsx
    GeneratePracticeManuscriptPage.tsx
    PracticeDataCollectionPage.tsx
  components/
    SidebarLayout.tsx
    ProtectedRoute.tsx       Role-based access guard
    PublishedPapersWrapper.tsx
  utils/
    authStore.ts             Zustand auth state
```

---

## Nginx Routing (journal.mind-meditate.com)

```
/api/*           → proxy → Express :5005
/health          → proxy → Express :5005
/papers/*        → proxy → Express :5005   (Scholar meta tag injection)
/sitemap.xml     → proxy → Express :5005
/robots.txt      → proxy → Express :5005
/uploads/*       → alias /opt/nexusjournal/uploads/
/assets/*        → static /opt/nexusjournal/public/assets/ (immutable cache)
/*               → SPA fallback /opt/nexusjournal/public/index.html
```

---

## Key Design Decisions

### Paper vs Manuscript
- **Manuscript** — internal editorial record. Has status, reviews, author communications, uploaded files.
- **Paper** — public discovery record. Created when a manuscript is published. Has `$text` index for full-text search. Must be created via Mongoose (not raw mongosh) for the index to work.

### Paper collection contents (as of May 2026)
The `paper` MongoDB collection contains **337 records**:
- **5 NexusJournal-published papers** — Zenodo DOIs (`10.5281/zenodo.*`), full PDFs, Google Scholar indexed
- **332 reference/knowledge-base papers** — imported from CSV (external DOIs from Ayurveda/Siddha literature), no uploaded PDF

All 337 records appear in `sitemap.xml` and get `citation_*` meta tags. The 5 Zenodo papers are the authoritative NexusJournal publications. The MongoDB collection name is **`paper`** (singular) — not `papers` (which is an empty legacy collection).

### Paper `$text` index weights
```
title: 8 · keywords: 5 · abstract: 3 · authors.name: 2
```

### Paper.create is idempotent
`publishManuscript` uses `Paper.findOneAndUpdate(..., { upsert: true })` keyed on DOI. Safe to retry if client times out during publish.

### Google Scholar meta tags
`GET /papers/:id` is server-rendered by Express (not the SPA) — injects all `citation_*` Highwire Press meta tags into `index.html` before serving. `citation_pdf_url` points to `/papers/:id/download` (same subdirectory, required by Scholar).

### BASE_URL env var
`BASE_URL` in `.env` controls all absolute URLs in meta tags and sitemap. Currently set to `https://tradmedint.com` (migration completed May 2026).

### Publish timeout
Client overrides Axios timeout to 120 seconds for `POST /manuscripts/:id/publish`. Server calls Zenodo (external), which can take 30–60 s.
