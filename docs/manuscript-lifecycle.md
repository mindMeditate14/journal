# NexusJournal — Manuscript Lifecycle

## Status Flow

```
draft
  │
  ▼ (author submits)
submitted
  │
  ▼ (editor assigns reviewers)
under-review
  │
  ├─▶ revision-requested  ──▶ (author revises) ──▶ submitted (again)
  │
  ├─▶ rejected
  │
  ▼ (editor accepts)
accepted
  │
  ▼ (editor publishes)
published
```

---

## Status Descriptions

| Status | Who sets it | What happens |
|---|---|---|
| `draft` | System (on create) | Author is still writing. Can be edited, deleted. |
| `submitted` | Author (or auto on create) | Locked for author edits. Editor can review. |
| `under-review` | Editor (on assigning reviewers) | Reviewers receive assignment. |
| `revision-requested` | Editor (decision) | Author notified. Can re-edit and re-submit. |
| `rejected` | Editor (decision) | Terminal state. Author notified. |
| `accepted` | Editor (decision) | Ready for publication. |
| `published` | Editor (publish action) | Zenodo deposit created. DOI assigned. Paper record created. |

---

## Publish Flow (Step by Step)

### 1. Upload Final Document
- Editor uploads the camera-ready PDF via `POST /manuscripts/:id/final-document`
- Or promotes working document: `POST /manuscripts/:id/promote-to-final`

### 2. Trigger AI Review (optional)
- `POST /manuscripts/:id/ai-review`
- Stores result in `manuscript.aiReviewReport` (status, score, recommendation, dimensions)
- Editor downloads PDF from EditorDashboard (`⬇ Download PDF` button — appears when `aiReviewReport.status === 'done'`)
- PDF is labelled "Pre-Review Report — Internal Use Only" (not shared with authors)

### 3. Publish
- `POST /manuscripts/:id/publish`
- Client must use **120 second timeout** (Zenodo call can take 30–60 s)
- Server flow:
  1. Validates manuscript has title, abstract, authors with name+email, discipline
  2. Creates Zenodo deposition with metadata
  3. Uploads the final PDF to Zenodo
  4. Publishes the Zenodo deposition → receives DOI
  5. Updates `manuscript.status = 'published'`, `manuscript.doi`, `manuscript.publishedAt`
  6. Creates / upserts `Paper` record in MongoDB (idempotent — safe to retry)
  7. Sends publication notification email to authors

### 4. After Publish
- Paper is immediately searchable via `GET /api/papers/search`
- Paper page at `https://<domain>/papers/<id>` serves Scholar meta tags
- Sitemap automatically includes new paper
- Zenodo record at `https://zenodo.org/records/<id>` is public

---

## Retrying a Failed Publish

If the client times out but the server continued and succeeded:
- The manuscript will be `status: 'published'` in the DB
- A `Paper` record will exist (created during the first attempt)
- If the client retried → the second `Paper.findOneAndUpdate()` with `upsert:true` on DOI just updates the existing record safely

If the server itself failed (Zenodo error):
- The manuscript stays in `accepted` status
- Check PM2 logs: `pm2 logs nexusjournal --lines 100`
- Fix the issue and retry `POST /manuscripts/:id/publish`

---

## Paper Record vs Manuscript Record

| Field | Manuscript | Paper |
|---|---|---|
| Purpose | Internal editorial management | Public discovery |
| Audience | Authors, editors, reviewers | Readers, search crawlers, Google Scholar |
| Searchable | No (internal list only) | Yes (`$text` index) |
| Created when | Author submits | Manuscript is published |
| Contains | Status history, reviews, AI reports, uploaded files | Title, abstract, authors, DOI, keywords, PDF URL |
| Indexed by | MongoDB (no text index) | MongoDB `$text` (title×8, keywords×5, abstract×3, authors.name×2) |

---

## Admin Edit Fields (AdminPage.tsx)

Admins can edit these fields on any manuscript via the Admin → Manuscripts tab:

| Field | Editable |
|---|---|
| Status | ✅ (any value including published) |
| Title | ✅ |
| Abstract | ✅ |
| Discipline | ✅ |
| Methodology / Article Type | ✅ |
| Keywords | ✅ (comma-separated input) |
| Authors (name, email, affiliation, ORCID) | ✅ (add/remove rows) |

> **Body** was intentionally removed from the edit form — content is in the uploaded PDF.

---

## Zenodo Integration

### API key
Stored in `.env` as `ZENODO_API_KEY`. Current key: `2d368QMx...` (see `.env` on VPS).

### Sandbox vs Production
- Set `ZENODO_SANDBOX=true` in `.env` to test against `sandbox.zenodo.org` without creating real DOIs
- Unset (or `false`) for production

### Published Zenodo records (as of May 2026)

| DOI | Title | Zenodo record |
|---|---|---|
| `10.5281/zenodo.20118137` | Modern Consumption Patterns | `zenodo.org/records/20118137` |
| `10.5281/zenodo.20117947` | Archetiq Archetype Blueprint | `zenodo.org/records/20117947` |
| `10.5281/zenodo.20153396` | AI in Siddha Medicine | `zenodo.org/records/20153396` |

### MongoDB Paper `_id` for published papers

| Paper `_id` | Title |
|---|---|
| `69f950f7...` | Modern Consumption Patterns |
| `6a017f00...` | Archetiq Archetype Blueprint |
| `6a043d4c84f269b21472c288` | AI in Siddha Medicine |

---

## Branded PDF Download

`GET /papers/:id/download` returns the manuscript PDF with a TradMed International cover page prepended.

Cover page includes:
- Indigo header bar "TradMed International · Open Access · Peer Reviewed"
- Journal name
- Paper title (word-wrapped)
- Authors and affiliations
- Published date
- DOI as clickable URL
- Abstract (up to 1200 chars)
- Keywords
- CC BY 4.0 licence footer

Implementation: `server/src/utils/coverPageService.js` using `pdf-lib` (no external fonts — StandardFonts only).

The original manuscript PDF is read from `/opt/nexusjournal/uploads/manuscripts/<filename>` on disk. If the file is missing, a cover-only PDF is returned.
