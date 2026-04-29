import Journal from '../models/Journal.js';
import '../models/ClinicalEvidence.js';
import '../models/Reference.js';
import logger from '../utils/logger.js';

export const createJournal = async (journalData, ownerId) => {
  try {
    const journal = new Journal({
      ...journalData,
      owner: ownerId,
    });
    await journal.save();
    logger.info(`✅ Journal created: ${journal._id}`);
    return journal;
  } catch (error) {
    logger.error('Create journal error:', error.message);
    throw error;
  }
};

export const getJournalById = async (journalId) => {
  try {
    const journal = await Journal.findById(journalId)
      .populate('owner', 'profile.firstName profile.lastName email')
      .populate('evidence')
      .populate('citations.refId');
    
    if (!journal) {
      throw { status: 404, message: 'Journal not found' };
    }
    return journal;
  } catch (error) {
    logger.error('Get journal error:', error.message);
    throw error;
  }
};

export const searchJournals = async (query, filters = {}, page = 1, limit = 20) => {
  try {
    const searchFilter = {};

    if (filters.status) {
      searchFilter.status = filters.status;
    }

    if (filters.isOpen !== undefined && filters.isOpen !== null) {
      searchFilter.isOpen = filters.isOpen === true || filters.isOpen === 'true';
    }

    if (query) {
      searchFilter.$text = { $search: query };
    }

    if (filters.author) {
      searchFilter['authors.name'] = new RegExp(filters.author, 'i');
    }

    if (filters.year) {
      searchFilter.publishedAt = {
        $gte: new Date(`${filters.year}-01-01`),
        $lt: new Date(`${filters.year + 1}-01-01`),
      };
    }

    if (filters.keywords) {
      searchFilter.keywords = { $in: filters.keywords };
    }

    const skip = (page - 1) * limit;
    const journals = await Journal.find(searchFilter)
      .skip(skip)
      .limit(limit)
      .sort({ publishedAt: -1 });

    const total = await Journal.countDocuments(searchFilter);

    return { journals, total, page, limit };
  } catch (error) {
    logger.error('Search journals error:', error.message);
    throw error;
  }
};

export const updateJournal = async (journalId, updates, userId) => {
  try {
    const journal = await Journal.findById(journalId);
    
    if (!journal) {
      throw { status: 404, message: 'Journal not found' };
    }

    if (journal.owner.toString() !== userId && journal.status !== 'draft') {
      throw { status: 403, message: 'Cannot edit published journal' };
    }

    Object.assign(journal, updates);
    await journal.save();
    logger.info(`✅ Journal updated: ${journalId}`);
    return journal;
  } catch (error) {
    logger.error('Update journal error:', error.message);
    throw error;
  }
};

export default {
  createJournal,
  getJournalById,
  searchJournals,
  updateJournal,
};
