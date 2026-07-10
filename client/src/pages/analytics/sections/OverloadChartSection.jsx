import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'
import OverloadLineChart from '../../../components/charts/OverloadLineChart'

function OverloadChartSection() {
  const [exercises, setExercises] = useState([])
  const [exerciseId, setExerciseId] = useState('')
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    api.get('/analytics/pr-board').then(({ data }) => {
      setExercises(data.prs.map((p) => ({ id: p.exerciseId, name: p.exerciseName })))
      if (data.prs.length) setExerciseId(String(data.prs[0].exerciseId))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!exerciseId) return
    api
      .get(`/analytics/overload/${exerciseId}`, { params: { range: dateRange } })
      .then(({ data }) => setChartData(data))
  }, [exerciseId, dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!exercises.length) return <EmptyState message="No logged exercises yet." />

  const series = chartData?.series || []

  return (
    <div className="flex flex-col gap-3">
      <select
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
        className="w-full h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>

      <OverloadLineChart series={series} plateauDates={chartData?.plateauDates} target={chartData?.target} />

      {chartData?.plateauDates?.length > 0 && (
        <p className="text-xs text-(--color-warning)">⚠ Plateau detected in the last 3 sessions (orange).</p>
      )}
    </div>
  )
}

export default OverloadChartSection
