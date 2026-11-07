import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Instructor, hashInstructorPassword } from '../models/Instructor.js';

// Demo credentials for the Instructor Portal lab.
const instructors = [
  {
    name: 'Prof. Alice Smith',
    username: 'prof.smith',
    password: 'password123',
    department: 'CS',
    role: 'instructor',
    privateEmail: 'alice.smith@university.edu',
    privatePhone: '+1-555-0101'
  },
  {
    name: 'Prof. Brian Jones',
    username: 'prof.jones',
    password: 'mathRules!',
    department: 'Math',
    role: 'instructor',
    privateEmail: 'brian.jones@university.edu',
    privatePhone: '+1-555-0102'
  },
  {
    name: 'Prof. Chen Lee',
    username: 'prof.lee',
    password: 'linalg2024',
    department: 'Math',
    role: 'instructor',
    privateEmail: 'chen.lee@university.edu',
    privatePhone: '+1-555-0103'
  },
  {
    // The high-value target: the only superadmin, holding the API key.
    name: 'Portal Administrator',
    username: 'admin',
    password: 'S3cr3t-Admin-Pw!',
    department: 'IT',
    role: 'superadmin',
    apiKey: 'sk_live_9f3b2c7d8e4a1b6f0d5c2a9e',
    privateEmail: 'root@university.edu',
    privatePhone: '+1-555-0000'
  }
];

async function seed() {
  await Instructor.deleteMany({});
  const created = await Instructor.create(instructors);
  console.log(`Seeded ${created.length} instructor(s):`);
  for (const i of created) {
    console.log(`  - ${i.username} (${i.role})`);
  }
}

async function migratePasswords() {
  const pending = { passwordHashed: { $ne: true } };
  const accounts = Instructor.find(pending).select('_id +password').lean().cursor();
  let migrated = 0;

  for await (const { _id, password } of accounts) {
    const hash = await hashInstructorPassword(password);
    const { modifiedCount } = await Instructor.updateOne(
      { ...pending, _id, password },
      { $set: { password: hash, passwordHashed: true } }
    );
    migrated += modifiedCount;
  }
  console.log(`Migrated ${migrated} instructor password(s).`);
}

async function run() {
  const [option] = process.argv.slice(2);
  if (option !== undefined && option !== '--migrate') {
    throw new Error('Unknown instructor setup option');
  }
  await connectDB();
  try {
    if (option === '--migrate') {
      await migratePasswords();
    } else {
      await seed();
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(() => {
  console.error('Instructor setup failed.');
  process.exitCode = 1;
});
