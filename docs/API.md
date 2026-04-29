# NexusJournal — REST API Documentation

**Base URL:** `http://localhost:5005/api` (development)

**Authentication:** JWT Bearer token in `Authorization: Bearer <token>` header

---

## Authentication Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "researcher@example.com",
  "password": "securepassword123"
}

Response: 201 Created
{
  "user": {
    "_id": "...",
    "email": "researcher@example.com",
    "role": "reader",
    "subscription": { "plan": "free" }
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "researcher@example.com",
  "password": "securepassword123"
}

Response: 200 OK
{
  "user": { ... },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Refresh Token
```
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}

Response: 200 OK
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Get Current User
```
GET /auth/me
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "_id": "...",
  "email": "researcher@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "affiliation": "Harvard Medical School",
    "expertise": ["Cardiology", "Ayurveda"]
  },
  "role": "researcher",
  "subscription": { "plan": "researcher" }
}
```

---

## Journal Endpoints

### Search Journals
```
GET /journals/search?q=hypertension&author=Smith&year=2024&page=1&limit=20
Authorization: Bearer <token> (optional - public search available)

Response: 200 OK
{
  "journals": [
    {
      "_id": "...",
      "title": "Efficacy of Ashwagandha in Hypertension",
      "abstract": "...",
      "authors": [
        {
          "name": "Dr. Smith",
          "affiliation": "Johns Hopkins"
        }
      ],
      "doi": "10.1234/example",
      "publishedAt": "2024-01-15T00:00:00Z",
      "keywords": ["Ashwagandha", "Hypertension", "Ayurveda"],
      "metrics": { "views": 254, "citations": 12 }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### Get Journal Details
```
GET /journals/:id
Authorization: Bearer <token> (optional for published)

Response: 200 OK
{
  "_id": "...",
  "title": "...",
  "content": "<html>...",
  "authors": [...],
  "evidence": [
    {
      "_id": "...",
      "condition": { "name": "Hypertension" },
      "intervention": { "name": "Ashwagandha" },
      "outcome": { "primary": "BP reduction" }
    }
  ],
  "knowledgeLinks": {
    "conditions": ["Hypertension"],
    "interventions": ["Ashwagandha", "Yoga"],
    "outcomes": ["BP reduction"]
  },
  "status": "published",
  "peerReview": { "status": "approved", "version": 2 }
}
```

### Create Journal
```
POST /journals
Authorization: Bearer <token>
Content-Type: application/json
Role: researcher|admin

{
  "title": "New Journal Article",
  "abstract": "This is a groundbreaking study...",
  "content": "<html>...",
  "keywords": ["keyword1", "keyword2"],
  "authors": [
    {
      "name": "Dr. John Doe",
      "affiliation": "University Hospital"
    }
  ]
}

Response: 201 Created
{
  "_id": "...",
  "title": "...",
  "status": "draft",
  "owner": "...",
  "createdAt": "2024-04-28T..."
}
```

### Update Journal
```
PATCH /journals/:id
Authorization: Bearer <token>
Content-Type: application/json
Role: owner|admin

{
  "title": "Updated Title",
  "abstract": "Updated abstract...",
  "status": "submitted"  # Can only edit if draft
}

Response: 200 OK
{ ... updated journal ... }
```

---

## Manuscript Endpoints

### Submit Existing Paper (External Document)
```
POST /manuscripts/submit-existing
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- journalId (required)
- title (required)
- abstract (required)
- description (optional)
- discipline (optional)
- methodology (optional)
- keywords (optional comma-separated)
- authors (optional comma-separated)
- document (required: PDF/DOC/DOCX)

Response: 201 Created
{
  "success": true,
  "manuscript": {
    "_id": "...",
    "submissionId": "...",
    "status": "submitted",
    "title": "..."
  }
}
```

### Upload Working Document (Editable Review File)
```
POST /manuscripts/:id/working-document
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- document (required: PDF/DOC/DOCX)

Notes:
- Intended for researcher/reviewer/editor correction cycle.
- Can be replaced before publication.

Response: 200 OK
{
  "success": true,
  "workingDocument": {
    "url": "/uploads/manuscripts/<file>",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
}
```

### Upload Final Publication PDF
```
POST /manuscripts/:id/final-document
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- document (required: PDF only)

Notes:
- Allowed only after editorial acceptance.
- This final PDF is used for public publication/search.
```

### Publish Accepted Manuscript
```
POST /manuscripts/:id/publish
Authorization: Bearer <token>

Rules:
- Manuscript status must be accepted.
- A final PDF must already be uploaded.
```

### Create Draft (Structured or Clinical Input)
```
POST /manuscripts/drafts
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourcePath": "ai_wizard", // manual | pdf_import | ai_wizard | clinical_case
  "journalId": "...",
  "projectId": "...",
  "title": "Integrative intervention outcomes",
  "abstract": "...",
  "keywords": ["integrative care", "case report"],
  "authors": [{ "name": "Dr. A", "email": "a@example.com" }],
  "discipline": "Medicine",
  "methodology": "case-study",
  "body": "## Introduction\n..."
}

Response: 201 Created
{
  "success": true,
  "manuscript": {
    "_id": "...",
    "status": "draft",
    "validationState": "review_needed",
    "completenessScore": 70
  }
}
```

### Extract Metadata From PDF (No Draft Persist)
```
POST /manuscripts/extract-metadata
Authorization: Bearer <token>
Content-Type: multipart/form-data
Form field: pdf=<file>

Response: 200 OK
{
  "success": true,
  "extracted": {
    "title": "...",
    "authors": [...],
    "abstract": "...",
    "keywords": [...],
    "body": "...",
    "metadata": {
      "sectionHeadings": [...],
      "references": [...],
      "citationDetails": { "doi": "..." },
      "extractionConfidence": { "title": 0.85 }
    },
    "extractionReport": {
      "parser": "pdf-parse",
      "fileName": "paper.pdf"
    }
  }
}
```

### Create Draft From PDF
```
POST /manuscripts/drafts/from-pdf
Authorization: Bearer <token>
Content-Type: multipart/form-data
Form fields:
  pdf=<file>
  journalId=<journalId>
  projectId=<optional>

Response: 201 Created
{
  "success": true,
  "manuscript": { "_id": "...", "status": "draft" },
  "extracted": { "title": "..." }
}
```

### Submit Existing Paper With Document (Fast Review Path)
```
POST /manuscripts/submit-existing
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
  journalId=<journalId>
  title=<paper title>
  abstract=<short abstract>
  description=<paper description>
  authors=<comma-separated names>
  keywords=<comma-separated keywords>
  discipline=<optional>
  methodology=<optional>
  document=<PDF|DOC|DOCX>

Response: 201 Created
{
  "success": true,
  "manuscript": {
    "_id": "...",
    "submissionId": "NJ-...",
    "status": "submitted"
  }
}
```

### List Manuscripts
```
GET /manuscripts?status=draft,submitted&journalId=...&page=1&limit=20
Authorization: Bearer <token>

Behavior:
- Researchers see manuscripts where `submittedBy = current user`
- Editors see assigned manuscripts plus manuscripts from journals they own
- Admins can list across all manuscripts
```

### AI Outline Generation
```
POST /manuscripts/ai/outline
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "...",
  "abstract": "...",
  "discipline": "Medicine",
  "methodology": "case-study",
  "sourcePath": "ai_wizard"
}
```

### AI Section Generation
```
POST /manuscripts/ai/section
Authorization: Bearer <token>
Content-Type: application/json

{
  "sectionType": "methods",
  "title": "...",
  "abstract": "...",
  "methodology": "...",
  "keyPoints": ["..."],
  "context": "..."
}
```

### AI Structured Draft Generation
```
POST /manuscripts/ai/structured-draft
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "...",
  "abstract": "...",
  "discipline": "...",
  "methodology": "...",
  "objective": "...",
  "methods": "...",
  "findings": "...",
  "limitations": "..."
}
```

### AI Clinical Draft Generation
```
POST /manuscripts/ai/clinical-draft
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "...",
  "abstract": "...",
  "discipline": "Medicine",
  "methodology": "case-study",
  "condition": "...",
  "intervention": "...",
  "outcome": "...",
  "notes": "..."
}
```

### Get Manuscript
```
GET /manuscripts/:id
Authorization: Bearer <token>
```

### Update Draft
```
PATCH /manuscripts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "abstract": "Updated abstract",
  "body": "Updated body",
  "metadata": {
    "extractionWarnings": []
  }
}
```

### Get Draft Extraction Report
```
GET /manuscripts/:id/extraction-report
Authorization: Bearer <token>
```

### Upload Final Publication Document
```
POST /manuscripts/:id/final-document
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form field:
  document=<PDF|DOC|DOCX>

Response: 200 OK
{
  "success": true,
  "finalDocument": {
    "url": "/uploads/manuscripts/..."
  }
}
```

### Submit Manuscript (Draft-Aware)
```
POST /manuscripts
Authorization: Bearer <token>
Content-Type: application/json

{
  "draftId": "...", // optional, if omitted it submits from payload directly
  "journalId": "...",
  "title": "...",
  "abstract": "...",
  "authors": [{ "name": "...", "email": "..." }],
  "body": "...",
  "discipline": "...",
  "methodology": "..."
}

Response: 201 Created
{
  "success": true,
  "manuscript": {
    "_id": "...",
    "submissionId": "NJ-...",
    "status": "submitted",
    "submittedAt": "..."
  }
}
```

Note: Publishing to search index requires an uploaded `finalDocument` on the manuscript.

---

## Evidence Endpoints (Phase 2)

### Search Evidence
```
GET /evidence?condition=Hypertension&intervention=Ashwagandha&evidenceLevel=1A

Response: 200 OK
{
  "evidence": [
    {
      "_id": "...",
      "condition": { "name": "Hypertension", "icd10": "I10" },
      "intervention": { "name": "Ashwagandha", "dosage": "500mg" },
      "outcome": { "primary": "BP reduction", "improvement": 15 },
      "quality": {
        "studyType": "RCT",
        "evidenceLevel": "1A",
        "sampleSize": 120
      }
    }
  ]
}
```

### Get Evidence by Condition
```
GET /evidence/condition/:conditionId/interventions

Response: 200 OK
{
  "interventions": [
    {
      "name": "Ashwagandha",
      "outcomes": [{ "primary": "BP reduction", "improvement": 15 }]
    }
  ]
}
```

---

## Workspace Endpoints (Phase 2)

### List User Projects
```
GET /workspace/projects
Authorization: Bearer <token>

Response: 200 OK
{
  "projects": [
    {
      "_id": "...",
      "title": "Ayurvedic Cardiology Study",
      "description": "...",
      "status": "active",
      "manuscripts": [...],
      "collaborators": [...]
    }
  ]
}
```

### Create Project
```
POST /workspace/projects
Authorization: Bearer <token>

{
  "title": "New Research Project",
  "description": "...",
  "tags": ["Ayurveda", "Cardiology"]
}

Response: 201 Created
```

### List Manuscripts
```
GET /workspace/manuscripts?projectId=...
Authorization: Bearer <token>

Response: 200 OK
{ "manuscripts": [...] }
```

---

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    "email is required",
    "password must be at least 8 characters"
  ]
}
```

### Unauthorized (401)
```json
{
  "error": "Invalid or expired access token"
}
```

### Forbidden (403)
```json
{
  "error": "Insufficient permissions",
  "requiredRoles": ["admin"]
}
```

### Not Found (404)
```json
{
  "error": "Journal not found"
}
```

### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

---

## Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Rate Limiting (Phase 2)

**Free tier:**
- 10 searches/day
- 2 PDF uploads/month

**Researcher tier:**
- Unlimited searches
- 50 PDF uploads/month
- 100 AI requests/month

---

## CORS Headers

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

*API Documentation — v1.0.0 — Phase 1 Complete*
