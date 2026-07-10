import {
  createBodyweightLog,
  getBodyweightLogs,
  getLatestBodyweightLog,
  deleteBodyweightLog,
} from '../models/bodyweight.model.js';
import { rangeStartDate } from '../utils/dateRange.js';

export const addBodyweightLog = async (req, res) => {
  const { date, weight_kg } = req.body;

  if (!date || !weight_kg || Number(weight_kg) <= 0) {
    return res.status(400).json({ message: 'Missing or invalid date/weight_kg' });
  }

  try {
    const result = await createBodyweightLog(req.user.id, date, Number(weight_kg));
    return res.status(201).json({
      message: 'Bodyweight logged successfully',
      bodyweightLog: { id: result.insertId, date, weight_kg: Number(weight_kg) },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Bodyweight already logged for this date' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getBodyweight = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const bodyweightLogs = await getBodyweightLogs(req.user.id, startDate);
    const latest = await getLatestBodyweightLog(req.user.id);
    return res.status(200).json({ bodyweightLogs, latest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeBodyweightLog = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteBodyweightLog(id, req.user.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bodyweight log not found' });
    }
    return res.status(200).json({ message: 'Bodyweight log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
