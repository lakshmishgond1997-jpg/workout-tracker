import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { applyTheme } from '../../utils/theme'
import NotificationBell from './components/NotificationBell'
import PrivacySettingsSheet from './components/PrivacySettingsSheet'
import MyBuddiesSection from './sections/MyBuddiesSection'
import RequestsSection from './sections/RequestsSection'
import LeaderboardSection from './sections/LeaderboardSection'
import CompareSection from './sections/CompareSection'

const TABS = [
  { value: 'buddies', label: 'My Buddies' },
  { value: 'requests', label: 'Requests' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'compare', label: 'Compare' },
]

function Buddies() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'buddies')
  const [receivedCount, setReceivedCount] = useState(0)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="h-screen w-full bg-(--color-bg) flex justify-center overflow-hidden">
      <div className="w-full max-w-[430px] flex flex-col h-full">
        <header className="shrink-0 px-4 pt-6 pb-4 bg-(--color-bg-elevated) border-b border-(--color-border)">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-(--color-text)">Buddies</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                aria-label="Privacy settings"
                className="w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center"
              >
                🔒
              </button>
              <NotificationBell />
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          <div className="flex gap-1 mt-4 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`relative whitespace-nowrap px-3 h-9 rounded-lg text-xs font-semibold ${
                  tab === t.value
                    ? 'bg-(--color-accent-soft) text-(--color-accent)'
                    : 'bg-(--color-card) text-(--color-text-muted) border border-(--color-border)'
                }`}
              >
                {t.label}
                {t.value === 'requests' && receivedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-(--color-danger) text-white text-[10px] flex items-center justify-center">
                    {receivedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-3 pb-24">
          {tab === 'buddies' && <MyBuddiesSection />}
          {tab === 'requests' && <RequestsSection onChange={(d) => setReceivedCount(d.received.length)} />}
          {tab === 'leaderboard' && <LeaderboardSection />}
          {tab === 'compare' && <CompareSection initialBuddyId={searchParams.get('buddy')} />}
        </main>
      </div>
      <Navbar />
      {showPrivacy && <PrivacySettingsSheet onClose={() => setShowPrivacy(false)} />}
    </div>
  )
}

export default Buddies
