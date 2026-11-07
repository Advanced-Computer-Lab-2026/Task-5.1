
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { Instructor } from '../models/Instructor.js';

// Public fields only
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

// Validate login input
const loginSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required(),

  password: Joi.string()
    .min(1)
    .required()
}).required();

// Validate search input
const searchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  username: Joi.string().trim().min(1).max(100),
  department: Joi.string().trim().min(1).max(100),
  role: Joi.string().valid('instructor', 'superadmin')
}).min(1).required();

// POST /api/instructors/login
export async function loginInstructor(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(
      req.body,
      {
        convert: false,
        allowUnknown: false
      }
    );

    if (error) {
      return res.status(400).json({
        message: 'Invalid login input'
      });
    }

    const instructor = await Instructor.findOne({
      username: value.username
    }).select('+password');

    if (!instructor) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const matches = await bcrypt.compare(
      value.password,
      instructor.password
    );

    if (!matches) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: instructor._id.toString(),
        role: instructor.role,
        accountType: 'instructor'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    return res.json({
      token,
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
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();

    return res.json({
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
      {
        convert: false,
        allowUnknown: false
      }
    );

    if (error) {
      return res.status(400).json({
        message: 'Invalid search parameters'
      });
    }

    // Build a safe filter
    const filter = {};

    for (const key of [
      'name',
      'username',
      'department',
      'role'
    ]) {
      if (value[key] !== undefined) {
        filter[key] = value[key];
      }
    }

    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .lean();

    return res.json({
      count: instructors.length,
      instructors
    });

  } catch (err) {
    next(err);
  }
}
