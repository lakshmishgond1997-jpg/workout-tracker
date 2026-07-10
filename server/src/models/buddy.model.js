import pool from '../config/db.js';

export const getAcceptedBuddyRows = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT b.*, CASE WHEN b.requester_id = ? THEN b.recipient_id ELSE b.requester_id END AS buddy_id
     FROM buddies b
     WHERE (b.requester_id = ? OR b.recipient_id = ?) AND b.status = 'accepted'`,
    [userId, userId, userId]
  );
  return rows;
};

export const getAcceptedBuddiesWithUserInfo = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT b.*, u.id AS buddy_id, u.name, u.email, u.created_at,
            u.privacy_workout_details, u.privacy_prs, u.privacy_streak, u.privacy_volume
     FROM buddies b
     JOIN users u ON u.id = CASE WHEN b.requester_id = ? THEN b.recipient_id ELSE b.requester_id END
     WHERE (b.requester_id = ? OR b.recipient_id = ?) AND b.status = 'accepted'`,
    [userId, userId, userId]
  );
  return rows;
};

export const getBuddyRelationship = async (userA, userB) => {
  const [rows] = await pool.execute(
    `SELECT * FROM buddies
     WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)
     LIMIT 1`,
    [userA, userB, userB, userA]
  );
  return rows[0];
};

export const getBuddyRelationshipById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM buddies WHERE id = ?', [id]);
  return rows[0];
};

export const countAcceptedBuddies = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS n FROM buddies WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted'`,
    [userId, userId]
  );
  return rows[0].n;
};

export const createBuddyRequest = async (requesterId, recipientId) => {
  const [result] = await pool.execute(
    'INSERT INTO buddies (requester_id, recipient_id, status) VALUES (?, ?, ?)',
    [requesterId, recipientId, 'pending']
  );
  return result;
};

export const acceptBuddyRequest = async (id) => {
  const [result] = await pool.execute(
    `UPDATE buddies SET status = 'accepted', accepted_at = NOW() WHERE id = ? AND status = 'pending'`,
    [id]
  );
  return result;
};

export const deleteBuddyRelationship = async (id, userId) => {
  const [result] = await pool.execute(
    'DELETE FROM buddies WHERE id = ? AND (requester_id = ? OR recipient_id = ?)',
    [id, userId, userId]
  );
  return result;
};

export const getPendingSentRequests = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT b.id, b.recipient_id, b.created_at, u.name, u.email
     FROM buddies b JOIN users u ON u.id = b.recipient_id
     WHERE b.requester_id = ? AND b.status = 'pending'
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows;
};

export const getPendingReceivedRequests = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT b.id, b.requester_id, b.created_at, u.name, u.email
     FROM buddies b JOIN users u ON u.id = b.requester_id
     WHERE b.recipient_id = ? AND b.status = 'pending'
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows;
};

export const countPendingReceivedRequests = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS n FROM buddies WHERE recipient_id = ? AND status = 'pending'`,
    [userId]
  );
  return rows[0].n;
};

export const updateNotifyPrs = async (id, userId, enabled) => {
  const relationship = await getBuddyRelationshipById(id);
  if (!relationship) return { affectedRows: 0 };
  const column =
    relationship.requester_id === userId
      ? 'requester_wants_pr_notifs_from_recipient'
      : relationship.recipient_id === userId
        ? 'recipient_wants_pr_notifs_from_requester'
        : null;
  if (!column) return { affectedRows: 0 };
  const [result] = await pool.execute(
    `UPDATE buddies SET ${column} = ? WHERE id = ?`,
    [enabled ? 1 : 0, id]
  );
  return result;
};

export const getLastNSessionsSummary = async (userId, n) => {
  const [dateRows] = await pool.execute(
    'SELECT DISTINCT date FROM logs WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    [userId, n]
  );
  const dates = dateRows.map((r) => r.date);
  if (!dates.length) return [];
  const placeholders = dates.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT logs.*, exercises.name AS exercise_name, exercises.workout_id
     FROM logs JOIN exercises ON logs.exercise_id = exercises.id
     WHERE logs.user_id = ? AND logs.is_warmup = 0 AND logs.date IN (${placeholders})
     ORDER BY logs.date DESC, logs.exercise_id, logs.set_number`,
    [userId, ...dates]
  );
  return rows;
};
