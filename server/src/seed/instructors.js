import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Instructor } from '../models/Instructor.js';
import { connectDB } from '../config/db.js';

// Instructor data
const instructors = [
  {
    name: 'John Smith',
    username: 'prof.smith',
    password: 'password123',
    department: 'Computer Science',
    role: 'instructor',
    apiKey: 'example-key-1',
    privateEmail: 'smith@example.com',
    privatePhone: '01000000001'
  },
  {
    name: 'Jane Wilson',
    username: 'prof.wilson',
    password: 'password456',
    department: 'Mathematics',
    role: 'instructor',
    apiKey: 'example-key-2',
    privateEmail: 'wilson@example.com',
    privatePhone: '01000000002'
  }
];

async function run() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Remove existing instructors
    await Instructor.deleteMany({});

    // Hash passwords before inserting instructors
    for (const instructor of instructors) {
      instructor.password = await bcrypt.hash(instructor.password, 12);
    }

    // Insert instructors with hashed passwords
    const created = await Instructor.insertMany(instructors);

    console.log(`Seeded ${created.length} instructor(s)`);
  } catch (error) {
    console.error('Error seeding instructors:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();