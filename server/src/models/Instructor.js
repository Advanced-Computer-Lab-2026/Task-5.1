import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Instructor Portal account.
//
// Security notes:
// - `password` stores a bcrypt hash, never the plaintext. It is `select: false`
//   so no query returns it unless the code explicitly asks with '+password'.
// - `apiKey` is a secret and is also `select: false`.
// - `privateEmail` / `privatePhone` are private and are never returned by the
//   public endpoints (the controller uses explicit allow-lists of fields).
const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    apiKey: { type: String, select: false },
    privateEmail: { type: String },
    privatePhone: { type: String }
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed.
instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

instructorSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
