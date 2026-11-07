import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, enum: ['instructor', 'superadmin'], default: 'instructor' },
    apiKey: { type: String, select: false },
    privateEmail: { type: String, select: false },
    privatePhone: { type: String, select: false }
  },
  { timestamps: true }
);

instructorSchema.pre('save', async function () {
  if (this.isModified('password')) {
    if (Buffer.byteLength(this.password, 'utf8') > 72) {
      throw new Error('Password must not exceed 72 bytes');
    }
    this.password = await bcrypt.hash(this.password, 12);
  }
});

export const Instructor = mongoose.model('Instructor', instructorSchema);
