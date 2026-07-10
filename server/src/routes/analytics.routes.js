import express from 'express';
import {
  getPrBoard,
  getPrHistory,
  getOverloadChart,
  getVolumeByMuscleGroup,
  getPlateaus,
  getConsistency,
  getPushPullBalance,
  getRatios,
  getBodyweightCorrelation,
  getE1rm,
  getRestVsPerformance,
  getExerciseConsistency,
  getSorenessAnalysis,
  getWarmupEfficiency,
  getSummary,
} from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/summary', getSummary);
router.get('/pr-board', getPrBoard);
router.get('/pr-history/:exerciseId', getPrHistory);
router.get('/overload/:exerciseId', getOverloadChart);
router.get('/volume-by-muscle-group', getVolumeByMuscleGroup);
router.get('/plateaus', getPlateaus);
router.get('/consistency', getConsistency);
router.get('/push-pull-balance', getPushPullBalance);
router.get('/ratios', getRatios);
router.get('/bodyweight-correlation', getBodyweightCorrelation);
router.get('/e1rm', getE1rm);
router.get('/rest-vs-performance', getRestVsPerformance);
router.get('/exercise-consistency', getExerciseConsistency);
router.get('/soreness', getSorenessAnalysis);
router.get('/warmup-efficiency', getWarmupEfficiency);

export default router;
