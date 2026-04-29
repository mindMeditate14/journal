import mongoose from 'mongoose';

const manuscriptSchema = new mongoose.Schema(
  {
    submissionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => `NJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    },
    journalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journal',
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    abstract: String,
    body: String,
    content: String,
    authors: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
        affiliation: String,
        orcid: String,
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchProject',
      index: true,
    },
    version: { type: Number, default: 1 },
    sections: [
      {
        title: String,
        content: String,
        order: Number,
        type: {
          type: String,
          enum: ['introduction', 'methods', 'results', 'discussion', 'conclusion', 'references'],
        },
      },
    ],
    citedReferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reference' }],
    linkedJournals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Journal' }],
    discipline: String,
    methodology: String,
    fundingStatement: String,
    conflictOfInterest: String,
    dataAvailability: String,
    linkedClinicalData: [
      {
        caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseStudy' },
        extractedData: {
          condition: String,
          intervention: String,
          outcome: String,
          dosage: String,
          duration: String,
        },
      },
    ],
    knowledgeGraph: {
      nodes: [
        {
          id: String,
          type: { type: String, enum: ['condition', 'intervention', 'evidence', 'outcome'] },
          label: String,
          linkedJournals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Journal' }],
        },
      ],
      edges: [
        {
          from: String,
          to: String,
          relationship: String,
        },
      ],
    },
    status: {
      type: String,
      enum: [
        'draft',
        'in_progress',
        'ready_for_review',
        'submitted',
        'under-review',
        'revision-requested',
        'accepted',
        'rejected',
        'published',
      ],
      default: 'draft',
      index: true,
    },
    assignedEditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviews: [
      {
        reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewerName: String,
        score: Number,
        recommendation: String,
        feedback: String,
        isAnonymous: { type: Boolean, default: true },
        submittedAt: Date,
      },
    ],
    editorDecision: String,
    editorNotes: String,
    revisionRound: { type: Number, default: 0 },
    submittedAt: Date,
    acceptedAt: Date,
    publishedAt: Date,
    doi: String,
    submissionMetadata: {
      submittedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Journal' },
      submittedAt: Date,
      reviewStatus: {
        type: String,
        enum: ['pending', 'under_review', 'accepted', 'rejected'],
      },
      editorNotes: String,
    },
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        range: {
          from: Number,
          to: Number,
        },
        resolved: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    collaborators: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['editor', 'contributor', 'viewer'], default: 'contributor' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

manuscriptSchema.index({ owner: 1, projectId: 1, updatedAt: -1 });
manuscriptSchema.index({ status: 1 });

export default mongoose.model('Manuscript', manuscriptSchema);
