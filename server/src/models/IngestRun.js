import mongoose from 'mongoose';

const ingestRunSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['openalex'],
      default: 'openalex',
      required: true,
    },
    query: { type: String, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedByRole: { type: String, default: 'reader' },
    options: {
      page: { type: Number, default: 1 },
      perPage: { type: Number, default: 25 },
      pages: { type: Number, default: 1 },
      includeReferencedWorks: { type: Boolean, default: false },
      maxReferencedPerWork: { type: Number, default: 8 },
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
    },
    durationMs: { type: Number, default: 0 },
    result: {
      ingested: { type: Number, default: 0 },
      pagesRequested: { type: Number, default: 0 },
      pagesProcessed: { type: Number, default: 0 },
      upserted: { type: Number, default: 0 },
      modified: { type: Number, default: 0 },
      dedupeMatched: { type: Number, default: 0 },
      referencedFetched: { type: Number, default: 0 },
      referencedInserted: { type: Number, default: 0 },
      referencedUpdated: { type: Number, default: 0 },
      referencedSkipped: { type: Number, default: 0 },
    },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

ingestRunSchema.index({ createdAt: -1 });
ingestRunSchema.index({ source: 1, createdAt: -1 });

export default mongoose.model('IngestRun', ingestRunSchema);
