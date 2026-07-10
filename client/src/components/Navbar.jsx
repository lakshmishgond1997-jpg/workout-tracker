import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/slices/authSlice'
import { setUnreadCount } from '../store/slices/buddiesSlice'
import api from '../api/axios'

const POLL_INTERVAL_MS = 60000

function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const unreadCount = useSelector((state) => state.buddies.unreadNotificationCount)

  useEffect(() => {
    const poll = () => {
      api
        .get('/notifications/unread-count')
        .then(({ data }) => dispatch(setUnreadCount(data.count)))
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium ${
      isActive ? 'text-(--color-accent)' : 'text-(--color-text-muted)'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[430px] h-16 bg-(--color-bg-elevated) border-t border-(--color-border) flex">
      <NavLink to="/dashboard" className={linkClass}>
        <span className="text-lg">🏋️</span>
        Today
      </NavLink>
      <NavLink to="/analytics" className={linkClass}>
        <span className="text-lg">📊</span>
        Stats
      </NavLink>
      <NavLink to="/buddies" className={linkClass}>
        <span className="relative text-lg">
          🤝
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-(--color-danger) text-white text-[9px] leading-4 text-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        Buddy
      </NavLink>
      <button
        type="button"
        onClick={handleLogout}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium text-(--color-text-muted)"
      >
        <span className="text-lg">🚪</span>
        Logout
      </button>
    </nav>
  )
}

export default Navbar
