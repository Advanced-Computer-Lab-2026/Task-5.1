
import { Instructor } from '../models/Instructor.js';
import Joi from 'joi';
import bcrypt from 'bcryptjs';

function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: 'Invalid username or password format'
      });
    }

    const instructor = await Instructor.findOne({
      username: value.username
    }).select('+password');

    if (!instructor ||
        !(await bcrypt.compare(value.password, instructor.password))) {
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
export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find()
      .select('name department role')
      .sort({ name: 1 })
      .lean();

    return res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructors/search
export async function searchInstructors(req, res, next) {
  try {
    const filter = {};

    // Only allow a validated name string to affect the query.
    // Ignore unknown or malicious search parameters.
    if (typeof req.query.name === 'string') {
      const { error, value } = Joi.string()
        .trim()
        .max(100)
        .validate(req.query.name);

      if (error) {
        return res.status(400).json({
          message: 'Invalid name'
        });
      }

      if (value) {
        filter.name = value;
      }
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
