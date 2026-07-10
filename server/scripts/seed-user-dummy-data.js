import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';
import { createUser, findUserByEmail } from '../src/models/user.model.js';
import { seedDefaultWorkoutsForUser } from '../src/models/workout.model.js';

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

// Base -> end weight/reps progression across the 20-day window, keyed by exercise name
// (matches the default-workout template exactly, so it applies to any account).
const EXERCISE_PLAN = {
  'Barbell bench press': { start: 55, end: 65, reps: 5, compound: true },
  'Machine chest press': { start: 40, end: 47, reps: 10 },
  'DB inclined chest press': { start: 18, end: 22, reps: 10 },
  'Machine pec fly': { start: 25, end: 30, reps: 12 },
  'Triceps cable pushdown': { start: 20, end: 25, reps: 12 },
  'Cable overhead triceps ext': { start: 15, end: 18, reps: 12 },

  Deadlift: { start: 80, end: 95, reps: 5, compound: true },
  'Back machine row': { start: 45, end: 52, reps: 10 },
  'Lat pulldown': { start: 40, end: 47, reps: 10 },
  'Face pull': { start: 15, end: 18, reps: 15 },
  'Biceps barbell curl': { start: 20, end: 25, reps: 10 },
  'Hammer curl': { start: 12, end: 15, reps: 12 },

  'Barbell squats': { start: 60, end: 72.5, reps: 8, compound: true },
  'Hip thrust': { start: 50, end: 60, reps: 10 },
  'Romanian deadlift': { start: 50, end: 60, reps: 10 },
  'Machine leg extension': { start: 35, end: 42, reps: 12 },
  'Machine leg curl': { start: 30, end: 36, reps: 12 },
  'Calf raises': { start: 40, end: 48, reps: 15 },

  'Shoulder press': { start: 25, end: 30, reps: 10, compound: true },
  'Shoulder cable raises': { start: 8, end: 10, reps: 15 },
  'Wood-chops': { start: 15, end: 18, reps: 15 },
  'Cable crunches': { start: 25, end: 30, reps: 15 },
  'Leg raises': { start: 0, end: 0, reps: 15 },
};

const MUSCLE_GROUP_BY_WORKOUT = {
  Push: 'chest',
  Pull: 'back',
  Legs: 'legs',
  'Shoulders + Core': 'shoulders',
};

// Rest on days-ago 3, 7, 11, 15, 19; train the rest, cycling through the 4 workouts.
const REST_DAYS = new Set([3, 7, 11, 15, 19]);
const WORKOUT_CYCLE = ['Push', 'Pull', 'Legs', 'Shoulders + Core'];

function buildTrainingSchedule() {
  const trainingDaysAgo = [];
  for (let d = 19; d >= 0; d--) {
    if (!REST_DAYS.has(d)) trainingDaysAgo.push(d);
  }
  return trainingDaysAgo.map((daysAgoVal, i) => ({
    daysAgo: daysAgoVal,
    workout: WORKOUT_CYCLE[i % WORKOUT_CYCLE.length],
  }));
}

async function logSet(userId, exerciseId, date, setNumber, weightKg, reps, isWarmup = false) {
  await pool.execute(
    'INSERT IGNORE INTO logs (user_id, exercise_id, date, set_number, weight_kg, reps, is_warmup) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, exerciseId, toDateKey(date), setNumber, weightKg, reps, isWarmup ? 1 : 0]
  );
}

async function seedForUser(userId) {
  const [workouts] = await pool.execute('SELECT id, name FROM workouts WHERE user_id = ?', [userId]);
  const [exercises] = await pool.execute('SELECT id, workout_id, name FROM exercises WHERE user_id = ?', [userId]);

  const workoutById = new Map(workouts.map((w) => [w.id, w.name]));
  const exercisesByWorkoutName = new Map();
  for (const ex of exercises) {
    const workoutName = workoutById.get(ex.workout_id);
    if (!exercisesByWorkoutName.has(workoutName)) exercisesByWorkoutName.set(workoutName, []);
    exercisesByWorkoutName.get(workoutName).push(ex);
  }

  const schedule = buildTrainingSchedule();

  // Track each exercise's own session index (for smooth start->end progression).
  const sessionIndexByExercise = new Map();
  for (const ex of exercises) sessionIndexByExercise.set(ex.id, 0);

  // Count sessions per workout type to know each exercise's total occurrence count up front.
  const sessionsPerWorkout = {};
  for (const s of schedule) sessionsPerWorkout[s.workout] = (sessionsPerWorkout[s.workout] || 0) + 1;

  for (const session of schedule) {
    const exList = exercisesByWorkoutName.get(session.workout) || [];
    const totalSessions = sessionsPerWorkout[session.workout];
    const isRecentSession = session.daysAgo <= 4;

    for (const ex of exList) {
      const plan = EXERCISE_PLAN[ex.name];
      if (!plan) continue;

      const sessionIdx = sessionIndexByExercise.get(ex.id);
      sessionIndexByExercise.set(ex.id, sessionIdx + 1);
      const progress = totalSessions > 1 ? sessionIdx / (totalSessions - 1) : 1;
      const weight = Math.round((plan.start + (plan.end - plan.start) * progress) * 2) / 2;

      const date = daysAgo(session.daysAgo);
      let setNumber = 1;

      if (plan.compound && isRecentSession) {
        await logSet(userId, ex.id, date, setNumber++, Math.max(0, weight - 20), plan.reps + 3, true);
      }

      const numSets = plan.compound ? 3 : 3;
      for (let s = 0; s < numSets; s++) {
        const repVariance = s === numSets - 1 ? -1 : 0;
        await logSet(userId, ex.id, date, setNumber++, weight, Math.max(1, plan.reps + repVariance));
      }
    }

    // Soreness rating for the trained muscle group, 1-2 days after most sessions.
    const muscleGroup = MUSCLE_GROUP_BY_WORKOUT[session.workout];
    const soreDate = toDateKey(daysAgo(Math.max(0, session.daysAgo - 1)));
    const rating = session.workout === 'Push' && session.daysAgo <= 8 ? 7 + (session.daysAgo <= 4 ? 1 : 0) : 3 + Math.floor(Math.random() * 3);
    await pool.execute(
      'INSERT IGNORE INTO soreness_logs (user_id, date, muscle_group, rating) VALUES (?, ?, ?, ?)',
      [userId, soreDate, muscleGroup, rating]
    );
  }

  // Bodyweight roughly every 3 days across the 20-day window, gentle upward trend.
  for (let d = 19; d >= 0; d -= 3) {
    const weight = (78 + (19 - d) * 0.1).toFixed(1);
    await pool.execute(
      'INSERT IGNORE INTO bodyweight_logs (user_id, date, weight_kg) VALUES (?, ?, ?)',
      [userId, toDateKey(daysAgo(d)), weight]
    );
  }

  console.log(`Seeded 20 days of logs, bodyweight, and soreness for user ${userId}`);
}

async function ensureUser(email, name, password) {
  let user = await findUserByEmail(email);
  if (user) {
    console.log(`Using existing account: ${email} (id ${user.id})`);
    return user.id;
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await createUser(name, email, hashedPassword);
  await seedDefaultWorkoutsForUser(result.insertId);
  console.log(`Created new account: ${email} / ${password} (id ${result.insertId})`);
  return result.insertId;
}

async function main() {
  const lakshmishId = await ensureUser('lakshmishgond@gmail.com', 'Lakshmish Gond', 'placeholder');
  await seedForUser(lakshmishId);

  const chaithanyaId = await ensureUser('chaithanya@gmail.com', 'Chaithanya', 'chaithanya123');
  await seedForUser(chaithanyaId);

  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
