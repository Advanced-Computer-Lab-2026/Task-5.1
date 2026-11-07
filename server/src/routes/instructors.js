import { Router } from 'express';
import {
  loginInstructor,
  getDirectory,
  searchInstructors
} from '../controllers/instructorController.js';

const router = Router();

// The Instructor Portal has its own login — it does NOT use the JWT
// requireAuth middleware. Input is validated/sanitized in the controller.
router.post('/login', loginInstructor);
router.get('/', getDirectory);
router.get('/search', searchInstructors);

export default router;
