import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { initDatabase } from './db'

console.log('[App] Starting database initialization...')
initDatabase()
  .then(() => console.log('[App] Database initialized successfully'))
  .catch((err) => console.error('[App] Database init failed:', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
