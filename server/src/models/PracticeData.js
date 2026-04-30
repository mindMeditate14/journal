import mongoose from 'mongoose';

const practiceDataSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
    },
    description: String,
    practitioner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    affiliation: String,

    // Study Design
    studyType: {
      type: String,
      enum: ['case-report', 'case-series', 'observational-study', 'comparative-study'],
      required: true,
    },
    studyDuration: {
      months: Number,
      startDate: Date,
      endDate: Date,
    },

    // Patient/Case Data
    population: {
      totalCount: {
        type: Number,
        required: true,
      },
      ageRange: {
        min: Number,
        max: Number,
      },
      genderDistribution: {
        male: Number,
        female: Number,
        other: Number,
      },
      demographics: String,
      inclusionCriteria: String,
      exclusionCriteria: String,
    },

    // Condition & Intervention
    condition: {
      name: String,
      description: String,
      icd10Code: String, // International Classification of Diseases
    },
    intervention: {
      name: String,
      description: String,
      protocol: String,
      duration: String,
      frequency: String,
      dosage: String,
      materials: [String],
    },

    // Comparison (if available)
    hasControlGroup: Boolean,
    controlGroupSize: Number,
    controlGroupDescription: String,

    // Primary & Secondary Outcomes
    outcomes: [
      {
        name: String, // e.g., "Blood Glucose Level"
        type: {
          type: String,
          enum: ['numeric', 'categorical', 'qualitative'],
        },
        unit: String, // e.g., "mg/dL"
        measurmentMethod: String, // e.g., "HbA1c test"
        measurementFrequency: String, // e.g., "baseline, 3mo, 6mo, 12mo"
        isPrimary: Boolean,
      },
    ],

    // Patient-Level Data (De-identified)
    patientData: [
      {
        patientId: String, // Anonymous ID, not real name
        age: Number,
        gender: String,
        baselineData: {}, // outcome: value pairs
        timePointData: [
          {
            timePoint: String, // "3 months", "6 months", etc.
            date: Date,
            measurements: {}, // outcome: value pairs
          },
        ],
        adverseEvents: [String],
        dropoutReason: String,
        completed: Boolean,
      },
    ],

        // Statistical Summary (calculated by system)
    statistics: {
      completionRate: Number, // % of patients who completed
      baselineStats: {}, // Summary stats for each outcome at baseline
      outcomesStats: [
        {
          outcome: String,
          baseline: {
            mean: Number,
            median: Number,
            sd: Number,
            min: Number,
            max: Number,
          },
          postIntervention: {
            mean: Number,
            median: Number,
            sd: Number,
            min: Number,
            max: Number,
          },
          changeFromBaseline: {
            absoluteChange: Number,
            percentageChange: Number,
            pValue: Number, // If paired t-test performed
            confidenceInterval: {
              lower: Number,
              upper: Number,
            },
          },
          improvementRate: Number, // % of patients who improved
        },
      ],
      subgroupAnalysis: {}, // Optional breakdown by age, gender, etc.
    },

    // Research Quality
    researchQuality: {
      ethicalApprovalObtained: Boolean,
      ethicsApprovalNumber: String,
      patientConsentObtained: Boolean,
      dataPrivacyEnsured: Boolean,
      conflictOfInterest: String,
      fundingSource: String,
    },

    // Literature Context
    literatureContext: {
      existingSimilarStudies: [String],
      researchGap: String,
      targetDiscipline: {
        type: String,
        enum: ['medicine', 'ayurveda', 'homeopathy', 'nursing', 'public-health', 'psychology', 'physiology', 'pharmacology', 'nutrition', 'allied-health', 'general'],
      },
      targetMethodology: {
        type: String,
        enum: ['case-report', 'case-series', 'case-study', 'systematic-review', 'meta-analysis', 'rct', 'cohort-study', 'cross-sectional', 'qualitative', 'mixed-methods', 'literature-review', 'opinion-commentary', 'external-submission'],
      },
    },

    // Adverse Events & Complications
    adverseEvents: [
      {
        event: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
        },
        relatedToTreatment: Boolean,
        count: Number,
      },
    ],

    // Additional Data
    patientTestimonials: [String],
    attachments: [
      {
        filename: String,
        url: String,
        type: String, // 'consent-form', 'data-file', 'supporting-doc'
      },
    ],

    // Manuscript Generation Status
    manuscriptStatus: {
      type: String,
      enum: ['collecting', 'ready-for-draft', 'draft-generated', 'reviewed', 'submitted'],
      default: 'collecting',
    },
    generatedManuscriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manuscript',
    },

    // Metadata
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for quick filtering
practiceDataSchema.index({ practitioner: 1, createdAt: -1 });
practiceDataSchema.index({ 'condition.name': 1 });
practiceDataSchema.index({ studyType: 1 });
practiceDataSchema.index({ manuscriptStatus: 1 });

export default mongoose.model('PracticeData', practiceDataSchema);
