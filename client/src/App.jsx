import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/analytics/Analytics'
import Buddies from './pages/buddies/Buddies'
import BuddyProfile from './pages/buddies/BuddyProfile'

function ProtectedRoute({ children }) {
  const token = useSelector((state) => state.auth.token)
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  const token = useSelector((state) => state.auth.token)

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={token ? '/dashboard' : '/login'} replace />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buddies"
        element={
          <ProtectedRoute>
            <Buddies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buddies/:id"
        element={
          <ProtectedRoute>
            <BuddyProfile />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
