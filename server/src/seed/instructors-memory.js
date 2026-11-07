// Seeds the instructors into an in-memory MongoDB and keeps it alive
// so you can point the app at it. Ctrl+C to stop.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Instructor } from '../models/Instructor.js';

const instructors = [
  { name: 'Prof. Alice Smith', username: 'prof.smith', password: 'password123',
    department: 'CS', role: 'instructor',
    privateEmail: 'alice.smith@university.edu', privatePhone: '+1-555-0101' },
  { name: 'Prof. Brian Jones', username: 'prof.jones', password: 'mathRules!',
    department: 'Math', role: 'instructor',
    privateEmail: 'brian.jones@university.edu', privatePhone: '+1-555-0102' },
  { name: 'Prof. Chen Lee', username: 'prof.lee', password: 'linalg2024',
    department: 'Math', role: 'instructor',
    privateEmail: 'chen.lee@university.edu', privatePhone: '+1-555-0103' },
  { name: 'Portal Administrator', username: 'admin', password: 'S3cr3t-Admin-Pw!',
    department: 'IT', role: 'superadmin',
    apiKey: 'sk_live_9f3b2c7d8e4a1b6f0d5c2a9e',
    privateEmail: 'root@university.edu', privatePhone: '+1-555-0000' }
];

const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
await mongoose.connect(mongod.getUri());
await Instructor.deleteMany({});
await Instructor.create(instructors); // runs pre('save') → bcrypt hashes
console.log('Seeded at', mongod.getUri());
console.log('Ctrl+C to stop. Keep this terminal open while running the app.');
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
});