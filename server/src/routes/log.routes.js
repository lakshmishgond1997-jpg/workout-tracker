import express from 'express';
import {
  addLog,
  getLogsByExercise,
  getLogsBySessionDate,
  editLog,
  removeLog,
} from '../controllers/log.controller.js';

import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.post('/', addLog);
router.get('/exercise/:exerciseId', getLogsByExercise);
router.get('/session/:date', getLogsBySessionDate);
router.put('/:logId', editLog);
router.delete('/:logId', removeLog);

export default router;
