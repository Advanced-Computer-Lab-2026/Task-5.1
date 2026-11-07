import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    passwordHashed: { type: Boolean, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    apiKey: { type: String, select: false },
    privateEmail: { type: String, select: false },
    privatePhone: { type: String, select: false }
  },
  { timestamps: true }
);

// Use the whole password, including bytes beyond bcrypt's 72-byte input limit.
function passwordInput(password) {
  return createHash('sha256').update(password).digest('base64');
}

export function hashInstructorPassword(password) {
  return bcrypt.hash(passwordInput(password), 10);
}

instructorSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await hashInstructorPassword(this.password);
    this.passwordHashed = true;
  }
});

instructorSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(passwordInput(password), this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
