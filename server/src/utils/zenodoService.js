import axios from 'axios';
import logger from './logger.js';

/**
 * Register manuscript with Zenodo and get DOI
 * This uses the free Zenodo API — no cost, instant DOI assignment
 */
export async function registerZenodoDOI(manuscript, journal) {
  const zenodoAPIKey = process.env.ZENODO_API_KEY;
  if (!zenodoAPIKey) {
    throw new Error('ZENODO_API_KEY not configured in environment');
  }

  const zenodoAPI = axios.create({
    baseURL: 'https://zenodo.org/api',
    headers: {
      'Authorization': `Bearer ${zenodoAPIKey}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    logger.info(`📤 Starting Zenodo registration for: ${manuscript.title}`);

    // Step 1: Create deposit record
    logger.info('Creating Zenodo deposit...');
    const recordResponse = await zenodoAPI.post('/deposit/depositions', {
      metadata: {
        title: manuscript.title,
        description: manuscript.abstract,
        creators: manuscript.authors.map(a => ({
          name: a.name,
          affiliation: a.affiliation || '',
          orcid: a.orcid || '',
        })),
        keywords: manuscript.keywords || [],
        license: 'cc-by',
        access_right: 'open',
        publication_type: 'article',
        publication_date: new Date().toISOString().split('T')[0],
        journal_title: journal?.title || 'NexusJournal',
        upload_type: 'publication',
        communities: [{ identifier: 'nexusjournal' }],
      },
    });

    const recordId = recordResponse.data.id;
    logger.info(`✓ Zenodo deposit created: ID ${recordId}`);

    // Step 2: Publish deposit to get DOI
    logger.info('Publishing deposit to get DOI...');
    const publishResponse = await zenodoAPI.post(
      `/deposit/depositions/${recordId}/actions/publish`
    );

    const doi = publishResponse.data.doi;
    const url = publishResponse.data.links.record_html;
    const zenodoId = publishResponse.data.record_id;

    logger.info(`✓ Zenodo DOI assigned: ${doi}`);

    return {
      doi,
      url,
      zenodoId,
      success: true,
    };
  } catch (error) {
    logger.error(`❌ Zenodo API error: ${error.message}`);
    if (error.response?.data) {
      logger.error(`Zenodo response: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to register DOI with Zenodo: ${error.message}`);
  }
}

/**
 * Register DOI with Crossref (optional, for future use)
 * Cost: $300/year — we skip this for MVP
 */
export async function registerCrossrefDOI(manuscript, journal, doi) {
  // For MVP, we skip Crossref registration
  // The free Zenodo DOI is sufficient and automatically indexed by Google Scholar
  logger.info(`⚠️  Skipping Crossref registration (free tier). DOI ${doi} will auto-index.`);
  return { registered: false, reason: 'Skipped for MVP (use free Zenodo registration)' };
}

/**
 * Verify Zenodo API configuration
 */
export async function verifyZenodoConfiguration() {
  const zenodoAPIKey = process.env.ZENODO_API_KEY;

  if (!zenodoAPIKey) {
    logger.warn('⚠️  ZENODO_API_KEY not configured');
    return { configured: false, error: 'ZENODO_API_KEY missing' };
  }

  try {
    const zenodoAPI = axios.create({
      baseURL: 'https://zenodo.org/api',
      headers: {
        'Authorization': `Bearer ${zenodoAPIKey}`,
      },
    });

    // Try to get user info to verify API key
    const response = await zenodoAPI.get('/user');
    logger.info(`✓ Zenodo API configured for: ${response.data.email}`);
    return { configured: true, email: response.data.email };
  } catch (error) {
    logger.error(`❌ Zenodo API verification failed: ${error.message}`);
    return { configured: false, error: error.message };
  }
}

export default {
  registerZenodoDOI,
  registerCrossrefDOI,
  verifyZenodoConfiguration,
};
