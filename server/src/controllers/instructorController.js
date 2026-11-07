
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { Instructor } from '../models/Instructor.js';

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

    // Jest runs with NODE_ENV=test.
    // Production must provide its own JWT_SECRET.
    const jwtSecret =
      process.env.JWT_SECRET ||
      (
        process.env.NODE_ENV === 'test'
          ? 'task5-test-only-secret-do-not-use-in-production'
          : null
      );

    if (!jwtSecret) {
      return res.status(500).json({
        message: 'Authentication configuration error'
      });
    }

    const token = jwt.sign(
      {
        id: instructor._id.toString(),
        role: instructor.role,
        accountType: 'instructor'
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    return res.status(200).json({
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
    // Explicitly allow only supported string filters.
    // Never pass req.query directly to MongoDB.
    const allowedFields = [
      'name',
      'username',
      'department',
      'role'
    ];

    const filter = {};

    for (const field of allowedFields) {
      const value = req.query[field];

      // Ignore objects, arrays, and injected operators.
      if (typeof value !== 'string') {
        continue;
      }

      if (!value.trim()) {
        continue;
      }

      // Restrict the values to valid text.
      const { error } = Joi.string()
        .trim()
        .min(1)
        .max(100)
        .validate(value, { convert: false });

      if (error) {
        continue;
      }

      filter[field] = value.trim();
    }

    const instructors = await Instructor.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      count: instructors.length,
      instructors
    });

  } catch (err) {
    next(err);
  }
}
