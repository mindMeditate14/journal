import mongoose from 'mongoose';

const clinicalEvidenceSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ['journal', 'clinical_trial', 'case_study', 'clinical_case', 'meta_analysis'],
      required: true,
      index: true,
    },
    sourceId: mongoose.Schema.Types.ObjectId,
    condition: {
      name: { type: String, required: true, index: true },
      icd10: String,
      description: String,
    },
    intervention: {
      name: { type: String, required: true, index: true },
      type: {
        type: String,
        enum: ['herb', 'formula', 'procedure', 'lifestyle'],
      },
      ingredients: [
        {
          name: String,
          quantity: String,
          unit: String,
        },
      ],
      dosage: String,
      duration: String,
      instructions: String,
    },
    outcome: {
      primary: String,
      secondary: [String],
      measurementTool: String,
      improvement: Number,
      timeToEffect: String,
    },
    quality: {
      studyType: {
        type: String,
        enum: ['RCT', 'cohort', 'case_control', 'observational', 'case_report'],
      },
      sampleSize: Number,
      followUpPeriod: String,
      evidenceLevel: {
        type: String,
        enum: ['1A', '1B', '2A', '2B', '3', '4', '5'],
        index: true,
      },
    },
    clinicalRelevance: {
      applicablePopulation: [String],
      contraindications: [String],
      adverseEvents: [String],
      interactionRisks: [String],
    },
    linkedJournals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Journal' }],
    tags: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

clinicalEvidenceSchema.index({ 'condition.name': 1, 'intervention.name': 1 });
clinicalEvidenceSchema.index({ evidenceLevel: 1 });

export default mongoose.model('ClinicalEvidence', clinicalEvidenceSchema);
