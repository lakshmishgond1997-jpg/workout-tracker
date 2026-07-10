import { upsertSorenessLog, getSorenessLogs } from '../models/soreness.model.js';
import { MUSCLE_GROUPS } from '../utils/exerciseClassifier.js';
import { rangeStartDate } from '../utils/dateRange.js';

export const addSorenessLog = async (req, res) => {
  const { date, muscle_group, rating } = req.body;

  if (!date || !muscle_group || !MUSCLE_GROUPS.includes(muscle_group)) {
    return res.status(400).json({ message: 'Missing or invalid date/muscle_group' });
  }
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 10) {
    return res.status(400).json({ message: 'rating must be an integer between 1 and 10' });
  }

  try {
    await upsertSorenessLog(req.user.id, date, muscle_group, numericRating);
    return res.status(201).json({
      message: 'Soreness logged successfully',
      sorenessLog: { date, muscle_group, rating: numericRating },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSoreness = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const sorenessLogs = await getSorenessLogs(req.user.id, startDate);
    return res.status(200).json({ sorenessLogs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
