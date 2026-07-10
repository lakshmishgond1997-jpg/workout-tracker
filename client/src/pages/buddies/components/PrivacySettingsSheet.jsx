import { useEffect, useState } from 'react'
import api from '../../../api/axios'

const FIELDS = [
  { key: 'privacy_workout_details', label: 'Workout details' },
  { key: 'privacy_prs', label: 'Personal records' },
  { key: 'privacy_streak', label: 'Streak' },
  { key: 'privacy_volume', label: 'Weekly volume' },
]

function PrivacySettingsSheet({ onClose }) {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/buddies/privacy').then(({ data }) => setSettings(data))
  }, [])

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: prev[key] === 'private' ? 'public' : 'private' }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.patch('/buddies/privacy', settings)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[430px] rounded-t-2xl bg-(--color-card) border-t border-(--color-border) p-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-(--color-text)">Privacy Settings</h2>
          <button type="button" onClick={onClose} className="text-(--color-text-muted) text-xl leading-none px-2">
            ×
          </button>
        </div>

        {!settings ? (
          <p className="text-sm text-(--color-text-muted) py-4">Loading…</p>
        ) : (
          <div className="flex flex-col divide-y divide-(--color-border)">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-(--color-text)">{f.label}</p>
                  <p className="text-xs text-(--color-text-muted)">
                    {settings[f.key] === 'private' ? '🔒 Hidden from buddies' : 'Visible to buddies'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(f.key)}
                  className={`w-12 h-7 rounded-full relative inline-flex items-center transition-colors shrink-0 ${
                    settings[f.key] === 'private' ? 'bg-(--color-border)' : 'bg-(--color-accent)'
                  }`}
                >
                  <span
                    className={`absolute left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings[f.key] === 'private' ? 'translate-x-0' : 'translate-x-5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!settings || saving}
          className="w-full h-11 mt-4 rounded-lg bg-(--color-accent) text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default PrivacySettingsSheet
