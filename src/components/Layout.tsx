import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/json-viewer', label: 'JSON Viewer' },
  { to: '/api-client', label: 'API Client' },
  { to: '/doc-converter', label: 'Doc Converter' },
]

export function Layout() {
  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      <nav className="nav">
        <div className="flex items-baseline gap-3 mr-auto">
          <span className="nav-brand">DevTools</span>
          <span className="text-[10px] tracking-[0.12em] uppercase text-accent">JSON · OpenAPI · DOCS</span>
        </div>
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
