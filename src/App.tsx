import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { JsonViewerPage } from './tools/json-viewer/JsonViewerPage'

function ApiPlaceholder() {
  return <div className="p-4">API Client (coming in Task 9)</div>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonViewerPage />} />
          <Route path="/api" element={<ApiPlaceholder />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
