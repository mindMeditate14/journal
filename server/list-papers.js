import 'dotenv/config';
import mongoose from 'mongoose';
import Paper from './src/models/Paper.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusjournal_db';

await mongoose.connect(MONGO_URI);

const total = await Paper.countDocuments();
console.log(`Total papers: ${total}`);

const papers = await Paper.find({}, 'title sourceProvenance.source urls.landing authors').lean();
papers.forEach(p => {
  const hasName = p.authors?.every(a => a.name);
  console.log(JSON.stringify({
    id: p._id,
    title: p.title?.substring(0, 60),
    source: p.sourceProvenance?.[0]?.source,
    landingUrl: p.urls?.landing,
    authorsValid: hasName,
  }));
});

await mongoose.disconnect();
