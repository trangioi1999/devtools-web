import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { JsonViewerPage } from './tools/json-viewer/JsonViewerPage'
import { ApiClientPage } from './tools/api-client/ApiClientPage'

const LEGACY_HASH_ROUTES: Record<string, string> = {
  '#/json': '/json-viewer',
  '#/api': '/api-client',
}

/** Old links used HashRouter (/#/json) — forward them to the clean paths. */
function LegacyHashRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const hash = window.location.hash
    const target = LEGACY_HASH_ROUTES[hash] ?? (hash.startsWith('#/') ? hash.slice(1) : null)
    if (target) navigate(target, { replace: true })
  }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter basename="/devtools-web">
      <LegacyHashRedirect />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json-viewer" replace />} />
          <Route path="/json-viewer" element={<JsonViewerPage />} />
          <Route path="/api-client" element={<ApiClientPage />} />
          <Route path="/json" element={<Navigate to="/json-viewer" replace />} />
          <Route path="/api" element={<Navigate to="/api-client" replace />} />
          <Route path="*" element={<Navigate to="/json-viewer" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
