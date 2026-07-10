import { useEffect, useState } from 'react'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

function PlateauDetectionSection() {
  const [plateaus, setPlateaus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/analytics/plateaus')
      .then(({ data }) => setPlateaus(data.plateaus))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!plateaus?.length) return <EmptyState message="No plateaus detected — keep it up!" />

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-(--color-text-muted)">Always scans your full history</p>
      {plateaus.map((p) => (
        <div key={p.exerciseId} className="rounded-xl bg-(--color-warning-soft) border border-(--color-warning) p-3">
          <p className="font-semibold text-(--color-text)">⚠ {p.exerciseName}</p>
          <p className="text-xs text-(--color-text-muted) mt-0.5">
            Stuck at {p.stuckAtWeight}kg for {p.sessionsStuck} sessions
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {p.suggestedFixes.map((fix, i) => (
              <li key={i} className="text-xs text-(--color-text)">
                • {fix}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default PlateauDetectionSection
