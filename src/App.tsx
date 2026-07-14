import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'

function JsonPlaceholder() {
  return <div className="p-4">JSON Viewer (coming in Task 4)</div>
}
function ApiPlaceholder() {
  return <div className="p-4">API Client (coming in Task 9)</div>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonPlaceholder />} />
          <Route path="/api" element={<ApiPlaceholder />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
