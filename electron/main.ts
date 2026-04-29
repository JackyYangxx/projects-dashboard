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

ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-platform', () => process.platform)
ipcMain.handle('get-wasm-binary', () => {
  const wasmPath = path.join(__dirname, '../dist/sql-wasm.wasm')
  return fs.readFileSync(wasmPath)
})