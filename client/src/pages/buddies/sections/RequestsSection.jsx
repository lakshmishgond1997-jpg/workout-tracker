import { useEffect, useState } from 'react'
import api from '../../../api/axios'

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

function RequestsSection({ onChange }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api
      .get('/buddies/requests')
      .then(({ data }) => {
        setData(data)
        onChange?.(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const respond = async (id, action) => {
    await api.patch(`/buddies/${id}/respond`, { action })
    load()
  }

  const cancel = async (id) => {
    await api.delete(`/buddies/${id}`)
    load()
  }

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>

  const { received = [], sent = [] } = data || {}

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="shrink-0 text-sm font-bold text-(--color-text)">Received {received.length > 0 && `(${received.length})`}</h2>
        {received.length === 0 ? (
          <p className="shrink-0 text-sm text-(--color-text-muted)">No pending requests.</p>
        ) : (
          received.map((r) => (
            <div key={r.id} className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-(--color-accent-soft) text-(--color-accent) font-bold flex items-center justify-center shrink-0">
                {initials(r.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--color-text) truncate">{r.name}</p>
                <p className="text-xs text-(--color-text-muted) truncate">{r.email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => respond(r.id, 'accept')}
                  className="h-9 px-3 rounded-lg bg-(--color-accent) text-white text-xs font-semibold"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond(r.id, 'decline')}
                  className="h-9 px-3 rounded-lg bg-(--color-card-alt) border border-(--color-border) text-(--color-text-muted) text-xs font-semibold"
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="shrink-0 text-sm font-bold text-(--color-text)">Sent {sent.length > 0 && `(${sent.length})`}</h2>
        {sent.length === 0 ? (
          <p className="shrink-0 text-sm text-(--color-text-muted)">You haven't sent any requests.</p>
        ) : (
          sent.map((r) => (
            <div key={r.id} className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-(--color-accent-soft) text-(--color-accent) font-bold flex items-center justify-center shrink-0">
                {initials(r.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--color-text) truncate">{r.name}</p>
                <p className="text-xs text-(--color-text-muted) truncate">Waiting for response…</p>
              </div>
              <button
                type="button"
                onClick={() => cancel(r.id)}
                className="shrink-0 h-9 px-3 rounded-lg bg-(--color-card-alt) border border-(--color-border) text-(--color-text-muted) text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RequestsSection
