import { isNewAllTimeMax, getExerciseNameById } from '../models/log.model.js';
import { getAcceptedBuddyRows } from '../models/buddy.model.js';
import { createNotification } from '../models/notification.model.js';

export async function notifyBuddiesOfPr(userId, exerciseId, weightKg, logId) {
  const isMax = await isNewAllTimeMax(userId, exerciseId, weightKg, logId);
  if (!isMax) return;

  const exerciseName = await getExerciseNameById(exerciseId);
  const buddyRows = await getAcceptedBuddyRows(userId);

  for (const rel of buddyRows) {
    const wantsNotif =
      rel.requester_id === userId
        ? rel.recipient_wants_pr_notifs_from_requester
        : rel.requester_wants_pr_notifs_from_recipient;
    if (!wantsNotif) continue;

    await createNotification(rel.buddy_id, 'buddy_pr', {
      relatedUserId: userId,
      exerciseName,
      valueKg: weightKg,
    });
  }
}
