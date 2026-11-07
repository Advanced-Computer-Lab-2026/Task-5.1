import { Router } from 'express';
import {
  loginInstructor,
  getDirectory,
  searchInstructors
} from '../controllers/instructorController.js';
import { validate, loginSchema, searchSchema } from '../validators/instructor.js';

const router = Router();

router.post('/login', validate(loginSchema), loginInstructor);
router.get('/', getDirectory);
router.get('/search', validate(searchSchema, 'query'), searchInstructors);

export default router;