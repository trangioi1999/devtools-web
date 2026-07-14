import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { JsonViewerPage } from './tools/json-viewer/JsonViewerPage'
import { ApiClientPage } from './tools/api-client/ApiClientPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/json" replace />} />
          <Route path="/json" element={<JsonViewerPage />} />
          <Route path="/api" element={<ApiClientPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
