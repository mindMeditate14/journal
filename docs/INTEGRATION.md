# AYUSH Entry → NexusJournal Integration Guide

**Purpose:** Import clinical case records from AYUSH Entry and convert them into structured journal evidence.

---

## Architecture Overview

```
AYUSH Entry Database          NexusJournal
(Clinical Cases)             (Journals & Evidence)
      ↓
   /api/cases/:id
      ↓
   Case Record
   {
     patient: {...},
     condition: "Hypertension",
     intervention: {...},
     outcome: {...}
   }
      ↓
   CaseStudy Collection
   (Structured extraction)
      ↓
   Manuscript Skeleton
   (Auto-draft generation)
      ↓
   Journal
   (Published article)
```

---

## Integration Flow

### 1. User Initiates Import

**Frontend:** User clicks "Import from AYUSH Entry" in workspace

```typescript
// client/src/services/api.ts
export const ayushAPI = {
  listAvailableCases: async () => {
    const { data } = await apiClient.get('/integration/ayush/cases');
    return data;  // [{ _id, patient, condition, intervention, outcome }]
  },
  importCase: async (caseId: string, projectId: string) => {
    const { data } = await apiClient.post('/integration/ayush/import', {
      caseId,
      projectId,
    });
    return data;  // { caseStudy, manuscript }
  },
};
```

### 2. Backend Fetches Case from AYUSH Entry

**Server:** Controller calls AYUSH Entry API

```javascript
// server/src/controllers/integrationController.js
export const importAYUSHCase = async (req, res, next) => {
  try {
    const { caseId, projectId } = req.body;
    const ayushCase = await ayushService.getCaseRecord(caseId);
    
    // Validate case exists
    if (!ayushCase) {
      return res.status(404).json({ error: 'Case not found in AYUSH Entry' });
    }

    // Extract structured data
    const extractedData = extractClinicalData(ayushCase);
    
    // Create CaseStudy
    const caseStudy = await CaseStudy.create({
      title: `Case: ${ayushCase.patient.age}y ${ayushCase.condition}`,
      projectId,
      owner: req.userId,
      caseRecordId: caseId,
      clinicalData: extractedData,
      status: 'draft',
    });

    // Create Manuscript skeleton
    const manuscript = await createManuscriptFromCase(caseStudy);

    res.status(201).json({
      caseStudy,
      manuscript,
      extractedData,
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Data Extraction & Mapping

### AYUSH Entry Case Format

```json
{
  "_id": "case_123",
  "patient": {
    "age": 52,
    "gender": "M",
    "conditions": ["Hypertension"]
  },
  "intervention": {
    "name": "Ashwagandha + Lifestyle",
    "type": "herbal",
    "dosage": "500mg",
    "frequency": "twice daily",
    "duration": "8 weeks"
  },
  "outcomes": {
    "primary": "BP reduction",
    "measurements": [
      {
        "date": "2024-01-01",
        "systolic": 140,
        "diastolic": 90
      },
      {
        "date": "2024-03-01",
        "systolic": 120,
        "diastolic": 80
      }
    ],
    "improvementPercentage": 14.3
  },
  "sideEffects": [],
  "notes": "Patient compliant, good lifestyle changes"
}
```

### NexusJournal CaseStudy Format

```javascript
// Extracted and normalized
const caseStudy = {
  title: "Case: 52-year-old male with hypertension treated with Ashwagandha",
  clinicalData: {
    patientAge: 52,
    patientGender: "M",
    condition: "Hypertension",
    intervention: {
      name: "Ashwagandha + Lifestyle Modification",
      ingredients: ["Ashwagandha root extract"],
      dosage: "500mg",
      duration: "8 weeks",
      route: "oral"
    },
    outcomes: {
      primary: "Systolic BP reduction from 140 to 120 mmHg",
      improvementPercentage: 14.3,
      sideEffects: ["None reported"]
    }
  },
  knowledgeLinks: {
    relatedJournals: [],  // Will be populated by search
    knowledgeGraphNodes: [
      { type: "condition", label: "Hypertension" },
      { type: "intervention", label: "Ashwagandha" },
      { type: "outcome", label: "BP Reduction" }
    ]
  }
};
```

---

## Service Layer Implementation

### AYUSH Entry Service

```javascript
// server/src/services/ayushService.js
import axios from 'axios';
import logger from '../utils/logger.js';

const AYUSH_API_URL = process.env.AYUSH_ENTRY_API_URL || 'http://localhost:5001/api';
const AYUSH_API_KEY = process.env.AYUSH_ENTRY_API_KEY;

export const getCaseRecord = async (caseId) => {
  try {
    const { data } = await axios.get(
      `${AYUSH_API_URL}/cases/${caseId}`,
      { headers: { Authorization: `Bearer ${AYUSH_API_KEY}` } }
    );
    return data;
  } catch (error) {
    logger.error('AYUSH API error:', error.message);
    throw { status: 500, message: 'Failed to fetch case from AYUSH Entry' };
  }
};

export const listAvailableCases = async (filters = {}) => {
  try {
    const { data } = await axios.get(
      `${AYUSH_API_URL}/cases`,
      {
        params: {
          status: 'completed',
          hasOutcomes: true,
          ...filters,
        },
        headers: { Authorization: `Bearer ${AYUSH_API_KEY}` },
      }
    );
    return data;  // [{ _id, patient, condition, ... }]
  } catch (error) {
    logger.error('AYUSH API list error:', error.message);
    throw { status: 500, message: 'Failed to fetch cases' };
  }
};

export default {
  getCaseRecord,
  listAvailableCases,
};
```

### Evidence Extraction Service

```javascript
// server/src/services/evidenceExtractorService.js
export const extractClinicalData = (ayushCase) => {
  return {
    patientAge: ayushCase.patient.age,
    patientGender: ayushCase.patient.gender,
    condition: ayushCase.conditions?.[0] || 'Unknown',
    duration: ayushCase.symptoms?.duration || 'Not specified',
    priorTreatments: ayushCase.priorTreatments || [],
    
    intervention: {
      name: ayushCase.intervention.name,
      ingredients: ayushCase.intervention.ingredients || [],
      dosage: ayushCase.intervention.dosage,
      duration: ayushCase.intervention.duration,
      route: ayushCase.intervention.route || 'oral',
    },
    
    outcomes: {
      primary: extractPrimaryOutcome(ayushCase.outcomes),
      secondary: ayushCase.outcomes?.secondary || [],
      improvementPercentage: calculateImprovement(ayushCase.outcomes),
      sideEffects: ayushCase.outcomes?.sideEffects || [],
      timeToEffect: estimateTimeToEffect(ayushCase.outcomes),
    },
    
    followUp: {
      duration: ayushCase.followUpDuration || 'Not specified',
      lastCheckup: ayushCase.lastFollowUp,
      currentStatus: ayushCase.currentStatus,
    },
  };
};

const extractPrimaryOutcome = (outcomes) => {
  if (!outcomes?.measurements || outcomes.measurements.length === 0) {
    return outcomes?.description || 'Not specified';
  }
  const first = outcomes.measurements[0];
  const last = outcomes.measurements[outcomes.measurements.length - 1];
  return `${first.value} → ${last.value}`;
};

const calculateImprovement = (outcomes) => {
  if (!outcomes?.measurements || outcomes.measurements.length < 2) {
    return outcomes?.improvementPercentage || 0;
  }
  const first = outcomes.measurements[0].value;
  const last = outcomes.measurements[outcomes.measurements.length - 1].value;
  return Math.round(((first - last) / first) * 100 * 10) / 10;
};

const estimateTimeToEffect = (outcomes) => {
  if (!outcomes?.measurements || outcomes.measurements.length < 2) {
    return 'Not specified';
  }
  const first = new Date(outcomes.measurements[0].date);
  const last = new Date(outcomes.measurements[outcomes.measurements.length - 1].date);
  const weeks = Math.round((last - first) / (7 * 24 * 60 * 60 * 1000));
  return weeks > 0 ? `${weeks} weeks` : 'Immediate';
};

export default { extractClinicalData };
```

### Manuscript Generation

```javascript
// server/src/services/manuscriptGeneratorService.js
export const createManuscriptFromCase = async (caseStudy) => {
  const skeleton = buildManuscriptSkeleton(caseStudy);
  
  const manuscript = await Manuscript.create({
    title: `Case Study: ${caseStudy.title}`,
    projectId: caseStudy.projectId,
    owner: caseStudy.owner,
    status: 'draft',
    
    sections: [
      {
        type: 'introduction',
        title: 'Introduction',
        content: generateIntroduction(caseStudy),
        order: 1,
      },
      {
        type: 'methods',
        title: 'Patient & Methods',
        content: generateMethods(caseStudy),
        order: 2,
      },
      {
        type: 'results',
        title: 'Results',
        content: generateResults(caseStudy),
        order: 3,
      },
      {
        type: 'discussion',
        title: 'Discussion',
        content: generateDiscussionStub(caseStudy),
        order: 4,
      },
      {
        type: 'conclusion',
        title: 'Conclusion',
        content: generateConclusion(caseStudy),
        order: 5,
      },
    ],
    
    linkedClinicalData: [
      {
        caseId: caseStudy._id,
        extractedData: caseStudy.clinicalData,
      },
    ],
    
    knowledgeGraph: {
      nodes: caseStudy.clinicalData.knowledgeLinks.knowledgeGraphNodes.map(node => ({
        id: `${node.type}_${node.label.replace(/\s+/g, '_')}`,
        type: node.type,
        label: node.label,
        linkedJournals: [],
      })),
      edges: [
        {
          from: 'condition_hypertension',
          to: 'intervention_ashwagandha',
          relationship: 'treated-by',
        },
        {
          from: 'intervention_ashwagandha',
          to: 'outcome_bp_reduction',
          relationship: 'leads-to',
        },
      ],
    },
  });

  return manuscript;
};

const generateIntroduction = (caseStudy) => {
  const { condition, intervention } = caseStudy.clinicalData;
  return `<h2>Introduction</h2>
<p>${condition} is a chronic condition affecting millions worldwide...</p>
<p>This case report documents the use of ${intervention.name} 
in managing ${condition}.</p>`;
};

const generateMethods = (caseStudy) => {
  const { patientAge, patientGender, condition, intervention, duration } = caseStudy.clinicalData;
  return `<h2>Patient & Methods</h2>
<p><strong>Patient:</strong> ${patientAge}-year-old ${patientGender}</p>
<p><strong>Diagnosis:</strong> ${condition}</p>
<p><strong>Intervention:</strong> ${intervention.name} (${intervention.dosage})</p>
<p><strong>Duration:</strong> ${duration}</p>`;
};

const generateResults = (caseStudy) => {
  const { outcomes } = caseStudy.clinicalData;
  return `<h2>Results</h2>
<p><strong>Primary Outcome:</strong> ${outcomes.primary}</p>
<p><strong>Improvement:</strong> ${outcomes.improvementPercentage}%</p>
<p><strong>Time to Effect:</strong> ${outcomes.timeToEffect}</p>
<p><strong>Side Effects:</strong> ${outcomes.sideEffects.length === 0 ? 'None' : outcomes.sideEffects.join(', ')}</p>`;
};

const generateDiscussionStub = (caseStudy) => {
  return `<h2>Discussion</h2>
<p>This case demonstrates the potential efficacy of the chosen intervention.</p>
<p>[Continue discussion with literature review and clinical implications]</p>`;
};

const generateConclusion = (caseStudy) => {
  const { condition, intervention } = caseStudy.clinicalData;
  return `<h2>Conclusion</h2>
<p>${intervention.name} may be a promising approach for managing ${condition}.</p>
<p>Further research is warranted to confirm these findings.</p>`;
};

export default { createManuscriptFromCase };
```

---

## API Routes for Integration

```javascript
// server/src/routes/integration.js
import express from 'express';
import { authMiddleware, requireRoles } from '../middleware/auth.js';
import * as integrationController from '../controllers/integrationController.js';

const router = express.Router();

// List available cases from AYUSH Entry
router.get(
  '/ayush/cases',
  authMiddleware,
  requireRoles(['researcher', 'admin']),
  integrationController.listAYUSHCases
);

// Import a specific case
router.post(
  '/ayush/import',
  authMiddleware,
  requireRoles(['researcher', 'admin']),
  integrationController.importAYUSHCase
);

// Get import status
router.get(
  '/ayush/import/:importId/status',
  authMiddleware,
  integrationController.getImportStatus
);

export default router;
```

---

## Frontend Integration Component

```typescript
// client/src/pages/workspace/ImportCasePage.tsx
import { useState } from 'react';
import { ayushAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ImportCasePage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);

  useEffect(() => {
    fetchAvailableCases();
  }, []);

  const fetchAvailableCases = async () => {
    setLoading(true);
    try {
      const data = await ayushAPI.listAvailableCases();
      setCases(data);
    } catch (error) {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (caseId: string, projectId: string) => {
    try {
      const { caseStudy, manuscript } = await ayushAPI.importCase(caseId, projectId);
      toast.success('Case imported successfully!');
      // Redirect to manuscript editor
      navigate(`/workspace/manuscripts/${manuscript._id}/edit`);
    } catch (error) {
      toast.error('Import failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Import from AYUSH Entry</h1>

      <div className="space-y-4">
        {cases.map((case_: any) => (
          <div key={case_._id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">
              {case_.patient.age}y {case_.condition}
            </h3>
            <p className="text-gray-600 mt-2">
              {case_.intervention.name} for {case_.duration}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleImport(case_._id, projectId)}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Import as Case Study
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling

```javascript
// Common integration errors
{
  "error": "AYUSH_API_UNAVAILABLE",
  "message": "Cannot reach AYUSH Entry API",
  "retryAfter": 300
}

{
  "error": "INVALID_API_KEY",
  "message": "AYUSH Entry authentication failed",
  "action": "Update AYUSH_ENTRY_API_KEY in .env"
}

{
  "error": "CASE_NOT_FOUND",
  "message": "Case does not exist in AYUSH Entry",
  "caseId": "case_123"
}

{
  "error": "MISSING_CLINICAL_DATA",
  "message": "Case missing required outcomes for extraction",
  "missingFields": ["outcomes.measurements"]
}
```

---

## Environment Variables

```bash
# .env
AYUSH_ENTRY_API_URL=http://localhost:5001/api
AYUSH_ENTRY_API_KEY=your-api-key-here
AYUSH_ENTRY_TIMEOUT=30000  # 30 seconds
```

---

## Testing Integration

```bash
# Test AYUSH Entry connectivity
curl -H "Authorization: Bearer $AYUSH_API_KEY" \
  http://localhost:5001/api/cases

# Test NexusJournal import endpoint
curl -X POST http://localhost:5005/api/integration/ayush/import \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case_123",
    "projectId": "proj_456"
  }'
```

---

*Integration Guide — v1.0.0 — Phase 2 Feature*
