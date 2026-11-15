
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
      enum: ['instructor', 'superadmin'],
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

// Avoid hashing a password that is already hashed
function isHashed(password) {
  return typeof password === 'string' &&
    /^\$2[aby]\$\d{2}\$/.test(password);
}

// Hash passwords when saving a document
instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  if (!isHashed(this.password)) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Hash passwords when inserting multiple documents
instructorSchema.pre('insertMany', async function (next, docs) {
  try {
    for (const instructor of docs) {
      if (
        typeof instructor.password === 'string' &&
        !isHashed(instructor.password)
      ) {
        instructor.password = await bcrypt.hash(
          instructor.password,
          10
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

export const Instructor = mongoose.model(
  'Instructor',
  instructorSchema
);
