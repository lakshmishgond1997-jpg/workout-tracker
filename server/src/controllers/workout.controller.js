import {
  getAllWorkouts,
  getWorkoutById,
  getExercisesByWorkoutId,
  createWorkout,
  createExercise,
  updateWorkout as updateWorkoutModel,
  deleteWorkout as deleteWorkoutModel,
  updateExercise as updateExerciseModel,
  deleteExercise as deleteExerciseModel,
} from '../models/workout.model.js';

const validateWorkoutInput = (name, description) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Missing required field: name';
  }
  if (name.length > 50) {
    return 'name must be 50 characters or fewer';
  }
  if (description && description.length > 100) {
    return 'description must be 100 characters or fewer';
  }
  return null;
};

const validateExerciseInput = (name, default_sets, default_reps) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Missing required field: name';
  }
  if (!default_sets || !Number.isInteger(Number(default_sets)) || Number(default_sets) <= 0) {
    return 'default_sets must be a positive integer';
  }
  if (!default_reps || typeof default_reps !== 'string' || !default_reps.trim()) {
    return 'Missing required field: default_reps';
  }
  return null;
};

export const getWorkouts = async (req, res) => {
  try {
    const workouts = await getAllWorkouts(req.user.id);
    return res.status(200).json({ workouts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getExercise = async (req, res) => {
  const { id } = req.params;
  try {
    const exercises = await getExercisesByWorkoutId(id, req.user.id);
    return res.status(200).json({ exercises });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addWorkout = async (req, res) => {
  const { name, description } = req.body;

  const validationError = validateWorkoutInput(name, description);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const trimmedDescription = description?.trim() || null;
    const result = await createWorkout(req.user.id, name.trim(), trimmedDescription);
    return res.status(201).json({
      message: 'Workout created successfully',
      workout: { id: result.insertId, name: name.trim(), description: trimmedDescription },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addExercise = async (req, res) => {
  const { id } = req.params;
  const { name, default_sets, default_reps } = req.body;

  const validationError = validateExerciseInput(name, default_sets, default_reps);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const workout = await getWorkoutById(id, req.user.id);
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    const result = await createExercise(
      req.user.id,
      id,
      name.trim(),
      Number(default_sets),
      default_reps.trim()
    );
    return res.status(201).json({
      message: 'Exercise created successfully',
      exercise: {
        id: result.insertId,
        workout_id: Number(id),
        name: name.trim(),
        default_sets: Number(default_sets),
        default_reps: default_reps.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateWorkout = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const validationError = validateWorkoutInput(name, description);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const trimmedDescription = description?.trim() || null;
    const result = await updateWorkoutModel(id, req.user.id, name.trim(), trimmedDescription);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    return res.status(200).json({
      message: 'Workout updated successfully',
      workout: { id: Number(id), name: name.trim(), description: trimmedDescription },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteWorkout = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteWorkoutModel(id, req.user.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    return res.status(200).json({ message: 'Workout deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateExercise = async (req, res) => {
  const { workoutId, exerciseId } = req.params;
  const { name, default_sets, default_reps } = req.body;

  const validationError = validateExerciseInput(name, default_sets, default_reps);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const result = await updateExerciseModel(
      exerciseId,
      req.user.id,
      name.trim(),
      Number(default_sets),
      default_reps.trim()
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    return res.status(200).json({
      message: 'Exercise updated successfully',
      exercise: {
        id: Number(exerciseId),
        workout_id: Number(workoutId),
        name: name.trim(),
        default_sets: Number(default_sets),
        default_reps: default_reps.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteExercise = async (req, res) => {
  const { exerciseId } = req.params;
  try {
    const result = await deleteExerciseModel(exerciseId, req.user.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    return res.status(200).json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
