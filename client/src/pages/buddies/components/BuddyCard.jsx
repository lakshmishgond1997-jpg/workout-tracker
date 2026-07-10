const HIDDEN = 'hidden'

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

function isToday(dateStr) {
  if (!dateStr) return false
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return dateStr === `${y}-${m}-${d}`
}

function BuddyCard({ buddy, onClick, onRemove }) {
  const active = isToday(buddy.lastWorkoutDate)

  return (
    <div
      onClick={onClick}
      className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4 flex items-center gap-3 cursor-pointer"
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-(--color-accent-soft) text-(--color-accent) font-bold flex items-center justify-center">
          {initials(buddy.name)}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-(--color-card) ${
            active ? 'bg-(--color-success)' : 'bg-(--color-text-muted)'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-(--color-text) truncate">{buddy.name}</p>
        <p className="text-xs text-(--color-text-muted) truncate">{buddy.email}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-(--color-text-muted)">
          <span>🔥 {buddy.currentStreak === HIDDEN ? '🔒' : `${buddy.currentStreak}d streak`}</span>
          <span>💪 {buddy.thisWeekVolume === HIDDEN ? '🔒' : `${buddy.thisWeekVolume}kg this wk`}</span>
        </div>
        {buddy.topPrThisMonth === HIDDEN ? (
          <p className="text-xs text-(--color-text-muted) mt-1">🏆 🔒 Hidden</p>
        ) : (
          buddy.topPrThisMonth && (
            <p className="text-xs text-(--color-success) mt-1">
              🏆 {buddy.topPrThisMonth.exerciseName} {buddy.topPrThisMonth.weightKg}kg
            </p>
          )
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label="Remove buddy"
          className="shrink-0 w-8 h-8 rounded-full text-(--color-text-muted) text-lg leading-none flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default BuddyCard
