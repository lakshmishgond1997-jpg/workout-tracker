const RANGE_DAYS = { 7: 7, 30: 30, 90: 90 };

export const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function rangeStartDate(range) {
  const days = RANGE_DAYS[range];
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateKey(d);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function daysAgoKey(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateKey(d);
}

// mysql2 returns DATE columns as JS Date objects built at local midnight (not UTC) —
// serializing via toISOString()/JSON shifts the date back a day for timezones ahead
// of UTC. Normalize to a plain 'YYYY-MM-DD' string using local getters immediately
// after every fetch so downstream string/Map-keyed date logic (and the JSON response) is correct.
export function normalizeSqlDate(date) {
  if (!(date instanceof Date)) return date;
  return toDateKey(date);
}

