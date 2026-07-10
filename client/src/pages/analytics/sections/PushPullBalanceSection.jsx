import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

const IMBALANCE_MESSAGES = {
  'push-exceeds-pull': 'Push exceeds pull by 20%+ — back lag risk',
  'pull-exceeds-push': 'Pull exceeds push by 20%+ — chest and shoulder lag risk',
}

function PushPullBalanceSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/analytics/push-pull-balance')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!data?.weeklyTrend?.length) return <EmptyState message="Not enough push/pull data yet." />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-(--color-text-muted)">Always shows the last 8 weeks</p>
      {data.imbalance && (
        <p className="text-xs text-(--color-warning)">⚠ {IMBALANCE_MESSAGES[data.imbalance]}</p>
      )}
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.weeklyTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="week" stroke="var(--color-text-muted)" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={36} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--color-text)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="push" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="pull" stroke="var(--color-accent2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default PushPullBalanceSection
