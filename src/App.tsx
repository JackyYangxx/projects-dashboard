import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import ProjectDetail from '@/pages/ProjectDetail'
import ProjectForm from '@/pages/ProjectForm'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/new" element={<ProjectForm />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
