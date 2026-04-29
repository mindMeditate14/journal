import Manuscript from '../models/Manuscript.js';
import Paper from '../models/Paper.js';
import Journal from '../models/Journal.js';
import logger from '../utils/logger.js';
import { registerZenodoDOI } from '../utils/zenodoService.js';

/**
 * Submit new manuscript
 * POST /api/manuscripts
 */
export async function submitManuscript(req, res, next) {
  try {
    const { journalId, title, abstract, keywords, authors, body, discipline, methodology, fundingStatement, conflictOfInterest, dataAvailability } = req.body;

    // Validate required fields
    if (!journalId || !title || !abstract || !authors || !body || !discipline || !methodology) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate title length
    if (title.length < 10 || title.length > 300) {
      return res.status(400).json({ error: 'Title must be 10-300 characters' });
    }

    // Validate abstract length
    if (abstract.length < 50 || abstract.length > 1000) {
      return res.status(400).json({ error: 'Abstract must be 50-1000 characters' });
    }

    // Validate authors
    if (!Array.isArray(authors) || authors.length === 0) {
      return res.status(400).json({ error: 'At least one author required' });
    }

    for (const author of authors) {
      if (!author.name || !author.email) {
        return res.status(400).json({ error: 'Each author must have name and email' });
      }
    }

    // Validate body length (minimum 1000 chars = ~150 words)
    if (body.length < 1000) {
      return res.status(400).json({ error: 'Manuscript body must be at least 1000 characters' });
    }

    // Verify journal exists
    const journal = await Journal.findById(journalId);
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    // Check if journal is open for submissions
    if (!journal.isOpen) {
      return res.status(400).json({ error: 'This journal is not accepting submissions' });
    }

    // Create manuscript
    const manuscript = new Manuscript({
      journalId,
      submittedBy: req.user._id,
      title: title.trim(),
      abstract: abstract.trim(),
      keywords: keywords || [],
      authors,
      body: body.trim(),
      discipline,
      methodology,
      fundingStatement: fundingStatement || '',
      conflictOfInterest: conflictOfInterest || '',
      dataAvailability: dataAvailability || '',
      status: 'submitted',
      submittedAt: new Date(),
    });

    await manuscript.save();

    // Send confirmation email to author
    try {
      await sendSubmissionConfirmationEmail(
        req.user.email,
        authors[0].name,
        manuscript.submissionId,
        title
      );
    } catch (emailErr) {
      logger.warn(`Failed to send submission confirmation email: ${emailErr.message}`);
    }

    res.status(201).json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        submissionId: manuscript.submissionId,
        title: manuscript.title,
        status: manuscript.status,
        submittedAt: manuscript.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get author's submissions
 * GET /api/manuscripts?status=submitted
 */
export async function listManuscripts(req, res, next) {
  try {
    const { status, journalId, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { submittedBy: req.user._id };

    if (status) {
      const statusValues = String(status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      filter.status = statusValues.length > 1 ? { $in: statusValues } : statusValues[0];
    }

    if (journalId) {
      filter.journalId = journalId;
    }

    const manuscripts = await Manuscript.find(filter)
      .populate('journalId', 'title')
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Manuscript.countDocuments(filter);

    res.json({
      manuscripts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get manuscript by ID
 * GET /api/manuscripts/:id
 */
export async function viewManuscript(req, res, next) {
  try {
    const { id } = req.params;

    const manuscript = await Manuscript.findById(id)
      .populate('journalId', 'title scope')
      .populate('submittedBy', 'email name')
      .populate('assignedEditor', 'name email');

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Authorization: author, editor, or admin
    const isAuthor = manuscript.submittedBy._id.toString() === req.user._id.toString();
    const isEditor = manuscript.assignedEditor?._id?.toString() === req.user._id.toString();
    const isJournalOwner = manuscript.journalId.owner?.toString() === req.user._id.toString();
    const isPublished = manuscript.status === 'published';

    if (!isAuthor && !isEditor && !isJournalOwner && !isPublished && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(manuscript);
  } catch (error) {
    next(error);
  }
}

/**
 * Update manuscript (author can edit draft)
 * PATCH /api/manuscripts/:id
 */
export async function updateManuscript(req, res, next) {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findById(id);

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Only author can edit
    if (manuscript.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow editing if status is draft
    if (manuscript.status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit draft manuscripts' });
    }

    const { title, abstract, keywords, authors, body, discipline, methodology, fundingStatement, conflictOfInterest, dataAvailability } = req.body;

    if (title) manuscript.title = title.trim();
    if (abstract) manuscript.abstract = abstract.trim();
    if (keywords) manuscript.keywords = keywords;
    if (authors) manuscript.authors = authors;
    if (body) manuscript.body = body.trim();
    if (discipline) manuscript.discipline = discipline;
    if (methodology) manuscript.methodology = methodology;
    if (fundingStatement !== undefined) manuscript.fundingStatement = fundingStatement;
    if (conflictOfInterest !== undefined) manuscript.conflictOfInterest = conflictOfInterest;
    if (dataAvailability !== undefined) manuscript.dataAvailability = dataAvailability;

    manuscript.updatedAt = new Date();
    await manuscript.save();

    res.json({
      success: true,
      manuscript,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editor: Assign reviewers
 * POST /api/manuscripts/:id/assign-reviewers
 */
export async function assignReviewers(req, res, next) {
  try {
    const { id } = req.params;
    const { reviewerIds } = req.body;

    if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
      return res.status(400).json({ error: 'At least one reviewer required' });
    }

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Check authorization (editor or journal owner)
    const journal = await Journal.findById(manuscript.journalId);
    const isEditor = manuscript.assignedEditor?.toString() === req.user._id.toString() || req.user.role === 'admin';
    const isJournalOwner = journal.owner.toString() === req.user._id.toString();

    if (!isEditor && !isJournalOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Initialize reviews array if not exists
    if (!manuscript.reviews) {
      manuscript.reviews = [];
    }

    // Add reviewer invitations
    for (const reviewerId of reviewerIds) {
      const existingReview = manuscript.reviews.find(r => r.reviewerId.toString() === reviewerId);

      if (!existingReview) {
        manuscript.reviews.push({
          reviewerId,
          reviewerName: '',
          score: null,
          recommendation: null,
          feedback: '',
          isAnonymous: true,
          submittedAt: null,
        });
      }
    }

    manuscript.status = 'under-review';
    await manuscript.save();

    // Send invitation emails (async, non-blocking)
    sendReviewerInvitations(manuscript, reviewerIds).catch(err => {
      logger.warn(`Failed to send reviewer invitations: ${err.message}`);
    });

    res.json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        status: manuscript.status,
        reviewCount: manuscript.reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reviewer: Submit peer review
 * POST /api/manuscripts/:id/reviews
 */
export async function submitPeerReview(req, res, next) {
  try {
    const { id } = req.params;
    const { score, recommendation, feedback } = req.body;

    if (!score || !recommendation || !feedback) {
      return res.status(400).json({ error: 'Score, recommendation, and feedback required' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be 1-5' });
    }

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Find this reviewer's review slot
    const reviewIndex = manuscript.reviews.findIndex(
      r => r.reviewerId.toString() === req.user._id.toString() && !r.submittedAt
    );

    if (reviewIndex === -1) {
      return res.status(400).json({ error: 'No pending review for this reviewer' });
    }

    // Record review
    manuscript.reviews[reviewIndex].score = score;
    manuscript.reviews[reviewIndex].recommendation = recommendation;
    manuscript.reviews[reviewIndex].feedback = feedback;
    manuscript.reviews[reviewIndex].submittedAt = new Date();

    await manuscript.save();

    res.json({
      success: true,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editor: Make editorial decision
 * PATCH /api/manuscripts/:id/decision
 */
export async function makeEditorDecision(req, res, next) {
  try {
    const { id } = req.params;
    const { decision, editorNotes } = req.body;

    if (!['accept', 'minor-revisions', 'major-revisions', 'desk-reject', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Check authorization
    const isEditor = manuscript.assignedEditor?.toString() === req.user._id.toString() || req.user.role === 'admin';
    const journal = await Journal.findById(manuscript.journalId);
    const isJournalOwner = journal.owner.toString() === req.user._id.toString();

    if (!isEditor && !isJournalOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    manuscript.editorDecision = decision;
    manuscript.editorNotes = editorNotes || '';

    // Update status based on decision
    if (decision === 'accept') {
      manuscript.status = 'accepted';
      manuscript.acceptedAt = new Date();
    } else if (['minor-revisions', 'major-revisions'].includes(decision)) {
      manuscript.status = 'revision-requested';
      manuscript.revisionRound = (manuscript.revisionRound || 0) + 1;
    } else if (['desk-reject', 'reject'].includes(decision)) {
      manuscript.status = 'rejected';
    }

    await manuscript.save();

    // Send decision email (async, non-blocking)
    sendDecisionEmail(manuscript, decision, editorNotes).catch(err => {
      logger.warn(`Failed to send decision email: ${err.message}`);
    });

    res.json({
      success: true,
      manuscript: {
        _id: manuscript._id,
        status: manuscript.status,
        decision: manuscript.editorDecision,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Editor: Publish manuscript with DOI
 * POST /api/manuscripts/:id/publish
 */
export async function publishManuscript(req, res, next) {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findById(id).populate('journalId');

    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscript not found' });
    }

    // Check authorization
    const isEditor = req.user.role === 'admin' || manuscript.journalId.owner.toString() === req.user._id.toString();
    if (!isEditor) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only publish accepted manuscripts
    if (manuscript.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted manuscripts can be published' });
    }

    // Validate before publishing
    if (!canPublish(manuscript)) {
      return res.status(400).json({ error: 'Manuscript does not meet publication criteria' });
    }

    try {
      // Register with Zenodo and get DOI
      const doiResult = await registerZenodoDOI(manuscript, manuscript.journalId);

      // Save DOI
      manuscript.doi = doiResult.doi;
      manuscript.publishedAt = new Date();
      manuscript.status = 'published';

      await manuscript.save();

      // Create Paper record for discovery
      await Paper.create({
        title: manuscript.title,
        abstract: manuscript.abstract,
        authors: manuscript.authors.map(a => a.name),
        publishedAt: manuscript.publishedAt,
        doi: manuscript.doi,
        journal: manuscript.journalId.title,
        sourceProvenance: [
          {
            source: 'nexusjournal-submission',
            sourceId: manuscript._id,
            journalTitle: manuscript.journalId.title,
          },
        ],
        keywords: manuscript.keywords,
        discipline: manuscript.discipline,
        openAccess: true,
        pdfUrl: doiResult.url,
      });

      // Send publication email to authors
      sendPublicationEmail(manuscript).catch(err => {
        logger.warn(`Failed to send publication email: ${err.message}`);
      });

      res.json({
        success: true,
        manuscript: {
          _id: manuscript._id,
          title: manuscript.title,
          doi: manuscript.doi,
          url: doiResult.url,
          publishedAt: manuscript.publishedAt,
        },
      });
    } catch (error) {
      logger.error(`DOI registration failed: ${error.message}`);
      return res.status(500).json({ error: 'Failed to register DOI. Please try again.' });
    }
  } catch (error) {
    next(error);
  }
}

// ===== HELPER FUNCTIONS =====

function canPublish(manuscript) {
  return (
    manuscript.title && manuscript.title.length > 10 &&
    manuscript.abstract && manuscript.abstract.length > 50 &&
    manuscript.authors && manuscript.authors.length > 0 &&
    manuscript.authors.every(a => a.name && a.email) &&
    manuscript.body && manuscript.body.length > 1000 &&
    manuscript.discipline
  );
}

/**
 * Send submission confirmation email
 */
async function sendSubmissionConfirmationEmail(email, authorName, submissionId, title) {
  const emailService = (await import('../utils/emailService.js')).default;

  const htmlContent = `
    <h2>Manuscript Submission Received</h2>
    <p>Dear ${authorName},</p>
    <p>Thank you for submitting your manuscript to our journal.</p>
    <p><strong>Submission ID:</strong> ${submissionId}</p>
    <p><strong>Title:</strong> ${title}</p>
    <p>Your manuscript has been received and will be reviewed by our editorial team within 5-7 business days. You can track the status of your submission at any time by logging into your account.</p>
    <p>Best regards,<br/>Editorial Team</p>
  `;

  await emailService.send({
    to: email,
    subject: `Manuscript Received: ${submissionId}`,
    html: htmlContent,
  });
}

/**
 * Send reviewer invitation emails
 */
async function sendReviewerInvitations(manuscript, reviewerIds) {
  const emailService = (await import('../utils/emailService.js')).default;

  const htmlContent = `
    <h2>Review Invitation</h2>
    <p>We invite you to review the following manuscript:</p>
    <p><strong>Title:</strong> ${manuscript.title}</p>
    <p><strong>Authors:</strong> ${manuscript.authors.map(a => a.name).join(', ')}</p>
    <p><strong>Abstract:</strong><br/>${manuscript.abstract}</p>
    <p>Please review this manuscript and provide your feedback within 30 days.</p>
    <p>Thank you for supporting open science!</p>
  `;

  // Note: This would need reviewer emails from the database
  // For now, just log that invitations should be sent
  logger.info(`Reviewer invitations ready to send for ${manuscript.title}`);
}

/**
 * Send editorial decision email
 */
async function sendDecisionEmail(manuscript, decision, notes) {
  const emailService = (await import('../utils/emailService.js')).default;

  let decisionText = '';
  if (decision === 'accept') decisionText = 'ACCEPTED for publication';
  else if (decision === 'minor-revisions') decisionText = 'ACCEPTED with MINOR REVISIONS';
  else if (decision === 'major-revisions') decisionText = 'ACCEPTED with MAJOR REVISIONS';
  else if (decision === 'desk-reject') decisionText = 'DESK REJECTED';
  else if (decision === 'reject') decisionText = 'REJECTED';

  const htmlContent = `
    <h2>Editorial Decision</h2>
    <p>Dear Author,</p>
    <p>The editorial decision on your manuscript "${manuscript.title}" is:</p>
    <p><strong>${decisionText}</strong></p>
    ${notes ? `<p><strong>Editor Notes:</strong><br/>${notes}</p>` : ''}
    <p>Please log into your account for more details and to view reviewer feedback.</p>
  `;

  if (manuscript.submittedBy && manuscript.submittedBy.email) {
    await emailService.send({
      to: manuscript.submittedBy.email,
      subject: `Editorial Decision: ${manuscript.submissionId}`,
      html: htmlContent,
    });
  }
}

/**
 * Send publication email
 */
async function sendPublicationEmail(manuscript) {
  const emailService = (await import('../utils/emailService.js')).default;

  const htmlContent = `
    <h2>Your Article is Published!</h2>
    <p>Dear Author,</p>
    <p>We're pleased to inform you that your article has been published.</p>
    <p><strong>Title:</strong> ${manuscript.title}</p>
    <p><strong>DOI:</strong> ${manuscript.doi}</p>
    <p>Your article is now available online and can be cited using the DOI above.</p>
    <p>Congratulations on your publication!</p>
  `;

  if (manuscript.submittedBy && manuscript.submittedBy.email) {
    await emailService.send({
      to: manuscript.submittedBy.email,
      subject: `Your Article Published: ${manuscript.title}`,
      html: htmlContent,
    });
  }
}
