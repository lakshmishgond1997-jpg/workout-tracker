import express from 'express';
import { addSorenessLog, getSoreness } from '../controllers/soreness.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getSoreness);
router.post('/', addSorenessLog);

export default router;
