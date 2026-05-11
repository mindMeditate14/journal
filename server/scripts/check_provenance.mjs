import { MongoClient, ObjectId } from '/opt/nexusjournal/server/node_modules/mongodb/lib/index.js';
const client = new MongoClient('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
await client.connect();
const db = client.db('journal_db');

// Check the source provenance of the original NexusJournal papers
const ids = ['6a017f58bad7fe84aa659e42', '69f962655e4c17fc2398bf70'];
for (const id of ids) {
  const p = await db.collection('paper').findOne({ _id: new ObjectId(id) });
  console.log('Paper', id);
  console.log('  title:', p?.title?.substring(0, 60));
  console.log('  doi:', p?.doi);
  console.log('  sourceProvenance:', JSON.stringify(p?.sourceProvenance));
  console.log('  publishedAt:', p?.publishedAt);
}

await client.close();
