import pool from '../config/db.js';
import { normalizeSqlDate } from '../utils/dateRange.js';

export const createBodyweightLog = async (userId, date, weightKg) => {
  const [result] = await pool.execute(
    'INSERT INTO bodyweight_logs (user_id, date, weight_kg) VALUES (?, ?, ?)',
    [userId, date, weightKg]
  );
  return result;
};

export const getBodyweightLogs = async (userId, startDate) => {
  const [rows] = startDate
    ? await pool.execute(
        'SELECT * FROM bodyweight_logs WHERE user_id = ? AND date >= ? ORDER BY date ASC',
        [userId, startDate]
      )
    : await pool.execute(
        'SELECT * FROM bodyweight_logs WHERE user_id = ? ORDER BY date ASC',
        [userId]
      );
  return rows.map((row) => ({ ...row, date: normalizeSqlDate(row.date) }));
};

export const getLatestBodyweightLog = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM bodyweight_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1',
    [userId]
  );
  if (!rows[0]) return undefined;
  return { ...rows[0], date: normalizeSqlDate(rows[0].date) };
};

export const deleteBodyweightLog = async (id, userId) => {
  const [result] = await pool.execute(
    'DELETE FROM bodyweight_logs WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result;
};
