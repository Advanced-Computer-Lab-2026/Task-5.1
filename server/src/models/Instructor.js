import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, enum: ['instructor', 'superadmin'], default: 'instructor' },
    apiKey: { type: String },
    privateEmail: { type: String },
    privatePhone: { type: String }
  },
  { timestamps: true }
);

instructorSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

instructorSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
