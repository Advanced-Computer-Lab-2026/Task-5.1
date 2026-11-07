import Joi from 'joi';

export const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).pattern(/^[a-zA-Z0-9._-]+$/).required(),
  password: Joi.string().min(1).max(128).required()
}).required();

export const searchSchema = Joi.object({
  name: Joi.string().trim().max(50).allow(''),
  department: Joi.string().trim().max(50).allow('')
});

export const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source]);
  if (error) return res.status(400).json({ message: 'Invalid input' });
  req.validated = value;
  next();
};