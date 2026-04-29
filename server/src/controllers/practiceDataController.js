import PracticeData from '../models/PracticeData.js';
import StatisticsService from '../services/statisticsService.js';
import logger from '../utils/logger.js';

/**
 * Create a new practice data collection
 */
export const createPracticeData = async (req, res, next) => {
  try {
    const { title, description, studyType, condition, intervention, population, outcomes, targetDiscipline } =
      req.body;

    if (!title || !studyType || !condition?.name || !population?.totalCount || !outcomes?.length) {
      return res.status(400).json({
        error: 'Missing required fields: title, studyType, condition, population, outcomes',
      });
    }

    const practiceData = new PracticeData({
      title,
      description,
      practitioner: req.userId,
      studyType,
      condition,
      intervention,
      population,
      outcomes,
      literatureContext: { targetDiscipline },
      manuscriptStatus: 'collecting',
    });

    await practiceData.save();

    res.status(201).json({
      _id: practiceData._id,
      message: 'Practice data created. Now add patient data.',
      practiceData,
    });
  } catch (error) {
    logger.error('Error creating practice data:', error);
    next(error);
  }
};

/**
 * Get practice data by ID
 */
export const getPracticeData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    // Verify ownership
    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(practiceData);
  } catch (error) {
    logger.error('Error fetching practice data:', error);
    next(error);
  }
};

/**
 * List all practice data for current user
 */
export const listPracticeData = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { practitioner: req.userId };
    if (status) query.manuscriptStatus = status;

    const practiceDataList = await PracticeData.find(query)
      .select('title condition studyType population manuscript Status createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await PracticeData.countDocuments(query);

    res.json({
      practiceData: practiceDataList,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    logger.error('Error listing practice data:', error);
    next(error);
  }
};

/**
 * Add patient-level data
 */
export const addPatientData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { patientId, age, gender, baselineData, timePointData, adverseEvents, completed } = req.body;

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Add patient data
    practiceData.patientData.push({
      patientId: patientId || `P${Date.now()}`, // Generate anonymous ID if not provided
      age,
      gender,
      baselineData,
      timePointData,
      adverseEvents,
      completed: completed !== undefined ? completed : true,
    });

    await practiceData.save();

    res.json({
      message: 'Patient data added',
      patientCount: practiceData.patientData.length,
    });
  } catch (error) {
    logger.error('Error adding patient data:', error);
    next(error);
  }
};

/**
 * Bulk add patient data (CSV import)
 */
export const bulkAddPatientData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { patients } = req.body; // Array of patient objects

    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: 'patients must be a non-empty array' });
    }

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Add all patients
    for (const patient of patients) {
      practiceData.patientData.push({
        patientId: patient.patientId || `P${Date.now()}-${Math.random()}`,
        age: patient.age,
        gender: patient.gender,
        baselineData: patient.baselineData,
        timePointData: patient.timePointData || [],
        adverseEvents: patient.adverseEvents || [],
        completed: patient.completed !== false,
      });
    }

    await practiceData.save();

    res.json({
      message: `${patients.length} patients added`,
      totalPatients: practiceData.patientData.length,
    });
  } catch (error) {
    logger.error('Error bulk adding patient data:', error);
    next(error);
  }
};

/**
 * Generate statistics for practice data
 */
export const generateStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Calculate statistics
    const outcomeAnalysis = StatisticsService.analyzeOutcomes(practiceData);
    const completionRate = StatisticsService.calculateCompletionRate(practiceData.patientData);
    const adverseEventAnalysis = StatisticsService.analyzeAdverseEvents(practiceData);

    // Save statistics to database
    practiceData.statistics = {
      completionRate,
      outcomesStats: outcomeAnalysis,
      adverseEvents: adverseEventAnalysis,
    };

    await practiceData.save();

    res.json({
      statistics: practiceData.statistics,
      outcomesAnalysis: outcomeAnalysis,
      completionRate,
      adverseEventAnalysis,
    });
  } catch (error) {
    logger.error('Error generating statistics:', error);
    next(error);
  }
};

/**
 * Update practice data metadata
 */
export const updatePracticeData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update allowed fields
    const allowedFields = [
      'title',
      'description',
      'affiliation',
      'studyDuration',
      'condition',
      'intervention',
      'hasControlGroup',
      'controlGroupSize',
      'researchQuality',
      'literatureContext',
      'adverseEvents',
      'patientTestimonials',
      'manuscriptStatus',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        practiceData[field] = updates[field];
      }
    }

    await practiceData.save();

    res.json({
      message: 'Practice data updated',
      practiceData,
    });
  } catch (error) {
    logger.error('Error updating practice data:', error);
    next(error);
  }
};

/**
 * Delete practice data
 */
export const deletePracticeData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await PracticeData.findByIdAndDelete(id);

    res.json({ message: 'Practice data deleted' });
  } catch (error) {
    logger.error('Error deleting practice data:', error);
    next(error);
  }
};

/**
 * Mark data as ready for manuscript generation
 */
export const markReadyForManuscript = async (req, res, next) => {
  try {
    const { id } = req.params;

    const practiceData = await PracticeData.findById(id);
    if (!practiceData) {
      return res.status(404).json({ error: 'Practice data not found' });
    }

    if (practiceData.practitioner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate data completeness
    if (!practiceData.patientData || practiceData.patientData.length === 0) {
      return res.status(400).json({ error: 'No patient data available' });
    }

    // Generate statistics if not already done
    if (!practiceData.statistics || practiceData.statistics.outcomesStats.length === 0) {
      const outcomeAnalysis = StatisticsService.analyzeOutcomes(practiceData);
      const completionRate = StatisticsService.calculateCompletionRate(practiceData.patientData);
      const adverseEventAnalysis = StatisticsService.analyzeAdverseEvents(practiceData);

      practiceData.statistics = {
        completionRate,
        outcomesStats: outcomeAnalysis,
        adverseEvents: adverseEventAnalysis,
      };
    }

    practiceData.manuscriptStatus = 'ready-for-draft';

    await practiceData.save();

    res.json({
      message: 'Data marked as ready for manuscript generation',
      statistics: practiceData.statistics,
    });
  } catch (error) {
    logger.error('Error marking data as ready:', error);
    next(error);
  }
};

export default {
  createPracticeData,
  getPracticeData,
  listPracticeData,
  addPatientData,
  bulkAddPatientData,
  generateStatistics,
  updatePracticeData,
  deletePracticeData,
  markReadyForManuscript,
};
