import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    // Sensitive trophy fields
    apiKey: { type: String },
    privateEmail: { type: String },
    privatePhone: { type: String }
  },
  { timestamps: true }
);

// Hash password automatically before saving
instructorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Helper to verify passwords securely in memory
instructorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);