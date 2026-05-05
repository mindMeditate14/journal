import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusjournal_db';

await mongoose.connect(MONGO_URI);
const users = await User.find({}, 'email name role createdAt').lean();
users.forEach(u => console.log(JSON.stringify({ email: u.email, name: u.name, role: u.role, id: u._id })));
await mongoose.disconnect();
