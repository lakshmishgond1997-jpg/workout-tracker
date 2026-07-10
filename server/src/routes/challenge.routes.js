import express from 'express';
import {
  createChallengeHandler,
  respondToChallengeHandler,
  listChallengesHandler,
  activeSummaryHandler,
} from '../controllers/challenge.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/active-summary', activeSummaryHandler);
router.get('/', listChallengesHandler);
router.post('/', createChallengeHandler);
router.patch('/:id/respond', respondToChallengeHandler);

export default router;
