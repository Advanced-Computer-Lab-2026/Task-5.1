import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Instructor } from '../models/Instructor.js';

// One-time upgrade for accounts created by the original plaintext seed.
// Use save() so hashing follows the same rules as new accounts.
try {
  await connectDB();
  let migrated = 0;
  for await (const instructor of Instructor.find().select('+password').cursor()) {
    if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(instructor.password)) continue;
    instructor.markModified('password');
    await instructor.save();
    migrated++;
  }
  console.log(`Hashed passwords for ${migrated} existing instructor(s).`);
} catch (err) {
  console.error('Password migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
