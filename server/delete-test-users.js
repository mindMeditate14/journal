import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusjournal_db';
const KEEP_EMAIL = 'sivabalan.vellasamy@gmail.com';

await mongoose.connect(MONGO_URI);

const result = await User.deleteMany({ email: { $ne: KEEP_EMAIL } });
console.log(`Deleted ${result.deletedCount} test users.`);

const remaining = await User.find({}, 'email role').lean();
console.log('Remaining users:');
remaining.forEach(u => console.log(`  ${u.email} (${u.role})`));

await mongoose.disconnect();
