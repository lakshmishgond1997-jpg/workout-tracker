import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';
import { createUser, findUserByEmail } from '../src/models/user.model.js';
import { seedDefaultWorkoutsForUser } from '../src/models/workout.model.js';

const DEMO_EMAIL = 'analytics-demo@test.local';
const DEMO_PASSWORD = 'demopass123';

const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function cleanup() {
  const [result] = await pool.query('DELETE FROM users WHERE email = ?', [DEMO_EMAIL]);
  console.log(`Cleaned up demo account (deleted ${result.affectedRows} user row, cascades everything else)`);
}

async function getExerciseId(userId, workoutName, exerciseName) {
  const [rows] = await pool.execute(
    `SELECT e.id FROM exercises e JOIN workouts w ON e.workout_id = w.id
     WHERE e.user_id = ? AND w.name = ? AND e.name = ?`,
    [userId, workoutName, exerciseName]
  );
  if (!rows[0]) throw new Error(`Exercise not found: ${workoutName} / ${exerciseName}`);
  return rows[0].id;
}

async function logSet(userId, exerciseId, date, setNumber, weightKg, reps, isWarmup = false) {
  await pool.execute(
    'INSERT IGNORE INTO logs (user_id, exercise_id, date, set_number, weight_kg, reps, is_warmup) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, exerciseId, toDateKey(date), setNumber, weightKg, reps, isWarmup ? 1 : 0]
  );
}

async function seed() {
  if (process.argv.includes('--cleanup')) {
    await cleanup();
    process.exit(0);
  }

  let user = await findUserByEmail(DEMO_EMAIL);
  let userId;
  if (user) {
    userId = user.id;
    console.log(`Reusing existing demo account (id ${userId})`);
  } else {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
    const result = await createUser('Analytics Demo', DEMO_EMAIL, hashedPassword);
    userId = result.insertId;
    await seedDefaultWorkoutsForUser(userId);
    console.log(`Created demo account (id ${userId})`);
  }

  const benchId = await getExerciseId(userId, 'Push', 'Barbell bench press');
  const deadliftId = await getExerciseId(userId, 'Pull', 'Deadlift');
  const squatId = await getExerciseId(userId, 'Legs', 'Barbell squats');
  const shoulderPressId = await getExerciseId(userId, 'Shoulders + Core', 'Shoulder press');
  const curlId = await getExerciseId(userId, 'Pull', 'Biceps barbell curl');

  // Bench: progression 60 -> 82.5kg over ~9 weeks, then plateau for the last 3 sessions.
  const benchSessions = [63, 59, 56, 52, 49, 45, 42, 38, 35, 31, 28, 24, 21, 17, 14, 10, 7, 4, 2, 0];
  const benchWeights = [
    60, 62.5, 62.5, 65, 65, 67.5, 70, 70, 72.5, 75, 75, 77.5, 80, 82.5, 82.5, 82.5, 82.5, 82.5, 82.5, 82.5,
  ];
  for (let i = 0; i < benchSessions.length; i++) {
    const date = daysAgo(benchSessions[i]);
    const isRecent = benchSessions[i] <= 4;
    if (isRecent) await logSet(userId, benchId, date, 1, benchWeights[i] - 20, 8, true); // warm-up set
    await logSet(userId, benchId, date, isRecent ? 2 : 1, benchWeights[i], 5);
    await logSet(userId, benchId, date, isRecent ? 3 : 2, benchWeights[i], 5);
  }

  // Deadlift: steady progression, no plateau.
  const deadliftSessions = [60, 53, 46, 39, 32, 25, 18, 11, 4];
  const deadliftWeights = [100, 105, 107.5, 110, 112.5, 115, 117.5, 120, 122.5];
  for (let i = 0; i < deadliftSessions.length; i++) {
    const date = daysAgo(deadliftSessions[i]);
    await logSet(userId, deadliftId, date, 1, deadliftWeights[i], 5);
  }

  // Squats: progression with one big rest gap (12 days) mid-way, to populate rest-vs-performance.
  const squatSessions = [58, 51, 44, 30, 23, 16, 9, 2];
  const squatWeights = [70, 72.5, 75, 77.5, 80, 80, 82.5, 85];
  for (let i = 0; i < squatSessions.length; i++) {
    const date = daysAgo(squatSessions[i]);
    await logSet(userId, squatId, date, 1, squatWeights[i], 8);
  }

  // Shoulder press: last logged 25 days ago -> flags exercise-consistency warning.
  const shoulderSessions = [55, 45, 35, 25];
  const shoulderWeights = [30, 32.5, 32.5, 35];
  for (let i = 0; i < shoulderSessions.length; i++) {
    await logSet(userId, shoulderPressId, daysAgo(shoulderSessions[i]), 1, shoulderWeights[i], 10);
  }

  // Isolation exercise for compound-vs-isolation volume comparison.
  const curlSessions = [56, 42, 28, 14, 3];
  for (const days of curlSessions) {
    await logSet(userId, curlId, daysAgo(days), 1, 15, 12);
    await logSet(userId, curlId, daysAgo(days), 2, 15, 10);
  }

  // Bodyweight: ~8 weekly entries, gentle upward trend.
  for (let w = 8; w >= 0; w--) {
    const date = toDateKey(daysAgo(w * 7));
    await pool.execute(
      'INSERT IGNORE INTO bodyweight_logs (user_id, date, weight_kg) VALUES (?, ?, ?)',
      [userId, date, (78 + (8 - w) * 0.3).toFixed(1)]
    );
  }

  // Soreness: chest rated >=7 on two consecutive bench sessions -> overtraining warning + a few others for heatmap variety.
  await pool.execute(
    'INSERT IGNORE INTO soreness_logs (user_id, date, muscle_group, rating) VALUES (?, ?, ?, ?)',
    [userId, toDateKey(daysAgo(7)), 'chest', 8]
  );
  await pool.execute(
    'INSERT IGNORE INTO soreness_logs (user_id, date, muscle_group, rating) VALUES (?, ?, ?, ?)',
    [userId, toDateKey(daysAgo(4)), 'chest', 7]
  );
  const otherSoreness = [
    [14, 'back', 4],
    [21, 'legs', 6],
    [10, 'shoulders', 3],
    [17, 'legs', 5],
  ];
  for (const [days, group, rating] of otherSoreness) {
    await pool.execute(
      'INSERT IGNORE INTO soreness_logs (user_id, date, muscle_group, rating) VALUES (?, ?, ?, ?)',
      [userId, toDateKey(daysAgo(days)), group, rating]
    );
  }

  console.log('Seed complete.');
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
