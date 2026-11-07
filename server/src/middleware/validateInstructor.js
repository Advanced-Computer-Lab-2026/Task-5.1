import Joi from 'joi';

const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).pattern(/^[a-zA-Z0-9._-]+$/).required(),
  password: Joi.string().min(1).max(128).required()
}).required();

// Joi rejects unknown keys by default, so ?role[$ne]=... or ?$where=... get a 400.
const searchSchema = Joi.object({
  name: Joi.string().trim().max(50).allow(''),
  department: Joi.string().trim().max(50).allow('')
});

const validate = (schema, source) => (req, res, next) => {
  const { value, error } = schema.validate(req[source]);
  if (error) return res.status(400).json({ message: 'Invalid input' });
  req.validated = value; // req.query is read-only in Express 5, so don't overwrite it
  next();
};

export const validateLogin = validate(loginSchema, 'body');
export const validateSearch = validate(searchSchema, 'query');