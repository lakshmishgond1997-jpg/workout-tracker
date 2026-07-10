import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

function WarmupEfficiencySection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    setLoading(true)
    api
      .get('/analytics/warmup-efficiency', { params: { range: dateRange } })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!data?.hasData) {
    return (
      <EmptyState message="Not enough data yet — tick “This is a warm-up set” when logging sets to start tracking warm-up efficiency." />
    )
  }

  const recent = data.sessions.slice(-10)
  const trendingUp =
    recent.length >= 4 &&
    recent.slice(-2).every((s) => s.warmupCount) &&
    recent[recent.length - 1].warmupCount > recent[0].warmupCount

  return (
    <div className="flex flex-col gap-3">
      {trendingUp && (
        <p className="text-xs text-(--color-warning)">
          ⚠ Warm-up sets have been increasing — possible sign of fatigue or a deload needed.
        </p>
      )}
      <div className="flex flex-col divide-y divide-(--color-border)">
        {recent.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-(--color-text)">{s.date}</span>
            <span className="text-(--color-text-muted) text-xs">{s.warmupCount} warm-up sets</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WarmupEfficiencySection
