interface SubTabsProps<T extends string> {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  /** Tighter padding, used for the view-mode row inside panes. */
  compact?: boolean
  className?: string
}

/** Classical segmented control shared by tool pages. */
export function SubTabs<T extends string>({ tabs, active, onChange, compact, className = '' }: SubTabsProps<T>) {
  return (
    <div className={`seg ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={active === t.id}
          onClick={() => onChange(t.id)}
          className={`seg-opt ${active === t.id ? 'is-selected' : ''}`}
          style={compact ? { padding: '5px 12px' } : undefined}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
