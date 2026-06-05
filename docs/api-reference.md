# NexusJournal — API Reference

Base URL: `https://tradmedint.com/api`  
Auth: `Authorization: Bearer <jwt>` (all protected routes)  
JWT stored in client localStorage, issued by `/api/auth/login`.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account. Body: `{ email, password, firstName, lastName }` |
| POST | `/auth/login` | Public | Returns `{ token, user }`. Token is 7-day JWT. |
| POST | `/auth/refresh` | Public | Refresh token |
| GET | `/auth/me` | Required | Returns current user object |

### Password Reset — `/api/password-reset`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/password-reset/request` | Public | Sends reset email |
| POST | `/password-reset/reset` | Public | Body: `{ token, newPassword }` |

---

## Manuscripts — `/api/manuscripts`

All routes require auth. Role restrictions noted.

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/manuscripts` | Any | Submit new manuscript |
| GET | `/manuscripts` | Any | List manuscripts (filtered by role — authors see own, editors see all) |
| GET | `/manuscripts/:id` | Any | View single manuscript |
| PATCH | `/manuscripts/:id` | Author/Admin | Update fields. Admin can also change `status`. |
| DELETE | `/manuscripts/:id` | Author/Admin | Delete draft |
| POST | `/manuscripts/:id/submit` | Author | Change status draft → submitted |
| GET | `/manuscripts/:id/extraction-report` | Any | Get AI extraction report |
| POST | `/manuscripts/:id/final-document` | Any | Upload final PDF (multipart `document`) |
| POST | `/manuscripts/:id/working-document` | Any | Upload working draft PDF |
| POST | `/manuscripts/:id/promote-to-final` | editor/admin | Promote working doc to final |
| POST | `/manuscripts/:id/reviews` | reviewer | Submit peer review |
| POST | `/manuscripts/:id/assign-reviewers` | editor/admin | Assign reviewer(s) |
| PATCH | `/manuscripts/:id/decision` | editor/admin | Make editorial decision |
| POST | `/manuscripts/:id/send-feedback` | editor/admin | Email feedback to author |
| POST | `/manuscripts/:id/publish` | editor/admin | Publish to Zenodo + create Paper record. **120 s timeout on client.** |
| POST | `/manuscripts/:id/ai-review` | editor/admin | Trigger AI pre-review (Gemini). Stores result in `aiReviewReport`. |
| POST | `/manuscripts/drafts` | Any | Create blank draft |
| POST | `/manuscripts/drafts/from-pdf` | Any | Create draft by extracting from uploaded PDF |
| POST | `/manuscripts/submit-existing` | Any | Submit existing paper (upload document) |
| POST | `/manuscripts/extract-metadata` | Any | Extract metadata from PDF without creating draft |
| GET | `/manuscripts/reviewer-candidates` | editor/admin | List users available to review |
| GET | `/manuscripts/references/lookup` | Any | Look up references |
| POST | `/manuscripts/ai/outline` | Any | AI-generate outline |
| POST | `/manuscripts/ai/section` | Any | AI-generate a single section |
| POST | `/manuscripts/ai/structured-draft` | Any | AI structured full draft |
| POST | `/manuscripts/ai/clinical-draft` | Any | AI clinical case draft |
| POST | `/manuscripts/ai/complete-manuscript` | Any | AI complete manuscript |
| POST | `/manuscripts/ai/generate-from-practice-data` | Any | Generate from practice data |

### Manuscript status flow
```
draft → submitted → under-review → revision-requested → accepted → published
                                 ↘ rejected
```

---

## Papers — `/api/papers`

All public (no auth required).

| Method | Path | Description |
|---|---|---|
| GET | `/papers/search?q=&page=&limit=` | Full-text search. Returns `{ papers, total, page, limit }` |
| GET | `/papers/:id` | Get single paper by MongoDB `_id` |
| GET | `/papers/:id/download` | Download PDF with branded TradMed cover page (streams PDF) |
| GET | `/papers/:id/graph` | Citation graph data |
| GET | `/papers/:id/related` | Related papers |

### Scholar-aware HTML pages (not API)
| Method | Path | Description |
|---|---|---|
| GET | `/papers/:id` (HTML) | Server-rendered HTML with `citation_*` meta tags for Google Scholar |
| GET | `/sitemap.xml` | All paper URLs for crawler |
| GET | `/robots.txt` | `Allow: *` + Sitemap pointer |

---

## OAI-PMH 2.0 — `/oai`

Public endpoint (no auth). Used by MySitasi, DOAJ, and any OAI-PMH harvester.
Base URL to register with harvesters: `https://tradmedint.com/oai`

| Verb | Query params | Description |
|---|---|---|
| `Identify` | — | Repository identity and metadata |
| `ListMetadataFormats` | — | Returns supported formats (`oai_dc`) |
| `ListSets` | — | Returns `noSetHierarchy` (sets not used) |
| `ListIdentifiers` | `metadataPrefix=oai_dc` · optional `from` / `until` (YYYY-MM-DD) | All published paper identifiers + datestamps |
| `ListRecords` | `metadataPrefix=oai_dc` · optional `from` / `until` | Full Dublin Core XML records for all published papers |
| `GetRecord` | `identifier=oai:tradmedint.com:<mongoId>` · `metadataPrefix=oai_dc` | Single paper record |

**Dublin Core fields per record:** `dc:title`, `dc:creator` (one per author + affiliation), `dc:subject` (keywords + topics), `dc:description` (abstract), `dc:publisher`, `dc:date`, `dc:type`, `dc:format`, `dc:identifier` (DOI URL + landing page URL), `dc:source` (journal name + eISSN), `dc:language`, `dc:rights` (CC BY 4.0).

**Date filtering example:**
```
GET https://tradmedint.com/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2026-01-01
```

> **Note:** `/papers/:id` is routed through nginx to Express (not the SPA). The React app hydrates normally in the browser; the meta tags are pre-injected into the HTML shell.

---

## Journals — `/api/journals`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/journals/search` | Public | Search journals |
| GET | `/journals/:id` | Public | Get journal |
| POST | `/journals` | Required | Create journal |
| PATCH | `/journals/:id` | Required | Update journal |
| DELETE | `/journals/:id` | admin | Delete journal |

---

## Admin — `/api/admin`

All routes require `admin` role.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard stats (counts, recent activity) |
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:userId/role` | Change user role |
| PATCH | `/admin/users/:userId/active` | Enable/disable user |

---

## Config — `/api/config`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/config/classifications` | Public | Get disciplines + methodologies lists |
| POST | `/config/classifications` | admin | Update classifications |

---

## Workspace — `/api/workspace`

Research project management. Auth required.

---

## Practice Data — `/api/practice-data`

Clinical practice data upload and management.

---

## Ingest — `/api/ingest`

Background paper ingestion from OpenAlex. Admin only.

---

## Error Responses

All errors return JSON:
```json
{ "error": "Human-readable message" }
```

| Code | Meaning |
|---|---|
| 400 | Validation error / bad request |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role |
| 404 | Resource not found |
| 409 | Duplicate (e.g. DOI already exists) |
| 500 | Server error (logged via PM2) |
