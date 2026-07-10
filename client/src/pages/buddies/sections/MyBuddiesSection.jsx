import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../api/axios'
import BuddyCard from '../components/BuddyCard'

const STATUS_LABEL = {
  accepted: 'Already buddies',
  pending_sent: 'Request already sent',
  pending_received: 'They already sent you a request — check Requests',
}

function AddBuddyBar({ onSent }) {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setMessage('')
    setResult(null)
    try {
      const { data } = await api.get('/buddies/search', { params: { email: email.trim() } })
      setResult(data)
    } catch (err) {
      setMessage(err.response?.data?.message || 'No user found with that email')
    } finally {
      setBusy(false)
    }
  }

  const sendRequest = async () => {
    setBusy(true)
    try {
      await api.post('/buddies/request', { recipientId: result.user.id })
      setMessage(`Request sent to ${result.user.name}`)
      setResult(null)
      setEmail('')
      onSent?.()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to send request')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add a buddy by email"
          className="flex-1 h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-11 px-4 rounded-lg bg-(--color-accent) text-white text-sm font-semibold disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {result && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-(--color-text)">{result.user.name}</p>
            <p className="text-xs text-(--color-text-muted)">{result.user.email}</p>
          </div>
          {result.status === 'none' ? (
            <button
              type="button"
              onClick={sendRequest}
              disabled={busy}
              className="shrink-0 h-9 px-3 rounded-lg bg-(--color-accent-soft) text-(--color-accent) text-xs font-semibold"
            >
              Send Request
            </button>
          ) : (
            <span className="text-xs text-(--color-text-muted) shrink-0">{STATUS_LABEL[result.status]}</span>
          )}
        </div>
      )}

      {message && <p className="text-xs text-(--color-text-muted) mt-2">{message}</p>}
    </div>
  )
}

function MyBuddiesSection() {
  const navigate = useNavigate()
  const [buddies, setBuddies] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    api
      .get('/buddies')
      .then(({ data }) => setBuddies(data.buddies))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const removeBuddy = async (relationshipId) => {
    if (!window.confirm('Remove this buddy?')) return
    await api.delete(`/buddies/${relationshipId}`)
    load()
  }

  const filtered = (buddies || []).filter((b) =>
    `${b.name} ${b.email}`.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-bold text-(--color-text)">My Buddies {buddies ? `(${buddies.length}/20)` : ''}</h2>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh"
          className="shrink-0 w-8 h-8 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center text-sm"
        >
          ⟳
        </button>
      </div>

      <AddBuddyBar onSent={load} />

      {buddies && buddies.length > 0 && (
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search your buddies…"
          className="shrink-0 w-full h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
        />
      )}

      {loading && <p className="text-sm text-(--color-text-muted)">Loading…</p>}

      {!loading && buddies && buddies.length === 0 && (
        <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-6 text-center">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-sm font-semibold text-(--color-text)">No buddies yet</p>
          <p className="text-xs text-(--color-text-muted) mt-1">
            Add a buddy by email above to start comparing progress and sending challenges.
          </p>
        </div>
      )}

      {!loading &&
        filtered.map((b) => (
          <BuddyCard
            key={b.relationshipId}
            buddy={b}
            onClick={() => navigate(`/buddies/${b.buddyId}`)}
            onRemove={() => removeBuddy(b.relationshipId)}
          />
        ))}
    </div>
  )
}

export default MyBuddiesSection
