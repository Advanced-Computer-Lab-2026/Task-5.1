import Joi from 'joi';
import { Instructor } from '../models/Instructor.js';

const loginSchema = Joi.object({
  username: Joi.string().max(100).required(),
  password: Joi.string().max(72).custom((value, helpers) => (
    Buffer.byteLength(value, 'utf8') <= 72 ? value : helpers.error('any.invalid')
  )).required()
}).required();

const searchSchema = Joi.object({
  name: Joi.string().max(100).allow(''),
  username: Joi.string().max(100),
  department: Joi.string().max(100),
  role: Joi.string().valid('instructor', 'superadmin')
});

const publicFields = 'name department role';

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
    const { value, error } = loginSchema.validate(req.body, { convert: false });
    if (req.mongoSanitized || error) {
      return res.status(400).json({ message: 'Provide a valid username and password as strings' });
    }
    const instructor = await Instructor.findOne({ username: value.username }).select('+password');
    if (!instructor || !(await instructor.comparePassword(value.password))) {
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
      .select(publicFields).sort({ name: 1 }).lean();
    res.json({ instructors });
  } catch (err) {
    next(err);
  }
}

export async function searchInstructors(req, res, next) {
  try {
    const { value, error } = searchSchema.validate(req.query, { convert: false });
    // Sanitization must never broaden a malicious query into a full directory.
    // Reject unsafe filters without querying the database.
    if (req.mongoSanitized || error) {
      return res.json({ count: 0, instructors: [] });
    }
    const filter = {};
    if (value.name) {
      const literalName = value.name.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
      filter.name = { $regex: literalName, $options: 'i' };
    }
    for (const field of ['username', 'department', 'role']) {
      if (value[field] !== undefined) filter[field] = value[field];
    }
    const instructors = await Instructor.find(filter)
      .select(publicFields).sort({ name: 1 }).lean();
    res.json({ count: instructors.length, instructors });
  } catch (err) {
    next(err);
  }
}
