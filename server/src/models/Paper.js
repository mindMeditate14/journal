import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    affiliation: String,
    orcid: String,
  },
  { _id: false }
);

const sourceProvenanceSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['openalex', 'crossref', 'pubmed', 'manual'],
      required: true,
    },
    sourceId: String,
    confidence: { type: Number, min: 0, max: 1, default: 0.7 },
    fetchedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    normalizedTitle: { type: String, index: true },
    abstract: { type: String, default: '' },
    doi: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    pmid: { type: String, sparse: true, trim: true },
    externalIds: {
      openAlex: { type: String, index: true },
      crossref: String,
      pubmed: String,
    },
    authors: { type: [authorSchema], default: [] },
    journal: {
      name: String,
      issn: String,
      publisher: String,
    },
    publishedAt: Date,
    publicationYear: Number,
    keywords: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    referencesCount: { type: Number, default: 0 },
    referencesOpenAlex: { type: [String], default: [] },
    citationsCount: { type: Number, default: 0 },
    isOpenAccess: { type: Boolean, default: false },
    urls: {
      landing: String,
      source: String,
      pdf: String,
    },
    sourceProvenance: { type: [sourceProvenanceSchema], default: [] },
    qualityScore: { type: Number, min: 0, max: 100, default: 50 },
    trustFlags: { type: [String], default: [] },
  },
  { timestamps: true }
);

paperSchema.index({ publicationYear: -1, citationsCount: -1 });
paperSchema.index({ isOpenAccess: 1, publicationYear: -1 });
paperSchema.index({ 'authors.name': 1 });
paperSchema.index({ 'journal.name': 1 });
paperSchema.index({ referencesOpenAlex: 1 });
paperSchema.index(
  { title: 'text', abstract: 'text', keywords: 'text', 'authors.name': 'text' },
  {
    weights: {
      title: 8,
      abstract: 3,
      keywords: 5,
      'authors.name': 2,
    },
    name: 'paper_text_index',
  }
);

export default mongoose.model('Paper', paperSchema);