import pool from '../config/db.js';

export const createChallenge = async (challengerId, challengedId, type, exerciseName, targetValue, deadline) => {
  const [result] = await pool.execute(
    `INSERT INTO challenges (challenger_id, challenged_id, type, exercise_name, target_value, deadline)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [challengerId, challengedId, type, exerciseName, targetValue, deadline]
  );
  return result;
};

export const getChallengeById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM challenges WHERE id = ?', [id]);
  return rows[0];
};

export const acceptChallenge = async (id) => {
  const [result] = await pool.execute(
    `UPDATE challenges SET status = 'accepted', accepted_at = NOW() WHERE id = ? AND status = 'pending'`,
    [id]
  );
  return result;
};

export const declineChallenge = async (id) => {
  const [result] = await pool.execute(
    `UPDATE challenges SET status = 'declined' WHERE id = ? AND status = 'pending'`,
    [id]
  );
  return result;
};

export const completeChallenge = async (id, winnerId) => {
  const [result] = await pool.execute(
    `UPDATE challenges SET status = 'completed', winner_id = ?, resolved_at = NOW()
     WHERE id = ? AND status = 'accepted'`,
    [winnerId, id]
  );
  return result;
};

export const getChallengesForUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT c.*,
            cu.name AS challenger_name, cu.email AS challenger_email,
            du.name AS challenged_name, du.email AS challenged_email
     FROM challenges c
     JOIN users cu ON cu.id = c.challenger_id
     JOIN users du ON du.id = c.challenged_id
     WHERE c.challenger_id = ? OR c.challenged_id = ?
     ORDER BY c.created_at DESC`,
    [userId, userId]
  );
  return rows;
};

export const getExpiredAcceptedChallenges = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM challenges
     WHERE status = 'accepted' AND deadline < CURDATE() AND (challenger_id = ? OR challenged_id = ?)`,
    [userId, userId]
  );
  return rows;
};

export const getMostRecentActiveChallenge = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT c.*, cu.name AS challenger_name, du.name AS challenged_name
     FROM challenges c
     JOIN users cu ON cu.id = c.challenger_id
     JOIN users du ON du.id = c.challenged_id
     WHERE c.status = 'accepted' AND (c.challenger_id = ? OR c.challenged_id = ?)
     ORDER BY c.accepted_at DESC LIMIT 1`,
    [userId, userId]
  );
  return rows[0];
};

export const getChallengeProgressValue = async (userId, type, exerciseName, fromDate, toDate) => {
  if (type === 'pr_exercise') {
    const [rows] = await pool.execute(
      `SELECT MAX(l.weight_kg) AS value
       FROM logs l JOIN exercises e ON l.exercise_id = e.id
       WHERE l.user_id = ? AND l.is_warmup = 0 AND LOWER(e.name) = LOWER(?)
         AND l.date BETWEEN ? AND ?`,
      [userId, exerciseName, fromDate, toDate]
    );
    return rows[0].value != null ? Number(rows[0].value) : 0;
  }
  const [rows] = await pool.execute(
    `SELECT SUM(weight_kg * reps) AS value FROM logs
     WHERE user_id = ? AND is_warmup = 0 AND date BETWEEN ? AND ?`,
    [userId, fromDate, toDate]
  );
  return rows[0].value != null ? Number(rows[0].value) : 0;
};
