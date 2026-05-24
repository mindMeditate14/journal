import {
  getPaperById,
  getPaperGraph,
  getRelatedPapers,
  searchPapers,
  getCitedByPapers,
} from '../services/paperService.js';
import { buildCoverPdf } from '../utils/coverPageService.js';

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

export const download = async (req, res, next) => {
  try {
    const paper = await getPaperById(req.params.id);
    const safeTitle = (paper.title || 'paper').replace(/[^a-z0-9]/gi, '_').substring(0, 60);
    const pdfBuffer = await buildCoverPdf(paper);
    const inline = req.query.inline === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      inline
        ? `inline; filename="TMI_${safeTitle}.pdf"`
        : `attachment; filename="TMI_${safeTitle}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    // PDFs are binary files — CSP and framing headers are meaningless on them
    // and interfere with Chrome's built-in PDF viewer in iframes.
    if (inline) {
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
    }
    res.end(pdfBuffer);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const getCitedBy = async (req, res, next) => {
  try {
    const papers = await getCitedByPapers(req.params.id);
    res.json({ citedBy: papers });
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
  download,
};