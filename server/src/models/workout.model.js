import pool from '../config/db.js';

const DEFAULT_WORKOUTS = [
  {
    name: 'Push',
    description: 'Chest and triceps',
    exercises: [
      { name: 'Barbell bench press', default_sets: 5, default_reps: '5' },
      { name: 'Machine chest press', default_sets: 3, default_reps: '10-12' },
      { name: 'DB inclined chest press', default_sets: 3, default_reps: '10-12' },
      { name: 'Machine pec fly', default_sets: 3, default_reps: '12-15' },
      { name: 'Triceps cable pushdown', default_sets: 3, default_reps: '12-15' },
      { name: 'Cable overhead triceps ext', default_sets: 3, default_reps: '12-15' },
    ],
  },
  {
    name: 'Pull',
    description: 'Back and biceps',
    exercises: [
      { name: 'Deadlift', default_sets: 4, default_reps: '5' },
      { name: 'Back machine row', default_sets: 3, default_reps: '10-12' },
      { name: 'Lat pulldown', default_sets: 3, default_reps: '10-12' },
      { name: 'Face pull', default_sets: 3, default_reps: '15' },
      { name: 'Biceps barbell curl', default_sets: 3, default_reps: '10-12' },
      { name: 'Hammer curl', default_sets: 3, default_reps: '12' },
    ],
  },
  {
    name: 'Legs',
    description: 'Quads, hamstrings and glutes',
    exercises: [
      { name: 'Barbell squats', default_sets: 3, default_reps: '10-12' },
      { name: 'Hip thrust', default_sets: 3, default_reps: '10-12' },
      { name: 'Romanian deadlift', default_sets: 3, default_reps: '12' },
      { name: 'Machine leg extension', default_sets: 3, default_reps: '12-15' },
      { name: 'Machine leg curl', default_sets: 3, default_reps: '12-15' },
      { name: 'Calf raises', default_sets: 3, default_reps: '15' },
    ],
  },
  {
    name: 'Shoulders + Core',
    description: 'Shoulders and core',
    exercises: [
      { name: 'Shoulder press', default_sets: 3, default_reps: '10-12' },
      { name: 'Shoulder cable raises', default_sets: 3, default_reps: '15' },
      { name: 'Wood-chops', default_sets: 3, default_reps: '15' },
      { name: 'Cable crunches', default_sets: 3, default_reps: '15' },
      { name: 'Leg raises', default_sets: 3, default_reps: '15' },
    ],
  },
];

export const getAllWorkouts = async (userId) => {
  const [rows] = await pool.execute('SELECT * FROM workouts WHERE user_id = ?', [userId]);
  return rows;
};

export const getWorkoutById = async (id, userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return rows[0];
};

export const getExercisesByWorkoutId = async (workoutId, userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM exercises WHERE workout_id = ? AND user_id = ?',
    [workoutId, userId]
  );
  return rows;
};

export const createWorkout = async (userId, name, description) => {
  const [result] = await pool.execute(
    'INSERT INTO workouts (user_id, name, description) VALUES (?, ?, ?)',
    [userId, name, description ?? null]
  );
  return result;
};

export const createExercise = async (userId, workoutId, name, defaultSets, defaultReps) => {
  const [result] = await pool.execute(
    'INSERT INTO exercises (user_id, workout_id, name, default_sets, default_reps) VALUES (?, ?, ?, ?, ?)',
    [userId, workoutId, name, defaultSets, defaultReps]
  );
  return result;
};

export const updateWorkout = async (id, userId, name, description) => {
  const [result] = await pool.execute(
    'UPDATE workouts SET name = ?, description = ? WHERE id = ? AND user_id = ?',
    [name, description ?? null, id, userId]
  );
  return result;
};

export const deleteWorkout = async (id, userId) => {
  const [result] = await pool.execute(
    'DELETE FROM workouts WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result;
};

export const updateExercise = async (id, userId, name, defaultSets, defaultReps) => {
  const [result] = await pool.execute(
    'UPDATE exercises SET name = ?, default_sets = ?, default_reps = ? WHERE id = ? AND user_id = ?',
    [name, defaultSets, defaultReps, id, userId]
  );
  return result;
};

export const deleteExercise = async (id, userId) => {
  const [result] = await pool.execute(
    'DELETE FROM exercises WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result;
};

export const seedDefaultWorkoutsForUser = async (userId) => {
  for (const workout of DEFAULT_WORKOUTS) {
    const result = await createWorkout(userId, workout.name, workout.description);
    const workoutId = result.insertId;
    for (const exercise of workout.exercises) {
      await createExercise(
        userId,
        workoutId,
        exercise.name,
        exercise.default_sets,
        exercise.default_reps
      );
    }
  }
};
