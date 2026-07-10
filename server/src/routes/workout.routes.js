import express from 'express';
import {
  getWorkouts,
  getExercise,
  addWorkout,
  addExercise,
  updateWorkout,
  deleteWorkout,
  updateExercise,
  deleteExercise,
} from '../controllers/workout.controller.js';

import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getWorkouts);
router.get('/:id/exercises', getExercise);
router.post('/', addWorkout);
router.post('/:id/exercises', addExercise);
router.put('/:id', updateWorkout);
router.delete('/:id', deleteWorkout);
router.put('/:workoutId/exercises/:exerciseId', updateExercise);
router.delete('/:workoutId/exercises/:exerciseId', deleteExercise);

export default router;
