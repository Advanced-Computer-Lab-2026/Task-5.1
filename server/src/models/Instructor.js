import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Instructor Portal account.
//
// SECURITY: passwords are stored as bcrypt hashes (pre('save') hook below),
// and the hash is excluded from all query results unless explicitly selected
// with .select('+password') — used only by the login controller to compare.
const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    // Sensitive fields: never returned by directory/search endpoints.
    apiKey: { type: String },
    privateEmail: { type: String },
    privatePhone: { type: String }
  },
  { timestamps: true }
);

// Hash the plain-text password before it is persisted.
instructorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Constant-time-ish comparison helper used by the login controller.
instructorSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
