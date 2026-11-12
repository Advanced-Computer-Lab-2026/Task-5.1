import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// =============================================================================
//  INSTRUCTOR PORTAL CONTROLLER
// =============================================================================
//
// Two layers keep MongoDB operators out of the queries built here:
//
//   1. express-mongo-sanitize (app.js) strips every key that starts with "$" or
//      contains "." from req.body / req.query / req.params, for all routes.
//   2. Joi (below) checks the shape and types this controller expects: login
//      takes exactly two strings, search takes a fixed list of string fields.
//
// Sanitizing alone is not enough: `?password=guess` contains no operator, yet it
// would still let a client filter on a secret field. Only the Joi allow-list
// stops that. Queries are then built from the validated values, never from the
// raw request.
// =============================================================================

// The only fields the directory and search ever return.
const PUBLIC_FIELDS = 'name department role';

const loginSchema = Joi.object({
  username: Joi.string().trim().max(64).required(),
  password: Joi.string().max(128).required()
});

const searchSchema = Joi.object({
  name: Joi.string().trim().max(60).allow(''),
  department: Joi.string().trim().max(60).allow('')
});

// Makes user text safe to use inside a regular expression.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// What a signed-in instructor gets back about their own account. The API key
// and private contact details stay on the server.
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

    // Look the account up by username only, then compare the password against
    // the stored bcrypt hash. The password never takes part in the query.
    const instructor = await Instructor.findOne({ username: value.username }).select('+password');
    const ok = instructor && (await instructor.comparePassword(value.password));
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory.
export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find()
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors/search?name=...&department=...
export async function searchInstructors(req, res, next) {
  try {
    // Parameters outside the allow-list are dropped, so a client can only
    // filter on name and department.
    const { value, error } = searchSchema.validate(req.query, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const filter = {};
    if (value.name) {
      // case-insensitive "contains"
      filter.name = new RegExp(escapeRegex(value.name), 'i');
    }
    if (value.department) {
      // case-insensitive exact match
      filter.department = new RegExp(`^${escapeRegex(value.department)}$`, 'i');
    }

    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
