import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';
import { createUser, findUserByEmail } from '../src/models/user.model.js';
import { seedDefaultWorkoutsForUser } from '../src/models/workout.model.js';

const PASSWORD = 'demopass123';
const ACCOUNTS = {
  alex: { name: 'Alex Demo', email: 'buddy-demo-alex@test.local' },
  sam: { name: 'Sam Demo', email: 'buddy-demo-sam@test.local' },
  casey: { name: 'Casey Demo', email: 'buddy-demo-casey@test.local' },
  riley: { name: 'Riley Demo', email: 'buddy-demo-riley@test.local' },
  jordan: { name: 'Jordan Demo', email: 'buddy-demo-jordan@test.local' },
};

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
  const emails = Object.values(ACCOUNTS).map((a) => a.email);
  const [result] = await pool.query('DELETE FROM users WHERE email IN (?)', [emails]);
  console.log(`Cleaned up ${result.affectedRows} demo account(s) (cascades everything else)`);
}

async function ensureAccount({ name, email }) {
  let user = await findUserByEmail(email);
  if (user) {
    console.log(`Reusing existing account ${email} (id ${user.id})`);
    return user.id;
  }
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const result = await createUser(name, email, hashedPassword);
  await seedDefaultWorkoutsForUser(result.insertId);
  console.log(`Created account ${email} (id ${result.insertId})`);
  return result.insertId;
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

async function logSet(userId, exerciseId, date, setNumber, weightKg, reps) {
  await pool.execute(
    'INSERT IGNORE INTO logs (user_id, exercise_id, date, set_number, weight_kg, reps, is_warmup) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [userId, exerciseId, toDateKey(date), setNumber, weightKg, reps]
  );
}

async function seedTraining(userId, { benchWeights, squatWeights, sessionsAgo }) {
  const benchId = await getExerciseId(userId, 'Push', 'Barbell bench press');
  const squatId = await getExerciseId(userId, 'Legs', 'Barbell squats');
  const deadliftId = await getExerciseId(userId, 'Pull', 'Deadlift');

  for (let i = 0; i < sessionsAgo.length; i++) {
    const date = daysAgo(sessionsAgo[i]);
    await logSet(userId, benchId, date, 1, benchWeights[i], 5);
    await logSet(userId, benchId, date, 2, benchWeights[i], 5);
    await logSet(userId, squatId, date, 1, squatWeights[i], 6);
    await logSet(userId, deadliftId, date, 1, squatWeights[i] + 20, 5);
  }
}

async function createAcceptedBuddyPair(userA, userB, acceptedDaysAgo) {
  await pool.execute(
    `INSERT INTO buddies (requester_id, recipient_id, status, created_at, accepted_at)
     VALUES (?, ?, 'accepted', ?, ?)`,
    [userA, userB, toDateKey(daysAgo(acceptedDaysAgo + 1)), toDateKey(daysAgo(acceptedDaysAgo))]
  );
}

async function seed() {
  if (process.argv.includes('--cleanup')) {
    await cleanup();
    process.exit(0);
  }

  const alexId = await ensureAccount(ACCOUNTS.alex);
  const samId = await ensureAccount(ACCOUNTS.sam);
  const caseyId = await ensureAccount(ACCOUNTS.casey);
  const rileyId = await ensureAccount(ACCOUNTS.riley);
  const jordanId = await ensureAccount(ACCOUNTS.jordan);

  // Alex: trains ~5x/week for the last 3 weeks, strong bench progression.
  await seedTraining(alexId, {
    sessionsAgo: [19, 18, 16, 15, 13, 12, 11, 9, 8, 6, 5, 4, 2, 1],
    benchWeights: [70, 70, 72.5, 72.5, 75, 75, 77.5, 77.5, 80, 80, 82.5, 82.5, 85, 85],
    squatWeights: [90, 90, 92.5, 92.5, 95, 95, 97.5, 97.5, 100, 100, 102.5, 102.5, 105, 105],
  });

  // Sam: trains ~3x/week, lower volume/weight than Alex for a visible Compare contrast.
  await seedTraining(samId, {
    sessionsAgo: [18, 15, 12, 11, 8, 5, 4, 1],
    benchWeights: [55, 55, 57.5, 57.5, 60, 60, 62.5, 62.5],
    squatWeights: [70, 70, 72.5, 72.5, 75, 75, 77.5, 77.5],
  });

  // Alex <-> Sam: accepted buddies.
  const existing = await pool.execute(
    `SELECT id FROM buddies WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)`,
    [alexId, samId, samId, alexId]
  );
  if (existing[0].length === 0) {
    await createAcceptedBuddyPair(alexId, samId, 10);
    console.log('Created accepted buddy pair: Alex <-> Sam');
  }

  // An in-progress bench-press challenge between them (accepted 3 days ago, deadline 4 days out).
  const [existingChallenge] = await pool.execute(
    `SELECT id FROM challenges WHERE challenger_id = ? AND challenged_id = ? AND status = 'accepted'`,
    [alexId, samId]
  );
  if (existingChallenge.length === 0) {
    await pool.execute(
      `INSERT INTO challenges (challenger_id, challenged_id, type, exercise_name, target_value, status, deadline, created_at, accepted_at)
       VALUES (?, ?, 'pr_exercise', 'Barbell bench press', 90, 'accepted', ?, ?, ?)`,
      [alexId, samId, toDateKey(daysAgo(-4)), toDateKey(daysAgo(4)), toDateKey(daysAgo(3))]
    );
    console.log('Created in-progress bench-press challenge: Alex vs Sam');
  }

  // Requests: Alex -> Casey pending, Riley -> Alex pending.
  const [sentExisting] = await pool.execute(
    'SELECT id FROM buddies WHERE requester_id = ? AND recipient_id = ?',
    [alexId, caseyId]
  );
  if (sentExisting.length === 0) {
    await pool.execute(
      "INSERT INTO buddies (requester_id, recipient_id, status) VALUES (?, ?, 'pending')",
      [alexId, caseyId]
    );
    console.log('Created pending request: Alex -> Casey (sent)');
  }

  const [receivedExisting] = await pool.execute(
    'SELECT id FROM buddies WHERE requester_id = ? AND recipient_id = ?',
    [rileyId, alexId]
  );
  if (receivedExisting.length === 0) {
    await pool.execute(
      "INSERT INTO buddies (requester_id, recipient_id, status) VALUES (?, ?, 'pending')",
      [rileyId, alexId]
    );
    console.log('Created pending request: Riley -> Alex (received)');
  }

  // Jordan stays fully solo (no logs, no buddies, no requests) for empty-state screenshots.
  void jordanId;

  console.log('\nSeed complete. Demo accounts (all password: ' + PASSWORD + '):');
  for (const [key, { email }] of Object.entries(ACCOUNTS)) {
    console.log(`  ${key}: ${email}`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
