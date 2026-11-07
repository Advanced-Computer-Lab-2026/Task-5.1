import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    // Private: excluded from every query unless explicitly selected.
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

instructorSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);