import { Instructor } from '../models/Instructor.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// What a logged-in instructor sees about themselves. No secrets.
function ownProfile(doc) {
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
    const { username, password } = req.validated; // plain strings, guaranteed by Joi

    const instructor = await Instructor.findOne({ username }).select('+password');
    const ok = instructor && (await instructor.verifyPassword(password));

    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    return res.json({ instructor: ownProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors
export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find()
      .select('name department')
      .sort({ name: 1 })
      .lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors/search?name=Smith&department=CS
export async function searchInstructors(req, res, next) {
  try {
    const { name, department } = req.validated;

    const filter = {};
    if (name) filter.name = { $regex: escapeRegex(name), $options: 'i' };
    if (department) filter.department = department;

    const instructors = await Instructor.find(filter)
      .select('name department')
      .sort({ name: 1 })
      .limit(50)
      .lean();

    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}