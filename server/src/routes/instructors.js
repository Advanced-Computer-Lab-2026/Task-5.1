import { Router } from 'express';
import {
  loginInstructor,
  getDirectory,
  searchInstructors
} from '../controllers/instructorController.js';

const router = Router();

// The Instructor Portal has its own (naive, vulnerable) login — it does NOT use
// the JWT requireAuth middleware. That is intentional for the lab.
router.post('/login', loginInstructor);
router.get('/', getDirectory);
router.get('/search', searchInstructors);

export default router;
