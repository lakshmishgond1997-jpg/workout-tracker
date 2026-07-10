const DAY_MS = 1000 * 60 * 60 * 24

function buildDays(weeks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Align the grid end to the coming Saturday so full week-columns render cleanly.
  const endOffset = 6 - today.getDay()
  const end = new Date(today.getTime() + endOffset * DAY_MS)
  const totalDays = weeks * 7
  const days = []
  for (let i = totalDays - 1; i >= 0; i--) {
    days.push(new Date(end.getTime() - i * DAY_MS))
  }
  return days
}

const toDateKey = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function CalendarHeatmap({ activeDates, weeks = 13 }) {
  const activeSet = new Set(activeDates)
  const days = buildDays(weeks)
  const today = toDateKey(new Date())

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)`, gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}
    >
      {days.map((d) => {
        const key = toDateKey(d)
        const isActive = activeSet.has(key)
        const isFuture = key > today
        return (
          <div
            key={key}
            title={key}
            className="aspect-square rounded-sm bg-(--color-accent)"
            style={{ opacity: isFuture ? 0 : isActive ? 1 : 0.08 }}
          />
        )
      })}
    </div>
  )
}

export default CalendarHeatmap
