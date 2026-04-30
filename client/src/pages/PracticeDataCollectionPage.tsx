import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

interface Outcome {
  name: string;
  type: 'numeric' | 'categorical' | 'qualitative';
  unit: string;
  measurementMethod: string;
  isPrimary: boolean;
}

interface PatientRecord {
  patientId: string;
  age: number;
  gender: string;
  baselineData: Record<string, any>;
  timePointData: Array<{
    timePoint: string;
    date: string;
    measurements: Record<string, any>;
  }>;
  adverseEvents: string[];
  completed: boolean;
}

export default function PracticeDataCollectionPage() {
  const navigate = useNavigate();
  const { practiceDataId } = useParams();
  const [activePracticeDataId, setActivePracticeDataId] = useState<string>(practiceDataId || '');

  const [step, setStep] = useState<'setup' | 'patient-data' | 'review' | 'statistics'>('setup');
  const [entryMode, setEntryMode] = useState<'csv' | 'manual'>('csv');

  // Basic Setup State
  const [setup, setSetup] = useState({
    title: '',
    description: '',
    studyType: 'case-series' as const,
    condition: { name: '', description: '' },
    intervention: {
      name: '',
      description: '',
      protocol: '',
      duration: '',
      frequency: '',
    },
    population: {
      totalCount: 0,
      ageRange: { min: 0, max: 100 },
      demographics: '',
    },
    outcomes: [] as Outcome[],
    researchQuality: {
      ethicalApprovalObtained: false,
      patientConsentObtained: false,
      dataPrivacyEnsured: false,
    },
    targetDiscipline: 'medicine' as const,
  });

  // Patient Data Collection State
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [currentPatient, setCurrentPatient] = useState<PatientRecord>({
    patientId: '',
    age: 0,
    gender: '',
    baselineData: {},
    timePointData: [],
    adverseEvents: [],
    completed: true,
  });

  const [newOutcome, setNewOutcome] = useState<Outcome>({
    name: '',
    type: 'numeric',
    unit: '',
    measurementMethod: '',
    isPrimary: false,
  });

  const [timePoints, setTimePoints] = useState<string[]>(['Baseline']);
  const [newTimePoint, setNewTimePoint] = useState('');

  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [importingCSV, setImportingCSV] = useState(false);

  // Initialize baseline data for outcomes
  useEffect(() => {
    const baselineData: Record<string, any> = {};
    setup.outcomes.forEach((outcome) => {
      baselineData[outcome.name] = '';
    });
    setCurrentPatient((prev) => ({
      ...prev,
      baselineData,
    }));
  }, [setup.outcomes]);

  /**
   * Step 1: Setup - Add outcome measure
   */
  const handleAddOutcome = () => {
    if (!newOutcome.name.trim()) {
      toast.error('Outcome name is required');
      return;
    }

    setSetup((prev) => ({
      ...prev,
      outcomes: [...prev.outcomes, newOutcome],
    }));

    setNewOutcome({
      name: '',
      type: 'numeric',
      unit: '',
      measurementMethod: '',
      isPrimary: false,
    });

    toast.success('Outcome added');
  };

  /**
   * Step 1: Setup - Remove outcome
   */
  const handleRemoveOutcome = (outcomeIndex: number) => {
    setSetup((prev) => ({
      ...prev,
      outcomes: prev.outcomes.filter((_, i) => i !== outcomeIndex),
    }));
  };

  /**
   * Step 1: Setup - Save and move to patient data collection
   */
  const handleSaveSetup = async () => {
    if (!setup.title.trim()) {
      toast.error('Study title is required');
      return;
    }

    if (setup.outcomes.length === 0) {
      toast.error('Add at least one outcome measure');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/practice-data', {
        title: setup.title,
        description: setup.description,
        studyType: setup.studyType,
        condition: setup.condition,
        intervention: setup.intervention,
        population: setup.population,
        outcomes: setup.outcomes,
        researchQuality: setup.researchQuality,
        targetDiscipline: setup.targetDiscipline,
      });

      const createdId = response?.data?.practiceData?._id || response?.data?._id || '';
      if (createdId) {
        setActivePracticeDataId(createdId);
      }

      toast.success('Study setup saved');
      setStep('patient-data');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save setup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Add Time Point
   */
  const handleAddTimePoint = () => {
    if (!newTimePoint.trim()) {
      toast.error('Time point name is required');
      return;
    }

    if (timePoints.includes(newTimePoint)) {
      toast.error('This time point already exists');
      return;
    }

    setTimePoints([...timePoints, newTimePoint]);
    setNewTimePoint('');
    toast.success('Time point added');
  };

  /**
   * Step 2: Update patient baseline data
   */
  const handleUpdateBaselineValue = (outcomeName: string, value: any) => {
    setCurrentPatient((prev) => ({
      ...prev,
      baselineData: {
        ...prev.baselineData,
        [outcomeName]: value === '' ? null : isNaN(value) ? value : Number(value),
      },
    }));
  };

  /**
   * Step 2: Update patient follow-up data
   */
  const handleUpdateTimePointValue = (
    timePointIndex: number,
    outcomeName: string,
    value: any
  ) => {
    setCurrentPatient((prev) => {
      const newTimePointData = [...prev.timePointData];
      if (!newTimePointData[timePointIndex]) {
        newTimePointData[timePointIndex] = {
          timePoint: timePoints[timePointIndex + 1],
          date: new Date().toISOString(),
          measurements: {},
        };
      }

      newTimePointData[timePointIndex].measurements[outcomeName] =
        value === '' ? null : isNaN(value) ? value : Number(value);

      return {
        ...prev,
        timePointData: newTimePointData,
      };
    });
  };

  /**
   * Step 2: Add patient and start new one
   */
  const handleAddPatient = async () => {
    if (!currentPatient.age || !currentPatient.gender) {
      toast.error('Age and gender are required');
      return;
    }

    // Check that baseline data is complete
    const missingBaseline = setup.outcomes.filter(
      (o) => currentPatient.baselineData[o.name] === null || currentPatient.baselineData[o.name] === ''
    );

    if (missingBaseline.length > 0) {
      toast.error(`Missing baseline data for: ${missingBaseline.map((o) => o.name).join(', ')}`);
      return;
    }

    setPatients([...patients, currentPatient]);

    // Reset form for next patient
    const newBaselineData: Record<string, any> = {};
    setup.outcomes.forEach((o) => {
      newBaselineData[o.name] = '';
    });

    setCurrentPatient({
      patientId: `P${patients.length + 1}`,
      age: 0,
      gender: '',
      baselineData: newBaselineData,
      timePointData: [],
      adverseEvents: [],
      completed: true,
    });

    toast.success(`Patient ${patients.length + 1} added`);
  };

  /**
   * Step 2: Submit all patient data and generate statistics
   */
  const handleSubmitPatientData = async () => {
    if (patients.length === 0) {
      toast.error('Add at least one patient');
      return;
    }

    if (!activePracticeDataId) {
      toast.error('Practice data setup not initialized. Please save Step 1 again.');
      return;
    }

    setLoading(true);
    try {
      // Bulk add patient data
      await apiClient.post(`/practice-data/${activePracticeDataId}/patients/bulk`, {
        patients,
      });

      // Generate statistics
      const statsResponse = await apiClient.post(`/practice-data/${activePracticeDataId}/statistics`);

      setStatistics(statsResponse.data);
      setStep('statistics');
      toast.success('Patient data saved and statistics generated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save patient data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Generate manuscript from data
   */
  const handleGenerateManuscript = async () => {
    if (!activePracticeDataId) {
      toast.error('Practice data id missing. Please save setup first.');
      return;
    }

    setLoading(true);
    try {
      // Mark as ready for manuscript
      await apiClient.post(`/practice-data/${activePracticeDataId}/ready-for-manuscript`);

      toast.success('Data is ready! Now generating manuscript...');

      // Navigate to manuscript generation page
      // (You'll create a separate page for this)
      navigate(`/practice-data/${activePracticeDataId}/generate-manuscript`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to prepare for manuscript');
    } finally {
      setLoading(false);
    }
  };

  /**
   * CSV Import - Parse and create multiple practice data entries
   */
  const handleCSVImport = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setImportingCSV(true);
    try {
      const parseCSVRow = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          const next = line[i + 1];

          if (ch === '"' && inQuotes && next === '"') {
            current += '"';
            i++;
            continue;
          }

          if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
          }

          if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
            continue;
          }

          current += ch;
        }

        result.push(current.trim());
        return result;
      };

      const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

      const parseBoolean = (value: string) => {
        const normalized = String(value || '').trim().toLowerCase();
        return ['yes', 'true', '1', 'y'].includes(normalized);
      };

      const normalizeStudyType = (raw: string) => {
        const value = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!value) return 'case-series';
        if (['casereport', 'singlecase'].includes(value)) return 'case-report';
        if (['caseseries', 'series'].includes(value)) return 'case-series';
        if (['observational', 'observationalstudy', 'cohort', 'crosssectional'].includes(value)) {
          return 'observational-study';
        }
        if (['comparative', 'comparativestudy', 'controlled', 'rct', 'trial'].includes(value)) {
          return 'comparative-study';
        }

        return 'case-series';
      };

      const normalizeDiscipline = (raw: string) => {
        const value = String(raw || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\-\s]/g, '')
          .replace(/\s+/g, '-');

        const allowed = new Set([
          'medicine',
          'ayurveda',
          'homeopathy',
          'nursing',
          'public-health',
          'psychology',
          'physiology',
          'pharmacology',
          'nutrition',
          'allied-health',
          'general',
        ]);

        if (allowed.has(value)) return value;

        const aliases: Record<string, string> = {
          rehab: 'allied-health',
          rehabilitation: 'allied-health',
          physiotherapy: 'allied-health',
          'physical-therapy': 'allied-health',
          'mental-health': 'psychology',
          paediatrics: 'medicine',
          pediatrics: 'medicine',
          pediatric: 'medicine',
        };

        return aliases[value] || 'general';
      };

      const normalizeGender = (raw: string) => {
        const value = String(raw || '').trim().toLowerCase();
        if (['m', 'male'].includes(value)) return 'M';
        if (['f', 'female'].includes(value)) return 'F';
        return 'Other';
      };

      const generateSyntheticPatients = (study: any): PatientRecord[] => {
        const total = Number(study?.population?.totalCount) || 1;
        const minAge = Number(study?.population?.ageRange?.min) || 18;
        const maxAge = Number(study?.population?.ageRange?.max) || 65;
        const outcomes: Outcome[] = Array.isArray(study?.outcomes) ? study.outcomes : [];

        const patients: PatientRecord[] = [];

        for (let i = 0; i < total; i++) {
          const baselineData: Record<string, any> = {};
          const endpointMeasurements: Record<string, any> = {};

          outcomes.forEach((outcome, outcomeIndex) => {
            // Deterministic sample values so imports are reproducible
            const baseline = 40 + outcomeIndex * 10 + (i % 9);
            const endpoint = Number((baseline * 1.12).toFixed(2));
            baselineData[outcome.name] = baseline;
            endpointMeasurements[outcome.name] = endpoint;
          });

          const ageRangeSpan = Math.max(1, maxAge - minAge + 1);
          patients.push({
            patientId: `CSV-${i + 1}`,
            age: minAge + (i % ageRangeSpan),
            gender: i % 2 === 0 ? 'F' : 'M',
            baselineData,
            timePointData: [
              {
                timePoint: 'Endline',
                date: new Date().toISOString(),
                measurements: endpointMeasurements,
              },
            ],
            adverseEvents: [],
            completed: true,
          });
        }

        return patients;
      };

      const text = await csvFile.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        toast.error('CSV must have header row and at least one data row');
        setImportingCSV(false);
        return;
      }

      // Parse header
      const headers = parseCSVRow(lines[0]).map((h) => normalizeHeader(h));
      const titleHeaderOptions = ['title', 'studyTitle', 'study title', 'study_name', 'name'].map((h) =>
        normalizeHeader(h)
      );
      const hasTitleHeader = titleHeaderOptions.some((h) => headers.includes(h));

      if (!hasTitleHeader) {
        toast.error('CSV missing required title column (e.g., Study Title or title)');
        setImportingCSV(false);
        return;
      }

      // Parse data rows
      const parsedRows: Array<{
        study: any;
        patient?: {
          patientId: string;
          age: number;
          gender: string;
          outcomeName: string;
          baselineValue: number | null;
          endlineValue: number | null;
          completed: boolean;
          adverseEvents: string[];
          timePoint: string;
        };
      }> = [];
      let skippedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i]);
        if (values.every((v) => !v)) continue; // Skip empty lines

        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        const pick = (...keys: string[]) => {
          for (const key of keys) {
            const value = row[normalizeHeader(key)] || '';
            if (value.trim()) return value.trim();
          }
          return '';
        };

        const title = pick('title', 'studyTitle', 'study title', 'study_name', 'name');
        if (!title) {
          skippedRows++;
          continue;
        }

        const totalCountRaw = parseInt(
          pick('totalPatients', 'totalPatientCount', 'total patient count', 'totalCount', 'patients', 'sampleSize', 'n')
        );
        const minAgeRaw = parseInt(pick('minAge', 'minimumAge', 'minimum age years', 'ageMin'));
        const maxAgeRaw = parseInt(pick('maxAge', 'maximumAge', 'maximum age years', 'ageMax'));

        const totalCount = Number.isFinite(totalCountRaw) && totalCountRaw > 0 ? totalCountRaw : 1;
        const minAge = Number.isFinite(minAgeRaw) && minAgeRaw >= 0 ? minAgeRaw : 18;
        const maxAgeCandidate = Number.isFinite(maxAgeRaw) && maxAgeRaw >= 0 ? maxAgeRaw : 65;
        const maxAge = Math.max(maxAgeCandidate, minAge);

        // Parse outcomes from CSV if provided (advanced format)
        const outcomesStr = pick('outcomes', 'outcome', 'primaryOutcome', 'endpoint');
        const outcomeName = pick('outcomeName', 'outcome name');
        const outcomeTypeRaw = pick('outcomeType', 'outcome type').toLowerCase();
        const outcomeType: 'numeric' | 'categorical' | 'qualitative' = ['numeric', 'categorical', 'qualitative'].includes(
          outcomeTypeRaw
        )
          ? (outcomeTypeRaw as 'numeric' | 'categorical' | 'qualitative')
          : 'numeric';
        const outcomeUnit = pick('outcomeUnit', 'outcome unit');
        const outcomeMeasurementMethod = pick('outcomeMeasurementMethod', 'measurementMethod', 'measurement method');
        const outcomeIsPrimary = parseBoolean(pick('outcomeIsPrimary', 'primary outcome'));

        const outcomes: Outcome[] = outcomesStr
          ? outcomesStr.split(';').map((o) => {
              const parts = o.split('|');
              return {
                name: parts[0]?.trim() || 'Primary Outcome',
                type: (parts[1]?.trim() || 'numeric') as 'numeric' | 'categorical' | 'qualitative',
                unit: parts[2]?.trim() || '',
                measurementMethod: parts[3]?.trim() || 'clinical assessment',
                isPrimary: true,
              };
            })
          : outcomeName
            ? [
                {
                  name: outcomeName,
                  type: outcomeType,
                  unit: outcomeUnit || '',
                  measurementMethod: outcomeMeasurementMethod || 'clinical assessment',
                  isPrimary: outcomeIsPrimary,
                },
              ]
          : [
              {
                name: 'Primary Outcome',
                type: 'numeric',
                unit: '',
                measurementMethod: 'clinical assessment',
                isPrimary: true,
              },
            ];

        const study = {
          title,
          description: pick('description', 'summary', 'notes') || '',
          studyType: normalizeStudyType(pick('studyType', 'study_design', 'design', 'type')),
          condition: {
            name: pick('condition', 'conditionName', 'condition name', 'diagnosis', 'treatedCondition') || 'General Condition',
            description: pick('condition_description', 'conditionDescription', 'detailed condition description') || '',
          },
          intervention: {
            name: pick('intervention', 'interventionName', 'intervention name', 'treatment', 'therapy') || '',
            description: pick('intervention_description', 'interventionDescription', 'detailed intervention description') || '',
            protocol: pick('intervention_protocol', 'protocol') || '',
            duration: pick('intervention_duration', 'duration') || '',
            frequency: pick('intervention_frequency', 'frequency') || '',
          },
          population: {
            totalCount,
            ageRange: {
              min: minAge,
              max: maxAge,
            },
            demographics: pick('demographics', 'populationNotes') || '',
          },
          outcomes,
          researchQuality: {
            ethicalApprovalObtained: parseBoolean(pick('ethical_approval', 'ethicalApproval')),
            patientConsentObtained: parseBoolean(pick('patient_consent', 'patientConsent')),
            dataPrivacyEnsured: parseBoolean(pick('data_privacy', 'dataPrivacy')),
          },
          targetDiscipline: normalizeDiscipline(pick('discipline', 'targetDiscipline', 'target discipline') || 'medicine'),
        };

        const baselineRaw = pick('baselineValue', 'baseline value', 'baseline');
        const endlineRaw = pick('endlineValue', 'endline value', 'endpointValue', 'end point value', 'endpoint');
        const parsedBaseline = baselineRaw === '' ? null : Number(baselineRaw);
        const parsedEndline = endlineRaw === '' ? null : Number(endlineRaw);

        const patientId = pick('patientId', 'patient id', 'patient_code', 'patient code');
        const patientAgeRaw = Number(pick('patientAge', 'patient age', 'age'));
        const patientCompleted = parseBoolean(pick('completed', 'studyCompleted', 'study completed'));
        const patientAdverseEventsRaw = pick('adverseEvents', 'adverse events');
        const patientTimePoint = pick('timePoint', 'time point', 'followupTimePoint') || 'Endline';
        const rowOutcomeName = outcomeName || outcomes[0]?.name || 'Primary Outcome';

        const hasPatientRowData =
          !!patientId ||
          Number.isFinite(patientAgeRaw) ||
          baselineRaw !== '' ||
          endlineRaw !== '';

        parsedRows.push({
          study,
          patient: hasPatientRowData
            ? {
                patientId: patientId || '',
                age: Number.isFinite(patientAgeRaw) ? patientAgeRaw : 0,
                gender: normalizeGender(pick('patientGender', 'patient gender', 'gender')),
                outcomeName: rowOutcomeName,
                baselineValue: Number.isFinite(parsedBaseline) ? parsedBaseline : null,
                endlineValue: Number.isFinite(parsedEndline) ? parsedEndline : null,
                completed: patientCompleted,
                adverseEvents: patientAdverseEventsRaw
                  ? patientAdverseEventsRaw
                      .split(';')
                      .map((e) => e.trim())
                      .filter(Boolean)
                  : [],
                timePoint: patientTimePoint,
              }
            : undefined,
        });
      }

      if (parsedRows.length === 0) {
        toast.error('No valid study records found in CSV');
        setImportingCSV(false);
        return;
      }

      // Build study bundles. If patient-level fields are present, use uploaded patient values.
      const studyGroups = new Map<string, typeof parsedRows>();
      for (const row of parsedRows) {
        const key = row.study.title;
        const existing = studyGroups.get(key) || [];
        existing.push(row);
        studyGroups.set(key, existing);
      }

      const studyBundles: Array<{ study: any; patients?: PatientRecord[] }> = [];

      for (const [, rows] of studyGroups) {
        const first = rows[0];
        const patientRows = rows.filter((r) => r.patient);

        if (patientRows.length === 0) {
          studyBundles.push({ study: first.study });
          continue;
        }

        const outcomesMap = new Map<string, Outcome>();
        const patientsMap = new Map<string, PatientRecord>();

        for (let i = 0; i < patientRows.length; i++) {
          const row = patientRows[i];
          const patient = row.patient!;
          const pid = patient.patientId || `CSV-${i + 1}`;
          const outcomeName = patient.outcomeName || first.study.outcomes[0]?.name || 'Primary Outcome';

          if (!outcomesMap.has(outcomeName)) {
            outcomesMap.set(outcomeName, {
              name: outcomeName,
              type: first.study.outcomes[0]?.type || 'numeric',
              unit: first.study.outcomes[0]?.unit || '',
              measurementMethod: first.study.outcomes[0]?.measurementMethod || 'clinical assessment',
              isPrimary: outcomesMap.size === 0,
            });
          }

          if (!patientsMap.has(pid)) {
            const minAge = Number(first.study.population?.ageRange?.min) || 18;
            const maxAge = Number(first.study.population?.ageRange?.max) || 65;

            patientsMap.set(pid, {
              patientId: pid,
              age: patient.age > 0 ? patient.age : minAge,
              gender: patient.gender || 'Other',
              baselineData: {},
              timePointData: [
                {
                  timePoint: patient.timePoint || 'Endline',
                  date: new Date().toISOString(),
                  measurements: {},
                },
              ],
              adverseEvents: patient.adverseEvents || [],
              completed: patient.completed !== false,
            });

            // Guard age upper bound when incoming age is missing
            const p = patientsMap.get(pid)!;
            if (p.age > maxAge) p.age = maxAge;
          }

          const currentPatient = patientsMap.get(pid)!;
          if (patient.baselineValue !== null) {
            currentPatient.baselineData[outcomeName] = patient.baselineValue;
          }
          if (patient.endlineValue !== null) {
            currentPatient.timePointData[0].measurements[outcomeName] = patient.endlineValue;
          }
        }

        const csvPatients = Array.from(patientsMap.values()).filter(
          (p) => Object.keys(p.baselineData || {}).length > 0
        );

        studyBundles.push({
          study: {
            ...first.study,
            outcomes: outcomesMap.size > 0 ? Array.from(outcomesMap.values()) : first.study.outcomes,
            population: {
              ...first.study.population,
              totalCount: csvPatients.length > 0 ? csvPatients.length : first.study.population.totalCount,
            },
          },
          patients: csvPatients.length > 0 ? csvPatients : undefined,
        });
      }

      let successful = 0;
      let failed = 0;
      let lastStats: any = null;
      let lastCreatedId = '';
      let lastStudy: any = null;

      // Create each study, auto-generate patient data, and generate statistics
      for (const bundle of studyBundles) {
        try {
          const study = bundle.study;
          const createRes = await apiClient.post('/practice-data', study);
          const createdId = createRes?.data?.practiceData?._id || createRes?.data?._id;

          if (!createdId) {
            failed++;
            continue;
          }

          const importPatients = bundle.patients && bundle.patients.length > 0 ? bundle.patients : generateSyntheticPatients(study);
          await apiClient.post(`/practice-data/${createdId}/patients/bulk`, { patients: importPatients });
          const statsResponse = await apiClient.post(`/practice-data/${createdId}/statistics`);

          successful++;
          lastStats = statsResponse?.data || null;
          lastCreatedId = createdId;
          lastStudy = study;
        } catch (error: any) {
          failed++;
        }
      }

      toast.success(
        `Imported ${successful} studies${failed > 0 ? `, ${failed} failed` : ''}${skippedRows > 0 ? `, ${skippedRows} skipped (missing title)` : ''}`
      );

      // Jump directly to statistics from CSV flow (skip manual step 1 and step 2)
      if (lastStats && lastCreatedId && lastStudy) {
        setActivePracticeDataId(lastCreatedId);
        setSetup((prev) => ({
          ...prev,
          title: lastStudy.title,
          description: lastStudy.description || '',
          studyType: lastStudy.studyType,
          condition: lastStudy.condition,
          intervention: lastStudy.intervention,
          population: lastStudy.population,
          outcomes: lastStudy.outcomes,
          researchQuality: lastStudy.researchQuality,
          targetDiscipline: lastStudy.targetDiscipline,
        }));
        setTimePoints(['Baseline', 'Endline']);
        setStatistics(lastStats);
        setStep('statistics');
      }

      setCSVFile(null);
      setShowCSVImport(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to import CSV');
    } finally {
      setImportingCSV(false);
    }
  };

  /**
   * Download CSV template
   */
  const downloadCSVTemplate = () => {
    const template = `Study Title,Description,Study Type,Condition Name,Condition Description,Intervention Name,Intervention Description,Total Patient Count,Minimum Age (years),Maximum Age (years),Outcome Name,Outcome Type,Outcome Unit,Measurement Method,Primary Outcome,Ethical Approval Obtained,Patient Consent Obtained,Data Privacy Ensured,Target Discipline
Efficacy of Ayurvedic Treatment for Type 2 Diabetes,Real-world outcomes of insulin therapy,case-series,Type 2 Diabetes,Chronic metabolic disease,Insulin Therapy,Daily insulin injection with monitoring,25,18,75,Blood Glucose Level,numeric,mg/dL,lab test,yes,yes,yes,yes,medicine
Clinical outcomes of herbal medicine in arthritis,Observational outcomes over 8 weeks,observational-study,Rheumatoid Arthritis,Inflammatory joint disease,Ayurvedic Herbal Treatment,Customized herbal formulation,15,45,68,Pain Score,numeric,0-10,Visual Analog Scale,yes,yes,yes,yes,medicine`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'practice-data-standard-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Convert Your Practice Data to Research</h1>
          <p className="text-gray-600 mt-2">
            Step-by-step guide to structure your real-world clinical data into a publishable research manuscript
          </p>
        </div>

        {/* CSV Import Section */}
        <div className="mb-8">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setEntryMode('csv')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                entryMode === 'csv' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              CSV Fast Mode
            </button>
            <button
              onClick={() => setEntryMode('manual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                entryMode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Manual Mode
            </button>
          </div>

          <button
            onClick={() => setShowCSVImport(!showCSVImport)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            {showCSVImport ? '✕ Close CSV Import' : '📊 Bulk Import from CSV'}
          </button>

          {showCSVImport && (
            <div className="mt-4 bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Import Studies from CSV</h3>
              <p className="text-sm text-gray-600">
                Upload your Excel-exported CSV using the standard template. We will auto-create patient records, generate statistics, and skip manual Step 1 and Step 2.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={downloadCSVTemplate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  📥 Download Template
                </button>

                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCSVFile(e.target.files?.[0] || null)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleCSVImport}
                    disabled={!csvFile || importingCSV}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    {importingCSV ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                <p className="font-semibold mb-2">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    <strong>Required columns:</strong> title only
                  </li>
                  <li>
                    <strong>Recommended standard columns (Step 1 complete):</strong> Study Title, Description, Study Type, Condition Name, Condition Description, Intervention Name, Intervention Description, Total Patient Count, Minimum Age (years), Maximum Age (years), Outcome Name, Outcome Type, Outcome Unit, Measurement Method, Primary Outcome, Ethical Approval Obtained, Patient Consent Obtained, Data Privacy Ensured, Target Discipline
                  </li>
                  <li>
                    <strong>Optional patient-level columns (for real statistics):</strong> Patient ID, Patient Age, Patient Gender, Baseline Value, Endline Value, Time Point, Completed, Adverse Events
                  </li>
                  <li>
                    <strong>Optional columns:</strong> description, studyType, condition, condition_description,
                    intervention, intervention_description, intervention_protocol, intervention_duration,
                    intervention_frequency, demographics, discipline, outcomes, ethical_approval, patient_consent, data_privacy
                  </li>
                  <li>Header names are flexible (e.g., totalCount/patients/sampleSize, ageMin/ageMax, diagnosis, treatment)</li>
                  <li>Use "yes" or "true" for boolean fields (ethical_approval, patient_consent, data_privacy)</li>
                  <li><strong>Outcomes format (optional):</strong> Use semicolons to separate multiple outcomes, pipe-delimited: <code className="bg-white px-1">Name|Type|Unit|Method</code><br/>Example: <code className="bg-white px-1">Blood Glucose|numeric|mg/dL|lab test;Pain Score|numeric|0-10|scale</code><br/>If omitted, a default "Primary Outcome" will be created</li>
                  <li>Missing basics auto-fill to defaults: studyType=case-series, condition=General Condition, totalPatients=1, minAge=18, maxAge=65</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {entryMode === 'manual' && (
          <div className="mb-8 flex gap-4">
          {['setup', 'patient-data', 'statistics'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-3 rounded-lg text-center font-medium transition ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : step === 'statistics' || (step === 'patient-data' && s === 'setup')
                    ? 'bg-green-100 text-green-900'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              Step {i + 1}: {s === 'setup' ? 'Study Setup' : s === 'patient-data' ? 'Patient Data' : 'Statistics'}
            </div>
          ))}
          </div>
        )}

        {/* STEP 1: STUDY SETUP */}
        {entryMode === 'manual' && step === 'setup' && (
          <div className="bg-white rounded-lg shadow p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Step 1: Define Your Study</h2>

            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Study Title (e.g., 'Efficacy of Ayurvedic Treatment for Type 2 Diabetes')"
                  value={setup.title}
                  onChange={(e) => setSetup({ ...setup, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />

                <textarea
                  placeholder="Description (optional)"
                  value={setup.description}
                  onChange={(e) => setSetup({ ...setup, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />

                <select
                  value={setup.studyType}
                  onChange={(e) =>
                    setSetup({
                      ...setup,
                      studyType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="case-report">Case Report (1 patient)</option>
                  <option value="case-series">Case Series (2-100 patients)</option>
                  <option value="observational-study">Observational Study (50+ patients)</option>
                  <option value="comparative-study">Comparative Study (with control group)</option>
                </select>
              </div>
            </div>

            {/* Condition & Intervention */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Condition Treated</h3>
                <input
                  type="text"
                  placeholder="Condition name (e.g., 'Type 2 Diabetes')"
                  value={setup.condition.name}
                  onChange={(e) =>
                    setSetup({
                      ...setup,
                      condition: { ...setup.condition, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                />
                <textarea
                  placeholder="Detailed description"
                  value={setup.condition.description}
                  onChange={(e) =>
                    setSetup({
                      ...setup,
                      condition: { ...setup.condition, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Intervention/Practice Given</h3>
                <input
                  type="text"
                  placeholder="Intervention name"
                  value={setup.intervention.name}
                  onChange={(e) =>
                    setSetup({
                      ...setup,
                      intervention: { ...setup.intervention, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                />
                <textarea
                  placeholder="Detailed description of what was done"
                  value={setup.intervention.description}
                  onChange={(e) =>
                    setSetup({
                      ...setup,
                      intervention: { ...setup.intervention, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            {/* Population */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Population</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Patient Count</label>
                  <input
                    type="number"
                    placeholder="e.g., 7"
                    value={setup.population.totalCount}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        population: { ...setup.population, totalCount: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Age (years)</label>
                  <input
                    type="number"
                    placeholder="e.g., 6"
                    value={setup.population.ageRange.min}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        population: {
                          ...setup.population,
                          ageRange: { ...setup.population.ageRange, min: parseInt(e.target.value) || 0 },
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Age (years)</label>
                  <input
                    type="number"
                    placeholder="e.g., 100"
                    value={setup.population.ageRange.max}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        population: {
                          ...setup.population,
                          ageRange: { ...setup.population.ageRange, max: parseInt(e.target.value) || 100 },
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Outcomes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Outcome Measures</h3>
              <p className="text-sm text-gray-600 mb-4">
                What will you measure to evaluate improvement? (e.g., Blood glucose, Pain score, Weight)
              </p>

              <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Outcome name (e.g., 'Blood Glucose Level')"
                  value={newOutcome.name}
                  onChange={(e) => setNewOutcome({ ...newOutcome, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />

                <div className="grid md:grid-cols-3 gap-3">
                  <select
                    value={newOutcome.type}
                    onChange={(e) => setNewOutcome({ ...newOutcome, type: e.target.value as any })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="numeric">Numeric (number)</option>
                    <option value="categorical">Categorical (yes/no)</option>
                    <option value="qualitative">Qualitative (text)</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Unit (e.g., 'mg/dL')"
                    value={newOutcome.unit}
                    onChange={(e) => setNewOutcome({ ...newOutcome, unit: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />

                  <input
                    type="text"
                    placeholder="Measurement method"
                    value={newOutcome.measurementMethod}
                    onChange={(e) => setNewOutcome({ ...newOutcome, measurementMethod: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newOutcome.isPrimary}
                    onChange={(e) => setNewOutcome({ ...newOutcome, isPrimary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Primary outcome?</span>
                </label>

                <button
                  onClick={handleAddOutcome}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Add Outcome
                </button>
              </div>

              {/* Listed Outcomes */}
              <div className="space-y-2">
                {setup.outcomes.map((outcome, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {outcome.name} {outcome.isPrimary ? '(Primary)' : ''}
                      </p>
                      <p className="text-sm text-gray-600">
                        {outcome.unit && `Unit: ${outcome.unit}`} {outcome.measurementMethod && `• ${outcome.measurementMethod}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveOutcome(idx)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Research Quality */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Quality</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={setup.researchQuality.ethicalApprovalObtained}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        researchQuality: {
                          ...setup.researchQuality,
                          ethicalApprovalObtained: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Ethical approval obtained?</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={setup.researchQuality.patientConsentObtained}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        researchQuality: {
                          ...setup.researchQuality,
                          patientConsentObtained: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Patient consent obtained?</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={setup.researchQuality.dataPrivacyEnsured}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        researchQuality: {
                          ...setup.researchQuality,
                          dataPrivacyEnsured: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Data privacy ensured (de-identified)?</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSetup}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Continue to Patient Data'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PATIENT DATA COLLECTION */}
        {entryMode === 'manual' && step === 'patient-data' && (
          <div className="bg-white rounded-lg shadow p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Step 2: Enter Patient Data</h2>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Privacy First:</strong> Use anonymous patient IDs (P1, P2, etc.). Don't enter real names.
                {' '}
                Data is de-identified and HIPAA-compliant.
              </p>
            </div>

            {/* Time Points Setup */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Measurement Time Points</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {timePoints.map((tp, idx) => (
                  <span key={idx} className="bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full text-sm">
                    {tp}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add time point (e.g., '3 months', '6 months')"
                  value={newTimePoint}
                  onChange={(e) => setNewTimePoint(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleAddTimePoint}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Current Patient Form */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Patient #{patients.length + 1}
              </h3>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <input
                  type="number"
                  placeholder="Age"
                  value={currentPatient.age || ''}
                  onChange={(e) =>
                    setCurrentPatient({
                      ...currentPatient,
                      age: parseInt(e.target.value) || 0,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />

                <select
                  value={currentPatient.gender}
                  onChange={(e) =>
                    setCurrentPatient({
                      ...currentPatient,
                      gender: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentPatient.completed}
                    onChange={(e) =>
                      setCurrentPatient({
                        ...currentPatient,
                        completed: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Completed study?</span>
                </label>
              </div>

              {/* Baseline Data */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Baseline (Before Treatment)</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {setup.outcomes.map((outcome) => (
                    <div key={outcome.name}>
                      <label className="block text-sm text-gray-700 mb-1">
                        {outcome.name} {outcome.unit && `(${outcome.unit})`}
                      </label>
                      <input
                        type={outcome.type === 'numeric' ? 'number' : 'text'}
                        placeholder="Enter value"
                        value={currentPatient.baselineData[outcome.name] || ''}
                        onChange={(e) => handleUpdateBaselineValue(outcome.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up Data */}
              {timePoints.length > 1 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Follow-up Measurements</h4>
                  {timePoints.slice(1).map((timePoint, timePointIdx) => (
                    <div key={timePointIdx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-3">{timePoint}</h5>
                      <div className="grid md:grid-cols-2 gap-4">
                        {setup.outcomes.map((outcome) => (
                          <div key={outcome.name}>
                            <label className="block text-sm text-gray-700 mb-1">
                              {outcome.name} {outcome.unit && `(${outcome.unit})`}
                            </label>
                            <input
                              type={outcome.type === 'numeric' ? 'number' : 'text'}
                              placeholder="Enter value"
                              value={
                                currentPatient.timePointData[timePointIdx]?.measurements?.[outcome.name] || ''
                              }
                              onChange={(e) =>
                                handleUpdateTimePointValue(timePointIdx, outcome.name, e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Adverse Events */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Adverse Events (optional, comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mild nausea, Headache"
                  value={currentPatient.adverseEvents.join(', ')}
                  onChange={(e) =>
                    setCurrentPatient({
                      ...currentPatient,
                      adverseEvents: e.target.value.split(',').map((e) => e.trim()),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Add Patient Button */}
              <button
                onClick={handleAddPatient}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 mb-6"
              >
                Add Patient & Continue
              </button>
            </div>

            {/* Patients List */}
            {patients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Added Patients ({patients.length})
                </h3>
                <div className="space-y-2">
                  {patients.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          Patient {idx + 1}: Age {p.age}, {p.gender}
                        </p>
                        <p className="text-sm text-gray-600">
                          {p.completed ? '✓ Completed' : 'Dropped out'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t">
              <button
                onClick={() => setStep('setup')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmitPatientData}
                disabled={loading || patients.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Generate Statistics'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: STATISTICS & GRAPHS */}
        {step === 'statistics' && statistics && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">Step 3: Review Statistics & Prepare Manuscript</h2>

            {/* Completion Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Study Summary</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-blue-600">{setup.population.totalCount}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">{statistics.completionRate || 0}%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Study Duration</p>
                  <p className="text-3xl font-bold text-purple-600">{timePoints.length} timepoints</p>
                </div>
              </div>
            </div>

            {/* Outcomes Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Outcome Measures Summary</h3>

              <div className="space-y-6">
                {statistics.outcomesAnalysis?.map((outcome: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <h4 className="font-semibold text-gray-900">
                      {outcome.outcome} {outcome.unit && `(${outcome.unit})`}
                    </h4>

                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      {/* Baseline */}
                      {outcome.baseline && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm text-gray-600 font-medium">Baseline</p>
                          <p className="text-xl font-bold text-gray-900">{outcome.baseline.mean}</p>
                          <p className="text-xs text-gray-500">
                            Mean ± {outcome.baseline.sd} (n={outcome.baseline.n})
                          </p>
                        </div>
                      )}

                      {/* Endpoint */}
                      {outcome.endpoint && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm text-gray-600 font-medium">End Point</p>
                          <p className="text-xl font-bold text-blue-900">{outcome.endpoint.mean}</p>
                          <p className="text-xs text-gray-500">
                            Mean ± {outcome.endpoint.sd} (n={outcome.endpoint.n})
                          </p>
                        </div>
                      )}

                      {/* Improvement */}
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm text-gray-600 font-medium">Improvement Rate</p>
                        <p className="text-xl font-bold text-green-900">{outcome.improvementRate}%</p>
                        <p className="text-xs text-gray-500">Of completed patients</p>
                      </div>
                    </div>

                    {/* Change Stats */}
                    {outcome.change?.absoluteChange && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                        <p className="text-gray-700">
                          <strong>Mean Change:</strong> {outcome.change.absoluteChange.mean} (±
                          {outcome.change.absoluteChange.sd})
                          {outcome.change.percentageChange && ` • {outcome.change.percentageChange.mean}%`}
                        </p>
                        {outcome.change.pairedTTest && (
                          <p className="text-gray-600 text-xs mt-1">
                            t-test: t = {outcome.change.pairedTTest.tStatistic}, p &lt;{' '}
                            {outcome.change.pairedTTest.pValue}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Adverse Events */}
            {statistics.adverseEventAnalysis && statistics.adverseEventAnalysis.totalEvents > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adverse Events</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-3xl font-bold text-red-600">
                      {statistics.adverseEventAnalysis.totalEvents}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Events per Patient</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {statistics.adverseEventAnalysis.eventsPerPatient}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Manuscript Button */}
            <button
              onClick={handleGenerateManuscript}
              disabled={loading}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-lg"
            >
              {loading ? 'Preparing...' : '→ Generate Manuscript from This Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
