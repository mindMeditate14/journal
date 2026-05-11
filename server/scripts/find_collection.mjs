import mongoose from '/opt/nexusjournal/server/node_modules/mongoose/index.js';
await mongoose.connect('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');

const { default: Paper } = await import('/opt/nexusjournal/server/src/models/Paper.js');

console.log('Paper collection name:', Paper.collection.collectionName);
console.log('Paper collection namespace:', Paper.collection.namespace);
console.log('Paper.countDocuments():', await Paper.countDocuments());

// Insert a test doc directly in `paper` (singular) collection
const paperColl = mongoose.connection.db.collection('paper');
const testDoc = await paperColl.findOne({}, { projection: { _id: 1, doi: 1, title: 1 } });
console.log('First doc in paper (singular):', testDoc ? testDoc._id + ' | doi: ' + testDoc.doi + ' | title: ' + testDoc.title?.substring(0, 40) : 'empty');

// Check if our 2 papers exist in paper (singular)
const manualInPaper = await paperColl.countDocuments({ 'sourceProvenance.source': 'manual' });
console.log('Manual papers in paper (singular) collection:', manualInPaper);

await mongoose.disconnect();
