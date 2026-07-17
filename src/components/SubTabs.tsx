interface SubTabsProps<T extends string> {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}

/** Segmented-control style tab switcher shared by tool pages. */
export function SubTabs<T extends string>({ tabs, active, onChange }: SubTabsProps<T>) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-3.5 py-1 text-sm font-medium rounded-md transition-colors ${
            active === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
