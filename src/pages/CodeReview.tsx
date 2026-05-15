import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { useCodeReviewStore } from '@/store/codeReviewStore'
import { useProjectStore } from '@/store/projectStore'
import Icon from '@/components/Icon'
import ProjectSelector from '@/components/ProjectSelector'
import ReviewProgress from '@/components/ReviewProgress'
import MRReviewTabs from '@/components/MRReviewTabs'
import MCPConfigPanel from '@/components/MCPConfigPanel'
import { exportToExcel } from '@/utils/excel'
import type { MRReviewRecord } from '@/types'

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
    const result = await testLLMConfig(form.modelUrl, form.apiKey, form.modelName)
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
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
  const [showForm, setShowForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [checkedFiles, setCheckedFiles] = useState<number[]>([])

  useEffect(() => { loadSkills() }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.zip'))
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).filter(f => f.name.endsWith('.zip')) : []
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setCheckedFiles(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
  }

  const parseSkillFromZip = async (file: File): Promise<{ name: string; description?: string; content: string } | null> => {
    try {
      const zip = await JSZip.loadAsync(file)
      const txtFile = zip.file(/\.txt$/i)[0] || zip.file(/\.md$/i)[0]
      if (!txtFile) return null

      const content = await txtFile.async('string')
      const name = file.name.replace(/\.zip$/i, '')

      return {
        name,
        description: `从 ${file.name} 导入`,
        content: content.trim(),
      }
    } catch (err) {
      console.error('[Skill] Failed to parse zip:', file.name, err)
      return null
    }
  }

  const toggleChecked = (index: number) => {
    if (checkedFiles.includes(index)) {
      setCheckedFiles(checkedFiles.filter(i => i !== index))
    } else {
      setCheckedFiles([...checkedFiles, index])
    }
  }

  const handleBatchImport = async () => {
    if (checkedFiles.length === 0) return

    let successCount = 0
    for (const index of checkedFiles) {
      const file = selectedFiles[index]
      const skillData = await parseSkillFromZip(file)
      if (skillData) {
        addSkill({ ...skillData, enabled: true })
        successCount++
      }
    }

    setSelectedFiles([])
    setCheckedFiles([])
    if (successCount > 0) {
      alert(`成功导入 ${successCount} 个 Skill`)
    }
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl p-4">
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
          {/* Drag-drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-outline hover:border-primary-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".zip"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="skill-zip-upload"
            />
            <label htmlFor="skill-zip-upload" className="cursor-pointer">
              <div className="text-2xl mb-2">📦</div>
              <p className="text-sm text-on-surface-secondary">点击或拖拽 ZIP 文件到此处</p>
              <p className="text-xs text-on-surface-tertiary mt-1">支持多文件同时选择</p>
            </label>
          </div>

          {/* File list */}
          {selectedFiles.length > 0 && (
            <div className="bg-surface-secondary rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs text-on-surface-tertiary mb-2">
                <span>已选择 {selectedFiles.length} 个文件</span>
                <button onClick={() => { setSelectedFiles([]); setCheckedFiles([]) }} className="text-primary-500 hover:underline">清空</button>
              </div>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkedFiles.includes(index)}
                      onChange={() => toggleChecked(index)}
                    />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-on-surface-tertiary">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    移除
                  </button>
                </div>
              ))}
              <button
                onClick={handleBatchImport}
                disabled={checkedFiles.length === 0}
                className="w-full mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm disabled:opacity-50"
              >
                导入选中 ({checkedFiles.length})
              </button>
            </div>
          )}
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

// ── Main Page ─────────────────────────────────────────────────

export default function CodeReview() {
  const navigate = useNavigate()
  const { loadLLMConfigs, loadMCPs, loadSkills, isReviewing, reviewProgress, mrReviewRecords, selectedProjectIds, selectProjects, startBatchReview, clearAllReviewData, reviewError } = useCodeReviewStore()
  const [configOpen, setConfigOpen] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    loadLLMConfigs()
    loadMCPs()
    loadSkills()
    useProjectStore.getState().loadProjects()
  }, [])

  const handleStartReview = () => {
    if (selectedProjectIds.length === 0) return
    startBatchReview(selectedProjectIds)
  }

  const handleExport = () => {
    exportToExcel(mrReviewRecords)
  }

  const handleClearData = () => {
    if (mrReviewRecords.length === 0) return
    exportToExcel(mrReviewRecords)
    clearAllReviewData()
    setShowClearConfirm(false)
  }

  // Group records by project
  const recordsByProject = new Map<string, MRReviewRecord[]>()
  for (const record of mrReviewRecords) {
    const list = recordsByProject.get(record.projectName) || []
    list.push(record)
    recordsByProject.set(record.projectName, list)
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-secondary hover:bg-surface-container hover:text-on-surface-primary transition-colors" title="返回仪表盘">
          <Icon name="arrow_back" />
        </button>
        <div className="h-5 w-px bg-outline" />
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">AI 代码评审</h1>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6 pb-20">
        {/* Config Section */}
        <div className="border-b border-outline pb-4 mb-4">
          <button onClick={() => setConfigOpen(!configOpen)} className="flex items-center gap-2 text-sm font-medium mb-3">
            <Icon name="settings" size={20} />
            LLM / MCP / Skill 配置
            <Icon name={configOpen ? 'expand_less' : 'expand_more'} size={20} />
          </button>
          {configOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LLMConfigPanel />
              <MCPConfigPanel />
              <SkillPanel />
            </div>
          )}
        </div>

        {/* Project Selection */}
        <div className="mb-4">
          <h3 className="font-heading text-sm font-medium mb-3">评审项目选择</h3>
          <ProjectSelector selectedIds={selectedProjectIds} onChange={selectProjects} />
          <button
            onClick={handleStartReview}
            disabled={selectedProjectIds.length === 0 || isReviewing}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {isReviewing ? '评审中...' : '开始评审'}
          </button>
          {reviewError && (
            <div className="mt-2 text-sm text-red-500">{reviewError}</div>
          )}
        </div>

        {/* Review Progress */}
        {reviewProgress && (
          <div className="mb-4">
            <ReviewProgress
              currentProject={reviewProgress.projectName}
              currentMR={reviewProgress.mrTitle}
              progress={reviewProgress.progress}
              completedCount={reviewProgress.completed}
              totalCount={reviewProgress.total}
            />
          </div>
        )}

        {/* MR Review Results */}
        {mrReviewRecords.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-medium">评审结果</h3>
              <div className="flex gap-2">
                <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-primary-500 hover:bg-surface-container">
                  <Icon name="download" size={14} />
                  导出 Excel
                </button>
                <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-red-500 hover:bg-surface-container">
                  <Icon name="delete" size={14} />
                  清理数据
                </button>
              </div>
            </div>
            <MRReviewTabs recordsByProject={recordsByProject} onViewOnline={(url) => window.open(url, '_blank')} />
          </div>
        )}
      </main>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-heading font-semibold mb-2">确认清理</h3>
            <p className="text-sm text-on-surface-secondary mb-4">清理前会先导出 Excel，确定要清理吗？</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-surface-secondary rounded-lg text-sm">取消</button>
              <button onClick={handleClearData} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">确认清理</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}