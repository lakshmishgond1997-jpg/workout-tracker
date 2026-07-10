export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'other',
];

// Order matters: more specific/exclusive groups are checked first so phrases
// like "leg curl" (legs) don't get caught by a bare "curl" (biceps) check.
const MUSCLE_GROUP_KEYWORDS = [
  ['triceps', ['tricep', 'pushdown', 'skull crusher', 'skullcrusher', 'close-grip', 'close grip', 'overhead triceps']],
  ['core', ['ab ', 'abs', 'core', 'crunch', 'plank', 'wood-chop', 'woodchop', 'leg raise', 'sit-up', 'situp', 'russian twist', 'knee raise']],
  ['legs', ['squat', 'lunge', 'calf', 'calves', 'hamstring', 'quad', 'glute', 'hip thrust', 'rdl', 'romanian deadlift', 'leg press', 'leg extension', 'leg curl']],
  ['shoulders', ['shoulder', 'delt', 'overhead press', 'ohp', 'lateral raise', 'front raise', 'face pull', 'military press', 'arnold press']],
  ['back', ['row', 'pulldown', 'pull-up', 'pullup', 'chin-up', 'lat ', 'deadlift', 'shrug', 'back extension']],
  ['chest', ['bench', 'chest', 'pec', 'fly', 'flye', 'push-up', 'pushup', 'dip', 'incline press', 'decline press']],
  ['biceps', ['bicep', 'curl']],
];

const COMPOUND_KEYWORDS = [
  'bench press',
  'squat',
  'deadlift',
  'row',
  'pull-up',
  'pullup',
  'chin-up',
  'overhead press',
  'shoulder press',
  'military press',
  'lunge',
  'hip thrust',
  'clean',
  'snatch',
  'thruster',
  'dip',
];

const PUSH_KEYWORDS = [
  'bench',
  'chest press',
  'shoulder press',
  'overhead press',
  'ohp',
  'push-up',
  'pushup',
  'dip',
  'tricep',
  'pushdown',
  'fly',
  'flye',
  'skull crusher',
];

const PULL_KEYWORDS = [
  'row',
  'pulldown',
  'pull-up',
  'pullup',
  'chin-up',
  'lat ',
  'face pull',
  'curl',
  'shrug',
  'deadlift',
];

export function classifyExercise(name) {
  const n = ` ${name.toLowerCase()} `;

  const muscleGroup =
    MUSCLE_GROUP_KEYWORDS.find(([, keywords]) => keywords.some((k) => n.includes(k)))?.[0] ??
    'other';

  const isCompound = COMPOUND_KEYWORDS.some((k) => n.includes(k));
  const isPush = PUSH_KEYWORDS.some((k) => n.includes(k));
  const isPull = !isPush && PULL_KEYWORDS.some((k) => n.includes(k));
  const movementType = isPush ? 'push' : isPull ? 'pull' : 'neither';

  return { muscleGroup, movementType, isCompound };
}
