import { NavLink, Outlet } from 'react-router-dom'
import { Braces, Network } from 'lucide-react'

const NAV = [
  { to: '/json-viewer', label: 'JSON Viewer', icon: Braces },
  { to: '/api-client', label: 'API Client', icon: Network },
]

export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/10 text-white shadow-inner'
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-900 px-4 py-2.5 flex items-center gap-6 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
            {'{}'}
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-white text-sm">DevTools</div>
            <div className="text-[10px] text-slate-400 -mt-0.5">JSON · OpenAPI · HTTP</div>
          </div>
        </div>
        <nav className="flex items-center gap-1.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 min-h-0 bg-white">
        <Outlet />
      </main>
    </div>
  )
}
