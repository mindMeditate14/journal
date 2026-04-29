# NexusJournal — System Architecture

**Version:** v1.1.0  
**Date:** April 2026  
**Status:** Active implementation

---

## 1. System Overview

NexusJournal is a federated clinical evidence and journal publishing platform connecting:
- **Global knowledge repository** (journals, references, clinical evidence)
- **Personal research workspace** (projects, drafts, citations, libraries)
- **Clinical database integration** (AYUSH Entry: case records → structured evidence)
- **Knowledge graph** (Condition ↔ Intervention ↔ Evidence ↔ Outcomes)

### Core Value Proposition
Researchers convert clinical cases into peer-reviewed journal drafts using structured evidence, powered by knowledge graphs and RAG-assisted literature review.

### Implemented Authoring Workflow (April 2026)

Manuscript creation now starts from a dedicated three-path entry UI:

1. Upload Existing PDF
- `POST /api/manuscripts/extract-metadata` for extraction preview
- `POST /api/manuscripts/drafts/from-pdf` to persist draft

2. Generate from Structured Input
- `POST /api/manuscripts/drafts` with `sourcePath='ai_wizard'`
- Optional AI assist: `POST /api/manuscripts/ai/structured-draft` and `POST /api/manuscripts/ai/outline`

3. Generate from Clinical Case Inputs
- `POST /api/manuscripts/drafts` with `sourcePath='clinical_case'`
- Optional AI assist: `POST /api/manuscripts/ai/clinical-draft` and `POST /api/manuscripts/ai/section`

4. Existing Paper Fast-Track (already written externally)
- `POST /api/manuscripts/submit-existing` with PDF/DOC/DOCX attachment
- Editor reviews in the same dashboard flow as tool-authored manuscripts
- Uploaded file is stored as `workingDocument` for correction cycle

5. Collaborative correction cycle (before publication)
- `POST /api/manuscripts/:id/working-document` accepts PDF/DOC/DOCX replacements
- Researcher/editor/reviewer can iteratively update the working file
- Review notes remain in manuscript review feedback / editor notes

All paths converge on one draft model in `Manuscript`, then finalize through:
- `PATCH /api/manuscripts/:id` (author edits draft)
- `POST /api/manuscripts` with `draftId` (submission to editorial workflow)

Publication/search indexing rule:
- Accepted manuscripts require `POST /api/manuscripts/:id/final-document` (PDF only) before editor publish.
- Only this final PDF is used for published paper discovery links.

`POST /api/manuscripts/:id/comments` was removed from the active API surface because comment endpoints are not currently implemented in server routes.

---

## 2. Architecture Layers

### 2.1 Frontend (React 18 + Vite + TypeScript)
```
Presentation Layer
├── Pages (knowledge browser, workspace, draft editor, search)
├── Components (reusable UI: journals, editors, citations, PDFs)
├── Services (API client, search, PDF extraction, export)
├── State (Redux/Context: auth, workspace, documents)
└── Utils (formatting, validation, knowledge graph visualization)
```

### 2.2 Backend (Node.js + Express)
```
API Layer (REST + GraphQL for complex queries)
├── Auth Controller (JWT, roles, refresh tokens)
├── Journal Controller (CRUD, publish/archive)
├── Workspace Controller (projects, drafts, libraries)
├── Evidence Controller (clinical integration, knowledge graph)
├── Search Controller (full-text, filters, aggregations)
├── PDF Controller (upload, metadata extraction)
├── Citations Controller (generate, manage, export)
└── AI Controller (RAG backend, literature assistant, draft suggestions)

Service Layer
├── AuthService (JWT, refresh, password reset, role-based access)
├── JournalService (publication workflow, versioning, peer review)
├── EvidenceService (clinical DB sync, knowledge graph traversal)
├── SearchService (Elasticsearch integration, faceted search)
├── PDFService (upload handler, OCR, metadata extraction)
├── CitationService (multiple formats: APA, MLA, Chicago, Vancouver)
├── AIService (Gemini API, RAG prompt engineering)
└── NotificationService (WebSocket, email, in-app)

Data Layer
└── MongoDB (primary), Redis (cache), Elasticsearch (search)
```

### 2.3 External Integrations
- **AYUSH Entry API** (clinical case data)
- **Google Gemini** (RAG, draft assistance)
- **Elasticsearch** (full-text search)
- **AWS S3 / Cloudinary** (PDF storage)
- **SendGrid / Nodemailer** (email notifications)

---

## 3. Data Architecture

### 3.1 Core Collections

#### Users
```javascript
{
  _id: ObjectId,
  uid: String,                    // Unique identifier
  email: String,
  password: String (hashed),
  profile: {
    firstName: String,
    lastName: String,
    affiliation: String,
    bio: String,
    avatar: String (URL),
    expertise: [String]            // Tags: "Ayurveda", "Cardiology", etc.
  },
  role: Enum ['admin', 'researcher', 'practitioner', 'reader'],
  subscription: {
    plan: Enum ['free', 'researcher', 'premium', 'institutional'],
    expiresAt: Date,
    features: {
      maxProjects: Number,
      maxLibraryItems: Number,
      aiAssistantAccess: Boolean,
      advancedSearch: Boolean
    }
  },
  workspace: {
    projects: [ObjectId],          // References to ResearchProject
    libraries: [ObjectId],         // References to Library
    drafts: [ObjectId],            // References to Manuscript
    savedJournals: [ObjectId]      // Bookmarks
  },
  preferences: {
    theme: String,
    defaultCitationStyle: String,
    notifications: Boolean,
    emailDigest: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Journal
```javascript
{
  _id: ObjectId,
  title: String,
  abstract: String,
  content: String (rich HTML),
  authors: [{
    name: String,
    affiliation: String,
    role: String,
    contact: String
  }],
  keywords: [String],
  doi: String,                     // Digital Object Identifier
  issn: String,                    // Journal ISSN
  volume: Number,
  issue: Number,
  pages: String,
  publishedAt: Date,
  journal: {
    name: String,
    publisher: String,
    url: String
  },
  evidence: [ObjectId],            // References to ClinicalEvidence
  citations: [{
    refId: ObjectId,
    page: Number,
    context: String
  }],
  knowledgeLinks: {
    conditions: [String],
    interventions: [String],
    outcomes: [String]
  },
  status: Enum ['draft', 'submitted', 'under_review', 'published', 'archived'],
  peerReview: {
    reviewers: [ObjectId],
    status: Enum ['pending', 'in_progress', 'approved', 'rejected'],
    feedback: [String],
    version: Number
  },
  metrics: {
    views: Number,
    citations: Number,
    downloads: Number
  },
  owner: ObjectId,                 // Reference to User
  createdAt: Date,
  updatedAt: Date
}
```

#### ResearchProject
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  owner: ObjectId,                 // Reference to User
  collaborators: [{
    userId: ObjectId,
    role: Enum ['editor', 'contributor', 'viewer'],
    joinedAt: Date
  }],
  manuscripts: [ObjectId],         // References to Manuscript
  linkedCases: [ObjectId],         // References to clinical cases from AYUSH Entry
  caseStudies: [ObjectId],         // References to CaseStudy
  tags: [String],
  status: Enum ['active', 'archived', 'published'],
  createdAt: Date,
  updatedAt: Date
}
```

#### Manuscript
```javascript
{
  _id: ObjectId,
  title: String,
  sourcePath: Enum ['manual', 'pdf_import', 'ai_wizard', 'clinical_case'],
  abstract: String,
  content: String (rich HTML),     // Editor.js blocks or Markdown
  authors: [ObjectId],             // References to Users
  owner: ObjectId,                 // Reference to User
  projectId: ObjectId,             // Reference to ResearchProject
  version: Number,
  
  sections: [{
    title: String,
    content: String,
    order: Number,
    type: Enum ['introduction', 'methods', 'results', 'discussion', 'conclusion', 'references']
  }],
  
  citedReferences: [ObjectId],     // References to Reference
  linkedJournals: [ObjectId],      // References to published Journal
  linkedClinicalData: [{
    caseId: ObjectId,              // From AYUSH Entry
    extractedData: {
      condition: String,
      intervention: String,
      outcome: String,
      dosage: String,
      duration: String
    }
  }],
  
  knowledgeGraph: {
    nodes: [{
      id: String,
      type: Enum ['condition', 'intervention', 'evidence', 'outcome'],
      label: String,
      linkedJournals: [ObjectId]
    }],
    edges: [{
      from: String,
      to: String,
      relationship: String
    }]
  },
  
  status: Enum ['draft', 'in_progress', 'ready_for_review', 'submitted', 'published'],
  completenessScore: Number,       // 0-100 draft quality score
  validationState: Enum ['incomplete', 'review_needed', 'ready_for_submission'],
  extractionReport: {
    parser: String,
    fileName: String,
    fileSize: Number,
    extractedAt: Date,
    rawTextPreview: String
  },
  metadata: {
    affiliations: [String],
    sectionHeadings: [String],
    references: [String],
    citationDetails: {
      doi: String,
      rawCitation: String
    },
    extractionConfidence: {
      title: Number,
      authors: Number,
      abstract: Number,
      keywords: Number,
      references: Number
    },
    extractionWarnings: [String]
  },
  submissionMetadata: {
    submittedTo: ObjectId,         // Journal reference
    submittedAt: Date,
    reviewStatus: Enum ['pending', 'under_review', 'accepted', 'rejected'],
    editorNotes: String
  },
  
  comments: [{
    userId: ObjectId,
    text: String,
    range: {
      from: Number,
      to: Number
    },
    resolved: Boolean,
    createdAt: Date
  }],
  
  createdAt: Date,
  updatedAt: Date,
  lastEditedBy: ObjectId
}
```

#### ClinicalEvidence
```javascript
{
  _id: ObjectId,
  sourceType: Enum ['journal', 'clinical_trial', 'case_study', 'clinical_case', 'meta_analysis'],
  sourceId: ObjectId,              // Reference to Journal or external
  
  condition: {
    name: String,
    icd10: String,
    description: String
  },
  
  intervention: {
    name: String,
    type: Enum ['herb', 'formula', 'procedure', 'lifestyle'],
    ingredients: [{
      name: String,
      quantity: String,
      unit: String
    }],
    dosage: String,
    duration: String,
    instructions: String
  },
  
  outcome: {
    primary: String,
    secondary: [String],
    measurementTool: String,
    improvement: Number,           // Percentage
    timeToEffect: String
  },
  
  quality: {
    studyType: Enum ['RCT', 'cohort', 'case_control', 'observational', 'case_report'],
    sampleSize: Number,
    followUpPeriod: String,
    evidenceLevel: Enum ['1A', '1B', '2A', '2B', '3', '4', '5']
  },
  
  clinicalRelevance: {
    applicablePopulation: [String],
    contraindications: [String],
    adverseEvents: [String],
    interactionRisks: [String]
  },
  
  linkedJournals: [ObjectId],
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### Reference (Citation)
```javascript
{
  _id: ObjectId,
  title: String,
  authors: [String],
  publicationYear: Number,
  publicationType: Enum ['journal', 'book', 'conference', 'thesis', 'website'],
  
  journal: {
    name: String,
    volume: Number,
    issue: Number,
    pages: String,
    issn: String
  },
  
  doi: String,
  url: String,
  abstract: String,
  
  owner: ObjectId,                 // Reference to User (for personal library)
  isPublic: Boolean,
  
  citations: {
    apa: String,
    mla: String,
    chicago: String,
    vancouver: String
  },
  
  tags: [String],
  notes: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

#### Library
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  owner: ObjectId,                 // Reference to User
  isPublic: Boolean,
  
  references: [ObjectId],          // References to Reference
  collections: [{
    name: String,
    references: [ObjectId],
    description: String
  }],
  
  sharedWith: [{
    userId: ObjectId,
    accessLevel: Enum ['view', 'comment', 'edit']
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

#### CaseStudy
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  caseRecordId: ObjectId,          // Reference to AYUSH Entry case record
  projectId: ObjectId,             // Reference to ResearchProject
  owner: ObjectId,                 // Reference to User
  
  clinicalData: {
    patientAge: Number,
    patientGender: String,
    condition: String,
    diagnosis: String,
    duration: String,
    priorTreatments: [String],
    
    intervention: {
      name: String,
      ingredients: [String],
      dosage: String,
      duration: String,
      route: String
    },
    
    outcomes: {
      primary: String,
      secondary: [String],
      improvementPercentage: Number,
      sideEffects: [String],
      timeToEffect: String
    },
    
    followUp: {
      duration: String,
      lastCheckup: Date,
      currentStatus: String
    }
  },
  
  knowledgeLinks: {
    relatedJournals: [ObjectId],
    relatedEvidence: [ObjectId],
    knowledgeGraphNodes: [{
      type: Enum ['condition', 'intervention', 'outcome'],
      label: String
    }]
  },
  
  status: Enum ['draft', 'ready_for_draft', 'published'],
  createdAt: Date,
  updatedAt: Date
}
```

#### SearchIndex
```javascript
{
  _id: ObjectId,
  itemId: ObjectId,                // References any indexed item
  itemType: Enum ['journal', 'manuscript', 'case_study', 'reference', 'evidence'],
  
  searchableText: String,          // Full text for FTS
  keywords: [String],
  authors: [String],
  tags: [String],
  
  facets: {
    condition: [String],
    intervention: [String],
    outcome: [String],
    evidenceLevel: [String],
    studyType: [String],
    publicationYear: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. Knowledge Graph Design

### 4.1 Node Types
```
Condition (disease, disorder, symptom)
  ├─ ICD-10 code
  ├─ Synonyms
  └─ Related conditions

Intervention (herb, formula, procedure)
  ├─ Botanical name
  ├─ Ingredients
  ├─ Dosage range
  └─ Preparation method

Evidence (clinical trial, case study, meta-analysis)
  ├─ Study type
  ├─ Sample size
  ├─ Evidence level
  └─ Effect size

Outcome (improvement, recovery, side effect)
  ├─ Measurement tool
  ├─ Improvement %
  └─ Time to effect
```

### 4.2 Edge Relationships
```
Condition --treats--> Intervention
Intervention --shows-effect-on--> Outcome
Evidence --supports--> (Condition, Intervention, Outcome)
Intervention --may-cause--> (Outcome[adverse])
Condition --related-to--> Condition
Outcome --measured-by--> Instrument
```

---

## 5. API Architecture

### 5.1 REST Endpoints Structure

#### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

#### Journals
```
GET    /api/journals                    (paginated, filtered)
GET    /api/journals/:id                (with evidence links)
POST   /api/journals                    (admin/researcher)
PATCH  /api/journals/:id                (owner/admin)
DELETE /api/journals/:id                (owner/admin)
GET    /api/journals/:id/versions       (history)
POST   /api/journals/:id/publish        (submit for review)
```

#### Workspace (Personal)
```
GET    /api/workspace/projects          (user's projects)
POST   /api/workspace/projects          (create project)
GET    /api/workspace/projects/:id
PATCH  /api/workspace/projects/:id
DELETE /api/workspace/projects/:id

GET    /api/workspace/manuscripts       (user's drafts)
POST   /api/workspace/manuscripts       (create draft)
GET    /api/workspace/manuscripts/:id
PATCH  /api/workspace/manuscripts/:id   (auto-save)
DELETE /api/workspace/manuscripts/:id
POST   /api/workspace/manuscripts/:id/submit
GET    /api/workspace/manuscripts/:id/comments
POST   /api/workspace/manuscripts/:id/comments
```

#### Clinical Evidence
```
GET    /api/evidence                    (search, filter)
GET    /api/evidence/:id
POST   /api/evidence                    (from AYUSH Entry import)
GET    /api/evidence/link/journal/:journalId
POST   /api/evidence/knowledge-graph    (build graph)
GET    /api/evidence/condition/:conditionId/interventions
GET    /api/evidence/intervention/:interventionId/outcomes
```

#### Search (Full-text + Filters)
```
GET    /api/search?q=query&filters=...  (Elasticsearch)
GET    /api/search/journals
GET    /api/search/evidence
GET    /api/search/cases
GET    /api/search/facets              (aggregations)
```

#### References & Citations
```
GET    /api/references                  (user's library)
POST   /api/references                  (add reference)
GET    /api/references/:id
DELETE /api/references/:id
POST   /api/references/:id/cite         (export citation)
GET    /api/citations/format?id=...&style=apa (generate)
```

#### PDF Management
```
POST   /api/pdf/upload                  (with metadata extraction)
GET    /api/pdf/:id                     (metadata)
DELETE /api/pdf/:id
POST   /api/pdf/:id/extract            (OCR, entity extraction)
```

#### AI Features (Future)
```
POST   /api/ai/draft-outline            (RAG: outline generation)
POST   /api/ai/literature-review        (RAG: search + summarize)
POST   /api/ai/cite-evidence            (RAG: find relevant evidence)
POST   /api/ai/suggest-next             (auto-complete section)
```

### 5.2 GraphQL Queries (Optional, for complex data)
```graphql
query GetManuscriptWithEvidence($id: ID!) {
  manuscript(id: $id) {
    title
    content
    linkedClinicalData {
      condition
      intervention
      outcome
    }
    linkedJournals {
      title
      doi
    }
    knowledgeGraph {
      nodes { id type label }
      edges { from to relationship }
    }
  }
}

query SearchEvidence($condition: String!, $intervention: String) {
  evidence(condition: $condition, intervention: $intervention) {
    id
    evidenceLevel
    studyType
    linkedJournals { title doi }
  }
}
```

---

## 6. Authentication & Authorization

### 6.1 Roles & Permissions

#### Admin
- View all journals, manuscripts, users
- Approve/reject journals for publication
- Manage peer reviewers
- Configure platform settings
- Access analytics

#### Researcher
- Create projects, manuscripts, drafts
- Access full journal library
- Link clinical data from AYUSH Entry
- Invite collaborators
- Submit journals for publication
- Use AI assistants
- Advanced search + knowledge graphs

#### Practitioner
- View published journals and evidence
- Create personal case studies
- Access their own notes and annotations
- Limited AI features
- Cannot publish journals (read-only)

#### Reader
- View published journals only
- Search (limited, 10 queries/day free)
- Download PDFs
- Save favorite journals
- No editing, no AI access

### 6.2 JWT Strategy
```
Access Token (15 minutes)
  ├─ user_id
  ├─ role
  ├─ workspace_id
  └─ permissions: [array of action strings]

Refresh Token (7 days, httpOnly cookie)
  └─ user_id

Role-based middleware: @requireRole('researcher')
Permission-based middleware: @requirePermission('publish_journal')
```

---

## 7. Integration with AYUSH Entry

### 7.1 Clinical Data Bridge
```
AYUSH Entry (Source)
  ├─ Case records
  ├─ Patient data (anonymized)
  ├─ Interventions (herbs, formulas)
  ├─ Outcomes (measurements)
  └─ Follow-up notes

NexusJournal (Consumer)
  ├─ Import case records as CaseStudy
  ├─ Extract structured evidence
  ├─ Link to ClinicalEvidence collection
  ├─ Populate knowledge graph
  └─ Generate manuscript drafts
```

### 7.2 API Integration Flow
```
1. User selects case record from AYUSH Entry
2. System calls AYUSH Entry API: GET /api/cases/:id
3. Extract: condition, intervention, outcome, dosage, duration
4. Create CaseStudy doc with structured fields
5. Auto-populate Manuscript skeleton
6. User enriches with literature links
```

---

## 8. Search Architecture

### 8.1 Multi-Index Search
```
Elasticsearch Indices:
  ├─ journals_index (title, abstract, content, authors, keywords)
  ├─ manuscripts_index (title, abstract, sections)
  ├─ evidence_index (condition, intervention, outcome, quality)
  ├─ cases_index (condition, intervention, outcome, case details)
  └─ references_index (title, authors, abstract)
```

### 8.2 Faceted Search
```
Filters available:
  ├─ Condition (multi-select, autocomplete)
  ├─ Intervention (herb/formula/procedure)
  ├─ Outcome type (improvement %, recovery)
  ├─ Evidence level (1A, 1B, 2A, 2B, 3, 4, 5)
  ├─ Study type (RCT, cohort, case study)
  ├─ Year range
  ├─ Language
  └─ Peer-reviewed (yes/no)
```

---

## 9. Deployment Architecture

### 9.1 Infrastructure (VPS)
```
VPS: 76.13.211.100 (same as existing services)

Services:
  ├─ nexusjournal-app (PM2, port 5005)
  ├─ nexusjournal-pdf-worker (port 5006, async PDF processing)
  └─ nexusjournal-search (Elasticsearch)

Databases:
  ├─ MongoDB: mongodb://localhost:27017/nexusjournal_db
  ├─ Redis: localhost:6379 (sessions, cache)
  └─ Elasticsearch: localhost:9200 (full-text search)
```

### 9.2 Storage
```
Local (VPS /opt/nexusjournal/):
  ├─ /opt/nexusjournal/public/      (built React client)
  ├─ /opt/nexusjournal/server/      (Node.js backend)
  ├─ /opt/nexusjournal/uploads/     (temp PDF storage)
  └─ /opt/nexusjournal/logs/        (PM2 logs)

S3 / Cloudinary:
  └─ PDFs (long-term storage, CDN delivery)
```

### 9.3 Deployment Pipeline
```
Client:
  npm run build → dist/
  tar → scp → /opt/nexusjournal/public/
  
Server:
  Single file hotfix: scp → /opt/nexusjournal/server/src/...
  pm2 restart nexusjournal-app
```

---

## 10. Scalability & Performance

### 10.1 Caching Strategy
```
Redis:
  ├─ User sessions (JWT validation)
  ├─ Journal metadata (24h TTL)
  ├─ Search results (1h TTL)
  ├─ Knowledge graph nodes (7d TTL)
  └─ Frequently accessed PDFs metadata
```

### 10.2 Database Optimization
```
MongoDB Indexes:
  ├─ journals: { status: 1, publishedAt: -1 }
  ├─ manuscripts: { owner: 1, projectId: 1, updatedAt: -1 }
  ├─ evidence: { condition: 1, intervention: 1, evidenceLevel: 1 }
  ├─ references: { owner: 1, tags: 1 }
  └─ searchIndex: { itemType: 1, facets: 1 } (text index)
```

### 10.3 API Rate Limiting
```
Free tier:
  ├─ Search: 10 req/day
  ├─ PDFs: 2 uploads/month
  └─ AI: Disabled

Researcher tier:
  ├─ Search: unlimited
  ├─ PDFs: 50 uploads/month
  ├─ AI: 100 requests/month
  └─ Collaborators: 5
```

---

## 11. Security Considerations

### 11.1 Data Protection
- Passwords: bcrypt (12 rounds)
- Sensitive fields (patient data): AES-256 encryption at rest
- JWT: HS256 (HMAC) with secure secret rotation
- CORS: Restrict to frontend domain only
- HTTPS: Force redirect on production

### 11.2 PDF Handling
- Virus scan (ClamAV integration)
- Max file size: 50MB
- Allowed types: PDF only
- Store on S3 with pre-signed URLs (10min expiry)
- Metadata extraction: sandboxed process

### 11.3 Clinical Data Privacy
- PII anonymization on import from AYUSH Entry
- Audit logs for all data access
- Data retention: 7 years (compliance)
- Export compliance: GDPR, HIPAA considerations

---

## 12. Development Roadmap (Phase 1-3)

### Phase 1 (Weeks 1-4): MVP
- [ ] Auth system + roles
- [ ] Journal CRUD + search
- [ ] Personal workspace (projects, manuscripts)
- [ ] Basic citation management
- [ ] AYUSH Entry integration (case import)

### Phase 2 (Weeks 5-8): Core Features
- [ ] Knowledge graph visualization
- [ ] Advanced search with facets
- [ ] Peer review workflow
- [ ] PDF upload + metadata extraction
- [ ] Collaboration (comments, suggestions)

### Phase 3 (Weeks 9-12): AI + Polish
- [ ] RAG-based literature review
- [ ] Journal draft assistant
- [ ] Manuscript auto-outline
- [ ] Full-text analytics
- [ ] Performance optimization

---

## 13. Technology Stack Summary

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Modern, type-safe, fast build |
| **Styling** | Tailwind CSS + Shadcn/ui | Production-ready components |
| **State** | Redux Toolkit + RTK Query | Predictable, scalable state |
| **Backend** | Node.js + Express | Lightweight, event-driven |
| **Database** | MongoDB + Mongoose | Flexible schema, document model fits evidence |
| **Search** | Elasticsearch | Fast FTS, faceted search, aggregations |
| **Cache** | Redis | Sessions, metadata, search results |
| **Auth** | JWT (HS256) | Stateless, scalable |
| **AI** | Google Gemini API | RAG, auto-completion, summaries |
| **PDF** | pdf.js + pdfkit | Client-side viewing + server-side generation |
| **File Storage** | AWS S3 / Cloudinary | Scalable, CDN-backed |
| **Deployment** | PM2 + VPS | Process manager, existing infrastructure |
| **Testing** | Jest + Vitest + Supertest | Frontend, backend, API testing |
| **Logging** | Winston + Pino | Structured, performance-optimized |

---

## 14. Next Steps

1. **Folder Structure** → Complete MERN scaffolding
2. **MongoDB Schemas** → Mongoose models with validation
3. **API Routes** → Express controllers + middleware
4. **Frontend Components** → Key screens: Dashboard, Editor, Search
5. **Authentication** → JWT + role-based middleware
6. **AYUSH Integration** → API bridge + case import workflow

---

*Architecture Document — v1.0.0 — April 2026*
