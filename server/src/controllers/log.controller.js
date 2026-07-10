import {
  createLog,
  getLogsByExerciseId,
  getLogsBySession,
  deleteLog,
  updateLog,
} from '../models/log.model.js';
import { notifyBuddiesOfPr } from '../services/buddyPr.service.js';

export const addLog = async (req, res) => {
  const { exerciseId, date, setNumber, weight_kg, reps, is_warmup } = req.body;
  if (exerciseId == null || !date || setNumber == null || weight_kg == null || reps == null) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const userId = req.user.id;

  try {
    const log = await createLog(
      userId,
      exerciseId,
      date,
      setNumber,
      weight_kg,
      reps,
      Boolean(is_warmup)
    );
    if (!is_warmup) {
      notifyBuddiesOfPr(userId, exerciseId, weight_kg, log.insertId).catch((err) =>
        console.error('notifyBuddiesOfPr failed:', err)
      );
    }

    return res
      .status(201)
      .json({ message: 'Log created successfully', logId: log.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: `Set ${setNumber} is already logged for this exercise today`,
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLogsByExercise = async (req, res) => {
  const { exerciseId } = req.params;
  const userId = req.user.id;

  try {
    const logs = await getLogsByExerciseId(userId, exerciseId);
    return res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLogsBySessionDate = async (req, res) => {
  const { date } = req.params;
  const userId = req.user.id;

  try {
    const logs = await getLogsBySession(userId, date);
    return res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeLog = async (req, res) => {
  const { logId } = req.params;
  const userId = req.user.id;

  try {
    const result = await deleteLog(logId, userId);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }
    return res.status(200).json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const editLog = async (req, res) => {
  const { logId } = req.params;
  const { weight_kg, reps } = req.body;
  if (weight_kg == null || reps == null) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const userId = req.user.id;
  try {
    const result = await updateLog(logId, userId, weight_kg, reps);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }
    return res.status(200).json({ message: 'Log updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
