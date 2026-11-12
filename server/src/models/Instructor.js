import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Instructor Portal account.
//
// Public fields:  name, department, role (shown in the directory and search).
// Private fields: password, apiKey, privateEmail, privatePhone. They are marked
// `select: false`, so no query returns them unless it asks with `+field`.
const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    // Stores the bcrypt hash, never the plain-text password.
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    apiKey: { type: String, select: false },
    privateEmail: { type: String, select: false },
    privatePhone: { type: String, select: false }
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed.
instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

instructorSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
