import pool from '../config/db.js';

export const createLog = async (
  userId,
  exerciseId,
  date,
  setNumber,
  weightKg,
  reps,
  isWarmup = false
) => {
  const [result] = await pool.execute(
    'INSERT INTO logs (user_id, exercise_id, date, set_number, weight_kg, reps, is_warmup) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, exerciseId, date, setNumber, weightKg, reps, isWarmup]
  );
  return result;
};

export const getLogsByExerciseId = async (userId, exerciseId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM logs WHERE exercise_id = ? AND user_id = ?',
    [exerciseId, userId]
  );
  return rows;
};

export const getLogsBySession = async (userId, date) => {
  const [rows] = await pool.execute(
    `SELECT logs.*, exercises.name as exercise_name, exercises.workout_id
     FROM logs 
     JOIN exercises ON logs.exercise_id = exercises.id
     WHERE logs.user_id = ? AND logs.date = ?
     ORDER BY logs.exercise_id, logs.set_number`,
    [userId, date]
  );
  return rows;
};

export const deleteLog = async (id, userId) => {
  const [result] = await pool.execute(
    'DELETE FROM logs WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result;
};

export const updateLog = async (id, userId, weightKg, reps) => {
  const [result] = await pool.execute(
    'UPDATE logs SET weight_kg = ?, reps = ? WHERE id = ? AND user_id = ?',
    [weightKg, reps, id, userId]
  );
  return result;
};

export const isNewAllTimeMax = async (userId, exerciseId, weightKg, excludeLogId) => {
  const [rows] = await pool.execute(
    `SELECT MAX(weight_kg) AS maxWeight FROM logs
     WHERE user_id = ? AND exercise_id = ? AND is_warmup = 0 AND id <> ?`,
    [userId, exerciseId, excludeLogId]
  );
  const currentMax = rows[0].maxWeight;
  return currentMax == null || Number(weightKg) > Number(currentMax);
};

export const getExerciseNameById = async (exerciseId) => {
  const [rows] = await pool.execute('SELECT name FROM exercises WHERE id = ?', [exerciseId]);
  return rows[0]?.name;
};
