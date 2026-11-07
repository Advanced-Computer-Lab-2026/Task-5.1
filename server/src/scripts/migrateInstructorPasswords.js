import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDB } from '../config/db.js';
import { Instructor } from '../models/Instructor.js';

// Preserve accounts and secrets; only convert existing plaintext passwords.
export async function migrateInstructorPasswords() {
  let updated = 0;
  const cursor = Instructor.find().select('+password').cursor();
  try {
    for await (const instructor of cursor) {
      if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(instructor.password)) continue;
      instructor.markModified('password');
      await instructor.save();
      updated += 1;
    }
  } finally {
    await cursor.close();
  }
  return updated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDB();
    console.log('Hashed passwords for ' + await migrateInstructorPasswords() + ' instructor(s).');
  } catch (err) {
    console.error('Password migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
