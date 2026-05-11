import { MongoClient, ObjectId } from '/opt/nexusjournal/server/node_modules/mongodb/lib/index.js';
const client = new MongoClient('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
await client.connect();
const db = client.db('journal_db');

const count = await db.collection('papers').countDocuments({ 'sourceProvenance.source': 'manual' });
console.log('Manual papers count:', count);

const papers = await db.collection('papers').find({ 'sourceProvenance.source': 'manual' }).toArray();
for (const p of papers) {
  console.log('ID:', p._id.toString(), '| doi:', p.doi, '| title:', p.title?.substring(0, 50));
}

await client.close();
