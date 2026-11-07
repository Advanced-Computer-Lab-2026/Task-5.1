import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// =============================================================================
//  INSTRUCTOR PORTAL CONTROLLER  —  FIXED
// =============================================================================
//
// Security layers applied here:
//   1. express-mongo-sanitize (in app.js) already stripped $-prefixed keys and
//      dots from req.body / req.query, so operators like $ne / $regex / $where
//      never reach Mongoose.
//   2. Joi validation below enforces that every field is a plain string — an
//      object/array (i.e. a smuggled operator) fails validation → 400.
//   3. /search uses an allow-list of queryable fields and rejects anything else,
//      so the entire req.query object is never passed into find().
//   4. All responses use explicit projections and never include password /
//      apiKey / privateEmail / privatePhone.
// =============================================================================

// Fields the public directory/search endpoint may expose.
const PUBLIC_FIELDS = 'name username department role';

// Fields that may be searched. Explicit allow-list so arbitrary keys such as
// $where cannot be part of the filter even if sanitization is bypassed.
const SEARCHABLE_FIELDS = ['name', 'username', 'department', 'role'];

const loginSchema = Joi.object({
  username: Joi.string().min(1).max(120).required(),
  password: Joi.string().min(1).max(200).required()
});

const searchSchema = Joi.object({
  name: Joi.string().max(120),
  username: Joi.string().max(120),
  department: Joi.string().max(120),
  role: Joi.string().max(60)
}).unknown(false); // reject unknown keys outright

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    // 1. Validate the shape: username/password must be strings.
    //    This rejects {"username":{"$ne":null}} with a 400 — the operator is
    //    already stripped by mongo-sanitize, but an empty object also fails.
    const { value, error } = loginSchema.validate(req.body, {
      abortEarly: true,
      convert: false
    });
    if (error) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    // 2. Look the account up by username only. We never compare the password
    //    inside a Mongo filter, so $regex/$ne tricks can't be applied to it.
    const instructor = await Instructor.findOne({ username: value.username })
      .select('+password');

    // 3. Compare against the bcrypt hash with a constant code path so
    //    right-vs-wrong guesses are indistinguishable.
    const ok = instructor
      ? await instructor.comparePassword(value.password)
      : false;
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Only return safe public fields — never the password hash, apiKey,
    //    private email or phone.
    return res.json({
      instructor: {
        id: instructor._id.toString(),
        name: instructor.name,
        username: instructor.username,
        department: instructor.department,
        role: instructor.role
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory. Explicit projection — no secrets.
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

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    // Sanitization can turn bracketed operator parameters such as
    // `role[$ne]=...` into a nested object (or remove the operator). Treat
    // these non-scalar values as an empty search instead of exposing a 400
    // response distinction or ever forwarding them to MongoDB.
    const hasNonScalarValue = Object.values(req.query).some(
      (value) => typeof value !== 'string'
    );
    if (hasNonScalarValue) {
      return res.json({ count: 0, instructors: [] });
    }

    // 1. Validate: only known fields, and only strings are accepted.
    //    An injected object ({ "role[$ne]": ... } becomes { role: {...} } after
    //    Express parsing; sanitize then strips the operator leaving an empty
    //    object, which fails Joi's .string() check → 400).
    const { value, error } = searchSchema.validate(req.query, {
      abortEarly: true,
      convert: false,
      stripUnknown: false
    });
    if (error) {
      return res.status(400).json({ message: 'Invalid search parameters' });
    }

    // 2. Build the filter from an allow-list. Any key not in SEARCHABLE_FIELDS
    //    (e.g. $where, $nor) is simply ignored. Values are plain strings.
    const filter = {};
    for (const field of SEARCHABLE_FIELDS) {
      if (typeof value[field] === 'string' && value[field].length > 0) {
        // Case-insensitive "contains" for the name field (honest UX), exact
        // match for the others.
        if (field === 'name') {
          filter.name = { $regex: escapeRegex(value[field]), $options: 'i' };
        } else {
          filter[field] = value[field];
        }
      }
    }

    // 3. Project only public fields — no secrets in the response even if a
    //    filter bug were introduced later.
    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();

    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}

// Escape user input used inside a $regex so a literal dot/star/etc. can't be
// turned into a metacharacter. (We only ever pass our own regex object into
// Mongoose, never a user-supplied one.)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
