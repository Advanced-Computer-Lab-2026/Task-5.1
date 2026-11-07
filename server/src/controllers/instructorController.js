import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// =============================================================================
//  INSTRUCTOR PORTAL CONTROLLER  —  hardened against NoSQL injection
// =============================================================================
//
// Two layers of defense:
//   1. express-mongo-sanitize (app.js) strips any `$`-prefixed / dotted keys
//      from req.body / req.query / req.params for every route.
//   2. Joi schemas here enforce the exact shape of each request: only the
//      expected fields, and only as plain strings. An object such as
//      {"$ne": null} (or {} after sanitizing) is rejected with 400.
//
// On top of that:
//   - Login looks the account up by username only and verifies the password
//     with bcrypt in application code, so the password is never part of a DB
//     query (no $regex oracle) and is never stored in plaintext.
//   - Responses use explicit allow-lists of PUBLIC fields; password, apiKey,
//     privateEmail and privatePhone are never returned.
// =============================================================================

// Fields that are safe to show to anyone.
const PUBLIC_FIELDS = 'name username department role';

function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

// Escape user input so it is matched literally inside a RegExp.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required(),
  password: Joi.string().min(1).max(200).required()
});

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'username and password must be non-empty strings' });
    }

    // Query by username only (a validated string); fetch the hash explicitly.
    const instructor = await Instructor.findOne({ username: value.username }).select('+password');

    // Same generic response whether the user is unknown or the password is wrong.
    const ok = instructor && (await instructor.comparePassword(value.password));
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory with limited fields.
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

// Only these query parameters are accepted, and only as strings.
const searchSchema = Joi.object({
  name: Joi.string().trim().max(100),
  department: Joi.string().trim().max(50),
  role: Joi.string().trim().valid('instructor', 'superadmin')
});

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    // Keep only plain-string parameters. Anything else (arrays, or objects such
    // as the `{}` left behind after express-mongo-sanitize strips `role[$ne]`)
    // is ignored rather than ever reaching the query.
    const params = Object.fromEntries(
      Object.entries(req.query).filter(([, v]) => typeof v === 'string')
    );
    const { value, error } = searchSchema.validate(params, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Build the filter ourselves from validated strings — never pass req.query.
    const filter = {};
    if (value.name) filter.name = { $regex: escapeRegex(value.name), $options: 'i' };
    if (value.department) filter.department = value.department;
    if (value.role) filter.role = value.role;

    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
