import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { Instructor } from '../models/Instructor.js';

const loginSchema = Joi.object({
  username: Joi.string().max(100).required(),
  // bcrypt uses at most 72 bytes. Never trim or otherwise alter passwords.
  password: Joi.string().required().custom((value, helpers) =>
    Buffer.byteLength(value, 'utf8') <= 72 ? value : helpers.error('any.invalid'))
}).required();
const searchSchema = Joi.object({
  name: Joi.string().max(100).allow(''),
  department: Joi.string().max(100),
  role: Joi.string().valid('instructor', 'superadmin')
}).required();
const validationOptions = { convert: false, abortEarly: false, allowUnknown: false };
const directoryFields = '_id name department role';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function loginInstructor(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, validationOptions);
    if (error) return res.status(400).json({ message: 'Invalid login input' });
    // Only a validated username enters the query; bcrypt verifies the password.
    const instructor = await Instructor.findOne({ username: value.username }).select('+password');
    if (!instructor || !(await bcrypt.compare(value.password, instructor.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ instructor: {
      id: instructor._id.toString(),
      name: instructor.name,
      username: instructor.username,
      department: instructor.department,
      role: instructor.role
    } });
  } catch (err) {
    next(err);
  }
}

export async function getDirectory(req, res, next) {
  try {
    const instructors = await Instructor.find().select(directoryFields).sort({ name: 1 }).lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

export async function searchInstructors(req, res, next) {
  try {
    const { error, value } = searchSchema.validate(req.query, validationOptions);
    if (error) return res.status(400).json({ message: 'Invalid search input' });
    // Build a filter from allowed strings. Search text is literal, not regex code.
    const filter = {};
    if (value.name) filter.name = { $regex: escapeRegex(value.name), $options: 'i' };
    if (value.department) filter.department = value.department;
    if (value.role) filter.role = value.role;
    const instructors = await Instructor.find(filter).select(directoryFields).sort({ name: 1 }).lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
