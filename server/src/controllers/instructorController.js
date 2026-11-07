import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

// Fields a caller is allowed to see. password, apiKey, privateEmail, and
// privatePhone stay in the database and are never copied onto a response.
const PUBLIC_FIELDS = 'name username department role';

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(80).required(),
  password: Joi.string().min(1).max(200).required()
});

// Search only accepts plain strings. Objects (operator injection) fail this
// check and are dropped instead of being sent to MongoDB.
const searchField = Joi.string().trim().max(80);

function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

function plainString(input) {
  if (typeof input !== 'string') return null;
  const { value, error } = searchField.validate(input);
  if (error || value === '') return null;
  return value;
}

// The pattern is built by us, from an already-validated string, with regex
// metacharacters escaped. The client never chooses the operator.
function contains(text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { $regex: escaped, $options: 'i' };
}

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const instructor = await Instructor.findOne({ username: value.username }).select('+password');
    if (!instructor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const matches = await instructor.comparePassword(value.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
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
    const filter = {};
    const name = plainString(req.query.name);
    const username = plainString(req.query.username);
    const department = plainString(req.query.department);
    const role = plainString(req.query.role);

    if (name) filter.name = contains(name);
    if (username) filter.username = contains(username);
    if (department) filter.department = contains(department);
    if (role === 'instructor' || role === 'superadmin') filter.role = role;

    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();

    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
