import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// =============================================================================
//  INSTRUCTOR PORTAL CONTROLLER — hardened against NoSQL injection
// =============================================================================
//
// Two complementary defenses (see also app.js and the Instructor model):
//
//   * express-mongo-sanitize (app.js) strips any key containing `$` or `.` from
//     req.body/query/params. It is a BLANKET operator filter: it removes
//     `$ne`, `$gt`, `$regex`, `$where`, ... but it does NOT understand types or
//     business rules — after sanitizing, `{"username":{"$ne":null}}` is just
//     `{"username":{}}`, still an object where a string belongs.
//
//   * Joi (here) VALIDATES AND TYPES each field: it insists username/password
//     are strings and rejects anything else, and for search it whitelists the
//     exact fields a client may filter on. That is what finally turns the
//     leftover `{}` into a rejected request. Joi is the allow-list; sanitize is
//     the operator scrubber. Neither alone is sufficient — together they are
//     defense in depth.
//
// Secret fields (password/apiKey/privateEmail/privatePhone) are `select:false`
// in the schema, so the directory and search never return them; the owner's own
// profile is opted-in explicitly on a successful, password-verified login.
// =============================================================================

// Only an authenticated owner sees their own private fields; password (the
// bcrypt hash) is never returned.
function ownProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role,
    apiKey: doc.apiKey,
    privateEmail: doc.privateEmail,
    privatePhone: doc.privatePhone
  };
}

// Escape user input so it is matched as a LITERAL string, never as a regex
// pattern the caller controls.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const loginSchema = Joi.object({
  username: Joi.string().min(1).max(100).required(),
  password: Joi.string().min(1).max(200).required()
});

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    // Joi rejects any non-string credential (objects, operators), so a crafted
    // body like {"username":{"$ne":null}} or {"password":{"$regex":"^S"}} is a
    // 400 BEFORE it ever reaches Mongo — and a right vs wrong regex guess are
    // indistinguishable (both rejected), so there is no extraction oracle.
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: 'username and password must be strings' });

    // Look up by username only, then verify the password with bcrypt. Because
    // the stored value is a hash, there is nothing plaintext to $regex against.
    const instructor = await Instructor.findOne({ username: value.username })
      .select('+password +apiKey +privateEmail +privatePhone');

    if (!instructor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await instructor.comparePassword(value.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json({ instructor: ownProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
// Public directory — only ever the safe, non-secret fields.
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

// Only these fields may be filtered on, and only when sent as a plain string.
// Anything else (unknown keys, operator objects, $where) is simply ignored, so
// a tampered query degrades to a harmless "list everyone" rather than leaking.
const SEARCHABLE_FIELDS = ['name', 'department', 'role'];

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    // Build the filter ourselves from whitelisted, string-typed values — never
    // spread raw query input into find(). A non-string value (e.g. the {} left
    // after express-mongo-sanitize strips `role[$ne]`) is dropped, not matched.
    // `name` is a case-insensitive CONTAINS match on an escaped literal so the
    // caller cannot supply their own regex; department/role are exact matches.
    const filter = {};
    for (const field of SEARCHABLE_FIELDS) {
      const raw = req.query[field];
      if (typeof raw !== 'string' || raw.trim() === '') continue;
      const term = raw.trim();
      filter[field] = field === 'name' ? new RegExp(escapeRegex(term), 'i') : term;
    }

    const instructors = await Instructor.find(filter)
      .select('name username department role')
      .sort({ name: 1 })
      .lean();

    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
