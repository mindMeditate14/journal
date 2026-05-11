import { MongoClient } from '/opt/nexusjournal/server/node_modules/mongodb/lib/index.js';
const client = new MongoClient('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
await client.connect();
const db = client.db('journal_db');
const col = db.collection('paper');

// Find duplicates by doi
const dupsByDoi = await col.aggregate([
  { $match: { doi: { $exists: true, $ne: null, $ne: '' } } },
  { $group: { _id: '$doi', count: { $sum: 1 }, ids: { $push: '$_id' }, titles: { $push: '$title' } } },
  { $match: { count: { $gt: 1 } } }
]).toArray();

console.log('Duplicate groups by DOI:', dupsByDoi.length);
for (const d of dupsByDoi) {
  console.log('  DOI:', d._id, '| count:', d.count);
  d.ids.forEach((id, i) => console.log('    ', id.toString(), d.titles[i]?.substring(0,50)));
}

// Find duplicates by normalized title
const dupsByTitle = await col.aggregate([
  { $group: { _id: { $toLower: '$title' }, count: { $sum: 1 }, ids: { $push: '$_id' }, dois: { $push: '$doi' } } },
  { $match: { count: { $gt: 1 } } }
]).toArray();

console.log('Duplicate groups by title:', dupsByTitle.length);
for (const d of dupsByTitle) {
  console.log('  Title:', d._id?.substring(0,60), '| count:', d.count);
  d.ids.forEach((id, i) => console.log('    ', id.toString(), 'doi:', d.dois[i]));
}

await client.close();
