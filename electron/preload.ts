import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getWasmBinary: () => ipcRenderer.invoke('get-wasm-binary'),
  loadDatabase: () => ipcRenderer.invoke('db:load'),
  saveDatabase: (data: number[]) => ipcRenderer.send('db:save', data),
})

contextBridge.exposeInMainWorld('mcpAPI', {
  listTools: (params: { url: string; authHeader?: string }) =>
    ipcRenderer.invoke('mcp:list-tools', params),
  invokeTool: (params: { url: string; authHeader?: string; toolName: string; toolArgs: Record<string, unknown> }) =>
    ipcRenderer.invoke('mcp:invoke-tool', params),
})

contextBridge.exposeInMainWorld('secureStore', {
  get: (key: string) => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store:delete', key),
})
