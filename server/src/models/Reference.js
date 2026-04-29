import mongoose from 'mongoose';

const referenceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    authors: [String],
    publicationYear: Number,
    publicationType: {
      type: String,
      enum: ['journal', 'book', 'conference', 'thesis', 'website'],
      default: 'journal',
    },
    journal: {
      name: String,
      volume: Number,
      issue: Number,
      pages: String,
      issn: String,
    },
    doi: {
      type: String,
      index: true,
    },
    url: String,
    abstract: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    isPublic: { type: Boolean, default: false },
    citations: {
      apa: String,
      mla: String,
      chicago: String,
      vancouver: String,
    },
    tags: [String],
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

referenceSchema.index({ owner: 1, tags: 1 });

export default mongoose.model('Reference', referenceSchema);
