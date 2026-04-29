import ResearchProject from '../models/ResearchProject.js';
import User from '../models/User.js';

export const listProjects = async (req, res, next) => {
  try {
    const projects = await ResearchProject.find({
      $or: [{ owner: req.userId }, { 'collaborators.userId': req.userId }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await ResearchProject.findOne({
      _id: id,
      $or: [{ owner: req.userId }, { 'collaborators.userId': req.userId }],
    }).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { title, description, tags = [] } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const project = await ResearchProject.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      tags: Array.isArray(tags) ? tags : [],
      owner: req.userId,
      status: 'active',
    });

    // Keep user workspace pointers in sync for existing profile screens.
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { 'workspace.projects': project._id },
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export default {
  listProjects,
  getProjectById,
  createProject,
};