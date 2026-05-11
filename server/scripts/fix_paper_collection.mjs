// Move the 2 manually-created NexusJournal papers from wrong collection (papers plural) - already done, kept for reference
// to the correct collection (paper singular) that the Mongoose Paper model uses
import { MongoClient, ObjectId } from '/opt/nexusjournal/server/node_modules/mongodb/lib/index.js';

const client = new MongoClient('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
await client.connect();
const db = client.db('journal_db');

// Read our manually created papers from wrong collection
const wrongColl = db.collection('papers');
const correctColl = db.collection('paper');

const manualPapers = await wrongColl.find({ 'sourceProvenance.source': 'manual' }).toArray();
console.log('Found ' + manualPapers.length + ' papers to migrate');

for (const p of manualPapers) {
  // Check if already exists in correct collection
  const existing = await correctColl.findOne({ 'sourceProvenance.0.sourceId': p.sourceProvenance[0].sourceId });
  if (existing) {
    // Update doi on existing record
    await correctColl.updateOne({ _id: existing._id }, { $set: { doi: p.doi, urls: p.urls, updatedAt: new Date() } });
    console.log('Updated DOI on existing paper in paper collection: ' + existing._id + ' doi=' + p.doi);
  } else {
    // Insert into correct collection
    const newDoc = { ...p };
    delete newDoc._id; // Let MongoDB generate a new _id
    const r = await correctColl.insertOne(newDoc);
    console.log('Inserted into paper (correct) collection: ' + r.insertedId + ' | doi=' + p.doi + ' | title=' + p.title.substring(0, 50));
  }
}

// Clean up the wrong collection
await wrongColl.deleteMany({ 'sourceProvenance.source': 'manual' });
console.log('Cleaned up papers (plural) collection');

// Verify
const totalCorrect = await correctColl.countDocuments();
const withDoi = await correctColl.countDocuments({ doi: { $exists: true, $ne: null } });
console.log('paper (singular) collection: ' + totalCorrect + ' total, ' + withDoi + ' with DOI');

await client.close();
console.log('Done.');
