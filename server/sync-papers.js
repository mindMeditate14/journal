#!/usr/bin/env node
/**
 * Sync published manuscripts to Paper collection
 * Creates Paper records for all published manuscripts that don't have one
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Manuscript from './src/models/Manuscript.js';
import Journal from './src/models/Journal.js';
import Paper from './src/models/Paper.js';
import logger from './src/utils/logger.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusjournal_db';

async function syncPapers() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('✓ Connected to MongoDB');

    // Find all published manuscripts
    const publishedManuscripts = await Manuscript.find({ status: 'published' })
      .populate('journalId', 'title');

    logger.info(`Found ${publishedManuscripts.length} published manuscripts`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const manuscript of publishedManuscripts) {
      try {
        // Check if Paper already exists
        const existingPaper = await Paper.findOne({
          'sourceProvenance.sourceId': manuscript._id,
        });

        if (existingPaper) {
          logger.info(`  ⏭️  Paper exists for: ${manuscript.title}`);
          skipped++;
          continue;
        }

        // Create Paper record
        const paperAuthors = (manuscript.authors || []).map(a => {
          if (typeof a === 'string') {
            return { name: a, affiliation: '', orcid: '' };
          }
          return {
            name: (a.name || '').trim() || 'Unknown Author',
            affiliation: (a.affiliation || '').trim() || '',
            orcid: (a.orcid || '').trim() || '',
          };
        });

        if (paperAuthors.length === 0) {
          paperAuthors.push({ name: 'Unknown Author', affiliation: '', orcid: '' });
        }

        await Paper.create({
          title: manuscript.title || 'Untitled',
          abstract: manuscript.abstract || '',
          authors: paperAuthors,
          publishedAt: manuscript.publishedAt,
          doi: manuscript.doi || undefined,
          journal: {
            name: manuscript.journalId?.title || 'Unknown Journal',
          },
          sourceProvenance: [
            {
              source: 'manual',
              sourceId: manuscript._id,
              confidence: 0.98,
              fetchedAt: new Date(),
            },
          ],
          keywords: manuscript.keywords || [],
          topics: manuscript.metadata?.sectionHeadings || [],
          isOpenAccess: true,
          urls: {
            landing: manuscript.finalDocument?.url || '',
            source: manuscript.finalDocument?.url || '',
            pdf: manuscript.finalDocument?.url || '',
          },
        });

        logger.info(`  ✓ Created Paper for: ${manuscript.title}`);
        created++;
      } catch (error) {
        logger.error(`  ❌ Error for manuscript ${manuscript._id}: ${error.message}`);
        errors++;
      }
    }

    logger.info(`\n=== SYNC COMPLETE ===`);
    logger.info(`Created: ${created}`);
    logger.info(`Skipped: ${skipped}`);
    logger.info(`Errors:  ${errors}`);

    process.exit(0);
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

syncPapers();
