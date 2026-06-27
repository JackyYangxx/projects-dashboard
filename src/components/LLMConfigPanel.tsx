import { useEffect, useState } from 'react'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import type { LLMConfig } from '@/types'

const NEW_ID = '__new__'

export default function LLMConfigPanel() {
  const { llmConfigs, loadLLMConfigs, addLLMConfig, updateLLMConfig, toggleLLMConfig, removeLLMConfig, testLLMConfig } = useCodeReviewStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [origKey, setOrigKey] = useState('')
  const [form, setForm] = useState({ modelName: '', modelUrl: '', apiKey: '', apiType: 'openai' as 'openai' | 'anthropic' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => { loadLLMConfigs() }, [])

  const resetForm = () => {
    setForm({ modelName: '', modelUrl: '', apiKey: '', apiType: 'openai' })
    setEditingId(null)
    setOrigKey('')
    setTestResult(null)
  }

  const openNewForm = () => {
    resetForm()
    setEditingId(NEW_ID)
  }

  const openEditForm = (cfg: LLMConfig) => {
    setForm({ modelName: cfg.modelName, modelUrl: cfg.modelUrl, apiKey: cfg.apiKey, apiType: cfg.apiType })
    setEditingId(cfg.id)
    setOrigKey(cfg.apiKey)
    setTestResult(null)
  }

  const getEffectiveApiKey = () => form.apiKey || origKey

  const handleSave = () => {
    if (!form.modelName || !form.modelUrl) return
    if (editingId && editingId !== NEW_ID) {
      const updates: Partial<LLMConfig> = {
        modelName: form.modelName,
        modelUrl: form.modelUrl,
        apiType: form.apiType,
      }
      if (form.apiKey) updates.apiKey = form.apiKey
      updateLLMConfig(editingId, updates)
    } else {
      if (!form.apiKey) return
      addLLMConfig({ ...form, enabled: true })
    }
    resetForm()
  }

  const handleTest = async () => {
    const key = getEffectiveApiKey()
    if (!form.modelUrl || !key) return
    setTesting(true)
    setTestResult(null)
    const result = await testLLMConfig(form.modelUrl, key, form.modelName, form.apiType)
    setTestResult(result)
    setTesting(false)
  }

  const isEditing = (id: string) => editingId === id

  const EditForm = () => (
    <div className="space-y-3 p-3 bg-surface-secondary rounded-lg mt-2 mb-2">
      <div>
        <label className="text-xs text-on-surface-secondary mb-1 block">模型名称</label>
        <input
          placeholder="如 claude-3-5-sonnet / gpt-4o / deepseek-chat"
          value={form.modelName}
          onChange={e => setForm({ ...form, modelName: e.target.value })}
          className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-on-surface-secondary mb-1 block">API URL</label>
        <input
          placeholder="如 https://api.minimaxi.com/v1/chat/completions"
          value={form.modelUrl}
          onChange={e => setForm({ ...form, modelUrl: e.target.value })}
          className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-on-surface-secondary mb-1 block">API Key</label>
        <input
          type="password"
          placeholder={editingId === NEW_ID ? '必填' : '输入新 Key 可替换'}
          value={form.apiKey}
          onChange={e => setForm({ ...form, apiKey: e.target.value })}
          className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-on-surface-secondary mb-1 block">API 格式</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="apiType"
              checked={form.apiType === 'openai'}
              onChange={() => setForm({ ...form, apiType: 'openai' })}
            />
            <span>OpenAI 格式</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="apiType"
              checked={form.apiType === 'anthropic'}
              onChange={() => setForm({ ...form, apiType: 'anthropic' })}
            />
            <span>Anthropic 格式</span>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={testing || !form.modelUrl || !getEffectiveApiKey()}
          className="px-4 py-2 border border-outline text-on-surface-primary rounded-lg text-sm hover:bg-surface-secondary disabled:opacity-50 transition-colors"
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
        <div className="flex-1" />
        <button
          onClick={resetForm}
          className="px-4 py-2 border border-outline text-on-surface-primary rounded-lg text-sm hover:bg-surface-secondary transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          {editingId === NEW_ID ? '保存' : '更新'}
        </button>
      </div>
      {testResult && (
        <div className={`text-xs p-2 rounded-lg ${testResult.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
          {testResult.success ? '✓' : '✗'} {testResult.message}
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">LLM 配置</h3>
        {editingId !== NEW_ID && (
          <button onClick={openNewForm} className="text-xs text-primary-500 hover:underline">
            + 新增
          </button>
        )}
      </div>

      <ul>
        {/* New config form */}
        {isEditing(NEW_ID) && <EditForm  />}

        {llmConfigs.length === 0 && editingId !== NEW_ID && (
          <li className="text-sm text-on-surface-tertiary py-2">暂无 LLM 配置</li>
        )}

        {llmConfigs.map(cfg => (
          <li key={cfg.id} className="pt-4 pb-4 border-b border-outline/50 first:pt-0 last:border-b-0 last:pb-0">
            <div className={`flex items-center gap-2 ${editingId === cfg.id ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={e => toggleLLMConfig(cfg.id, e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">
                  {cfg.modelName}
                  <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${cfg.apiType === 'openai' ? 'bg-green-500/10 text-green-600' : 'bg-purple-500/10 text-purple-600'}`}>
                    {cfg.apiType === 'openai' ? 'OpenAI' : 'Anthropic'}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-tertiary truncate">{cfg.modelUrl}</span>
              </div>
              <button
                onClick={() => openEditForm(cfg)}
                className="text-xs text-primary-500 hover:underline shrink-0"
              >
                编辑
              </button>
              <button
                onClick={() => removeLLMConfig(cfg.id)}
                className="text-xs text-red-500 hover:underline shrink-0"
              >
                删除
              </button>
            </div>
            {/* Inline edit form below the row */}
            {isEditing(cfg.id) && <EditForm  />}
          </li>
        ))}
      </ul>
    </div>
  )
}
