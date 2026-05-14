import React, { useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import type { MCPConfig } from '@/types'

export default function MCPConfigPanel() {
  const { mcpServices, loadMCPServices, addMCPService, toggleMCPService, removeMCPService } = useCodeReviewStore()
  const [showForm, setShowForm] = useState(false)
  const [configJson, setConfigJson] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  React.useEffect(() => { loadMCPServices() }, [])

  const handleSave = () => {
    setParseError(null)
    try {
      const config = JSON.parse(configJson) as MCPConfig
      if (!config.name || !config.endpoint) {
        setParseError('配置必须包含 name 和 endpoint')
        return
      }
      addMCPService({
        name: config.name,
        url: config.endpoint,
        authHeader: config.authHeader || '',
        tools: config.tools || [],
        enabled: true,
      })
      setConfigJson('')
      setShowForm(false)
    } catch {
      setParseError('JSON 格式错误')
    }
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">MCP 服务配置</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-primary-500 hover:underline">
          {showForm ? '取消' : '+ 新增'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          <textarea
            placeholder='粘贴 MCP 配置 JSON，例如：&#10;{"name": "GitLab MCP", "endpoint": "https://...", "authHeader": "Bearer xxx", "tools": ["listMRs", "getMRDetails"]}'
            value={configJson}
            onChange={e => { setConfigJson(e.target.value); setParseError(null) }}
            rows={8}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm font-mono"
          />
          {parseError && <div className="text-xs text-red-500">{parseError}</div>}
          <button onClick={handleSave} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">保存</button>
        </div>
      )}
      <ul className="space-y-2">
        {mcpServices.map(mcp => (
          <li key={mcp.id} className="flex items-center gap-2">
            <input type="checkbox" checked={mcp.enabled} onChange={e => toggleMCPService(mcp.id, e.target.checked)} />
            <div className="flex-1">
              <span className="text-sm">{mcp.name}</span>
              <span className="block text-xs text-on-surface-tertiary truncate">{mcp.url}</span>
            </div>
            <button onClick={() => removeMCPService(mcp.id)} className="text-xs text-red-500 hover:underline">删除</button>
          </li>
        ))}
        {mcpServices.length === 0 && <li className="text-sm text-on-surface-tertiary">暂无 MCP 配置</li>}
      </ul>
    </div>
  )
}