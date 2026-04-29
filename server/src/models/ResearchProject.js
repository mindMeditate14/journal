import mongoose from 'mongoose';

const researchProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: {
          type: String,
          enum: ['editor', 'contributor', 'viewer'],
          default: 'contributor',
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    manuscripts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Manuscript' }],
    linkedCases: [{ type: mongoose.Schema.Types.ObjectId }],
    caseStudies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CaseStudy' }],
    tags: [String],
    status: {
      type: String,
      enum: ['active', 'archived', 'published'],
      default: 'active',
      index: true,
    },
    metadata: {
      researchArea: String,
      targetConditions: [String],
      targetInterventions: [String],
      expectedOutcomes: [String],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

researchProjectSchema.index({ owner: 1, status: 1 });

export default mongoose.model('ResearchProject', researchProjectSchema);
