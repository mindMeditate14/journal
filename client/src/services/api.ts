import apiClient from '../api/client';
import { AdminStats, AdminUser, IngestRun, Paper, PaperGraph, User, Journal, Manuscript, ResearchProject, Role } from '../types';

export const authAPI = {
  register: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/register', { email, password });
    return data;
  },
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
};

export const journalAPI = {
  search: async (query: string, filters: any = {}, page = 1, limit = 20) => {
    const { data } = await apiClient.get('/journals/search', {
      params: { q: query, ...filters, page, limit },
    });
    return data;
  },
  getById: async (id: string): Promise<Journal> => {
    const { data } = await apiClient.get(`/journals/${id}`);
    return data;
  },
  create: async (journal: Partial<Journal>): Promise<Journal> => {
    const { data } = await apiClient.post('/journals', journal);
    return data;
  },
  update: async (id: string, updates: Partial<Journal>): Promise<Journal> => {
    const { data } = await apiClient.patch(`/journals/${id}`, updates);
    return data;
  },
};

export const manuscriptAPI = {
  list: async (projectId: string) => {
    const { data } = await apiClient.get('/manuscripts', {
      params: { projectId },
    });
    return data;
  },
    getById: async (id: string): Promise<Manuscript> => {
    const { data } = await apiClient.get(`/manuscripts/${id}`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/manuscripts/${id}`);
  },
  create: async (manuscript: Partial<Manuscript>) => {
    const { data } = await apiClient.post('/manuscripts', manuscript);
    return data;
  },
  update: async (id: string, updates: Partial<Manuscript>) => {
    const { data } = await apiClient.patch(`/manuscripts/${id}`, updates);
    return data;
  },
  createDraft: async (payload: Partial<Manuscript>) => {
    const { data } = await apiClient.post('/manuscripts/drafts', payload);
    return data;
  },
  createDraftFromPdf: async (formData: FormData) => {
    const { data } = await apiClient.post('/manuscripts/drafts/from-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  extractMetadataFromPdf: async (formData: FormData) => {
    const { data } = await apiClient.post('/manuscripts/extract-metadata', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getExtractionReport: async (id: string) => {
    const { data } = await apiClient.get(`/manuscripts/${id}/extraction-report`);
    return data;
  },
  submitExistingPaper: async (formData: FormData) => {
    const { data } = await apiClient.post('/manuscripts/submit-existing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  uploadFinalDocument: async (manuscriptId: string, formData: FormData) => {
    const { data } = await apiClient.post(`/manuscripts/${manuscriptId}/final-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  uploadWorkingDocument: async (manuscriptId: string, formData: FormData) => {
    const { data } = await apiClient.post(`/manuscripts/${manuscriptId}/working-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  generateOutline: async (payload: {
    title?: string;
    abstract?: string;
    discipline?: string;
    methodology?: string;
    sourcePath?: string;
  }) => {
    const { data } = await apiClient.post('/manuscripts/ai/outline', payload);
    return data;
  },
  generateSection: async (payload: {
    sectionType: string;
    title?: string;
    abstract?: string;
    methodology?: string;
    sourcePath?: string;
    keyPoints?: string[];
    context?: string;
  }) => {
    const { data } = await apiClient.post('/manuscripts/ai/section', payload);
    return data;
  },
  generateStructuredDraft: async (payload: {
    title: string;
    abstract: string;
    discipline?: string;
    methodology?: string;
    objective?: string;
    methods?: string;
    findings?: string;
    limitations?: string;
  }) => {
    const { data } = await apiClient.post('/manuscripts/ai/structured-draft', payload);
    return data;
  },
    generateClinicalDraft: async (payload: {
    title: string;
    abstract: string;
    discipline?: string;
    methodology?: string;
    condition: string;
    intervention: string;
    outcome: string;
    notes?: string;
  }) => {
    const { data } = await apiClient.post('/manuscripts/ai/clinical-draft', payload);
    return data;
  },
    generateCompleteManuscript: async (payload: {
    practiceData: any;
    statistics?: any;
    options?: any;
  }) => {
    const { data } = await apiClient.post('/manuscripts/ai/complete-manuscript', payload);
    return data;
  },
  lookupReferences: async (params: { condition?: string; intervention?: string; outcome?: string; limit?: number }) => {
    const { data } = await apiClient.get('/manuscripts/references/lookup', { params });
    return data;
  },
  generateFromPracticeData: async (payload: { practiceDataId: string; journalId?: string; options?: any }) => {
    const { data } = await apiClient.post('/manuscripts/ai/generate-from-practice-data', payload);
    return data;
  },
};

export const projectAPI = {
  list: async (): Promise<ResearchProject[]> => {
    const { data } = await apiClient.get('/workspace/projects');
    return data;
  },
  getById: async (id: string): Promise<ResearchProject> => {
    const { data } = await apiClient.get(`/workspace/projects/${id}`);
    return data;
  },
  create: async (project: Partial<ResearchProject>) => {
    const { data } = await apiClient.post('/workspace/projects', project);
    return data;
  },
};

export const paperAPI = {
  search: async (
    query: string,
    filters: { yearFrom?: number; yearTo?: number; openAccess?: boolean; source?: string } = {},
    page = 1,
    limit = 20
  ): Promise<{ papers: Paper[]; total: number; page: number; limit: number }> => {
    const { data } = await apiClient.get('/papers/search', {
      params: {
        q: query,
        page,
        limit,
        ...filters,
      },
    });
    return data;
  },
  getById: async (id: string): Promise<Paper> => {
    const { data } = await apiClient.get(`/papers/${id}`);
    return data;
  },
  getGraph: async (id: string, limit = 20): Promise<PaperGraph> => {
    const { data } = await apiClient.get(`/papers/${id}/graph`, {
      params: { limit },
    });
    return data;
  },
  getRelated: async (id: string, limit = 8): Promise<Paper[]> => {
    const { data } = await apiClient.get(`/papers/${id}/related`, {
      params: { limit },
    });
    return data.related;
  },
};

export const ingestAPI = {
  openAlexBatch: async (payload: {
    query?: string;
    page?: number;
    perPage?: number;
    pages?: number;
    includeReferencedWorks?: boolean;
    maxReferencedPerWork?: number;
  }) => {
    const { data } = await apiClient.post('/ingest/openalex', payload);
    return data;
  },
  getRuns: async (source: 'openalex' = 'openalex', limit = 12): Promise<IngestRun[]> => {
    const { data } = await apiClient.get('/ingest/runs', {
      params: { source, limit },
    });
    return data.runs;
  },
  retryRun: async (runId: string) => {
    const { data } = await apiClient.post(`/ingest/runs/${runId}/retry`);
    return data;
  },
};

export const adminAPI = {
  getStats: async (): Promise<AdminStats> => {
    const { data } = await apiClient.get('/admin/stats');
    return data;
  },
  listUsers: async (params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  } = {}): Promise<{ users: AdminUser[]; total: number; page: number; limit: number }> => {
    const { data } = await apiClient.get('/admin/users', { params });
    return data;
  },
  changeRole: async (userId: string, roles: Role[]): Promise<AdminUser> => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/role`, { roles });
    return data.user;
  },
  setActive: async (userId: string, isActive: boolean): Promise<AdminUser> => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/active`, { isActive });
    return data.user;
  },
};
