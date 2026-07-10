import pool from '../config/db.js';
import { classifyExercise, MUSCLE_GROUPS } from '../utils/exerciseClassifier.js';
import { toDateKey, normalizeSqlDate } from '../utils/dateRange.js';

const epley = (weightKg, reps) => Number(weightKg) * (1 + reps / 30);

const normalizeRows = (rows) => rows.map((row) => ({ ...row, date: normalizeSqlDate(row.date) }));

export const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------- Raw fetchers ----------

export const getWorkingSetLogsForPrBoard = async (userId, startDate) => {
  const [rows] = startDate
    ? await pool.execute(
        `SELECT l.exercise_id, e.name AS exercise_name, e.workout_id, l.weight_kg, l.reps, l.date
         FROM logs l JOIN exercises e ON l.exercise_id = e.id
         WHERE l.user_id = ? AND l.is_warmup = 0 AND l.date >= ?
         ORDER BY l.exercise_id, l.weight_kg DESC, l.reps DESC, l.date ASC`,
        [userId, startDate]
      )
    : await pool.execute(
        `SELECT l.exercise_id, e.name AS exercise_name, e.workout_id, l.weight_kg, l.reps, l.date
         FROM logs l JOIN exercises e ON l.exercise_id = e.id
         WHERE l.user_id = ? AND l.is_warmup = 0
         ORDER BY l.exercise_id, l.weight_kg DESC, l.reps DESC, l.date ASC`,
        [userId]
      );
  return normalizeRows(rows);
};

export const getExerciseWorkingSetLogs = async (userId, exerciseId, startDate) => {
  const [rows] = startDate
    ? await pool.execute(
        'SELECT weight_kg, reps, date FROM logs WHERE user_id = ? AND exercise_id = ? AND is_warmup = 0 AND date >= ? ORDER BY date ASC',
        [userId, exerciseId, startDate]
      )
    : await pool.execute(
        'SELECT weight_kg, reps, date FROM logs WHERE user_id = ? AND exercise_id = ? AND is_warmup = 0 ORDER BY date ASC',
        [userId, exerciseId]
      );
  return normalizeRows(rows);
};

export const getAllWorkingSetLogsFlat = async (userId, startDate) => {
  const [rows] = startDate
    ? await pool.execute(
        `SELECT l.exercise_id, e.name AS exercise_name, l.weight_kg, l.reps, l.date
         FROM logs l JOIN exercises e ON l.exercise_id = e.id
         WHERE l.user_id = ? AND l.is_warmup = 0 AND l.date >= ?
         ORDER BY l.exercise_id, l.date ASC`,
        [userId, startDate]
      )
    : await pool.execute(
        `SELECT l.exercise_id, e.name AS exercise_name, l.weight_kg, l.reps, l.date
         FROM logs l JOIN exercises e ON l.exercise_id = e.id
         WHERE l.user_id = ? AND l.is_warmup = 0
         ORDER BY l.exercise_id, l.date ASC`,
        [userId]
      );
  return normalizeRows(rows);
};

export const getDistinctSessionDates = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT DISTINCT date FROM logs WHERE user_id = ? ORDER BY date ASC',
    [userId]
  );
  return rows.map((r) => normalizeSqlDate(r.date));
};

export const getAllExercisesWithLastLog = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT e.id, e.name, e.workout_id, MAX(l.date) AS last_date,
            (SELECT weight_kg FROM logs WHERE exercise_id = e.id AND user_id = ? AND is_warmup = 0
             ORDER BY date DESC, id DESC LIMIT 1) AS last_weight
     FROM exercises e
     LEFT JOIN logs l ON l.exercise_id = e.id AND l.user_id = ? AND l.is_warmup = 0
     WHERE e.user_id = ?
     GROUP BY e.id, e.name, e.workout_id`,
    [userId, userId, userId]
  );
  return rows.map((row) => ({ ...row, last_date: normalizeSqlDate(row.last_date) }));
};

export const getWarmupRows = async (userId, startDate) => {
  const [rows] = startDate
    ? await pool.execute(
        `SELECT exercise_id, date, is_warmup, set_number FROM logs
         WHERE user_id = ? AND date >= ? ORDER BY date ASC, exercise_id ASC, set_number ASC`,
        [userId, startDate]
      )
    : await pool.execute(
        `SELECT exercise_id, date, is_warmup, set_number FROM logs
         WHERE user_id = ? ORDER BY date ASC, exercise_id ASC, set_number ASC`,
        [userId]
      );
  return normalizeRows(rows);
};

// ---------- Shared computation helpers ----------

export function groupSessionBests(rows) {
  const byDate = new Map();
  for (const row of rows) {
    const w = Number(row.weight_kg);
    const existing = byDate.get(row.date);
    if (!existing || w > existing) byDate.set(row.date, w);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, weightKg]) => ({ date, weightKg }));
}

export function detectPlateau(sessionBests) {
  if (sessionBests.length < 4) return { plateaued: false, insufficientData: true };
  const last3 = sessionBests.slice(-3);
  const priorBest = Math.max(...sessionBests.slice(0, -3).map((s) => s.weightKg));
  const maxInLast3 = Math.max(...last3.map((s) => s.weightKg));
  const plateaued = maxInLast3 <= priorBest;
  return {
    plateaued,
    insufficientData: false,
    priorBest,
    maxInLast3,
    plateauDates: plateaued ? last3.map((s) => s.date) : [],
  };
}

// ---------- 1. PR Board ----------

export function computePrBoard(rows) {
  const byExercise = new Map();
  for (const row of rows) {
    if (!byExercise.has(row.exercise_id)) byExercise.set(row.exercise_id, row);
  }
  const now = new Date();
  const prs = [...byExercise.values()].map((row) => {
    const { muscleGroup, movementType, isCompound } = classifyExercise(row.exercise_name);
    const prDate = new Date(`${row.date}T00:00:00`);
    const daysAgo = (now - prDate) / (1000 * 60 * 60 * 24);
    return {
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      workoutId: row.workout_id,
      weightKg: Number(row.weight_kg),
      reps: row.reps,
      date: row.date,
      e1rm: Number(epley(row.weight_kg, row.reps).toFixed(1)),
      muscleGroup,
      movementType,
      isCompound,
      isRecentPr: daysAgo <= 7,
    };
  });
  prs.sort((a, b) => new Date(b.date) - new Date(a.date));
  return prs;
}

export function computePrHistory(rows) {
  let maxWeight = 0;
  const history = [];
  for (const row of rows) {
    const w = Number(row.weight_kg);
    if (w > maxWeight) {
      maxWeight = w;
      history.push({
        date: row.date,
        weightKg: w,
        reps: row.reps,
        e1rm: Number(epley(row.weight_kg, row.reps).toFixed(1)),
      });
    }
  }
  return history.reverse();
}

// ---------- 3. Weekly volume per muscle group ----------

export function computeVolumeByMuscleGroup(rows) {
  const thisWeekStart = getWeekStart(new Date());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const totals = {};
  for (const g of MUSCLE_GROUPS) totals[g] = { thisWeek: 0, lastWeek: 0 };

  for (const row of rows) {
    const { muscleGroup } = classifyExercise(row.exercise_name);
    const rowDate = new Date(`${row.date}T00:00:00`);
    const volume = Number(row.weight_kg) * row.reps;
    if (rowDate >= thisWeekStart) totals[muscleGroup].thisWeek += volume;
    else if (rowDate >= lastWeekStart) totals[muscleGroup].lastWeek += volume;
  }

  return MUSCLE_GROUPS.filter((g) => totals[g].thisWeek > 0 || totals[g].lastWeek > 0).map((g) => ({
    muscleGroup: g,
    thisWeek: Math.round(totals[g].thisWeek),
    lastWeek: Math.round(totals[g].lastWeek),
    dropped: totals[g].thisWeek < totals[g].lastWeek,
  }));
}

// ---------- 4. Plateau scan ----------

const FIX_SUGGESTIONS = {
  compound: ['Try a deload week', 'Check sleep and recovery', 'Reduce reps slightly and add weight next session'],
  isolation: ['Increase reps before adding weight', 'Add a second weekly session for this muscle group', 'Check your form and tempo'],
};

export function computePlateauScan(rows) {
  const byExercise = new Map();
  for (const row of rows) {
    if (!byExercise.has(row.exercise_id)) {
      byExercise.set(row.exercise_id, { exerciseName: row.exercise_name, logs: [] });
    }
    byExercise.get(row.exercise_id).logs.push(row);
  }

  const results = [];
  for (const [exerciseId, { exerciseName, logs }] of byExercise) {
    const sessionBests = groupSessionBests(logs);
    const plateau = detectPlateau(sessionBests);
    if (plateau.insufficientData || !plateau.plateaued) continue;
    const { isCompound } = classifyExercise(exerciseName);
    results.push({
      exerciseId,
      exerciseName,
      stuckAtWeight: plateau.maxInLast3,
      sessionsStuck: plateau.plateauDates.length,
      suggestedFixes: isCompound ? FIX_SUGGESTIONS.compound : FIX_SUGGESTIONS.isolation,
    });
  }
  return results;
}

// ---------- 5. Session consistency ----------

export function computeConsistency(allDates, asOfDate = new Date()) {
  const dates = allDates.map((d) => new Date(`${d}T00:00:00`));
  const streaks = [];
  let streakCount = 0;

  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      streakCount = 1;
      continue;
    }
    const gapDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
    if (gapDays <= 2) {
      streakCount++;
    } else {
      streaks.push(streakCount);
      streakCount = 1;
    }
  }
  if (dates.length > 0) streaks.push(streakCount);
  const longestStreak = streaks.length ? Math.max(...streaks) : 0;

  let currentStreak = 0;
  if (dates.length > 0) {
    const lastGap = (asOfDate - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
    currentStreak = lastGap <= 2 ? streaks[streaks.length - 1] : 0;
  }

  const heatmapCutoff = new Date(asOfDate);
  heatmapCutoff.setDate(heatmapCutoff.getDate() - 90);
  const heatmapDates = allDates.filter((d) => new Date(`${d}T00:00:00`) >= heatmapCutoff);

  const totalWeeks = dates.length > 0 ? Math.max(1, (asOfDate.getTime() - dates[0]) / (1000 * 60 * 60 * 24 * 7)) : 1;
  const avgSessionsPerWeek = allDates.length > 0 ? Number((allDates.length / totalWeeks).toFixed(1)) : 0;

  return { heatmapDates, currentStreak, longestStreak, avgSessionsPerWeek, totalSessions: allDates.length };
}

// ---------- 6 + 10. Push/pull balance ----------

export function computePushPullBalance(rows) {
  const weekMap = new Map();
  for (const row of rows) {
    const { movementType } = classifyExercise(row.exercise_name);
    if (movementType === 'neither') continue;
    const key = toDateKey(getWeekStart(new Date(`${row.date}T00:00:00`)));
    if (!weekMap.has(key)) weekMap.set(key, { push: 0, pull: 0 });
    const volume = Number(row.weight_kg) * row.reps;
    weekMap.get(key)[movementType] += volume;
  }

  const weeklyTrend = [...weekMap.entries()]
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([week, v]) => ({
      week,
      push: Math.round(v.push),
      pull: Math.round(v.pull),
      ratio: v.pull > 0 ? Number((v.push / v.pull).toFixed(2)) : null,
    }))
    .slice(-8);

  const current = weeklyTrend[weeklyTrend.length - 1];
  let imbalance = null;
  if (current && current.push > 0 && current.pull > 0) {
    const diff = (current.push - current.pull) / Math.max(current.push, current.pull);
    if (diff > 0.2) imbalance = 'push-exceeds-pull';
    else if (diff < -0.2) imbalance = 'pull-exceeds-push';
  }

  return { currentRatio: current ? current.ratio : null, imbalance, weeklyTrend };
}

// ---------- 6. Strength ratios ----------

export function computeRatios(rows) {
  const benchRows = rows.filter((r) => /bench/i.test(r.exercise_name));
  const squatRows = rows.filter((r) => /squat/i.test(r.exercise_name));
  const benchMax = benchRows.length ? Math.max(...benchRows.map((r) => Number(r.weight_kg))) : null;
  const squatMax = squatRows.length ? Math.max(...squatRows.map((r) => Number(r.weight_kg))) : null;
  const benchVsSquat = benchMax && squatMax ? Number((benchMax / squatMax).toFixed(2)) : null;

  let compoundVolume = 0;
  let isolationVolume = 0;
  for (const row of rows) {
    const { isCompound } = classifyExercise(row.exercise_name);
    const volume = Number(row.weight_kg) * row.reps;
    if (isCompound) compoundVolume += volume;
    else isolationVolume += volume;
  }

  return {
    benchMax,
    squatMax,
    benchVsSquat,
    compoundVolume: Math.round(compoundVolume),
    isolationVolume: Math.round(isolationVolume),
  };
}

// ---------- 7. Bodyweight correlation ----------

export function computeBodyweightCorrelation(bodyweightRows, workingSetRows) {
  const bwByWeek = new Map();
  for (const row of bodyweightRows) {
    const week = toDateKey(getWeekStart(new Date(`${row.date}T00:00:00`)));
    bwByWeek.set(week, Number(row.weight_kg));
  }

  const byExerciseWeek = new Map();
  for (const row of workingSetRows) {
    const week = toDateKey(getWeekStart(new Date(`${row.date}T00:00:00`)));
    const e1rm = epley(row.weight_kg, row.reps);
    const key = `${row.exercise_id}_${week}`;
    if (!byExerciseWeek.has(key) || e1rm > byExerciseWeek.get(key)) byExerciseWeek.set(key, e1rm);
  }
  const strengthByWeek = new Map();
  for (const [key, e1rm] of byExerciseWeek) {
    const week = key.split('_')[1];
    strengthByWeek.set(week, (strengthByWeek.get(week) || 0) + e1rm);
  }

  const weeks = [...new Set([...bwByWeek.keys(), ...strengthByWeek.keys()])].sort();
  const series = weeks.map((week) => ({
    week,
    bodyweightKg: bwByWeek.get(week) ?? null,
    totalStrength: strengthByWeek.has(week) ? Math.round(strengthByWeek.get(week)) : null,
  }));

  const bwPoints = series.filter((s) => s.bodyweightKg != null);
  const strPoints = series.filter((s) => s.totalStrength != null);
  let outcome = null;
  if (bwPoints.length >= 2 && strPoints.length >= 2) {
    const bwDelta = bwPoints[bwPoints.length - 1].bodyweightKg - bwPoints[0].bodyweightKg;
    const strDelta = strPoints[strPoints.length - 1].totalStrength - strPoints[0].totalStrength;
    const bwUp = bwDelta > 0.5;
    const bwDown = bwDelta < -0.5;
    const bwStable = !bwUp && !bwDown;
    const strUp = strDelta > 0;
    const strDown = strDelta < 0;
    if (bwUp && strUp) outcome = { label: 'Muscle gain', tone: 'success' };
    else if (bwUp && !strUp && !strDown) outcome = { label: 'Fat gain risk', tone: 'warning' };
    else if (bwStable && strUp) outcome = { label: 'Clean recomp', tone: 'success' };
    else if ((bwUp || bwStable) && strDown) outcome = { label: 'Overtrained or undereating protein', tone: 'danger' };
  }

  return { series, outcome };
}

// ---------- 8. e1RM tracker ----------

export function computeE1rmTrend(rows) {
  const byDate = new Map();
  for (const row of rows) {
    const e1rm = epley(row.weight_kg, row.reps);
    const existing = byDate.get(row.date);
    if (!existing || e1rm > existing) byDate.set(row.date, e1rm);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, e1rm]) => ({ date, e1rm: Number(e1rm.toFixed(1)) }));
}

export function computeTopMovers(rows) {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;

  const byExercise = new Map();
  for (const row of rows) {
    const d = new Date(`${row.date}T00:00:00`);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthKey !== thisMonthKey && monthKey !== lastMonthKey) continue;
    if (!byExercise.has(row.exercise_id)) {
      byExercise.set(row.exercise_id, { exerciseName: row.exercise_name, thisMonth: 0, lastMonth: 0 });
    }
    const e1rm = epley(row.weight_kg, row.reps);
    const entry = byExercise.get(row.exercise_id);
    if (monthKey === thisMonthKey) entry.thisMonth = Math.max(entry.thisMonth, e1rm);
    else entry.lastMonth = Math.max(entry.lastMonth, e1rm);
  }

  return [...byExercise.entries()]
    .filter(([, v]) => v.lastMonth > 0 && v.thisMonth > 0)
    .map(([exerciseId, v]) => ({
      exerciseId,
      exerciseName: v.exerciseName,
      thisMonthE1rm: Number(v.thisMonth.toFixed(1)),
      lastMonthE1rm: Number(v.lastMonth.toFixed(1)),
      percentIncrease: Number((((v.thisMonth - v.lastMonth) / v.lastMonth) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.percentIncrease - a.percentIncrease)
    .slice(0, 5);
}

export function computeKeyLiftE1rm(rows) {
  const patterns = {
    bench: /bench/i,
    squat: /squat/i,
    deadlift: /deadlift/i,
    shoulderPress: /shoulder press|ohp|overhead press/i,
  };
  const result = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const matching = rows.filter((r) => pattern.test(r.exercise_name));
    result[key] = matching.length
      ? Number(Math.max(...matching.map((r) => epley(r.weight_kg, r.reps))).toFixed(1))
      : null;
  }
  return result;
}

// ---------- 9. Rest vs performance ----------

export function computeRestVsPerformance(rows) {
  const byExercise = new Map();
  for (const row of rows) {
    if (!byExercise.has(row.exercise_id)) {
      byExercise.set(row.exercise_id, { exerciseName: row.exercise_name, logs: [] });
    }
    byExercise.get(row.exercise_id).logs.push(row);
  }

  const perExercise = [];
  const overallRest = [];
  const overallTrain = [];

  for (const [exerciseId, { exerciseName, logs }] of byExercise) {
    const sessionBests = groupSessionBests(logs);
    const restWeights = [];
    const trainWeights = [];
    for (let i = 1; i < sessionBests.length; i++) {
      const gapDays =
        (new Date(`${sessionBests[i].date}T00:00:00`) - new Date(`${sessionBests[i - 1].date}T00:00:00`)) /
        (1000 * 60 * 60 * 24);
      if (gapDays >= 2) restWeights.push(sessionBests[i].weightKg);
      else trainWeights.push(sessionBests[i].weightKg);
    }
    if (restWeights.length === 0 || trainWeights.length === 0) continue;
    const restAvg = restWeights.reduce((a, b) => a + b, 0) / restWeights.length;
    const trainAvg = trainWeights.reduce((a, b) => a + b, 0) / trainWeights.length;
    overallRest.push(...restWeights);
    overallTrain.push(...trainWeights);
    perExercise.push({
      exerciseId,
      exerciseName,
      restAvg: Number(restAvg.toFixed(1)),
      trainAvg: Number(trainAvg.toFixed(1)),
      recoveryWarning: restAvg >= trainAvg * 1.05,
    });
  }

  let overall = null;
  if (overallRest.length && overallTrain.length) {
    const restAvg = overallRest.reduce((a, b) => a + b, 0) / overallRest.length;
    const trainAvg = overallTrain.reduce((a, b) => a + b, 0) / overallTrain.length;
    overall = {
      restAvg: Number(restAvg.toFixed(1)),
      trainAvg: Number(trainAvg.toFixed(1)),
      recoveryWarning: restAvg >= trainAvg * 1.05,
    };
  }

  return { perExercise, overall };
}

// ---------- 11. Exercise consistency ----------

export function computeExerciseConsistency(rows) {
  const now = new Date();
  return rows
    .map((row) => {
      const daysSince = row.last_date
        ? Math.floor((now - new Date(`${row.last_date}T00:00:00`)) / (1000 * 60 * 60 * 24))
        : null;
      return {
        exerciseId: row.id,
        exerciseName: row.name,
        workoutId: row.workout_id,
        lastDate: row.last_date,
        lastWeight: row.last_weight != null ? Number(row.last_weight) : null,
        daysSinceLastLogged: daysSince,
        flagged: daysSince != null && daysSince >= 21,
      };
    })
    .filter((r) => r.flagged);
}

// ---------- 12. Soreness analysis ----------

export function computeSorenessAnalysis(sorenessRows, workingSetRows) {
  const heatmap = sorenessRows.map((r) => ({ date: r.date, muscleGroup: r.muscle_group, rating: r.rating }));

  const byMuscle = new Map();
  for (const row of sorenessRows) {
    if (!byMuscle.has(row.muscle_group)) byMuscle.set(row.muscle_group, []);
    byMuscle.get(row.muscle_group).push(row);
  }

  const overtrainingWarnings = [];
  for (const [muscleGroup, entries] of byMuscle) {
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].rating >= 7 && entries[i - 1].rating >= 7) {
        overtrainingWarnings.push({ muscleGroup, dates: [entries[i - 1].date, entries[i].date] });
        break;
      }
    }
  }

  const correlations = [];
  for (const [muscleGroup, entries] of byMuscle) {
    const highRatingDates = entries.filter((e) => e.rating >= 7).map((e) => e.date);
    if (!highRatingDates.length) continue;
    const muscleLogs = workingSetRows.filter((r) => classifyExercise(r.exercise_name).muscleGroup === muscleGroup);
    if (!muscleLogs.length) continue;
    const baselineAvg = muscleLogs.reduce((sum, r) => sum + Number(r.weight_kg), 0) / muscleLogs.length;
    const nextSessionWeights = [];
    for (const hrDate of highRatingDates) {
      const after = muscleLogs
        .filter((r) => new Date(r.date) > new Date(hrDate))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (after.length) nextSessionWeights.push(Number(after[0].weight_kg));
    }
    if (!nextSessionWeights.length) continue;
    const nextAvg = nextSessionWeights.reduce((a, b) => a + b, 0) / nextSessionWeights.length;
    correlations.push({
      muscleGroup,
      baselineAvg: Number(baselineAvg.toFixed(1)),
      nextSessionAvg: Number(nextAvg.toFixed(1)),
      performanceDrop: nextAvg < baselineAvg * 0.95,
    });
  }

  return { heatmap, overtrainingWarnings, correlations };
}

// ---------- 13. Warm-up efficiency ----------

export function computeWarmupEfficiency(rows) {
  const hasData = rows.some((r) => r.is_warmup);
  if (!hasData) return { hasData: false, sessions: [] };

  const bySessionExercise = new Map();
  for (const row of rows) {
    const key = `${row.date}_${row.exercise_id}`;
    if (!bySessionExercise.has(key)) {
      bySessionExercise.set(key, { date: row.date, exerciseId: row.exercise_id, warmupCount: 0 });
    }
    if (row.is_warmup) bySessionExercise.get(key).warmupCount++;
  }

  const sessions = [...bySessionExercise.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
  return { hasData: true, sessions };
}

// ---------- Summary card ----------

export function computeSummary(prRows, allDates, keyLiftE1rm, pushPullCurrentRatio) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const prBoard = computePrBoard(prRows);
  const prsThisMonth = prBoard.filter((pr) => {
    const d = new Date(`${pr.date}T00:00:00`);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  const { currentStreak } = computeConsistency(allDates);

  return {
    prsThisMonth,
    currentStreak,
    benchE1rm: keyLiftE1rm.bench,
    pushPullRatio: pushPullCurrentRatio,
  };
}

// ---------- Best month ever (used by Buddy Compare) ----------

export function computeBestMonthEver(rows) {
  const byMonth = new Map();
  for (const row of rows) {
    const d = new Date(`${row.date}T00:00:00`);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const volume = Number(row.weight_kg) * row.reps;
    byMonth.set(key, (byMonth.get(key) || 0) + volume);
  }
  let bestMonth = null;
  let bestVolume = 0;
  for (const [month, volume] of byMonth) {
    if (volume > bestVolume) {
      bestVolume = volume;
      bestMonth = month;
    }
  }
  return { month: bestMonth, volume: Math.round(bestVolume) };
}
