import { useState } from 'react'

function CollapsibleSection({ title, icon, children, defaultExpanded = false, onExpand }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next) onExpand?.()
  }

  return (
    <div className="print-expand shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 text-left min-h-11"
      >
        <span className="font-bold text-(--color-text)">
          {icon} {title}
        </span>
        <span className="text-(--color-text-muted) text-xs shrink-0">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  )
}

export default CollapsibleSection
