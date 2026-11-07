import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// Joi enforces the exact shape and types we expect. express-mongo-sanitize
// (in app.js) is the safety net that strips $-operators before we get here.
const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(50).required(),
  password: Joi.string().min(1).max(100).required()
});

// Only these fields are searchable. Any other key (role, username, $where, ...)
// is stripped by stripUnknown when we validate, so it can never reach the query.
const searchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50),
  department: Joi.string().trim().min(1).max(50)
});

// Treat user input as literal text inside a regex.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Only non-secret fields. apiKey, privateEmail, privatePhone, password never leave the server.
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
    const { value, error } = loginSchema.validate(req.body ?? {});
    if (error) return res.status(400).json({ message: 'Invalid input' });

    // Query by username ONLY; the password is never part of the query.
    const instructor = await Instructor.findOne({ username: value.username }).select('+password');

    // Same response whether the user doesn't exist or the password is wrong.
    const ok = instructor ? await instructor.comparePassword(value.password) : false;
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors  (public directory)
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
    // stripUnknown silently drops anything that isn't name/department.
    // A wrong type for name/department (e.g. an object) is still a 400.
    const { value, error } = searchSchema.validate(req.query, { stripUnknown: true });
    if (error) return res.status(400).json({ message: 'Invalid input' });

    // Build the filter ourselves; never pass req.query to find().
    const filter = {};
    if (value.name) {
      filter.name = { $regex: escapeRegex(value.name), $options: 'i' };
    }
    if (value.department) {
      filter.department = { $regex: escapeRegex(value.department), $options: 'i' };
    }

    // .select() guarantees no secret field can ever be returned.
    const instructors = await Instructor.find(filter)
      .select('name department role')
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}