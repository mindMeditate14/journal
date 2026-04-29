import {
  createJournal,
  getJournalById,
  searchJournals,
  updateJournal,
} from '../services/journalService.js';
import logger from '../utils/logger.js';

export const create = async (req, res, next) => {
  try {
    const { title, abstract, content, keywords, authors } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const journal = await createJournal(
      { title, abstract, content, keywords, authors },
      req.userId
    );

    res.status(201).json(journal);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const journal = await getJournalById(id);
    res.json(journal);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const search = async (req, res, next) => {
  try {
    const { q, author, year, page = 1, limit = 20 } = req.query;
    const filters = {
      author,
      year: year ? parseInt(year) : null,
    };

    const result = await searchJournals(q, filters, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const journal = await updateJournal(id, updates, req.userId);
    res.json(journal);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export default { create, getById, search, update };
