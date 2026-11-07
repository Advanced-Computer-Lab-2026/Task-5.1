import Joi from 'joi';
import mongoSanitize from 'express-mongo-sanitize';
import { Instructor } from '../models/Instructor.js';

const directoryFields = 'name department role';
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
}).required();
const searchSchema = Joi.object({
  name: Joi.string().allow(''),
  department: Joi.string().allow(''),
  role: Joi.string().allow('')
});

export async function loginInstructor(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body, { convert: false });
    if (error) {
      return res.status(400).json({ message: 'Expected a username and password as strings' });
    }

    const instructor = await Instructor.findOne({
      username: value.username,
      passwordHashed: true
    }).select(`${directoryFields} username +password`);

    if (!instructor || !(await instructor.comparePassword(value.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json({
      instructor: {
        id: instructor.id,
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

export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find()
      .select(directoryFields)
      .sort({ name: 1 })
      .lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

export async function searchInstructors(req, res, next) {
  try {
    // Reject the entire filter rather than broadening the search by stripping keys.
    if (mongoSanitize.has(req.query)) {
      return res.json({ count: 0, instructors: [] });
    }

    const { value, error } = searchSchema.validate(req.query, { convert: false });
    if (error) {
      return res.status(400).json({ message: 'Expected name, department or role as strings' });
    }

    const { name, department, role } = value;
    const filter = {};
    if (department !== undefined) filter.department = department;
    if (role !== undefined) filter.role = role;
    if (name) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escapedName, 'i');
    }
    const instructors = await Instructor.find(filter).select(directoryFields).lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
