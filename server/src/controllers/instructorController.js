import { Instructor } from '../models/Instructor.js';
import bcrypt from 'bcryptjs';
import Joi from 'joi';

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required(),
  password: Joi.string().min(1).max(128).required()
}).unknown(false);

const searchSchema = Joi.object({
  name: Joi.string().trim().max(100).allow('').optional()
}).unknown(false);

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
    if (error) return res.status(400).json({ message: 'username and password must be strings' });

    const instructor = await Instructor.findOne({ username: value.username }).select('+password');

    if (!instructor || !(await bcrypt.compare(value.password, instructor.password))) {
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

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    const { value, error } = searchSchema.validate(req.query);
    if (error) return res.status(400).json({ message: 'Only a string name query is supported' });

    const filter = value.name
      ? { name: { $regex: escapeRegex(value.name), $options: 'i' } }
      : {};
    const instructors = await Instructor.find(filter)
      .select('name username department role')
      .sort({ name: 1 })
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
