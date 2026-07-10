import pool from '../config/db.js';

export const createNotification = async (
  userId,
  type,
  { relatedUserId = null, relatedChallengeId = null, exerciseName = null, valueKg = null } = {}
) => {
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, type, related_user_id, related_challenge_id, exercise_name, value_kg)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, relatedUserId, relatedChallengeId, exerciseName, valueKg]
  );
  return result;
};

export const getNotifications = async (userId, limit = 50) => {
  const [rows] = await pool.execute(
    `SELECT n.*, u.name AS related_user_name, u.email AS related_user_email
     FROM notifications n
     LEFT JOIN users u ON u.id = n.related_user_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

export const getUnreadCount = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [userId]
  );
  return rows[0].n;
};

export const markRead = async (id, userId) => {
  const [result] = await pool.execute(
    'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
    [id, userId]
  );
  return result;
};

export const markAllRead = async (userId) => {
  const [result] = await pool.execute(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
    [userId]
  );
  return result;
};
