import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import api from '../api/axios'
import { setCredentials } from '../store/slices/authSlice'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      dispatch(setCredentials({ user: data.user, token: data.token }))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-(--color-bg) flex items-center justify-center px-4">
      <div className="w-full max-w-[430px] mx-auto">
        <div className="bg-(--color-card) border border-(--color-border) rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-(--color-text) mb-1">Create account</h1>
          <p className="text-sm text-(--color-text-muted) mb-6">Start tracking your gym progress</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-(--color-text-muted) mb-1.5" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 rounded-xl bg-(--color-card-alt) border border-(--color-border) px-4 text-(--color-text) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm text-(--color-text-muted) mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-xl bg-(--color-card-alt) border border-(--color-border) px-4 text-(--color-text) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-(--color-text-muted) mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 rounded-xl bg-(--color-card-alt) border border-(--color-border) px-4 text-(--color-text) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm text-(--color-text-muted) mb-1.5" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 rounded-xl bg-(--color-card-alt) border border-(--color-border) px-4 text-(--color-text) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-(--color-danger)" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-(--color-accent) text-white font-semibold disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-(--color-text-muted) mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-(--color-accent) font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
