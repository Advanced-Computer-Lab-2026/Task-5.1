import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    department: { type: String },
    role: { type: String, default: 'instructor' }, // 'instructor' | 'superadmin'

    // Private fields: never returned unless explicitly requested.
    apiKey: { type: String, select: false },
    privateEmail: { type: String, select: false },
    privatePhone: { type: String, select: false }
  },
  { timestamps: true }
);

// Hash on save(). Not triggered by insertMany/updateOne/findOneAndUpdate.
instructorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

instructorSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Safety net if a document is ever serialized by accident.
instructorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.apiKey;
    delete ret.privateEmail;
    delete ret.privatePhone;
    delete ret.__v;
    return ret;
  }
});

export const Instructor = mongoose.model('Instructor', instructorSchema);