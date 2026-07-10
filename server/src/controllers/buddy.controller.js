import {
  getAcceptedBuddiesWithUserInfo,
  getBuddyRelationship,
  getBuddyRelationshipById,
  countAcceptedBuddies,
  createBuddyRequest,
  acceptBuddyRequest,
  deleteBuddyRelationship,
  getPendingSentRequests,
  getPendingReceivedRequests,
  updateNotifyPrs,
  getLastNSessionsSummary,
} from '../models/buddy.model.js';
import { findUserByEmail, findUserById, updateUserPrivacy } from '../models/user.model.js';
import { createNotification } from '../models/notification.model.js';
import {
  getWorkingSetLogsForPrBoard,
  getExerciseWorkingSetLogs,
  getAllWorkingSetLogsFlat,
  getDistinctSessionDates,
  groupSessionBests,
  detectPlateau,
  computePrBoard,
  computeVolumeByMuscleGroup,
  computeConsistency,
  computeKeyLiftE1rm,
  computeBestMonthEver,
} from '../models/analytics.model.js';
import { rangeStartDate, daysAgoKey, toDateKey, normalizeSqlDate } from '../utils/dateRange.js';
import { redact } from '../utils/privacy.js';

const MAX_BUDDIES = 20;
const LEADERBOARD_CATEGORIES = ['weekly_volume', 'monthly_prs', 'streak', 'e1rm'];

const handleError = (res, error) => {
  res.status(500).json({ message: 'Server error', error: error.message });
};

// ---------- Search / requests ----------

export const searchByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const target = await findUserByEmail(email.trim());
    if (!target || target.id === req.user.id) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    const relationship = await getBuddyRelationship(req.user.id, target.id);
    let status = 'none';
    if (relationship) {
      if (relationship.status === 'accepted') status = 'accepted';
      else status = relationship.requester_id === req.user.id ? 'pending_sent' : 'pending_received';
    }

    return res.status(200).json({
      user: { id: target.id, name: target.name, email: target.email },
      status,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const sendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ message: 'recipientId is required' });
    const requesterId = req.user.id;
    if (Number(recipientId) === requesterId) {
      return res.status(400).json({ message: 'Cannot send a buddy request to yourself' });
    }

    const recipient = await findUserById(recipientId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    const existing = await getBuddyRelationship(requesterId, recipientId);
    if (existing) {
      return res.status(409).json({ message: 'A buddy relationship already exists with this user' });
    }

    const [requesterCount, recipientCount] = await Promise.all([
      countAcceptedBuddies(requesterId),
      countAcceptedBuddies(recipientId),
    ]);
    if (requesterCount >= MAX_BUDDIES) {
      return res.status(400).json({ message: 'You have reached the maximum of 20 buddies' });
    }
    if (recipientCount >= MAX_BUDDIES) {
      return res.status(400).json({ message: 'This user has reached the maximum of 20 buddies' });
    }

    const result = await createBuddyRequest(requesterId, recipientId);
    await createNotification(recipientId, 'buddy_request', { relatedUserId: requesterId });
    return res.status(201).json({ message: 'Buddy request sent', requestId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A buddy relationship already exists with this user' });
    }
    handleError(res, error);
  }
};

export const getRequests = async (req, res) => {
  try {
    const [sent, received] = await Promise.all([
      getPendingSentRequests(req.user.id),
      getPendingReceivedRequests(req.user.id),
    ]);
    return res.status(200).json({ sent, received });
  } catch (error) {
    handleError(res, error);
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be accept or decline' });
    }

    const relationship = await getBuddyRelationshipById(id);
    if (!relationship || relationship.recipient_id !== req.user.id || relationship.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (action === 'decline') {
      await deleteBuddyRelationship(id, req.user.id);
      return res.status(200).json({ message: 'Request declined' });
    }

    const [requesterCount, recipientCount] = await Promise.all([
      countAcceptedBuddies(relationship.requester_id),
      countAcceptedBuddies(relationship.recipient_id),
    ]);
    if (requesterCount >= MAX_BUDDIES || recipientCount >= MAX_BUDDIES) {
      return res.status(400).json({ message: 'One of you has reached the maximum of 20 buddies' });
    }

    await acceptBuddyRequest(id);
    await createNotification(relationship.requester_id, 'buddy_accepted', {
      relatedUserId: relationship.recipient_id,
    });
    return res.status(200).json({ message: 'Buddy request accepted' });
  } catch (error) {
    handleError(res, error);
  }
};

export const removeBuddy = async (req, res) => {
  try {
    const result = await deleteBuddyRelationship(req.params.id, req.user.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    return res.status(200).json({ message: 'Removed' });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Privacy / notify-prs ----------

export const getPrivacy = async (req, res) => {
  try {
    const me = await findUserById(req.user.id);
    return res.status(200).json({
      privacy_workout_details: me.privacy_workout_details,
      privacy_prs: me.privacy_prs,
      privacy_streak: me.privacy_streak,
      privacy_volume: me.privacy_volume,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const updatePrivacy = async (req, res) => {
  try {
    const { privacy_workout_details, privacy_prs, privacy_streak, privacy_volume } = req.body;
    const isValid = (v) => v === 'public' || v === 'private';
    if (![privacy_workout_details, privacy_prs, privacy_streak, privacy_volume].every(isValid)) {
      return res.status(400).json({ message: 'Each privacy field must be public or private' });
    }
    await updateUserPrivacy(req.user.id, {
      privacy_workout_details,
      privacy_prs,
      privacy_streak,
      privacy_volume,
    });
    return res.status(200).json({ message: 'Privacy settings updated' });
  } catch (error) {
    handleError(res, error);
  }
};

export const setNotifyPrs = async (req, res) => {
  try {
    const { enabled } = req.body;
    const result = await updateNotifyPrs(req.params.id, req.user.id, Boolean(enabled));
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Relationship not found' });
    }
    return res.status(200).json({ message: 'Updated' });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- My buddies list ----------

export const getMyBuddies = async (req, res) => {
  try {
    const rows = await getAcceptedBuddiesWithUserInfo(req.user.id);
    const now = new Date();

    const buddies = await Promise.all(
      rows.map(async (row) => {
        const buddyId = row.buddy_id;
        const [allDates, prRows, volumeRows] = await Promise.all([
          getDistinctSessionDates(buddyId),
          getWorkingSetLogsForPrBoard(buddyId, rangeStartDate('30')),
          getAllWorkingSetLogsFlat(buddyId, daysAgoKey(14)),
        ]);
        const { currentStreak } = computeConsistency(allDates);
        const thisWeekVolume = computeVolumeByMuscleGroup(volumeRows).reduce((s, v) => s + v.thisWeek, 0);
        const topPrThisMonth =
          computePrBoard(prRows)
            .filter((pr) => {
              const d = new Date(`${pr.date}T00:00:00`);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .sort((a, b) => b.e1rm - a.e1rm)[0] ?? null;
        const lastWorkoutDate = allDates.length ? allDates[allDates.length - 1] : null;

        return {
          relationshipId: row.id,
          buddyId,
          name: row.name,
          email: row.email,
          memberSince: row.created_at,
          lastWorkoutDate,
          currentStreak: redact(currentStreak, row.privacy_streak),
          thisWeekVolume: redact(Math.round(thisWeekVolume), row.privacy_volume),
          topPrThisMonth: redact(topPrThisMonth, row.privacy_prs),
        };
      })
    );

    return res.status(200).json({ buddies });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Leaderboard ----------

function countPrsInMonth(prRows, asOfDate) {
  const board = computePrBoard(prRows);
  const month = asOfDate.getMonth();
  const year = asOfDate.getFullYear();
  const cutoff = toDateKey(asOfDate);
  return board.filter((pr) => {
    const d = new Date(`${pr.date}T00:00:00`);
    return d.getMonth() === month && d.getFullYear() === year && pr.date <= cutoff;
  }).length;
}

function sumKeyLiftE1rm(rows, asOfDateKey) {
  const filtered = asOfDateKey ? rows.filter((r) => r.date <= asOfDateKey) : rows;
  const values = Object.values(computeKeyLiftE1rm(filtered)).filter((v) => v != null);
  return values.reduce((a, b) => a + b, 0);
}

async function computeLeaderboardEntry(userId, category, sevenDaysAgo) {
  if (category === 'weekly_volume') {
    const rows = await getAllWorkingSetLogsFlat(userId, daysAgoKey(14));
    const volumes = computeVolumeByMuscleGroup(rows);
    return {
      current: volumes.reduce((s, v) => s + v.thisWeek, 0),
      weekAgo: volumes.reduce((s, v) => s + v.lastWeek, 0),
    };
  }
  if (category === 'streak') {
    const allDates = await getDistinctSessionDates(userId);
    return {
      current: computeConsistency(allDates).currentStreak,
      weekAgo: computeConsistency(allDates, sevenDaysAgo).currentStreak,
    };
  }
  if (category === 'monthly_prs') {
    const rows = await getWorkingSetLogsForPrBoard(userId, rangeStartDate('90'));
    return {
      current: countPrsInMonth(rows, new Date()),
      weekAgo: countPrsInMonth(rows, sevenDaysAgo),
    };
  }
  // e1rm
  const rows = await getAllWorkingSetLogsFlat(userId, null);
  return {
    current: sumKeyLiftE1rm(rows, null),
    weekAgo: sumKeyLiftE1rm(rows, toDateKey(sevenDaysAgo)),
  };
}

export const getLeaderboard = async (req, res) => {
  try {
    const { category } = req.query;
    if (!LEADERBOARD_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    const privacyField = {
      weekly_volume: 'privacy_volume',
      monthly_prs: 'privacy_prs',
      streak: 'privacy_streak',
      e1rm: 'privacy_prs',
    }[category];

    const [buddyRows, me] = await Promise.all([
      getAcceptedBuddiesWithUserInfo(req.user.id),
      findUserById(req.user.id),
    ]);

    const participants = [
      { userId: req.user.id, name: me.name, isSelf: true },
      ...buddyRows
        .filter((row) => row[privacyField] !== 'private')
        .map((row) => ({ userId: row.buddy_id, name: row.name, isSelf: false })),
    ];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const values = await Promise.all(
      participants.map((p) => computeLeaderboardEntry(p.userId, category, sevenDaysAgo))
    );

    const currentRanked = participants
      .map((p, i) => ({ ...p, value: values[i].current }))
      .sort((a, b) => b.value - a.value);
    const weekAgoRanked = participants
      .map((p, i) => ({ userId: p.userId, value: values[i].weekAgo }))
      .sort((a, b) => b.value - a.value);
    const weekAgoRankByUser = new Map(weekAgoRanked.map((p, i) => [p.userId, i + 1]));

    const leaderboard = currentRanked.map((p, i) => {
      const rank = i + 1;
      const previousRank = weekAgoRankByUser.get(p.userId) ?? rank;
      return {
        userId: p.userId,
        name: p.name,
        isSelf: p.isSelf,
        value: p.value,
        rank,
        rankDelta: previousRank - rank,
      };
    });

    return res.status(200).json({ category, leaderboard });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Compare ----------

function share(a, b) {
  const total = a + b;
  if (total <= 0) return 0.5;
  return a / total;
}

function isThisMonth(pr) {
  const d = new Date(`${pr.date}T00:00:00`);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function mergeMuscleGroupVolumes(selfArr, buddyArr) {
  const map = new Map();
  for (const v of selfArr) map.set(v.muscleGroup, { muscleGroup: v.muscleGroup, self: v.thisWeek, buddy: 0 });
  for (const v of buddyArr) {
    if (!map.has(v.muscleGroup)) map.set(v.muscleGroup, { muscleGroup: v.muscleGroup, self: 0, buddy: 0 });
    map.get(v.muscleGroup).buddy = v.thisWeek;
  }
  return [...map.values()];
}

function comparePrBoards(selfBoard, buddyBoard, buddyPrsPrivate) {
  const selfByName = new Map(selfBoard.map((pr) => [pr.exerciseName.toLowerCase(), pr]));
  const buddyByName = new Map(buddyBoard.map((pr) => [pr.exerciseName.toLowerCase(), pr]));
  const names = new Set([...selfByName.keys(), ...buddyByName.keys()]);

  return [...names]
    .map((key) => {
      const selfPr = selfByName.get(key) ?? null;
      const buddyPr = buddyPrsPrivate ? null : buddyByName.get(key) ?? null;
      const selfE1rm = selfPr?.e1rm ?? null;
      const buddyE1rm = buddyPr?.e1rm ?? null;
      let leader = null;
      if (selfE1rm != null && buddyE1rm != null) {
        leader = selfE1rm > buddyE1rm ? 'self' : selfE1rm < buddyE1rm ? 'buddy' : 'tie';
      }
      return {
        exerciseName: (selfPr ?? buddyPr).exerciseName,
        selfBest: selfPr ? { weightKg: selfPr.weightKg, reps: selfPr.reps, e1rm: selfPr.e1rm } : null,
        buddyBest: buddyPr ? { weightKg: buddyPr.weightKg, reps: buddyPr.reps, e1rm: buddyPr.e1rm } : null,
        leader,
      };
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export const getCompare = async (req, res) => {
  try {
    const buddyId = Number(req.params.id);
    const relationship = await getBuddyRelationship(req.user.id, buddyId);
    if (!relationship || relationship.status !== 'accepted') {
      return res.status(404).json({ message: 'Not an accepted buddy' });
    }
    const buddyUser = await findUserById(buddyId);
    if (!buddyUser) return res.status(404).json({ message: 'User not found' });

    const [selfVolumeRows, buddyVolumeRows, selfPrRows, buddyPrRows, selfDates, buddyDates, selfAllRows, buddyAllRows] =
      await Promise.all([
        getAllWorkingSetLogsFlat(req.user.id, daysAgoKey(14)),
        getAllWorkingSetLogsFlat(buddyId, daysAgoKey(14)),
        getWorkingSetLogsForPrBoard(req.user.id),
        getWorkingSetLogsForPrBoard(buddyId),
        getDistinctSessionDates(req.user.id),
        getDistinctSessionDates(buddyId),
        getAllWorkingSetLogsFlat(req.user.id, null),
        getAllWorkingSetLogsFlat(buddyId, null),
      ]);

    const selfVolume = computeVolumeByMuscleGroup(selfVolumeRows);
    const buddyVolume = computeVolumeByMuscleGroup(buddyVolumeRows);
    const volumeComparison = mergeMuscleGroupVolumes(selfVolume, buddyVolume);

    const selfPrBoard = computePrBoard(selfPrRows);
    const buddyPrBoard = computePrBoard(buddyPrRows);
    const buddyPrsPrivate = buddyUser.privacy_prs === 'private';
    const prComparison = comparePrBoards(selfPrBoard, buddyPrBoard, buddyPrsPrivate);

    const selfConsistency = computeConsistency(selfDates);
    const buddyConsistency = computeConsistency(buddyDates);
    const buddyStreakPrivate = buddyUser.privacy_streak === 'private';

    const selfKeyLifts = computeKeyLiftE1rm(selfAllRows);
    const buddyKeyLifts = computeKeyLiftE1rm(buddyAllRows);

    const selfBestMonth = computeBestMonthEver(selfAllRows);
    const buddyBestMonth = computeBestMonthEver(buddyAllRows);
    const buddyVolumePrivate = buddyUser.privacy_volume === 'private';

    const shares = [];
    shares.push(
      share(
        selfVolume.reduce((s, v) => s + v.thisWeek, 0),
        buddyVolumePrivate ? 0 : buddyVolume.reduce((s, v) => s + v.thisWeek, 0)
      )
    );
    if (!buddyStreakPrivate) shares.push(share(selfConsistency.currentStreak, buddyConsistency.currentStreak));
    if (!buddyPrsPrivate) {
      shares.push(share(selfPrBoard.filter(isThisMonth).length, buddyPrBoard.filter(isThisMonth).length));
      shares.push(
        share(
          Object.values(selfKeyLifts).filter((v) => v != null).reduce((a, b) => a + b, 0),
          Object.values(buddyKeyLifts).filter((v) => v != null).reduce((a, b) => a + b, 0)
        )
      );
    }
    if (!buddyVolumePrivate) shares.push(share(selfBestMonth.volume, buddyBestMonth.volume));

    const avgShare = shares.reduce((a, b) => a + b, 0) / shares.length;
    const leadPercent = Number(((avgShare - 0.5) * 200).toFixed(1));

    return res.status(200).json({
      buddy: { id: buddyId, name: buddyUser.name },
      volumeComparison: redact(volumeComparison, buddyUser.privacy_volume),
      prComparison,
      streakComparison: {
        self: selfConsistency.currentStreak,
        buddy: redact(buddyConsistency.currentStreak, buddyUser.privacy_streak),
      },
      keyLiftComparison: { self: selfKeyLifts, buddy: redact(buddyKeyLifts, buddyUser.privacy_prs) },
      bestMonthComparison: { self: selfBestMonth, buddy: redact(buddyBestMonth, buddyUser.privacy_volume) },
      summary: { leadPercent },
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Full profile ----------

export const getBuddyProfile = async (req, res) => {
  try {
    const buddyId = Number(req.params.id);
    const relationship = await getBuddyRelationship(req.user.id, buddyId);
    if (!relationship || relationship.status !== 'accepted') {
      return res.status(404).json({ message: 'Not an accepted buddy' });
    }
    const buddyUser = await findUserById(buddyId);
    if (!buddyUser) return res.status(404).json({ message: 'User not found' });

    const [allDates, prRows, volumeRows, sessions] = await Promise.all([
      getDistinctSessionDates(buddyId),
      getWorkingSetLogsForPrBoard(buddyId),
      getAllWorkingSetLogsFlat(buddyId, daysAgoKey(14)),
      getLastNSessionsSummary(buddyId, 5),
    ]);

    const consistency = computeConsistency(allDates);
    const prBoard = computePrBoard(prRows);
    const volumeByMuscleGroup = computeVolumeByMuscleGroup(volumeRows);
    const thisWeekVolume = volumeByMuscleGroup.reduce((s, v) => s + v.thisWeek, 0);
    const lastWeekVolume = volumeByMuscleGroup.reduce((s, v) => s + v.lastWeek, 0);

    return res.status(200).json({
      buddy: { id: buddyId, name: buddyUser.name, email: buddyUser.email, memberSince: buddyUser.created_at },
      streak: redact(
        { currentStreak: consistency.currentStreak, longestStreak: consistency.longestStreak },
        buddyUser.privacy_streak
      ),
      weeklyVolume: redact(
        { thisWeek: Math.round(thisWeekVolume), lastWeek: Math.round(lastWeekVolume) },
        buddyUser.privacy_volume
      ),
      prBoard: redact(prBoard, buddyUser.privacy_prs),
      volumeByMuscleGroup: redact(volumeByMuscleGroup, buddyUser.privacy_volume),
      lastSessions: redact(
        sessions.map((s) => ({ ...s, date: normalizeSqlDate(s.date) })),
        buddyUser.privacy_workout_details
      ),
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const getBuddyOverloadChart = async (req, res) => {
  try {
    const buddyId = Number(req.params.id);
    const { exerciseId } = req.params;
    const relationship = await getBuddyRelationship(req.user.id, buddyId);
    if (!relationship || relationship.status !== 'accepted') {
      return res.status(404).json({ message: 'Not an accepted buddy' });
    }
    const buddyUser = await findUserById(buddyId);
    if (!buddyUser || buddyUser.privacy_workout_details === 'private') {
      return res.status(403).json({ message: 'This buddy has hidden their workout details' });
    }

    const allRows = await getExerciseWorkingSetLogs(buddyId, exerciseId);
    const allTimeBests = groupSessionBests(allRows);
    const pr = allTimeBests.length ? Math.max(...allTimeBests.map((b) => b.weightKg)) : null;

    const startDate = rangeStartDate(req.query.range);
    const rangeRows = startDate ? allRows.filter((r) => r.date >= startDate) : allRows;
    const series = groupSessionBests(rangeRows);
    const plateau = detectPlateau(series);

    return res.status(200).json({
      series,
      pr,
      target: pr != null ? Number((pr + 2.5).toFixed(1)) : null,
      plateauDates: plateau.plateauDates || [],
    });
  } catch (error) {
    handleError(res, error);
  }
};
