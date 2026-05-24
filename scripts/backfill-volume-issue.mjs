/**
 * One-off migration: backfill volume, issue, articleSequence, language,
 * documentType, and articleNumber for all manually-published TMI papers
 * that are missing these fields.
 *
 * Run: node scripts/backfill-volume-issue.mjs
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = 'mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin';
const TMI_FOUNDING_YEAR = 2026; // Vol 1 = 2026

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const client = new MongoClient(MONGO_URI);

async function run() {
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db('journal_db');

  // Find which collection holds the TMI Zenodo papers
  let paperCol = 'paper'; // default to singular (where data actually lives)
  for (const cname of ['papers', 'paper']) {
    const count = await db.collection(cname).countDocuments({ doi: { $regex: 'zenodo', $options: 'i' } });
    if (count > 0) { paperCol = cname; break; }
  }
  console.log(`Using collection: ${paperCol}`);
  const papers = db.collection(paperCol);

  // 1. Find all TMI-published papers — try by manual sourceProvenance first,
  //    then fall back to Zenodo DOI prefix (covers papers created before source tracking)
  let tmiPapers = await papers
    .find({ 'sourceProvenance.source': 'manual' })
    .sort({ publishedAt: 1 })
    .toArray();

  if (tmiPapers.length === 0) {
    console.log('No manual-source papers found — falling back to Zenodo DOI filter');
    tmiPapers = await papers
      .find({ doi: { $regex: '^10\\.5281/zenodo', $options: 'i' } })
      .sort({ publishedAt: 1 })
      .toArray();
  }

  console.log(`\nFound ${tmiPapers.length} TMI paper(s):\n`);
  tmiPapers.forEach(p => console.log(`  • ${p.title} (${p.publishedAt})`));

  if (tmiPapers.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  // 2. Group by volume + issue
  const groups = {};
  for (const paper of tmiPapers) {
    if (!paper.publishedAt) {
      console.warn(`  ⚠ Skipping "${paper.title}" — no publishedAt`);
      continue;
    }
    const pubDate = new Date(paper.publishedAt);
    const volume = pubDate.getFullYear() - TMI_FOUNDING_YEAR + 1;
    const issue  = pubDate.getMonth() + 1;
    const key    = `${volume}-${issue}`;
    if (!groups[key]) groups[key] = { volume, issue, papers: [] };
    groups[key].papers.push(paper);
  }

  // 3. Within each group, assign articleSequence in chronological order
  let totalUpdated = 0;
  for (const { volume, issue, papers: grpPapers } of Object.values(groups)) {
    grpPapers.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

    console.log(`\nVol ${volume}, Issue ${issue} (${MONTH_NAMES[issue]} ${volume + TMI_FOUNDING_YEAR - 1}) — ${grpPapers.length} paper(s):`);

    for (let i = 0; i < grpPapers.length; i++) {
      const paper   = grpPapers[i];
      const seq     = i + 1;
      const pubYear = new Date(paper.publishedAt).getFullYear();

      // Derive articleNumber from sourceProvenance.sourceId (= manuscript._id)
      const manuId = paper.sourceProvenance?.[0]?.sourceId ?? String(paper._id);
      const artNum = `TMI-${pubYear}-${manuId.slice(-4).toUpperCase()}`;

      const update = {
        volume,
        issue,
        articleSequence: seq,
        ...(paper.language     ? {} : { language:     'English' }),
        ...(paper.documentType ? {} : { documentType: 'Research Article' }),
        ...(paper.articleNumber? {} : { articleNumber: artNum }),
      };

      await papers.updateOne({ _id: paper._id }, { $set: update });

      console.log(
        `  [${seq}] "${paper.title.substring(0, 60)}"` +
        `\n       articleNumber=${paper.articleNumber || artNum}` +
        `  language=${paper.language || 'English'}` +
        `  documentType=${paper.documentType || 'Research Article'}` +
        `\n       → Vol ${volume}, Issue ${issue}, Article ${seq} ✓`
      );
      totalUpdated++;
    }
  }

  console.log(`\n✅ Migration complete — ${totalUpdated} paper(s) updated.`);
  await client.close();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
