
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { Instructor } from '../models/Instructor.js';

// Login validation
const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required(),
  password: Joi.string().min(1).max(256).required()
}).unknown(false);

// Search validation
const searchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
}).unknown(false);

// Only expose approved instructor information
function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

// Escape special characters in user search text
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(
      req.body,
      { convert: false }
    );

    if (error) {
      return res.status(400).json({
        message: 'Invalid login input'
      });
    }

    const { username, password } = value;

    // Only search using the validated username
    const instructor = await Instructor.findOne({
      username: username
    }).select('+password');

    if (!instructor) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Compare plaintext input against stored bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      instructor.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    return res.status(200).json({
      instructor: publicProfile(instructor)
    });

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

    return res.status(200).json({
      instructors
    });

  } catch (err) {
    next(err);
  }
}

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    const { error, value } = searchSchema.validate(
      req.query,
      { convert: false }
    );

    // Unsupported or injected search parameters
    // must never reach the MongoDB query.
    if (error) {
      return res.status(200).json({
        count: 0,
        instructors: []
      });
    }

    const safeName = escapeRegex(value.name);

    const instructors = await Instructor.find({
      name: {
        $regex: safeName,
        $options: 'i'
      }
    })
      .select('name username department role')
      .lean();

    return res.status(200).json({
      count: instructors.length,
      instructors
    });

  } catch (err) {
    next(err);
  }
}
