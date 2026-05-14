# NexusJournal — Copilot / AI Agent Instructions

Loaded into every Copilot session for this workspace. All AI coding assistance **must** follow these rules.

App version: **v1.x** (May 2026). Academic journal publishing platform — TradMed International.

---

## 1 · Project Identity

**NexusJournal** — open-access academic journal platform for Traditional Medicine research.

| | |
|---|---|
| Stack | React 19 + TypeScript + Vite 6 + Tailwind CSS · Express 5 + MongoDB (native + mongoose) |
| Module system | **`"type": "module"`** — all server files use `import/export`, NOT `require()` |
| Server | PM2 process `nexusjournal`, port **5005** |
| VPS | `root@76.13.211.100` · paths under `/opt/nexusjournal/` |
| Built client | `/opt/nexusjournal/public/` (Vite dist) |
| Auth | JWT stored in `localStorage`, verified by `server/src/middleware/auth.js` |
| DB | `mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin` |
| AI | `@google/genai` (Gemini) for manuscript AI review, AI writing tools |
| DOI | Zenodo REST API (`ZENODO_API_KEY` in `.env`). Sandbox: `ZENODO_SANDBOX=true` |
| PDF | `pdf-lib` (server-side cover page) · `html2pdf.js` (client-side AI review PDF) |
| Base URL | `process.env.BASE_URL` — **always use this, never hardcode the domain** · current value: `https://tradmedint.com` |
| Email | Local Postfix relay · `noreply@tradmedint.com` · `SMTP_HOST=127.0.0.1`, `SMTP_PORT=25`, no auth · `emailService.js` handles empty `SMTP_PASS` |
| Entry | `server/src/index.js` |

SSH to VPS: PowerShell native `ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100` (key auth only — no password).

---

## 2 · Non-Negotiable Invariants

1. **Paper records must be created via Mongoose model layer**, never `mongosh` direct insert. Raw inserts bypass the `$text` index definition and papers won't appear in search. Always: `const Paper = getPaperModel(); await Paper.findOneAndUpdate(...)`.

2. **Publish upsert is idempotent.** Use `Paper.findOneAndUpdate(filter, { $set: {...} }, { upsert: true, new: true })`. Filter on `doi` if present, else `sourceProvenance.sourceId`. Never `Paper.create()` in the publish flow — it throws on retry.

3. **BASE_URL env var is the authoritative domain.** All absolute URLs in meta tags, sitemap, robots.txt, PDF cover, and email links use `process.env.BASE_URL`. Current value: `https://tradmedint.com` (migration completed May 14, 2026 — see `docs/domain-migration.md`).

4. **ES Modules only.** Server uses `"type": "module"` in package.json. Use `import`/`export`, dynamic `import()`, `__dirname` replacement: `const __dirname = path.dirname(fileURLToPath(import.meta.url))`.

5. **Publish API call timeout must be 120 seconds.** Zenodo + PDF upload takes 30–60 s. Client must pass `{ timeout: 120000 }` to the axios wrapper.

6. **Scholar-friendly HTML for `/papers/:id`.** Express intercepts these routes, injects `citation_*` Highwire Press meta tags into `index.html` before serving. Do NOT let nginx serve these routes as static SPA files — the nginx `location /papers/` block proxies to Express (port 5005).

7. **`citation_pdf_url` must point to `/papers/:id/download`** (same subdirectory as the abstract page). Do NOT point it to `/uploads/manuscripts/...` — Google Scholar requires same-subdirectory or subdomain PDF URL.

8. **`canPublish()` requirements:** title, abstract, at least one author with name + email, discipline. Body content is NOT required (content is in the PDF file). Do not add body length checks.

9. **Branded PDF download at `/papers/:id/download`.** Served by `paperController.download` → `coverPageService.buildCoverPdf`. Uses `pdf-lib` StandardFonts only (no custom fonts). Never remove this cover page feature.

10. **AI review PDF is internal use only.** Labelled "Pre-Review Report — Internal Use Only". Generated client-side with `html2pdf.js`. Only visible to editors/admins. The download button only shows when `aiReviewReport.status === 'done'`.

---

## 3 · Server File Map

```
server/src/
  index.js                    Entry: Express app, static serving, /papers/:id Scholar HTML,
                               robots.txt, sitemap.xml, all route mounts
  middleware/
    auth.js                   JWT verify + role checks (authenticateToken, requireAdmin, requireEditorOrAdmin)
    upload.js                 Multer config for manuscript PDF / document uploads
  routes/
    auth.js                   /api/auth (register, login, me, reset)
    manuscripts.js            /api/manuscripts (CRUD + submit + publish + review + AI)
    papers.js                 /api/papers (search, getById, download, related, graph, citations)
    journals.js               /api/journals
    users.js                  /api/users
    admin.js                  /api/admin (stats, users, role changes)
    reviews.js                /api/reviews
    ingest.js                 /api/ingest (CSV practice data import)
    config.js                 /api/config (classifications)
  controllers/
    manuscriptController.js   Manuscript CRUD + publish flow (Zenodo + Paper upsert)
    paperController.js        Paper search/fetch + branded PDF download
    reviewController.js       Peer review submission
    ingestController.js       CSV → manuscript draft generation
  models/
    Paper.js                  Mongoose model with $text index (title×8, keywords×5, abstract×3, authors.name×2)
    User.js                   Mongoose model
    Manuscript.js             Mongoose model
    Journal.js                Mongoose model
    Review.js                 Mongoose model
  utils/
    coverPageService.js       buildCoverPdf(paper) — A4 cover page via pdf-lib, returns Buffer
    emailService.js           Nodemailer transactional emails (publication notification, etc.)
    zenodoService.js          Zenodo REST API wrapper (create deposition, upload file, publish)
  jobs/
    (cron jobs if any)
```

---

## 4 · Client File Map

```
client/src/
  App.tsx                     Routes
  api/
    client.ts                 Axios wrapper with JWT, base URL, error handling
                               ALWAYS use this, never raw fetch('/api/...')
  pages/
    HomePage.tsx              Public landing — published papers list
    PaperViewPage.tsx         Public paper view + Download PDF + View PDF
    LoginPage.tsx / RegisterPage.tsx
    DashboardPage.tsx         Author dashboard — my manuscripts
    ManuscriptFormPage.tsx    Create / edit manuscript
    EditorDashboardPage.tsx   Editor: all manuscripts, AI review, publish, decision
    AdminPage.tsx             Admin: manuscripts (edit all fields) + users (role management)
    ReviewPage.tsx            Reviewer: submit peer review
    SearchPage.tsx            Full-text search papers
    PracticeDataPage.tsx      Practitioner: CSV upload → manuscript draft
  components/
    ProtectedRoute.tsx        allowedRoles prop controls access
    Layout.tsx                Navbar + sidebar
    (various UI components)
  types/
    index.ts                  Manuscript, Paper, User, Review TypeScript interfaces
```

---

## 5 · Key Patterns

### Adding a new server route
1. Create `server/src/routes/<name>.js`
2. Mount in `server/src/index.js`: `app.use('/api/<name>', nameRouter)`
3. Apply `authenticateToken` middleware unless explicitly public
4. Call from client via `apiClient.get/post/...` in `client/src/api/client.ts`

### Paper upsert (publish flow — idempotent)
```js
const Paper = getPaperModel();
const filter = manuscript.doi
  ? { doi: manuscript.doi }
  : { 'sourceProvenance.sourceId': manuscript._id.toString() };
const paper = await Paper.findOneAndUpdate(
  filter,
  { $set: { ...paperFields } },
  { upsert: true, new: true }
);
```

### Scholar meta tags (new field)
To add a new `citation_*` meta tag, update `buildMetaTags(paper)` in `server/src/index.js`.

### Deployment (client)
```powershell
cd "C:\MyApps\journal\client"; npm run build
# Then scp dist/ to /opt/nexusjournal/public/
```

### Deployment (server hotfix)
```powershell
scp -i "$HOME\.ssh\kvm4-hostinger" "C:\MyApps\journal\server\src\<file>.js" "root@76.13.211.100:/opt/nexusjournal/server/src/<file>.js"
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 restart nexusjournal"
```

### Check logs
```powershell
ssh -i "$HOME\.ssh\kvm4-hostinger" root@76.13.211.100 "pm2 logs nexusjournal --lines 50"
```

---

## 6 · Documentation Index

All docs in `docs/`:

| File | Content |
|---|---|
| `architecture.md` | System design, MongoDB collections, data flow diagrams |
| `api-reference.md` | All API endpoints with request/response shapes |
| `operations.md` | Deployment commands, PM2, nginx, backups, environment |
| `domain-migration.md` | Step-by-step migration from `journal.mind-meditate.com` to `tradmedint.com` |
| `google-scholar.md` | Highwire Press meta tags, sitemap, Search Console submission |
| `user-roles.md` | Role hierarchy, access matrix, how to change roles |
| `manuscript-lifecycle.md` | Status flow, publish flow, Zenodo integration, Paper vs Manuscript |
| `DEPLOYMENT.md` | Original deployment reference (legacy, superseded by operations.md) |

**Read the relevant doc before implementing any feature that touches those areas.**

---

## 7 · Current Published Papers (as of May 2026)

All papers with Zenodo DOIs are NexusJournal-originated publications. The `paper` collection also contains ~332 reference/knowledge-base papers imported from CSV (external DOIs, not NexusJournal-published).

| Paper `_id` | DOI | Title |
|---|---|---|
| `69f962655e4c17fc2398bf70` | `10.5281/zenodo.20118137` | Modern Consumption Patterns |
| `6a017f58bad7fe84aa659e42` | `10.5281/zenodo.20117947` | Archetiq Archetype Blueprint |
| `6a043d4c84f269b21472c288` | `10.5281/zenodo.20153396` | AI in Siddha Medicine |
| `6a04337e8221e4ae0a0fe99d` | `10.5281/zenodo.20153547` | Pancha Bhootha Medicine |
| `6a0433ca8221e4ae0a0fea4d` | `10.5281/zenodo.20153596` | Can Nutrition Delay Menopausal Complications? |
