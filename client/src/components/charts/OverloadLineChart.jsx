import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import EmptyState from '../../pages/analytics/components/EmptyState'

function OverloadLineChart({ series, plateauDates, target }) {
  if (!series?.length) return <EmptyState message="Not enough sessions yet for this exercise." />

  const plateauSet = new Set(plateauDates || [])
  const plotData = series.map((s) => ({
    date: s.date,
    valueNormal: plateauSet.has(s.date) ? null : s.weightKg,
    valuePlateau: plateauSet.has(s.date) ? s.weightKg : null,
  }))
  // bridge the gap so the plateau segment visually connects to the normal line
  const lastNormalIdx = plotData.map((d) => d.valueNormal).lastIndexOf(
    [...plotData].reverse().find((d) => d.valueNormal != null)?.valueNormal
  )
  if (lastNormalIdx > -1 && plotData[lastNormalIdx + 1]) {
    plotData[lastNormalIdx + 1] = { ...plotData[lastNormalIdx + 1], valuePlateau: plotData[lastNormalIdx].valueNormal }
  }

  return (
    <div className="h-56 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={plotData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickFormatter={(d) =>
              new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
          />
          <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={32} />
          <Tooltip
            contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="var(--color-accent2)"
              strokeDasharray="4 4"
              label={{ value: `Target ${target}kg`, position: 'right', fill: 'var(--color-text-muted)', fontSize: 11 }}
            />
          )}
          <Line type="monotone" dataKey="valueNormal" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="valuePlateau" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-warning)' }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default OverloadLineChart
