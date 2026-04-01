import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Recommend from './pages/Recommend'
import CompareDetail from './pages/CompareDetail'
import Sentiment from './pages/Sentiment'
import Settlement from './pages/Settlement'

function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="recommend" element={<Recommend />} />
          <Route path="compare" element={<CompareDetail />} />
          <Route path="sentiment" element={<Sentiment />} />
          <Route path="settlement" element={<Settlement />} />
          {/* Catch-all route - redirect to overview */}
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}

export default App