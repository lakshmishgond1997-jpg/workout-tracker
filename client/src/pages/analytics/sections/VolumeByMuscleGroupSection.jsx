import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

function VolumeByMuscleGroupSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/analytics/volume-by-muscle-group')
      .then(({ data }) => setData(data.volumeByMuscleGroup))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!data?.length) return <EmptyState message="No sets logged in the last two weeks yet." />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-(--color-text-muted)">Always compares this week vs last week</p>
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="muscleGroup" stroke="var(--color-text-muted)" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={36} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--color-text)' }}
            />
            <Bar dataKey="thisWeek" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lastWeek" fill="var(--color-text-muted)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col divide-y divide-(--color-border)">
        {data.map((row) => (
          <div key={row.muscleGroup} className="flex items-center justify-between py-1.5 text-sm">
            <span className={row.dropped ? 'text-(--color-danger) font-medium capitalize' : 'text-(--color-text) capitalize'}>
              {row.dropped && '↓ '}
              {row.muscleGroup}
            </span>
            <span className="text-(--color-text-muted) text-xs">
              {row.thisWeek}kg this wk · {row.lastWeek}kg last wk
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VolumeByMuscleGroupSection
