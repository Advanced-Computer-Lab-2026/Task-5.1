
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const instructorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    department: {
      type: String
    },
    role: {
      type: String,
      default: 'instructor'
    },
    apiKey: {
      type: String,
      select: false
    },
    privateEmail: {
      type: String,
      select: false
    },
    privatePhone: {
      type: String,
      select: false
    }
  },
  { timestamps: true }
);

// Hash passwords before saving an instructor
instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

export const Instructor = mongoose.model(
  'Instructor',
  instructorSchema
);
