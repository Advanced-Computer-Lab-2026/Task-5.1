
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Instructor } from '../models/Instructor.js';

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

async function run() {
  try {
    await connectDB();

    // WARNING: Deletes all instructors in the connected database
    await Instructor.deleteMany({});

    // create() runs the password-hashing middleware
    const created = await Instructor.create(instructors);

    console.log(`Seeded ${created.length} instructor(s):`);

    for (const instructor of created) {
      console.log(`  - ${instructor.username} (${instructor.role})`);
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
