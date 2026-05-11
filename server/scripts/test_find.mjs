import mongoose from '/opt/nexusjournal/server/node_modules/mongoose/index.js';

await mongoose.connect('mongodb://finscan_admin:OxUWuxuxgBComlfxUlxX@localhost:27017/journal_db?authSource=admin');
console.log('Connected');

const papers = mongoose.connection.db.collection('papers');
const all = await papers.countDocuments();
console.log('Total docs in papers collection:', all);

const raw = await papers.findOne({ _id: new mongoose.Types.ObjectId('6a018d620d3deef04314ee16') });
console.log('Raw findOne for 6a018d620d3deef04314ee16:', raw ? raw.title?.substring(0,50) : 'NULL');

const raw2 = await papers.findOne({ 'sourceProvenance.source': 'manual' });
console.log('Manual paper found:', raw2 ? raw2._id.toString() + ' | doi:' + raw2.doi : 'NULL');

// Now test via Paper model
const { default: Paper } = await import('/opt/nexusjournal/server/src/models/Paper.js');
const found = await Paper.findById('6a018d620d3deef04314ee16').lean();
console.log('Mongoose Paper.findById:', found ? found.title?.substring(0,50) : 'NULL');

const allViaModel = await Paper.countDocuments();
console.log('Paper model count:', allViaModel);

await mongoose.disconnect();
