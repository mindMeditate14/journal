// Quick check: why does Paper.findById fail for our manually inserted papers?
import mongoose from '/opt/nexusjournal/server/node_modules/mongoose/dist/mongoose.js';

await mongoose.connect('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');

// Check with Mongoose model
const Paper = mongoose.model('Paper', new mongoose.Schema({}, { strict: false }));

const id1 = '6a018d620d3deef04314ee15';
const id2 = '6a018d620d3deef04314ee16';
const userQueried = '6a017f58bad7fe84aa659e42';

const p1 = await Paper.findById(id1).lean();
const p2 = await Paper.findById(id2).lean();
const p3 = await Paper.findById(userQueried).lean();

console.log('id1 found:', !!p1, p1 ? p1.doi : 'null');
console.log('id2 found:', !!p2, p2 ? p2.doi : 'null');
console.log('userQueried found:', !!p3, p3 ? JSON.stringify({doi: p3.doi, title: p3.title?.substring(0,50)}) : 'null');

await mongoose.disconnect();
