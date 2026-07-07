import { useState } from 'react'
import type { AgentRule } from '@/types/agent'

interface Props {
  existingRule?: AgentRule | null
  onSave?: (rule: AgentRule) => void
  onCancel?: () => void
}

const SEVERITY_OPTIONS: { value: AgentRule['severity']; label: string; color: string }[] = [
  { value: 'critical', label: '严重', color: 'bg-red-500' },
  { value: 'warning', label: '警告', color: 'bg-yellow-500' },
  { value: 'suggestion', label: '建议', color: 'bg-blue-500' },
]

export default function RuleEditor({ existingRule, onSave, onCancel }: Props) {
  const [name, setName] = useState(existingRule?.name || '')
  const [description, setDescription] = useState(existingRule?.description || '')
  const [severity, setSeverity] = useState<AgentRule['severity']>(existingRule?.severity || 'warning')
  const [scope, setScope] = useState<'global' | 'project'>(existingRule?.scope || 'global')
  const [filePatterns, setFilePatterns] = useState((existingRule?.filePatterns || []).join('\n'))
  const [matchPatterns, setMatchPatterns] = useState((existingRule?.matchPatterns || []).join('\n'))
  const [examplesGood, setExamplesGood] = useState((existingRule?.examplesGood || []).join('\n'))
  const [examplesBad, setExamplesBad] = useState((existingRule?.examplesBad || []).join('\n'))
  const [nameError, setNameError] = useState(false)

  const isEditing = !!existingRule?.id

  const handleSave = () => {
    if (!name.trim()) {
      setNameError(true)
      return
    }
    const now = new Date().toISOString()
    const rule: AgentRule = {
      id: existingRule?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      content: existingRule?.content || description.trim(),
      examplesGood: examplesGood.split('\n').filter(Boolean),
      examplesBad: examplesBad.split('\n').filter(Boolean),
      severity,
      scope,
      projectId: existingRule?.projectId,
      filePatterns: filePatterns.split('\n').filter(Boolean),
      matchPatterns: matchPatterns.split('\n').filter(Boolean),
      enabled: existingRule?.enabled ?? true,
      isBuiltin: existingRule?.isBuiltin ?? false,
      createdAt: existingRule?.createdAt || now,
      updatedAt: now,
    }
    onSave?.(rule)
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-5">
      {/* Name */}
      <div className="mb-3">
        <label className="block text-xs text-on-surface-secondary mb-1">规则名称 *</label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); if (nameError) setNameError(false) }}
          className={`w-full px-3 py-2 bg-surface-primary text-on-surface-primary border rounded-lg text-sm focus:outline-none focus:border-primary-500 ${
            nameError ? 'border-red-500' : 'border-outline'
          }`}
          placeholder="例如: 避免 any 类型"
        />
        {nameError && (
          <div className="text-xs text-red-500 mt-1">规则名称不能为空</div>
        )}
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="block text-xs text-on-surface-secondary mb-1">规则说明</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-surface-primary text-on-surface-primary border border-outline rounded-lg text-sm resize-y focus:outline-none focus:border-primary-500"
          placeholder="详细描述此规则的检查内容..."
        />
      </div>

      {/* Severity + Scope */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-on-surface-secondary mb-1">严重度</label>
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSeverity(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  severity === opt.value
                    ? 'bg-surface-container border border-primary-500 text-on-surface-primary'
                    : 'bg-surface-secondary text-on-surface-secondary hover:bg-surface-container border border-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-on-surface-secondary mb-1">作用范围</label>
          <div className="flex gap-2">
            {(['global', 'project'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scope === s
                    ? 'bg-primary-500 text-white border border-primary-500'
                    : 'bg-surface-secondary text-on-surface-secondary hover:bg-surface-container border border-transparent'
                }`}
              >
                {s === 'global' ? '全局' : '项目'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File patterns + Match patterns */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-on-surface-secondary mb-1">文件匹配 (glob, 每行一个)</label>
          <textarea
            value={filePatterns}
            onChange={e => setFilePatterns(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-surface-primary text-on-surface-primary border border-outline rounded-lg text-xs font-mono resize-y focus:outline-none focus:border-primary-500"
            placeholder="*.tsx&#10;*.jsx"
          />
        </div>
        <div>
          <label className="block text-xs text-on-surface-secondary mb-1">内容匹配 (正则, 每行一个)</label>
          <textarea
            value={matchPatterns}
            onChange={e => setMatchPatterns(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-surface-primary text-on-surface-primary border border-outline rounded-lg text-xs font-mono resize-y focus:outline-none focus:border-primary-500"
            placeholder="dangerouslySetInnerHTML&#10;\.innerHTML\s*="
          />
        </div>
      </div>

      {/* Examples good/bad */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-on-surface-secondary mb-1">正面案例 (每行一个)</label>
          <textarea
            value={examplesGood}
            onChange={e => setExamplesGood(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface-primary text-on-surface-primary border border-outline rounded-lg text-xs resize-y focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs text-on-surface-secondary mb-1">反面案例 (每行一个)</label>
          <textarea
            value={examplesBad}
            onChange={e => setExamplesBad(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface-primary text-on-surface-primary border border-outline rounded-lg text-xs resize-y focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-outline rounded-lg text-xs text-on-surface-secondary hover:bg-surface-container transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!name.trim()}
        >
          {isEditing ? '保存' : '创建'}
        </button>
      </div>
    </div>
  )
}