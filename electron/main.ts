import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = !import.meta.env.PROD && !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Allow debugging in production
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
  })

  // Force open devtools for debugging blank page issue
  win.webContents.openDevTools({ mode: 'detach' })

  console.log('[Main] __dirname:', __dirname)
  console.log('[Main] isDev:', isDev)
  console.log('[Main] app.isPackaged:', app.isPackaged)

  // Capture console logs from renderer for debugging
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warn', 'error']
    const levelName = levels[level] || 'unknown'
    console.log(`[Renderer ${levelName}] ${message}`, { line, sourceId })
  })

  // Catch renderer crashes
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Renderer process gone:', details)
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Main] Failed to load: ${errorCode} - ${errorDescription}`)
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Window events
  win.on('closed', () => {
    // Clean up if needed
  })
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  // Someone tried to run a second instance, focus our window
  const existingWindow = BrowserWindow.getAllWindows()[0]
  if (existingWindow) {
    if (existingWindow.isMinimized()) existingWindow.restore()
    existingWindow.focus()
  }
})

// App lifecycle
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers for main process operations (if needed in future)
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('get-wasm-binary', () => {
  const wasmPath = isDev
    ? path.join(__dirname, '../dist/sql-wasm.wasm')
    : path.join(__dirname, '../dist/sql-wasm.wasm')
  return fs.readFileSync(wasmPath)
})
