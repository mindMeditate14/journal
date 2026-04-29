import {
  getPaperById,
  getPaperGraph,
  getRelatedPapers,
  searchPapers,
} from '../services/paperService.js';

export const search = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20, yearFrom, yearTo, openAccess, source } = req.query;
    const data = await searchPapers(
      q,
      { yearFrom, yearTo, openAccess, source },
      Number(page),
      Number(limit)
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await getPaperById(req.params.id);
    res.json(data);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const getGraph = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const data = await getPaperGraph(req.params.id, Number(limit));
    res.json(data);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const getRelated = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const data = await getRelatedPapers(req.params.id, Number(limit));
    res.json({ related: data });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export default {
  search,
  getById,
  getGraph,
  getRelated,
};