import { Instructor } from '../models/Instructor.js';
import Joi from 'joi';

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(60).required(),
  password: Joi.string().min(1).max(128).required()
}).unknown(false);

const searchSchema = Joi.object({
  name: Joi.string().trim().max(100).allow('').default('')
}).unknown(false);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    const { value, error } = loginSchema.validate(req.body, {
      abortEarly: false,
      convert: false
    });
    if (error) return res.status(400).json({ message: error.message });

    const instructor = await Instructor.findOne({ username: value.username })
      .select('+password');

    if (!instructor || !(await instructor.comparePassword(value.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory: only non-sensitive fields are returned.
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
    // Unknown query keys are discarded, so clients can only search the public
    // name field. Any regex metacharacters are escaped before the server builds
    // its own case-insensitive contains query.
    // Copy only the allow-listed property before validation. Other query keys
    // are ignored and never become part of a database filter.
    const { value, error } = searchSchema.validate({ name: req.query.name }, {
      abortEarly: false,
      convert: false
    });
    if (error) return res.status(400).json({ message: error.message });

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
