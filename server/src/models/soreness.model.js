import pool from '../config/db.js';
import { normalizeSqlDate } from '../utils/dateRange.js';

export const upsertSorenessLog = async (userId, date, muscleGroup, rating) => {
  const [result] = await pool.execute(
    `INSERT INTO soreness_logs (user_id, date, muscle_group, rating)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
    [userId, date, muscleGroup, rating]
  );
  return result;
};

export const getSorenessLogs = async (userId, startDate) => {
  const [rows] = startDate
    ? await pool.execute(
        'SELECT * FROM soreness_logs WHERE user_id = ? AND date >= ? ORDER BY date ASC',
        [userId, startDate]
      )
    : await pool.execute(
        'SELECT * FROM soreness_logs WHERE user_id = ? ORDER BY date ASC',
        [userId]
      );
  return rows.map((row) => ({ ...row, date: normalizeSqlDate(row.date) }));
};
