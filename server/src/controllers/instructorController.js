import { Instructor } from '../models/Instructor.js';
import Joi from 'joi';

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(80).required(),
  password: Joi.string().min(1).max(128).required()
}).unknown(false);

const searchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100)
});

function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const instructor = await Instructor.findOne({ username: value.username }).select('+password');

    if (!instructor || !(await instructor.comparePassword(value.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory. Deliberately limited fields so the contrast with the
// leaky /search endpoint below is obvious.
export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find()
      .select('name department role')
      .sort({ name: 1 })
      .lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

export async function searchInstructors(req, res, next) {
  try {
    const { value, error } = searchSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: { objects: true }
    });
    if (error) return res.status(400).json({ message: error.message });

    const filter = value.name
      ? { name: { $regex: value.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      : {};
    const instructors = await Instructor.find(filter)
      .select('name department role')
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
