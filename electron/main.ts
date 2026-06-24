import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, type NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import Store from 'electron-store'

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
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    center: true,
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
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
  tray = new Tray(loadTrayIcon())
  tray.setToolTip('项目管理看板')
  tray.on('click', toggleMainWindow)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: toggleMainWindow },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]))
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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
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