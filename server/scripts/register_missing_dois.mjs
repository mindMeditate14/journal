// One-off script: retroactively register Zenodo DOIs for already-published manuscripts
// Run from /opt/nexusjournal/server: node scripts/register_missing_dois.mjs
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';

const ZENODO_API_KEY = process.env.ZENODO_API_KEY;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!ZENODO_API_KEY) { console.error('ZENODO_API_KEY not set'); process.exit(1); }
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

const zenodoAPI = axios.create({
  baseURL: 'https://zenodo.org/api',
  headers: { Authorization: `Bearer ${ZENODO_API_KEY}`, 'Content-Type': 'application/json' },
  timeout: 60000,
});

const client = new MongoClient(MONGO_URI);
await client.connect();
const db = client.db();

// Find all published manuscripts that are missing a DOI
const manuscripts = await db.collection('manuscripts')
  .find({ status: 'published', $or: [{ doi: { $exists: false } }, { doi: null }, { doi: '' }] })
  .toArray();

console.log(`Found ${manuscripts.length} published manuscript(s) without DOI`);

for (const m of manuscripts) {
  const journal = m.journalId
    ? await db.collection('journals').findOne({ _id: m.journalId })
    : null;

  console.log(`\nProcessing [${m._id}]: ${m.title.substring(0, 70)}`);

  if (!m.finalDocument?.url) {
    console.log('  ✗ Skipping: no final PDF URL');
    continue;
  }

  try {
    // Step 1: Create deposit (no communities field)
    const r1 = await zenodoAPI.post('/deposit/depositions', {
      metadata: {
        title: m.title,
        description: m.abstract,
        creators: m.authors.map(a => ({
          name: a.name,
          affiliation: a.affiliation || '',
          orcid: a.orcid || '',
        })),
        keywords: m.keywords || [],
        license: 'cc-by',
        access_right: 'open',
        publication_type: 'article',
        publication_date: new Date(m.publishedAt || Date.now()).toISOString().split('T')[0],
        journal_title: journal?.title || 'NexusJournal',
        upload_type: 'publication',
      },
    });
    const recordId = r1.data.id;
    const bucketUrl = r1.data.links.bucket;
    console.log(`  ✓ Deposit created: ${recordId}`);

    // Step 2: Upload PDF (must use application/octet-stream per Zenodo legacy API)
    // URL may be a relative /uploads/... path — read from disk when available
    let pdfBuffer;
    const pdfUrl = m.finalDocument.url;
    if (pdfUrl.startsWith('/')) {
      // Files are at <server_dir>/../public/uploads/... (matching index.js static mount)
      const diskPath = path.resolve('/opt/nexusjournal/server', '..', 'public', pdfUrl.slice(1));
      pdfBuffer = fs.readFileSync(diskPath);
      console.log(`  ✓ PDF read from disk: ${diskPath} (${Math.round(pdfBuffer.length / 1024)} KB)`);
    } else {
      const r = await axios.get(pdfUrl, { responseType: 'arraybuffer', timeout: 120000 });
      pdfBuffer = r.data;
      console.log('  ✓ PDF fetched from URL');
    }
    await zenodoAPI.put(`${bucketUrl}/manuscript.pdf`, pdfBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${ZENODO_API_KEY}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000,
    });
    console.log('  ✓ PDF uploaded');

    // Step 3: Publish to get DOI (allow 3 min — large PDFs take time to process)
    const r3 = await zenodoAPI.post(`/deposit/depositions/${recordId}/actions/publish`, null, {
      timeout: 180000,
    });
    const doi = r3.data.doi;
    console.log(`  ✓ DOI: ${doi}`);

    // Persist in manuscripts + paper collections
    await db.collection('manuscripts').updateOne(
      { _id: m._id },
      { $set: { doi } }
    );
    await db.collection('paper').updateOne(
      { 'sourceProvenance.0.sourceId': m._id },
      { $set: { doi } }
    );
    console.log('  ✓ Saved to database');
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    if (err.response?.data) {
      console.error('    Zenodo:', JSON.stringify(err.response.data).substring(0, 400));
    }
  }
}

await client.close();
console.log('\nDone.');
