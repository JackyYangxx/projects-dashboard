import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, type NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import Store from 'electron-store'
import cron, { type ScheduledTask } from 'node-cron'

// Augment Electron's App type with our custom quitting flag.
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean
    }
  }
}

const isDev = !import.meta.env.PROD && !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    center: true,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

let tray: Tray | null = null

function loadTrayIcon(): NativeImage {
  const icoPath = path.join(__dirname, '../docs/app-icon/tray.ico')
  let image = nativeImage.createFromPath(icoPath)
  if (image.isEmpty()) {
    const pngPath = path.join(__dirname, '../docs/app-icon/tray-32.png')
    image = nativeImage.createFromPath(pngPath)
  }
  return image
}

function toggleMainWindow() {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return
  if (win.isVisible() && !win.isMinimized()) {
    win.hide()
  } else {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
}

function createTray() {
  try {
    tray = new Tray(loadTrayIcon())
    tray.setToolTip('项目管理看板')
    tray.on('click', toggleMainWindow)
    updateTrayMenu()
  } catch (err) {
    console.error('[tray] failed to create tray:', err)
    tray = null
  }
}

function updateTrayMenu(): void {
  if (!tray) return
  const nextRun = getNextScheduledRun()
  const nextRunLabel = nextRun ? `下次扫描: ${new Date(nextRun).toLocaleString('zh-CN')}` : '定时扫描未启用'
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: toggleMainWindow },
    { label: nextRunLabel, enabled: false },
    {
      label: '立即扫描',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('agent:schedule-tick', { triggerTime: new Date().toISOString() })
        }
      },
    },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(contextMenu)
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  const existingWindow = BrowserWindow.getAllWindows()[0]
  if (existingWindow) {
    if (existingWindow.isMinimized()) existingWindow.restore()
    existingWindow.focus()
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  initScheduler()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep app alive in tray for Windows/Linux. The renderer uses
    // `agent:confirm-close` to ask the user before closing; if they choose
    // "quit", `app.isQuitting` is set and the renderer calls `app.quit()`.
    if (app.isQuitting) {
      app.quit()
    }
    // Otherwise: stay alive in tray, no-op here.
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (cronJob) {
    cronJob.stop()
    cronJob = null
  }
  if (tray) {
    tray.destroy()
    tray = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-platform', () => process.platform)
ipcMain.handle('get-wasm-binary', () => {
  const wasmPath = path.join(__dirname, '../dist/sql-wasm.wasm')
  return fs.readFileSync(wasmPath)
})

const dbPath = path.join(app.getPath('userData'), 'projects-dashboard.db')

ipcMain.handle('db:load', () => {
  try {
    if (fs.existsSync(dbPath)) {
      return fs.readFileSync(dbPath)
    }
    return null
  } catch (err) {
    console.error('[DB] Failed to load database file:', err)
    return null
  }
})

ipcMain.on('db:save', (_event, data: number[]) => {
  try {
    fs.writeFileSync(dbPath, Buffer.from(data))
    console.log('[DB] Database saved to disk, size:', data.length)
  } catch (err) {
    console.error('[DB] Failed to save database file:', err)
  }
})

// MCP handlers
ipcMain.handle('mcp:list-tools', async (_event, { url, authHeader }) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) headers['Authorization'] = authHeader
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })
  return res.json()
})

ipcMain.handle('mcp:invoke-tool', async (_event, { url, authHeader, toolName, toolArgs }) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) headers['Authorization'] = authHeader
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: toolName, arguments: toolArgs },
    }),
  })
  return res.json()
})

// Encrypted store
const store = new Store()

ipcMain.handle('store:get', (_event, key: string) => store.get(key))
ipcMain.handle('store:set', (_event, key: string, value: unknown) => store.set(key, value))
ipcMain.handle('store:delete', (_event, key: string) => store.delete(key))

// Agent scheduler
let cronJob: ScheduledTask | null = null
const SCHEDULE_KEY = 'agent-schedule'
const DEFAULT_CRON = '0 9 * * 1-5'

function getNextScheduledRun(): string | null {
  // node-cron v4 does not expose nextDate(); tray label falls back to "定时扫描未启用"
  // until a proper cron-parser integration is added. See docs/superpowers/issues/.
  return null
}

function initScheduler(): void {
  const config = store.get(SCHEDULE_KEY) as { cronExpression?: string; enabled?: boolean } | undefined
  const expression = config?.cronExpression || DEFAULT_CRON
  const enabled = config?.enabled !== false

  if (cronJob) {
    cronJob.stop()
    cronJob = null
  }

  if (enabled && cron.validate(expression)) {
    cronJob = cron.schedule(expression, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent:schedule-tick', { triggerTime: new Date().toISOString() })
      }
    })
  } else if (!cron.validate(expression)) {
    console.warn(`[scheduler] invalid cron expression: ${expression}`)
  }

  updateTrayMenu()
}

ipcMain.handle('agent:get-schedule', async () => {
  const config = store.get(SCHEDULE_KEY) as { cronExpression?: string; enabled?: boolean } | undefined
  return config || { cronExpression: DEFAULT_CRON, enabled: true }
})

ipcMain.handle('agent:set-schedule', async (_event, config: { cronExpression: string; enabled: boolean }) => {
  store.set(SCHEDULE_KEY, config)
  initScheduler()
})

ipcMain.handle('agent:get-next-run', async () => {
  return getNextScheduledRun()
})

ipcMain.handle('agent:confirm-close', async () => {
  const closeBehavior = store.get('close-behavior') as string | undefined
  if (closeBehavior === 'quit') return { action: 'quit' }
  // Default: minimize to tray
  return { action: 'tray' }
})