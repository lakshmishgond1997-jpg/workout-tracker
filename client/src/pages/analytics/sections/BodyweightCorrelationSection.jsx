import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'
import { todayKey } from '../../../utils/date'

const OUTCOME_STYLES = {
  success: 'bg-(--color-success-soft) border-(--color-success) text-(--color-success)',
  warning: 'bg-(--color-warning-soft) border-(--color-warning) text-(--color-warning)',
  danger: 'bg-(--color-danger-soft) border-(--color-danger) text-(--color-danger)',
}

function WeighInWidget({ latestDate, onLogged }) {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const daysSinceLast = latestDate
    ? Math.floor((new Date(todayKey()) - new Date(latestDate)) / (1000 * 60 * 60 * 24))
    : null
  const recentlyLogged = daysSinceLast != null && daysSinceLast < 7

  const handleSave = async () => {
    if (!weight) return
    setSaving(true)
    setError('')
    try {
      await api.post('/bodyweight', { date: todayKey(), weight_kg: Number(weight) })
      setWeight('')
      onLogged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log bodyweight')
    } finally {
      setSaving(false)
    }
  }

  if (recentlyLogged) {
    return (
      <p className="text-xs text-(--color-text-muted)">
        ✓ Weigh-in logged {daysSinceLast === 0 ? 'today' : `${daysSinceLast}d ago`}
      </p>
    )
  }

  return (
    <div className="flex gap-2 items-start">
      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="Weight (kg)"
        className="flex-1 h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !weight}
        className="h-11 px-4 rounded-lg bg-(--color-accent) text-white text-sm font-medium disabled:opacity-60"
      >
        {saving ? '…' : 'Log'}
      </button>
      {error && <p className="text-xs text-(--color-danger)">{error}</p>}
    </div>
  )
}

function BodyweightCorrelationSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  const load = () => {
    setLoading(true)
    api
      .get('/analytics/bodyweight-correlation', { params: { range: dateRange } })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>

  const latestDate = [...(data?.series || [])].reverse().find((s) => s.bodyweightKg != null)?.week

  return (
    <div className="flex flex-col gap-3">
      <WeighInWidget latestDate={latestDate} onLogged={load} />

      {!data?.series?.length ? (
        <EmptyState message="Log your bodyweight weekly to see the correlation over time." />
      ) : (
        <>
          {data.outcome && (
            <p className={`text-xs font-medium rounded-lg border px-3 py-2 ${OUTCOME_STYLES[data.outcome.tone]}`}>
              {data.outcome.label}
            </p>
          )}
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--color-text-muted)" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <YAxis yAxisId="bw" stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={36} />
                <YAxis yAxisId="str" orientation="right" stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={36} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="bw" type="monotone" dataKey="bodyweightKg" name="Bodyweight" stroke="var(--color-accent2)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="str" type="monotone" dataKey="totalStrength" name="Total strength" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

export default BodyweightCorrelationSection
