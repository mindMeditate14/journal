// Sync DOIs from manuscripts collection to their corresponding paper records
import { MongoClient, ObjectId } from '/opt/nexusjournal/server/node_modules/mongodb/lib/index.js';
const client = new MongoClient('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
await client.connect();
const db = client.db('journal_db');

const manuscripts = await db.collection('manuscripts').find({ status: 'published', doi: { $exists: true, $ne: null, $ne: '' } }).toArray();
console.log('Published manuscripts with DOI:', manuscripts.length);

for (const m of manuscripts) {
  // Find the corresponding paper — sourceId is stored as string, not ObjectId
  const paper = await db.collection('paper').findOne({
    'sourceProvenance.sourceId': m._id.toString()
  });
  if (!paper) {
    console.log('No paper found for manuscript:', m._id.toString(), m.title?.substring(0, 50));
    continue;
  }
  if (paper.doi === m.doi) {
    console.log('DOI already synced for:', paper._id.toString());
    continue;
  }
  // Update the paper's DOI and PDF urls
  const pdfUrl = m.finalDocument?.url
    ? 'https://journal.mind-meditate.com' + m.finalDocument.url
    : '';

  await db.collection('paper').updateOne(
    { _id: paper._id },
    { $set: {
      doi: m.doi,
      'urls.landing': pdfUrl || paper.urls?.landing,
      'urls.source': pdfUrl || paper.urls?.source,
      'urls.pdf': pdfUrl || paper.urls?.pdf,
      updatedAt: new Date()
    }}
  );
  console.log('Updated paper', paper._id.toString(), 'with doi=' + m.doi, '| title:', paper.title?.substring(0, 50));
}

await client.close();
console.log('Done.');
