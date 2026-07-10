import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

function RestVsPerformanceSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    setLoading(true)
    api
      .get('/analytics/rest-vs-performance', { params: { range: dateRange } })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!data?.overall) return <EmptyState message="Not enough session history yet to compare rest vs training days." />

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-xl border p-3 ${
          data.overall.recoveryWarning
            ? 'bg-(--color-warning-soft) border-(--color-warning)'
            : 'bg-(--color-card-alt) border-(--color-border)'
        }`}
      >
        <p className="text-sm font-semibold text-(--color-text)">Overall</p>
        <p className="text-xs text-(--color-text-muted) mt-1">
          After rest: {data.overall.restAvg}kg avg · After training: {data.overall.trainAvg}kg avg
        </p>
        {data.overall.recoveryWarning && (
          <p className="text-xs text-(--color-warning) mt-1">
            ⚠ Consistently better after rest days — you may need more rest between sessions
          </p>
        )}
      </div>

      {data.perExercise.length > 0 && (
        <div className="flex flex-col divide-y divide-(--color-border)">
          {data.perExercise.map((ex) => (
            <div key={ex.exerciseId} className="py-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-(--color-text)">{ex.exerciseName}</span>
                {ex.recoveryWarning && <span className="text-(--color-warning) text-xs">⚠</span>}
              </div>
              <p className="text-xs text-(--color-text-muted)">
                Rest: {ex.restAvg}kg · Train: {ex.trainAvg}kg
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RestVsPerformanceSection
