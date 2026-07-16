import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import workoutRoutes from './src/routes/workout.routes.js';
import logRoutes from './src/routes/log.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';
import bodyweightRoutes from './src/routes/bodyweight.routes.js';
import sorenessRoutes from './src/routes/soreness.routes.js';
import buddyRoutes from './src/routes/buddy.routes.js';
import challengeRoutes from './src/routes/challenge.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';

const app = express();
// app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://workout-tracker-collab.vercel.app',
      'https://workout-tracker-nine-lac-97.vercel.app',
    ],
    credentials: true,
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Workout Tracker API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/bodyweight', bodyweightRoutes);
app.use('/api/soreness', sorenessRoutes);
app.use('/api/buddies', buddyRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/notifications', notificationRoutes);

try {
  const connection = await pool.getConnection();
  console.log('✅ MySQL connected successfully');
  connection.release();
} catch (err) {
  console.error('❌ MySQL connection failed');
  console.error('Code:', err.code);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
