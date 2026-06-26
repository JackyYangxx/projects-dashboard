import { useEffect, useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import type { MCPConfig } from '@/types'

export default function MCPConfigPanel() {
  const { mcps, loadMCPs, addMCP, toggleMCP, removeMCP } = useCodeReviewStore()
  const [showForm, setShowForm] = useState(false)
  const [configJson, setConfigJson] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => { loadMCPs() }, [])

  const handleSave = () => {
    setParseError(null)
    try {
      const config = JSON.parse(configJson) as MCPConfig
      if (!config.name || !config.endpoint) {
        setParseError('配置必须包含 name 和 endpoint')
        return
      }
      addMCP({
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
      <ul>
        {mcps.map(mcp => (
          <li key={mcp.id} className="pt-4 pb-4 border-b border-outline/50 first:pt-0 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={mcp.enabled} onChange={e => toggleMCP(mcp.id, e.target.checked)} />
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{mcp.name}</span>
                <span className="block text-xs text-on-surface-tertiary truncate">{mcp.url}</span>
              </div>
              <button onClick={() => removeMCP(mcp.id)} className="text-xs text-red-500 hover:underline shrink-0">删除</button>
            </div>
          </li>
        ))}
        {mcps.length === 0 && <li className="text-sm text-on-surface-tertiary py-2">暂无 MCP 配置</li>}
      </ul>
    </div>
  )
}