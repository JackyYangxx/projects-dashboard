import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import Icon from '@/components/Icon'
import MCPConfigPanel from '@/components/MCPConfigPanel'

// ── LLM Config Panel ─────────────────────────────────────────

function LLMConfigPanel() {
  const { llmConfigs, loadLLMConfigs, addLLMConfig, toggleLLMConfig, removeLLMConfig, testLLMConfig } = useCodeReviewStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ modelName: '', modelUrl: '', apiKey: '' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => { loadLLMConfigs() }, [])

  const handleSave = () => {
    if (!form.modelName || !form.modelUrl || !form.apiKey) return
    addLLMConfig({ ...form, enabled: true })
    setForm({ modelName: '', modelUrl: '', apiKey: '' })
    setShowForm(false)
    setTestResult(null)
  }

  const handleTest = async () => {
    if (!form.modelUrl || !form.apiKey) return
    setTesting(true)
    setTestResult(null)
    const result = await testLLMConfig(form.modelUrl, form.apiKey)
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">LLM 配置</h3>
        <button
          onClick={() => { setShowForm(!showForm); setTestResult(null) }}
          className="text-xs text-primary-500 hover:underline"
        >
          {showForm ? '取消' : '+ 新增'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          <input
            placeholder="模型名称（如 claude-3-5-sonnet）"
            value={form.modelName}
            onChange={e => setForm({ ...form, modelName: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
          />
          <input
            placeholder="模型 URL（如 https://api.anthropic.com/v1/messages）"
            value={form.modelUrl}
            onChange={e => setForm({ ...form, modelUrl: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
          />
          <input
            type="password"
            placeholder="API Key"
            value={form.apiKey}
            onChange={e => setForm({ ...form, apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !form.modelUrl || !form.apiKey}
              className="flex-1 px-4 py-2 bg-surface-secondary text-on-surface-primary rounded-lg text-sm disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm"
            >
              保存
            </button>
          </div>
          {testResult && (
            <div className={`text-xs p-2 rounded-lg ${testResult.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {testResult.success ? '✓' : '✗'} {testResult.message}
            </div>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {llmConfigs.map(cfg => (
          <li key={cfg.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={e => toggleLLMConfig(cfg.id, e.target.checked)}
            />
            <div className="flex-1">
              <span className="text-sm">{cfg.modelName || '未命名模型'}</span>
              <span className="block text-xs text-on-surface-tertiary truncate max-w-[200px]">{cfg.modelUrl}</span>
            </div>
            <button
              onClick={() => removeLLMConfig(cfg.id)}
              className="text-xs text-red-500 hover:underline"
            >
              删除
            </button>
          </li>
        ))}
        {llmConfigs.length === 0 && (
          <li className="text-sm text-on-surface-tertiary">暂无 LLM 配置</li>
        )}
      </ul>
    </div>
  )
}

// ── Skill Panel ────────────────────────────────────────────────

function SkillPanel() {
  const { skills, loadSkills, addSkill, toggleSkill, removeSkill } = useCodeReviewStore()
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', content: '' })

  useEffect(() => { loadSkills() }, [])

  const handleAdd = () => {
    if (!form.name || !form.content) return
    addSkill({ ...form, enabled: true })
    setForm({ name: '', description: '', content: '' })
    setShowForm(false)
  }

  return (
    <div className="border border-outline rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-medium">Skills</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary-500 hover:underline"
        >
          {showForm ? '取消' : '+ 上传'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-2 mb-3">
          <input
            placeholder="Skill 名称"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
          />
          <input
            placeholder="描述（可选）"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
          />
          <textarea
            placeholder="Skill 内容（prompt 文本）"
            value={form.content}
            rows={6}
            onChange={e => setForm({ ...form, content: e.target.value })}
            className="w-full px-3 py-2 border border-outline rounded-lg text-sm font-mono"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm"
          >
            保存
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {skills.map(skill => (
          <li key={skill.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={skill.enabled}
              onChange={e => toggleSkill(skill.id, e.target.checked)}
            />
            <div className="flex-1">
              <span className="text-sm">{skill.name}</span>
              {skill.description && (
                <span className="block text-xs text-on-surface-tertiary">{skill.description}</span>
              )}
            </div>
            <button
              onClick={() => removeSkill(skill.id)}
              className="text-xs text-red-500 hover:underline"
            >
              删除
            </button>
          </li>
        ))}
        {skills.length === 0 && (
          <li className="text-sm text-on-surface-tertiary">暂无 Skill</li>
        )}
      </ul>
    </div>
  )
}

// ── Stream Output ─────────────────────────────────────────────

function StreamOutput() {
  const { streamEvents, isReviewing } = useCodeReviewStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isReviewing) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamEvents, isReviewing])

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-auto">
      {streamEvents.length === 0 && !isReviewing && (
        <span className="text-sm text-on-surface-tertiary">点击「开始评审」后，AI 输出将显示在这里...</span>
      )}
      {streamEvents.map((ev, i) => {
        if (ev.type === 'chunk') return <span key={i}>{ev.content}</span>
        if (ev.type === 'tool_call') return (
          <div key={i} className="mt-2 p-2 bg-accent-500/10 rounded text-xs font-mono">
            🔧 调用工具: {ev.toolName} | 参数: {JSON.stringify(ev.toolArgs)}
          </div>
        )
        if (ev.type === 'tool_result') return (
          <div key={i} className="mt-1 p-2 bg-outline rounded text-xs font-mono text-on-surface-tertiary">
            → 结果: {typeof ev.toolResult === 'string' ? ev.toolResult : JSON.stringify(ev.toolResult)}
          </div>
        )
        return null
      })}
      {isReviewing && streamEvents.length > 0 && <span className="animate-pulse">▌</span>}
      <div ref={bottomRef} />
    </div>
  )
}

// ── Issue List ────────────────────────────────────────────────

function IssueList() {
  const { reviewRecords, deleteReviewRecord, currentProjectId } = useCodeReviewStore()
  const [filter, setFilter] = React.useState<'all' | 'critical' | 'warning' | 'suggestion'>('all')

  useEffect(() => {
    if (currentProjectId) {
      useCodeReviewStore.getState().loadReviewRecords(currentProjectId)
    }
  }, [currentProjectId])

  const filtered = filter === 'all' ? reviewRecords : reviewRecords.filter(r => r.severity === filter)

  const severityCounts = {
    all: reviewRecords.length,
    critical: reviewRecords.filter(r => r.severity === 'critical').length,
    warning: reviewRecords.filter(r => r.severity === 'warning').length,
    suggestion: reviewRecords.filter(r => r.severity === 'suggestion').length,
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['all', 'critical', 'warning', 'suggestion'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === f
                ? f === 'critical' ? 'bg-red-500 text-white'
                  : f === 'warning' ? 'bg-yellow-500 text-white'
                  : f === 'suggestion' ? 'bg-blue-500 text-white'
                  : 'bg-primary-500 text-white'
                : 'bg-surface-secondary text-on-surface-secondary'
            }`}
          >
            {f === 'all' ? '全部' : f === 'critical' ? '严重' : f === 'warning' ? '警告' : '建议'} ({severityCounts[f]})
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(record => (
          <div key={record.id} className="border border-outline rounded-xl p-4">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                record.severity === 'critical' ? 'bg-red-500'
                  : record.severity === 'warning' ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{record.title}</div>
                <div className="text-xs text-on-surface-secondary mt-1">{record.description}</div>
                {record.filePath && (
                  <div className="text-xs font-mono text-on-surface-tertiary mt-1">
                    {record.filePath}{record.lineRange ? `:${record.lineRange}` : ''}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteReviewRecord(record.id)}
                className="text-xs text-red-500 hover:underline"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-on-surface-tertiary">暂无问题记录</div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function CodeReview() {
  const navigate = useNavigate()
  const { projects } = useProjectStore()
  const { loadLLMConfigs, loadMCPServices, loadSkills, isReviewing, reviewError, llmConfigs } = useCodeReviewStore()
  const [selectedProjectId, setSelectedProjectId] = React.useState('')
  const [branch, setBranch] = React.useState('')
  const [configOpen, setConfigOpen] = React.useState(true)

  useEffect(() => {
    loadLLMConfigs()
    loadMCPServices()
    loadSkills()
  }, [])

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const hasEnabledLLM = llmConfigs.some(c => c.enabled)

  const handleStartReview = () => {
    if (!selectedProjectId) return
    useCodeReviewStore.getState().startReview(
      selectedProjectId,
      selectedProject?.repository || '',
      selectedProject?.branch || branch
    )
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
          title="返回仪表盘"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="h-5 w-px bg-outline" />
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">AI 代码评审</h1>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6 pb-20">
        <p className="text-sm text-on-surface-secondary mb-6">
          对项目代码仓库进行 AI 辅助评审，自动发现问题并记录
        </p>

        {/* Config panel */}
        <div className="border-b border-outline pb-4 mb-4">
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-2 text-sm font-medium mb-3"
          >
            <Icon name="settings" size={20} />
            LLM / MCP / Skill 配置
            <Icon name={configOpen ? 'expand_less' : 'expand_more'} size={20} />
          </button>
          {configOpen && (
            <div className="space-y-4">
              <LLMConfigPanel />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MCPConfigPanel />
                <SkillPanel />
              </div>
            </div>
          )}
        </div>

        {/* Review settings */}
        <div className="border border-outline rounded-xl p-4 space-y-4 mb-4">
          <h3 className="font-heading text-sm font-medium">评审设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-secondary mb-1">选择项目</label>
              <select
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value)
                  const proj = projects.find(p => p.id === e.target.value)
                  if (proj) setBranch(proj.branch)
                }}
                className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
              >
                <option value="">-- 选择项目 --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-secondary mb-1">分支</label>
              <input
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
                placeholder="分支名"
              />
            </div>
          </div>
          <button
            onClick={handleStartReview}
            disabled={!selectedProjectId || !hasEnabledLLM || isReviewing}
            className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {isReviewing ? '评审中...' : '开始评审'}
          </button>
          {reviewError && (
            <div className="text-sm text-red-500">{reviewError}</div>
          )}
        </div>

        {/* Streaming output */}
        <div className="mb-4">
          <h3 className="font-heading text-sm font-medium mb-3">评审输出</h3>
          <StreamOutput />
        </div>

        {/* Issue list */}
        <div>
          <h3 className="font-heading text-sm font-medium mb-3">问题记录</h3>
          <IssueList />
        </div>
      </main>
    </div>
  )
}