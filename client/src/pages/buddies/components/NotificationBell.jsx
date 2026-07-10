import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import api from '../../../api/axios'
import { setUnreadCount } from '../../../store/slices/buddiesSlice'

const LABELS = {
  buddy_request: (n) => `${n.related_user_name || 'Someone'} sent you a buddy request`,
  buddy_accepted: (n) => `${n.related_user_name || 'Someone'} accepted your buddy request`,
  challenge_received: (n) => `${n.related_user_name || 'A buddy'} challenged you`,
  challenge_accepted: (n) => `${n.related_user_name || 'A buddy'} accepted your challenge`,
  challenge_completed: (n) => `Your challenge with ${n.related_user_name || 'a buddy'} has ended`,
  buddy_pr: (n) => `${n.related_user_name || 'A buddy'} hit a new PR${n.exercise_name ? ` on ${n.exercise_name}` : ''}${n.value_kg ? ` (${n.value_kg}kg)` : ''}`,
}

function NotificationBell() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const refreshUnread = () => {
    api.get('/notifications/unread-count').then(({ data }) => dispatch(setUnreadCount(data.count)))
  }

  useEffect(() => {
    refreshUnread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      api
        .get('/notifications')
        .then(({ data }) => setNotifications(data.notifications))
        .finally(() => setLoading(false))
    }
  }

  const markAllRead = async () => {
    await api.patch('/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    dispatch(setUnreadCount(0))
  }

  const markOneRead = async (id) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)))
    refreshUnread()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center"
      >
        🔔
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-72 max-h-96 overflow-y-auto no-scrollbar rounded-2xl bg-(--color-card) border border-(--color-border) shadow-lg p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-bold text-(--color-text)">Notifications</span>
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-(--color-accent)">
                Mark all read
              </button>
            </div>
            {loading && <p className="text-xs text-(--color-text-muted) px-2 py-3">Loading…</p>}
            {!loading && notifications.length === 0 && (
              <p className="text-xs text-(--color-text-muted) px-2 py-3">No notifications yet.</p>
            )}
            {!loading &&
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markOneRead(n.id)}
                  className={`w-full text-left px-2 py-2 rounded-lg text-xs flex items-start gap-2 ${
                    n.read_at ? 'text-(--color-text-muted)' : 'text-(--color-text) bg-(--color-card-alt)'
                  }`}
                >
                  {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-(--color-accent) mt-1 shrink-0" />}
                  <span className="flex-1">
                    {(LABELS[n.type] || (() => n.type))(n)}
                    <span className="block text-[10px] text-(--color-text-muted) mt-0.5">
                      {new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
