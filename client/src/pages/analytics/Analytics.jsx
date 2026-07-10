import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Navbar from '../../components/Navbar'
import { applyTheme } from '../../utils/theme'
import { setDateRange } from '../../store/slices/analyticsSlice'
import AnalyticsSummaryCard from './AnalyticsSummaryCard'
import CollapsibleSection from './components/CollapsibleSection'
import PrBoardSection from './sections/PrBoardSection'
import OverloadChartSection from './sections/OverloadChartSection'
import VolumeByMuscleGroupSection from './sections/VolumeByMuscleGroupSection'
import PlateauDetectionSection from './sections/PlateauDetectionSection'
import ConsistencySection from './sections/ConsistencySection'
import StrengthRatiosSection from './sections/StrengthRatiosSection'
import BodyweightCorrelationSection from './sections/BodyweightCorrelationSection'
import E1rmTrackerSection from './sections/E1rmTrackerSection'
import RestVsPerformanceSection from './sections/RestVsPerformanceSection'
import PushPullBalanceSection from './sections/PushPullBalanceSection'
import ExerciseConsistencySection from './sections/ExerciseConsistencySection'
import SorenessLogSection from './sections/SorenessLogSection'
import WarmupEfficiencySection from './sections/WarmupEfficiencySection'

const RANGE_OPTIONS = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'All' },
]

function Analytics() {
  const dispatch = useDispatch()
  const dateRange = useSelector((state) => state.analytics.dateRange)
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
            <h1 className="text-xl font-bold text-(--color-text)">Analytics</h1>
            <div className="flex items-center gap-2 print-hidden">
              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Print or save as PDF"
                className="w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center"
              >
                🖨️
              </button>
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

          <div className="flex gap-2 mt-4 print-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => dispatch(setDateRange(opt.value))}
                className={`flex-1 h-9 rounded-lg text-xs font-semibold ${
                  dateRange === opt.value
                    ? 'bg-(--color-accent-soft) text-(--color-accent)'
                    : 'bg-(--color-card) text-(--color-text-muted) border border-(--color-border)'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-3 pb-24">
          <AnalyticsSummaryCard />

          <CollapsibleSection title="PR Board" icon="🏆" defaultExpanded>
            <PrBoardSection />
          </CollapsibleSection>

          <CollapsibleSection title="Progressive Overload" icon="📈">
            <OverloadChartSection />
          </CollapsibleSection>

          <CollapsibleSection title="Weekly Volume by Muscle Group" icon="💪">
            <VolumeByMuscleGroupSection />
          </CollapsibleSection>

          <CollapsibleSection title="Plateau Detection" icon="⚠️">
            <PlateauDetectionSection />
          </CollapsibleSection>

          <CollapsibleSection title="Session Consistency" icon="🔥">
            <ConsistencySection />
          </CollapsibleSection>

          <CollapsibleSection title="Strength Ratios" icon="⚖️">
            <StrengthRatiosSection />
          </CollapsibleSection>

          <CollapsibleSection title="Bodyweight vs Strength" icon="⚖️">
            <BodyweightCorrelationSection />
          </CollapsibleSection>

          <CollapsibleSection title="Estimated 1RM" icon="🏋️">
            <E1rmTrackerSection />
          </CollapsibleSection>

          <CollapsibleSection title="Rest vs Performance" icon="🛌">
            <RestVsPerformanceSection />
          </CollapsibleSection>

          <CollapsibleSection title="Push vs Pull Balance" icon="🔄">
            <PushPullBalanceSection />
          </CollapsibleSection>

          <CollapsibleSection title="Exercise Consistency" icon="🗓️">
            <ExerciseConsistencySection />
          </CollapsibleSection>

          <CollapsibleSection title="Soreness Log" icon="🩹">
            <SorenessLogSection />
          </CollapsibleSection>

          <CollapsibleSection title="Warm-up Efficiency" icon="🔆">
            <WarmupEfficiencySection />
          </CollapsibleSection>
        </main>
      </div>
      <Navbar />
    </div>
  )
}

export default Analytics
