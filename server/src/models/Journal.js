import mongoose from 'mongoose';

const journalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    abstract: String,
    content: String,
    authors: [
      {
        name: String,
        affiliation: String,
        role: String,
        contact: String,
      },
    ],
    keywords: [String],
    doi: {
      type: String,
      unique: true,
      sparse: true,
    },
    issn: String,
    volume: Number,
    issue: Number,
    pages: String,
    publishedAt: Date,
    journal: {
      name: String,
      publisher: String,
      url: String,
    },
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalEvidence' }],
    citations: [
      {
        refId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference' },
        page: Number,
        context: String,
      },
    ],
    knowledgeLinks: {
      conditions: [String],
      interventions: [String],
      outcomes: [String],
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
      index: true,
    },
    peerReview: {
      reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'approved', 'rejected'],
      },
      feedback: [String],
      version: Number,
    },
    metrics: {
      views: { type: Number, default: 0 },
      citations: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for status and published date
journalSchema.index({ status: 1, publishedAt: -1 });
journalSchema.index({ 'authors.name': 1 });

export default mongoose.model('Journal', journalSchema);
