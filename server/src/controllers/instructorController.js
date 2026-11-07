import { Instructor } from '../models/Instructor.js';

function publicProfile(doc) {
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

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { username, password } = req.body;

    // 1. Strictly validate that username and password are provided AND are primitive strings
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'username and password must be strings' });
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    // 2. Query database ONLY by username (avoids NoSQL operator injection in queries)
    const instructor = await Instructor.findOne({ username: trimmedUsername });
    if (!instructor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare password with bcrypt hash in memory (never inside a Mongo query)
    const isMatch = await instructor.comparePassword(password);
    if (!isMatch) {
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
    const { name, department } = req.query;

    // Reject searches with no valid criteria
    if (!name && !department) {
      return res.json({ count: 0, instructors: [] });
    }

    const filter = {};
    if (typeof name === 'string' && name.trim()) {
      filter.name = { $regex: escapeRegex(name.trim()), $options: 'i' };
    }
    if (typeof department === 'string' && department.trim()) {
      filter.department = String(department.trim());
    }

    // Exclude all secret/trophy fields from output
    const instructors = await Instructor.find(filter)
      .select('name username department role')
      .lean();

    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}