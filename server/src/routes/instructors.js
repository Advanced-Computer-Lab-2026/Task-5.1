import { Router } from 'express';
import { sanitizeInstructorInput } from '../middleware/instructorInput.js';
import {
  loginInstructor,
  getDirectory,
  searchInstructors
} from '../controllers/instructorController.js';

const router = Router();

router.use(sanitizeInstructorInput);

// The instructor portal is separate from student JWT authentication.
router.post('/login', loginInstructor);
router.get('/', getDirectory);
router.get('/search', searchInstructors);

export default router;
