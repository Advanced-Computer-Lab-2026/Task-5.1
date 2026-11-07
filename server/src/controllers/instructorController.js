import { Instructor } from '../models/Instructor.js';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
// =============================================================================
//  INSTRUCTOR PORTAL CONTROLLER  —  ⚠️ INTENTIONALLY VULNERABLE (security lab)
// =============================================================================
//
// Unlike the review/auth controllers in this project, these handlers do NOT
// validate input with Joi and the app has NO express-mongo-sanitize. They pass
// `req.body` / `req.query` straight into Mongoose. Because Express parses JSON
// bodies and bracket-notation query strings into nested objects, an attacker
// can smuggle MongoDB query operators ($ne, $gt, $regex, $where, ...) into
// what the code treats as plain strings.
//
// This is the bug students must find and fix. Do not "clean this up".
// =============================================================================

function publicProfile(doc) {
  // A successful login is a "trophy": we deliberately return the sensitive
  // fields so a bypass clearly reveals what it compromised.
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role,
   
  };
}

// POST /api/instructors/login
// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const loginSchema = Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required()
    });

    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: 'Invalid username or password format'
      });
    }

    const { username, password } = value;

    const instructor = await Instructor.findOne({ username });

    if (!instructor) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      instructor.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    return res.json({
  instructor: publicProfile(instructor)
});

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
    const searchSchema = Joi.object({
      name: Joi.string().trim().max(100)
    }).unknown(false);

    const { error, value } = searchSchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        message: 'Invalid search parameters'
      });
    }

    const filter = {};

    if (value.name) {
      filter.name = value.name;
    }

    const instructors = await Instructor.find(filter)
      .select('name department role')
      .lean();

    return res.json({
      count: instructors.length,
      instructors
    });

  } catch (err) {
    next(err);
  }
}
