import mongoose from 'mongoose';

const caseStudySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    caseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchProject',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
        route: String,
      },
      outcomes: {
        primary: String,
        secondary: [String],
        improvementPercentage: Number,
        sideEffects: [String],
        timeToEffect: String,
      },
      followUp: {
        duration: String,
        lastCheckup: Date,
        currentStatus: String,
      },
    },
    knowledgeLinks: {
      relatedJournals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Journal' }],
      relatedEvidence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalEvidence' }],
      knowledgeGraphNodes: [
        {
          type: String,
          enum: ['condition', 'intervention', 'outcome'],
          label: String,
        },
      ],
    },
    status: {
      type: String,
      enum: ['draft', 'ready_for_draft', 'published'],
      default: 'draft',
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

caseStudySchema.index({ projectId: 1, owner: 1 });

export default mongoose.model('CaseStudy', caseStudySchema);
