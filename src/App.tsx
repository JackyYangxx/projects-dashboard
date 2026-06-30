import { Component, ReactNode } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import ProjectDetail from '@/pages/ProjectDetail'
import ProjectForm from '@/pages/ProjectForm'
import CodeReview from '@/pages/CodeReview'
import Settings from '@/pages/Settings'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[App] React error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', color: '#dc2626' }}>
          <h1>Application Error</h1>
          <pre style={{ background: '#1f1f1f', color: '#e5e5e5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-surface-base">
          <Sidebar />
          <div className="ml-64 relative z-30">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/project/new" element={<ProjectForm />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/code-review" element={<CodeReview />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
