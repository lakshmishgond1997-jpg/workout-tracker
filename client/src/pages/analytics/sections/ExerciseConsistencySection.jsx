import { useEffect, useState } from 'react'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

function ExerciseConsistencySection() {
  const [flagged, setFlagged] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/analytics/exercise-consistency')
      .then(({ data }) => setFlagged(data.flagged))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!flagged?.length) return <EmptyState message="Nothing forgotten — every exercise has been logged recently." />

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-(--color-text-muted)">Always checks your full history</p>
      {flagged.map((ex) => (
        <div key={ex.exerciseId} className="rounded-xl bg-(--color-warning-soft) border border-(--color-warning) p-3">
          <p className="font-semibold text-(--color-text)">{ex.exerciseName}</p>
          <p className="text-xs text-(--color-text-muted) mt-0.5">
            Not logged in {ex.daysSinceLastLogged} days — did you drop this intentionally or forget?
          </p>
          <p className="text-xs text-(--color-text-muted) mt-1">
            Last: {ex.lastDate} at {ex.lastWeight}kg
          </p>
        </div>
      ))}
    </div>
  )
}

export default ExerciseConsistencySection
