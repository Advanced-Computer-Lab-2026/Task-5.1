import { Router } from 'express';
import {
  loginInstructor,
  getDirectory,
  searchInstructors
} from '../controllers/instructorController.js';

const router = Router();

router.post('/login', loginInstructor);
router.get('/', getDirectory);
router.get('/search', searchInstructors);

export default router;
