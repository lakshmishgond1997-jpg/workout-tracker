import {
  getWorkingSetLogsForPrBoard,
  getExerciseWorkingSetLogs,
  getAllWorkingSetLogsFlat,
  getDistinctSessionDates,
  getAllExercisesWithLastLog,
  getWarmupRows,
  groupSessionBests,
  detectPlateau,
  computePrBoard,
  computePrHistory,
  computeVolumeByMuscleGroup,
  computePlateauScan,
  computeConsistency,
  computePushPullBalance,
  computeRatios,
  computeBodyweightCorrelation,
  computeE1rmTrend,
  computeTopMovers,
  computeKeyLiftE1rm,
  computeRestVsPerformance,
  computeExerciseConsistency,
  computeSorenessAnalysis,
  computeWarmupEfficiency,
  computeSummary,
} from '../models/analytics.model.js';
import { getBodyweightLogs } from '../models/bodyweight.model.js';
import { getSorenessLogs } from '../models/soreness.model.js';
import { rangeStartDate, daysAgoKey } from '../utils/dateRange.js';

const handleError = (res, error) => {
  res.status(500).json({ message: 'Server error', error: error.message });
};

export const getPrBoard = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const rows = await getWorkingSetLogsForPrBoard(req.user.id, startDate);
    return res.status(200).json({ prs: computePrBoard(rows) });
  } catch (error) {
    handleError(res, error);
  }
};

export const getPrHistory = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const rows = await getExerciseWorkingSetLogs(req.user.id, req.params.exerciseId, startDate);
    return res.status(200).json({ history: computePrHistory(rows) });
  } catch (error) {
    handleError(res, error);
  }
};

export const getOverloadChart = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const allRows = await getExerciseWorkingSetLogs(req.user.id, exerciseId);
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

export const getVolumeByMuscleGroup = async (req, res) => {
  try {
    const rows = await getAllWorkingSetLogsFlat(req.user.id, daysAgoKey(14));
    return res.status(200).json({ volumeByMuscleGroup: computeVolumeByMuscleGroup(rows) });
  } catch (error) {
    handleError(res, error);
  }
};

export const getPlateaus = async (req, res) => {
  try {
    const rows = await getAllWorkingSetLogsFlat(req.user.id, null);
    return res.status(200).json({ plateaus: computePlateauScan(rows) });
  } catch (error) {
    handleError(res, error);
  }
};

export const getConsistency = async (req, res) => {
  try {
    const allDates = await getDistinctSessionDates(req.user.id);
    return res.status(200).json(computeConsistency(allDates));
  } catch (error) {
    handleError(res, error);
  }
};

export const getPushPullBalance = async (req, res) => {
  try {
    const rows = await getAllWorkingSetLogsFlat(req.user.id, daysAgoKey(56));
    return res.status(200).json(computePushPullBalance(rows));
  } catch (error) {
    handleError(res, error);
  }
};

export const getRatios = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const rows = await getAllWorkingSetLogsFlat(req.user.id, startDate);
    return res.status(200).json(computeRatios(rows));
  } catch (error) {
    handleError(res, error);
  }
};

export const getBodyweightCorrelation = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const [bodyweightRows, workingSetRows] = await Promise.all([
      getBodyweightLogs(req.user.id, startDate),
      getAllWorkingSetLogsFlat(req.user.id, startDate),
    ]);
    return res.status(200).json(computeBodyweightCorrelation(bodyweightRows, workingSetRows));
  } catch (error) {
    handleError(res, error);
  }
};

export const getE1rm = async (req, res) => {
  try {
    const allRows = await getAllWorkingSetLogsFlat(req.user.id, null);
    const startDate = rangeStartDate(req.query.range);
    const rangeRows = startDate ? allRows.filter((r) => r.date >= startDate) : allRows;

    const { exerciseId } = req.query;
    const trendRows = exerciseId ? rangeRows.filter((r) => r.exercise_id === Number(exerciseId)) : rangeRows;

    return res.status(200).json({
      trend: computeE1rmTrend(trendRows),
      topMovers: computeTopMovers(allRows),
      keyLifts: computeKeyLiftE1rm(allRows),
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const getRestVsPerformance = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const rows = await getAllWorkingSetLogsFlat(req.user.id, startDate);
    return res.status(200).json(computeRestVsPerformance(rows));
  } catch (error) {
    handleError(res, error);
  }
};

export const getExerciseConsistency = async (req, res) => {
  try {
    const rows = await getAllExercisesWithLastLog(req.user.id);
    return res.status(200).json({ flagged: computeExerciseConsistency(rows) });
  } catch (error) {
    handleError(res, error);
  }
};

export const getSorenessAnalysis = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const [sorenessRows, workingSetRows] = await Promise.all([
      getSorenessLogs(req.user.id, startDate),
      getAllWorkingSetLogsFlat(req.user.id, startDate),
    ]);
    return res.status(200).json(computeSorenessAnalysis(sorenessRows, workingSetRows));
  } catch (error) {
    handleError(res, error);
  }
};

export const getWarmupEfficiency = async (req, res) => {
  try {
    const startDate = rangeStartDate(req.query.range);
    const rows = await getWarmupRows(req.user.id, startDate);
    return res.status(200).json(computeWarmupEfficiency(rows));
  } catch (error) {
    handleError(res, error);
  }
};

export const getSummary = async (req, res) => {
  try {
    const [prRows, allDates, allTimeRows] = await Promise.all([
      getWorkingSetLogsForPrBoard(req.user.id),
      getDistinctSessionDates(req.user.id),
      getAllWorkingSetLogsFlat(req.user.id, null),
    ]);
    const keyLiftE1rm = computeKeyLiftE1rm(allTimeRows);

    const startDate = rangeStartDate(req.query.range);
    const rangeRows = startDate ? allTimeRows.filter((r) => r.date >= startDate) : allTimeRows;
    const { currentRatio } = computePushPullBalance(rangeRows);

    return res.status(200).json(computeSummary(prRows, allDates, keyLiftE1rm, currentRatio));
  } catch (error) {
    handleError(res, error);
  }
};
