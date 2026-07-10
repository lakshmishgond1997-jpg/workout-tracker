import pool from '../config/db.js';

export const createUser = async (name, email, hashedPassword) => {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword]
  );
  return result;
};

export const findUserByEmail = async (email) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [
    email,
  ]);
  return rows[0];
};

export const findUserById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, created_at,
            privacy_workout_details, privacy_prs, privacy_streak, privacy_volume
     FROM users WHERE id = ?`,
    [id]
  );
  return rows[0];
};

export const getUserPrivacyProfile = findUserById;

export const updateUserPrivacy = async (
  id,
  { privacy_workout_details, privacy_prs, privacy_streak, privacy_volume }
) => {
  const [result] = await pool.execute(
    `UPDATE users SET privacy_workout_details = ?, privacy_prs = ?, privacy_streak = ?, privacy_volume = ?
     WHERE id = ?`,
    [privacy_workout_details, privacy_prs, privacy_streak, privacy_volume, id]
  );
  return result;
};
