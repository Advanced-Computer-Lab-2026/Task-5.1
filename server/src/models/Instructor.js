import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Instructor Portal account.
//
// Secrets are protected by two schema-level measures:
//   1. `password` is stored as a bcrypt HASH (never plaintext), so the blind
//      $regex oracle has nothing meaningful to match against.
//   2. `password` and the "private" fields use `select: false` so they are
//      DENY-BY-DEFAULT: no query returns them unless a handler explicitly opts
//      in with `.select('+field')`. This stops the directory/search endpoints
//      from ever leaking them, even if a future handler forgets to project.
const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    // bcrypt hash; never selected unless a handler explicitly asks for it.
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    // Sensitive fields: only ever returned to the authenticated owner.
    apiKey: { type: String, select: false },
    privateEmail: { type: String, select: false },
    privatePhone: { type: String, select: false }
  },
  { timestamps: true }
);

// Hash the password before saving whenever it has changed. Runs for both
// create() and save(); keeps hashing out of every call site.
instructorSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

instructorSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (typeof candidate !== 'string') return false;
  return bcrypt.compare(candidate, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
