import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(80).required(),
  password: Joi.string().min(1).max(200).required()
}).unknown(false);

const searchSchema = Joi.object({
  name: Joi.string().trim().max(100),
  department: Joi.string().trim().max(80)
}).unknown(true);

function publicProfile(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    department: doc.department,
    role: doc.role
  };
}

export async function loginInstructor(req, res, next) {
  try {
    const { value, error } = loginSchema.validate(req.body, { convert: true });
    if (error) return res.status(400).json({ message: 'username and password must be strings' });

    const instructor = await Instructor.findOne({ username: value.username }).select('+password');
    if (!instructor || !(await bcrypt.compare(value.password, instructor.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ instructor: publicProfile(instructor) });
  } catch (err) {
    next(err);
  }
}

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

export async function searchInstructors(req, res, next) {
  try {
    const { value, error } = searchSchema.validate(req.query, { convert: true });
    if (error) return res.status(400).json({ message: 'name and department must be strings' });

    const filter = {};
    if (value.name) filter.name = { $regex: value.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (value.department) filter.department = value.department;
    const instructors = await Instructor.find(filter)
      .select('name department role')
      .sort({ name: 1 })
      .lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
