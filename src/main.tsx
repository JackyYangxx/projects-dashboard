import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { initDatabase } from './db'

// Global unhandled error handlers
window.addEventListener('error', (event) => {
  console.error('[App] Unhandled error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Unhandled promise rejection:', event.reason)
})

console.log('[App] Starting, window.location.href:', window.location.href)
console.log('[App] Starting database initialization...')
initDatabase()
  .then(() => console.log('[App] Database initialized successfully'))
  .catch((err) => {
    console.error('[App] Database init failed:', err)
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: #dc2626;">
        <h1>Database Initialization Failed</h1>
        <pre style="background: #1f1f1f; color: #e5e5e5; padding: 10px; border-radius: 4px; overflow: auto;">
${err.message}
${err.stack || ''}
        </pre>
        <p>Check the console for more details (DevTools → Console)</p>
      </div>
    `
  })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
