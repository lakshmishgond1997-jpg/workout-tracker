import express from 'express';
import {
  addBodyweightLog,
  getBodyweight,
  removeBodyweightLog,
} from '../controllers/bodyweight.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getBodyweight);
router.post('/', addBodyweightLog);
router.delete('/:id', removeBodyweightLog);

export default router;
