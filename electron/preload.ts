import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getWasmBinary: () => ipcRenderer.invoke('get-wasm-binary'),
  loadDatabase: () => ipcRenderer.invoke('db:load'),
  saveDatabase: (data: number[]) => ipcRenderer.send('db:save', data),
  getSchedule: () => ipcRenderer.invoke('agent:get-schedule'),
  setSchedule: (config: { cronExpression: string; enabled: boolean }) =>
    ipcRenderer.invoke('agent:set-schedule', config),
  getNextScheduledRun: () => ipcRenderer.invoke('agent:get-next-run'),
  confirmClose: () => ipcRenderer.invoke('agent:confirm-close'),
})

// Separate bridge for event subscription — contextBridge serializes return values,
// so listener add/remove is exposed via its own context rather than reusing electronAPI.
contextBridge.exposeInMainWorld('agentBridge', {
  onScheduleTick: (callback: () => void) => {
    const handler = (_event: Electron.IpcRendererEvent) => callback()
    ipcRenderer.on('agent:schedule-tick', handler)
    return handler
  },
  removeScheduleTick: (handler: (_event: Electron.IpcRendererEvent) => void) => {
    ipcRenderer.removeListener('agent:schedule-tick', handler)
  },
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