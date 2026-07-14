import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="font-semibold text-slate-800 mr-4">DevTools</span>
        <NavLink to="/json" className={linkClass}>JSON Viewer</NavLink>
        <NavLink to="/api" className={linkClass}>API Client</NavLink>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
