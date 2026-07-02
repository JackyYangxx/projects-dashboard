import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { initDatabase, persistDatabase } from './db'

// Global unhandled error handlers
window.addEventListener('error', (event) => {
  console.error('[App] Unhandled error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Unhandled promise rejection:', event.reason)
})

// Persist database on page close
window.addEventListener('beforeunload', () => {
  persistDatabase()
})

// Redirect pathname to hash for HashRouter compatibility (e.g. /code-review → /#/code-review)
// Only in dev mode: under file:// protocol, pathname is a filesystem path, not a route
if (window.location.protocol !== 'file:' && window.location.pathname !== '/' && !window.location.hash) {
  window.location.hash = window.location.pathname
}

console.log('[App] Starting, window.location.href:', window.location.href)
console.log('[App] Starting database initialization...')
initDatabase()
  .then(() => console.log('[App] Database initialized successfully'))
  .catch((err) => {
    console.error('[App] Database init failed:', err)
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: #dc2626;">
        <h1>项目管理看板 — 数据库初始化失败</h1>
        <pre style="background: #1f1f1f; color: #e5e5e5; padding: 10px; border-radius: 4px; overflow: auto;">
${err.message}
${err.stack || ''}
        </pre>
        <p>请查看控制台获取详情（开发者工具 → Console）</p>
      </div>
    `
  })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
