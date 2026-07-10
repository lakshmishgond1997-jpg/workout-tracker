import {
  createChallenge,
  getChallengeById,
  acceptChallenge,
  declineChallenge,
  completeChallenge,
  getChallengesForUser,
  getExpiredAcceptedChallenges,
  getMostRecentActiveChallenge,
  getChallengeProgressValue,
} from '../models/challenge.model.js';
import { getBuddyRelationship } from '../models/buddy.model.js';
import { createNotification } from '../models/notification.model.js';
import { toDateKey } from '../utils/dateRange.js';

const CHALLENGE_TYPES = ['pr_exercise', 'weekly_volume'];

const handleError = (res, error) => {
  res.status(500).json({ message: 'Server error', error: error.message });
};

async function resolveExpiredChallenges(userId) {
  const expired = await getExpiredAcceptedChallenges(userId);
  for (const challenge of expired) {
    const fromDate = toDateKey(new Date(challenge.accepted_at));
    const toDate = toDateKey(new Date(challenge.deadline));
    const [challengerValue, challengedValue] = await Promise.all([
      getChallengeProgressValue(challenge.challenger_id, challenge.type, challenge.exercise_name, fromDate, toDate),
      getChallengeProgressValue(challenge.challenged_id, challenge.type, challenge.exercise_name, fromDate, toDate),
    ]);
    const winnerId =
      challengerValue === challengedValue
        ? null
        : challengerValue > challengedValue
          ? challenge.challenger_id
          : challenge.challenged_id;

    const result = await completeChallenge(challenge.id, winnerId);
    if (result.affectedRows === 0) continue; // already resolved via the other party's read

    await Promise.all([
      createNotification(challenge.challenger_id, 'challenge_completed', {
        relatedChallengeId: challenge.id,
        relatedUserId: challenge.challenged_id,
      }),
      createNotification(challenge.challenged_id, 'challenge_completed', {
        relatedChallengeId: challenge.id,
        relatedUserId: challenge.challenger_id,
      }),
    ]);
  }
}

export const createChallengeHandler = async (req, res) => {
  try {
    const { challengedId, type, exerciseName, targetValue } = req.body;
    const challengerId = req.user.id;
    if (!challengedId || !CHALLENGE_TYPES.includes(type) || targetValue == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (type === 'pr_exercise' && !exerciseName) {
      return res.status(400).json({ message: 'exerciseName is required for pr_exercise challenges' });
    }
    if (Number(challengedId) === challengerId) {
      return res.status(400).json({ message: 'Cannot challenge yourself' });
    }
    const relationship = await getBuddyRelationship(challengerId, challengedId);
    if (!relationship || relationship.status !== 'accepted') {
      return res.status(400).json({ message: 'You can only challenge accepted buddies' });
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const result = await createChallenge(
      challengerId,
      challengedId,
      type,
      type === 'pr_exercise' ? exerciseName : null,
      targetValue,
      toDateKey(deadline)
    );
    await createNotification(challengedId, 'challenge_received', {
      relatedUserId: challengerId,
      relatedChallengeId: result.insertId,
    });
    return res.status(201).json({ message: 'Challenge sent', challengeId: result.insertId });
  } catch (error) {
    handleError(res, error);
  }
};

export const respondToChallengeHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be accept or decline' });
    }
    const challenge = await getChallengeById(id);
    if (!challenge || challenge.challenged_id !== req.user.id || challenge.status !== 'pending') {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    if (action === 'decline') {
      await declineChallenge(id);
      return res.status(200).json({ message: 'Challenge declined' });
    }
    await acceptChallenge(id);
    await createNotification(challenge.challenger_id, 'challenge_accepted', {
      relatedUserId: challenge.challenged_id,
      relatedChallengeId: challenge.id,
    });
    return res.status(200).json({ message: 'Challenge accepted' });
  } catch (error) {
    handleError(res, error);
  }
};

export const listChallengesHandler = async (req, res) => {
  try {
    await resolveExpiredChallenges(req.user.id);
    const challenges = await getChallengesForUser(req.user.id);
    return res.status(200).json({ challenges });
  } catch (error) {
    handleError(res, error);
  }
};

export const activeSummaryHandler = async (req, res) => {
  try {
    await resolveExpiredChallenges(req.user.id);
    const challenge = await getMostRecentActiveChallenge(req.user.id);
    if (!challenge) return res.status(200).json({ challenge: null });

    const fromDate = toDateKey(new Date(challenge.accepted_at));
    const toDate = toDateKey(new Date());
    const [challengerValue, challengedValue] = await Promise.all([
      getChallengeProgressValue(challenge.challenger_id, challenge.type, challenge.exercise_name, fromDate, toDate),
      getChallengeProgressValue(challenge.challenged_id, challenge.type, challenge.exercise_name, fromDate, toDate),
    ]);

    return res.status(200).json({
      challenge: {
        id: challenge.id,
        type: challenge.type,
        exerciseName: challenge.exercise_name,
        targetValue: Number(challenge.target_value),
        deadline: toDateKey(new Date(challenge.deadline)),
        challengerId: challenge.challenger_id,
        challengerName: challenge.challenger_name,
        challengedId: challenge.challenged_id,
        challengedName: challenge.challenged_name,
        challengerValue,
        challengedValue,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
