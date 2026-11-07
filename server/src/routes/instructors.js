import { Router } from 'express';
import {
  loginInstructor,
  getDirectory,
  searchInstructors
} from '../controllers/instructorController.js';
import { validateLogin, validateSearch } from '../middleware/validateInstructor.js';

const router = Router();

router.post('/login', validateLogin, loginInstructor);
router.get('/', getDirectory);
router.get('/search', validateSearch, searchInstructors);

export default router;