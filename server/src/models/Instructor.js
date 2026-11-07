import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Instructor Portal account.
// Passwords are hashed in a pre('save') hook. Tests seed with Instructor.create(),
// which runs that hook. apiKey and private contact fields stay on the document
// but are never part of a public response.
const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'
    apiKey: { type: String },
    privateEmail: { type: String },
    privatePhone: { type: String }
  },
  { timestamps: true }
);

instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

instructorSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

export const Instructor = mongoose.model('Instructor', instructorSchema);
