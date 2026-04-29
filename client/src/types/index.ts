export type Role = 'admin' | 'editor' | 'researcher' | 'practitioner' | 'reader';

export interface User {
  _id: string;
  uid: string;
  email: string;
  profile: {
    firstName?: string;
    lastName?: string;
    affiliation?: string;
    bio?: string;
    avatar?: string;
    expertise?: string[];
  };
  role: Role;
  roles?: Role[];
  subscription: {
    plan: 'free' | 'researcher' | 'premium' | 'institutional';
    expiresAt?: Date;
  };
}

export interface Journal {
  _id: string;
  title: string;
  abstract: string;
  content: string;
  authors: Array<{
    name: string;
    affiliation?: string;
    role?: string;
  }>;
  doi: string;
  status: 'draft' | 'submitted' | 'under_review' | 'published' | 'archived';
  publishedAt: Date;
  owner: string;
  keywords: string[];
  metrics: {
    views: number;
    citations: number;
    downloads: number;
  };
}

export interface Paper {
  _id: string;
  title: string;
  abstract: string;
  doi?: string;
  publicationYear?: number;
  citationsCount: number;
  referencesCount: number;
  isOpenAccess: boolean;
  authors: Array<{
    name: string;
    affiliation?: string;
    orcid?: string;
  }>;
  journal?: {
    name?: string;
    issn?: string;
    publisher?: string;
  };
  keywords: string[];
  topics: string[];
  referencesOpenAlex?: string[];
  urls?: {
    landing?: string;
    source?: string;
    pdf?: string;
  };
  sourceProvenance: Array<{
    source: 'openalex' | 'crossref' | 'pubmed' | 'manual';
    sourceId?: string;
    confidence: number;
    fetchedAt: Date;
  }>;
  qualityScore: number;
  trustFlags: string[];
  relevanceScore?: number;
}

export interface PaperGraphNode {
  id: string;
  type: 'paper';
  role: 'center' | 'reference' | 'citation';
  title: string;
  publicationYear?: number;
}

export interface PaperGraphEdge {
  source: string;
  target: string;
  relation: 'references' | 'cites';
}

export interface PaperGraph {
  center: string;
  nodes: PaperGraphNode[];
  edges: PaperGraphEdge[];
  summary: {
    referencesInGraph: number;
    citationsInGraph: number;
  };
}

export interface AdminUser {
  _id: string;
  uid: string;
  email: string;
  role: Role;
  roles?: Role[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  roleBreakdown: Partial<Record<Role, number>>;
}

export interface IngestRun {
  _id: string;
  source: 'openalex';
  query: string;
  requestedBy: string;
  requestedByRole: Role;
  options: {
    page: number;
    perPage: number;
    pages: number;
    includeReferencedWorks: boolean;
    maxReferencedPerWork: number;
  };
  status: 'success' | 'failed';
  durationMs: number;
  result: {
    ingested: number;
    pagesRequested: number;
    pagesProcessed: number;
    upserted: number;
    modified: number;
    dedupeMatched: number;
    referencedFetched: number;
    referencedInserted: number;
    referencedUpdated: number;
    referencedSkipped: number;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Manuscript {
  _id: string;
  title: string;
  abstract: string;
  content?: string;
  body?: string;
  owner: string;
  projectId?: string;
  sourcePath?: 'manual' | 'pdf_import' | 'ai_wizard' | 'clinical_case' | 'existing_upload';
  status:
    | 'draft'
    | 'in_progress'
    | 'ready_for_review'
    | 'submitted'
    | 'under-review'
    | 'revision-requested'
    | 'accepted'
    | 'rejected'
    | 'published';
  version: number;
  submissionId?: string;
  journalId?: string | { _id: string; title: string };
  discipline?: string;
  methodology?: string;
  keywords?: string[];
  completenessScore?: number;
  validationState?: 'incomplete' | 'review_needed' | 'ready_for_submission';
  metadata?: {
    affiliations?: string[];
    sectionHeadings?: string[];
    references?: string[];
    extractionWarnings?: string[];
    extractionConfidence?: {
      title?: number;
      authors?: number;
      abstract?: number;
      keywords?: number;
      references?: number;
    };
  };
  extractionReport?: {
    parser?: string;
    fileName?: string;
    fileSize?: number;
    extractedAt?: string;
    rawTextPreview?: string;
  };
  finalDocument?: {
    originalName?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    url?: string;
    uploadedAt?: string;
  };
  workingDocument?: {
    originalName?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    url?: string;
    uploadedAt?: string;
  };
  sections: Array<{
    title: string;
    content: string;
    order: number;
    type: 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'references';
  }>;
  citedReferences: string[];
  linkedJournals: string[];
  collaborators: Array<{
    userId: string;
    role: 'editor' | 'contributor' | 'viewer';
  }>;
  comments: Array<{
    userId: string;
    text: string;
    resolved: boolean;
    createdAt: Date;
  }>;
}

export interface ResearchProject {
  _id: string;
  title: string;
  description: string;
  owner: string;
  collaborators: Array<{
    userId: string;
    role: 'editor' | 'contributor' | 'viewer';
  }>;
  manuscripts: string[];
  status: 'active' | 'archived' | 'published';
  tags: string[];
}

export interface ClinicalEvidence {
  _id: string;
  sourceType: 'journal' | 'clinical_trial' | 'case_study' | 'clinical_case' | 'meta_analysis';
  condition: {
    name: string;
    icd10?: string;
  };
  intervention: {
    name: string;
    type: 'herb' | 'formula' | 'procedure' | 'lifestyle';
    dosage?: string;
    duration?: string;
  };
  outcome: {
    primary: string;
    improvement: number;
  };
  quality: {
    evidenceLevel: '1A' | '1B' | '2A' | '2B' | '3' | '4' | '5';
    studyType: 'RCT' | 'cohort' | 'case_control' | 'observational' | 'case_report';
  };
}

export interface Reference {
  _id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  publicationType: 'journal' | 'book' | 'conference' | 'thesis' | 'website';
  doi?: string;
  url?: string;
  abstract?: string;
  owner: string;
  tags: string[];
}

export interface CaseStudy {
  _id: string;
  title: string;
  projectId: string;
  owner: string;
  status: 'draft' | 'ready_for_draft' | 'published';
  clinicalData: {
    condition: string;
    intervention: {
      name: string;
      dosage?: string;
    };
    outcomes: {
      primary: string;
      improvementPercentage: number;
    };
  };
}
