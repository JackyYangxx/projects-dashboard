import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import { getAllAgentRules, deleteAgentRule } from '@/db/agentDao'
import type { AgentRule } from '@/types/agent'

const SEVERITY_COLORS: Record<AgentRule['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  suggestion: 'bg-blue-500',
}

const SEVERITY_LABELS: Record<AgentRule['severity'], string> = {
  critical: '严重',
  warning: '警告',
  suggestion: '建议',
}

export default function RuleList() {
  const toggleAgentRule = useCodeReviewStore(s => s.toggleAgentRule)
  const [rules, setRules] = useState<AgentRule[]>([])

  const refresh = () => {
    setRules(getAllAgentRules())
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleToggle = (rule: AgentRule, enabled: boolean) => {
    toggleAgentRule(rule.id, enabled)
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled } : r))
  }

  const handleDelete = (rule: AgentRule) => {
    if (!confirm(`确定要删除规则"${rule.name}"吗？此操作无法撤销。`)) return
    deleteAgentRule(rule.id)
    setRules(prev => prev.filter(r => r.id !== rule.id))
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name="fact_check" size={18} className="text-primary-500" />
          <h3 className="font-semibold text-sm font-mono">评审规则</h3>
          <span className="font-mono text-xs text-on-surface-secondary">
            ({rules.length})
          </span>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-sm text-on-surface-secondary font-mono">
          暂无规则
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 bg-surface-secondary rounded-lg border border-outline"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_COLORS[rule.severity]}`}
                  title={SEVERITY_LABELS[rule.severity]}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{rule.name}</span>
                    {rule.isBuiltin && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded border border-primary-200 flex-shrink-0">
                        内置
                      </span>
                    )}
                  </div>
                  {rule.filePatterns.length > 0 && (
                    <div className="font-mono text-[11px] text-on-surface-tertiary truncate mt-0.5">
                      {rule.filePatterns.slice(0, 3).join(', ')}
                      {rule.filePatterns.length > 3 && ` +${rule.filePatterns.length - 3}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <span className="text-on-surface-secondary">
                    {rule.enabled ? '已启用' : '已禁用'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    onClick={() => handleToggle(rule, !rule.enabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      rule.enabled ? 'bg-primary-500' : 'bg-outline'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                <button
                  onClick={() => handleDelete(rule)}
                  disabled={rule.isBuiltin}
                  className="p-1.5 border border-outline rounded-md hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title={rule.isBuiltin ? '内置规则不可删除' : '删除规则'}
                >
                  <Icon
                    name="delete"
                    size={14}
                    className={rule.isBuiltin ? 'text-on-surface-tertiary' : 'text-red-500'}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}