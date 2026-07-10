import { useEffect, useState } from 'react'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'
import CalendarHeatmap from '../components/CalendarHeatmap'

function ConsistencySection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/analytics/consistency')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!data?.totalSessions) return <EmptyState message="No sessions logged yet." />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-(--color-text-muted)">Streaks are all-time · heatmap always shows the last 3 months</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-2.5 text-center">
          <p className="text-lg font-bold text-(--color-text)">{data.currentStreak}</p>
          <p className="text-xs text-(--color-text-muted)">Current streak</p>
        </div>
        <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-2.5 text-center">
          <p className="text-lg font-bold text-(--color-text)">{data.longestStreak}</p>
          <p className="text-xs text-(--color-text-muted)">Longest streak</p>
        </div>
        <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-2.5 text-center">
          <p className="text-lg font-bold text-(--color-text)">{data.avgSessionsPerWeek}</p>
          <p className="text-xs text-(--color-text-muted)">Sessions/week</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-(--color-text-muted) mb-1.5">Last 3 months</p>
        <CalendarHeatmap activeDates={data.heatmapDates} weeks={13} />
      </div>
    </div>
  )
}

export default ConsistencySection
