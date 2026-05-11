import { MongoClient, ObjectId } from '/opt/nexusjournal/server/node_modules/mongodb/lib/index.js';
const client = new MongoClient('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
await client.connect();
const db = client.db('journal_db');

// Delete the duplicate papers WITHOUT DOIs (our erroneous migration inserted these)
// The correct originals already have DOIs: 6a017f58bad7fe84aa659e42 and 69f962655e4c17fc2398bf70
const result = await db.collection('paper').deleteMany({
  _id: { $in: [
    new ObjectId('6a01934303aca619e1098374'),
    new ObjectId('6a01934303aca619e1098373')
  ]}
});
console.log('Deleted:', result.deletedCount, 'duplicate papers');

const remaining = await db.collection('paper').countDocuments();
console.log('paper collection now has:', remaining, 'documents');

// Verify the original correct papers still exist
const check1 = await db.collection('paper').findOne({ _id: new ObjectId('6a017f58bad7fe84aa659e42') });
const check2 = await db.collection('paper').findOne({ _id: new ObjectId('69f962655e4c17fc2398bf70') });
console.log('Archetiq paper:', check1 ? 'EXISTS doi=' + check1.doi : 'MISSING');
console.log('Modern Consumption paper:', check2 ? 'EXISTS doi=' + check2.doi : 'MISSING');

await client.close();
