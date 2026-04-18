import React, { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import ProgressSlider from '@/components/ProgressSlider'
import RichEditor from '@/components/RichEditor'
import Timeline from '@/components/Timeline'

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getProjectById, updateProject } = useProjectStore()
  const project = id ? getProjectById(id) : undefined

  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')
  const [isReadOnly, setIsReadOnly] = useState(searchParams.get('edit') !== 'true')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('')
  const [budgetEditTotal, setBudgetEditTotal] = useState('')
  const [budgetEditUsed, setBudgetEditUsed] = useState('')
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    (() => {
      const history = project?.noteHistory
      return history && history.length > 0 ? history[history.length - 1].id : null
    })()
  )

  const handleAddMember = () => {
    if (!project || !newMemberName.trim() || !newMemberRole.trim()) return
    const newMember = {
      id: crypto.randomUUID(),
      name: newMemberName.trim(),
      role: newMemberRole.trim(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newMemberName.trim())}`,
    }
    updateProject(project.id, { team: [...project.team, newMember] })
    setNewMemberName('')
    setNewMemberRole('')
    setShowMemberModal(false)
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-tertiary mb-4">
            search_off
          </span>
          <h2 className="text-xl font-heading font-semibold text-on-surface-primary mb-2">
            项目不存在
          </h2>
          <p className="text-sm font-body text-on-surface-secondary mb-6">
            未找到 ID 为 "{id}" 的项目
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors"
          >
            返回仪表盘
          </button>
        </div>
      </div>
    )
  }

  const handleProgressChange = (value: number) => {
    updateProject(project.id, { progress: value, updatedAt: new Date().toISOString() })
  }

  const handleSubProgressChange = (key: keyof typeof project.subProgress, value: number) => {
    updateProject(project.id, {
      subProgress: { ...project.subProgress, [key]: value },
      updatedAt: new Date().toISOString(),
    })
  }

  const handleNotesChange = (html: string) => {
    updateProject(project.id, { notes: html, updatedAt: new Date().toISOString() })
  }

  const budgetPercent = project.totalAmount > 0
    ? Math.round((project.usedAmount / project.totalAmount) * 100)
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const milestoneStatusStyles: Record<string, { dot: string; label: string; line: string }> = {
    completed: { dot: 'bg-success', label: 'text-success', line: 'bg-success' },
    pending: { dot: 'bg-primary-500', label: 'text-primary-500', line: 'bg-surface-base' },
    delayed: { dot: 'bg-warning', label: 'text-warning', line: 'bg-warning' },
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
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="h-5 w-px bg-outline" />
        <div className="flex items-center gap-3">
          <h1 className="text-base font-heading font-semibold text-on-surface-primary">
            {project.name}
          </h1>
          <span className="px-2 py-0.5 bg-surface-container rounded text-xs font-body text-on-surface-tertiary">
            {project.tag}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setIsReadOnly((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-all duration-150 ${
              isReadOnly
                ? 'bg-surface-base text-on-surface-secondary hover:bg-primary-50 hover:text-primary-500'
                : 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isReadOnly ? 'edit' : 'visibility'}
            </span>
            {isReadOnly ? '编辑' : '查看'}
          </button>
          <span
            className={`px-2 py-1 rounded text-xs font-body font-medium ${
              project.status === 'ongoing'
                ? 'bg-success/10 text-success'
                : project.status === 'completed'
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'bg-warning/10 text-warning'
            }`}
          >
            {project.status === 'ongoing' ? '进行中' : project.status === 'completed' ? '已完成' : '已暂停'}
          </span>
          <span className="text-xs font-body text-on-surface-tertiary font-mono">
            #{project.id.slice(0, 8)}
          </span>
        </div>
      </nav>

      {/* Main Content - Bento Grid */}
      <main className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Row 1: Progress Tracking (8 cols) + Budget Stats (4 cols) */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-elevated rounded-xl p-6 h-full">
              <ProgressSlider
                value={project.progress}
                subProgress={project.subProgress}
                onChange={handleProgressChange}
                onSubProgressChange={handleSubProgressChange}
                lastUpdated={formatDate(project.updatedAt)}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="bg-primary-500 rounded-xl p-6 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-body font-medium text-white/70 mb-4">预算统计</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-body text-white/60 mb-1">总金额</p>
                    {isReadOnly ? (
                      <p className="text-2xl font-heading font-bold text-white">
                        {formatCurrency(project.totalAmount)}
                      </p>
                    ) : (
                      <input
                        type="number"
                        value={budgetEditTotal}
                        onChange={(e) => setBudgetEditTotal(e.target.value)}
                        onFocus={() => setBudgetEditTotal(String(project.totalAmount))}
                        onBlur={() => {
                          const val = Number(budgetEditTotal)
                          if (!isNaN(val) && val >= 0) {
                            setBudgetSaving(true)
                            updateProject(project.id, { totalAmount: val, updatedAt: new Date().toISOString() })
                            setTimeout(() => setBudgetSaving(false), 600)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setBudgetEditTotal(String(project.totalAmount))
                          }
                        }}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-2xl font-heading font-bold text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                        placeholder="0"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-body text-white/60 mb-1">已使用</p>
                    {isReadOnly ? (
                      <p className="text-xl font-heading font-semibold text-white">
                        {formatCurrency(project.usedAmount)}
                      </p>
                    ) : (
                      <input
                        type="number"
                        value={budgetEditUsed}
                        onChange={(e) => setBudgetEditUsed(e.target.value)}
                        onFocus={() => setBudgetEditUsed(String(project.usedAmount))}
                        onBlur={() => {
                          const val = Number(budgetEditUsed)
                          if (!isNaN(val) && val >= 0 && val <= project.totalAmount) {
                            setBudgetSaving(true)
                            updateProject(project.id, { usedAmount: val, updatedAt: new Date().toISOString() })
                            setTimeout(() => setBudgetSaving(false), 600)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setBudgetEditUsed(String(project.usedAmount))
                          }
                        }}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-xl font-heading font-semibold text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                        placeholder="0"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-body text-white/60">执行率</span>
                  {budgetSaving ? (
                    <span className="flex items-center gap-1 text-xs font-body text-white/70">
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      保存中...
                    </span>
                  ) : (
                    <span className="text-lg font-heading font-bold text-white">{budgetPercent}%</span>
                  )}
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Note History Accordion */}
          {project.noteHistory.length > 0 && (
            <div className="col-span-12">
              <div className="bg-surface-elevated rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between px-6 py-4 cursor-pointer select-none"
                  onClick={() => {
                    const newest = project.noteHistory[project.noteHistory.length - 1]?.id ?? null
                    setExpandedHistoryId(expandedHistoryId ? null : newest)
                  }}
                >
                  <h3 className="text-sm font-body font-medium text-on-surface-secondary">
                    笔记历史
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-body text-on-surface-tertiary">
                      {project.noteHistory.length} 条记录
                    </span>
                    <span className="material-symbols-outlined text-base text-on-surface-tertiary transition-transform duration-200" style={{ transform: expandedHistoryId ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                      expand_more
                    </span>
                  </div>
                </div>
                {expandedHistoryId && (
                  <div className="border-t border-outline">
                    {project.noteHistory.slice().reverse().map((entry) => (
                      <div
                        key={entry.id}
                        className="border-b border-outline-variant last:border-b-0"
                      >
                        <div
                          className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-base/50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)
                          }}
                        >
                          <span className="text-xs font-mono text-on-surface-tertiary">
                            {formatDate(entry.createdAt)}
                          </span>
                          <span className="material-symbols-outlined text-sm text-on-surface-tertiary transition-transform duration-200" style={{ transform: expandedHistoryId === entry.id ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                            expand_more
                          </span>
                        </div>
                        {expandedHistoryId === entry.id && (
                          <div
                            className="px-6 pb-3 text-sm font-body text-on-surface-secondary"
                            dangerouslySetInnerHTML={{ __html: entry.content }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 2b: Rich Text Editor (12 cols) */}
          <div className="col-span-12">
            <div className="bg-surface-elevated rounded-xl p-6">
              <h3 className="text-sm font-body font-medium text-on-surface-secondary mb-4">项目笔记</h3>
              <RichEditor
                value={project.notes}
                onChange={handleNotesChange}
                placeholder="在此记录项目进展、关键决策和重要事项..."
                readOnly={isReadOnly}
              />
              {!isReadOnly && (
                <div className="flex items-center justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      updateProject(project.id, { notes: '', updatedAt: new Date().toISOString() })
                    }}
                    className="px-4 py-2 border border-outline rounded-xl text-sm font-body text-on-surface-primary hover:bg-surface-container transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      const { addNoteHistory } = useProjectStore.getState()
                      addNoteHistory(project.id, project.notes)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-body font-medium hover:shadow-glow-sm transition-all"
                  >
                    保存历史
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Strategic Team (5 cols) + Milestones (7 cols) */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-surface-elevated rounded-xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">战略团队</h3>
                <span className="text-xs font-body text-on-surface-tertiary">
                  {project.team.length} 名成员
                </span>
              </div>

              {project.team.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-tertiary mb-2">
                    group_off
                  </span>
                  <p className="text-sm font-body text-on-surface-tertiary">暂无团队成员</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-surface-base rounded-lg"
                    >
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full bg-surface-container"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-on-surface-primary truncate">
                          {member.name}
                        </p>
                        <p className="text-xs font-body text-on-surface-tertiary truncate">
                          {member.role}
                        </p>
                      </div>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-tertiary hover:bg-surface-container hover:text-on-surface-primary transition-colors opacity-0 group-hover:opacity-100">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowMemberModal(true)}
                className="mt-4 w-full py-2 border border-dashed border-outline rounded-lg text-sm font-body text-on-surface-tertiary hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                添加成员
              </button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="bg-surface-elevated rounded-xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">里程碑</h3>
                <span className="text-xs font-body text-on-surface-tertiary">
                  {project.milestones.length} 个里程碑
                </span>
              </div>

              {project.milestones.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-on-surface-tertiary mb-2">
                    timeline
                  </span>
                  <p className="text-sm font-body text-on-surface-tertiary">暂无里程碑</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-outline" />
                  <div className="space-y-6">
                    {project.milestones.map((milestone) => {
                      const status = milestoneStatusStyles[milestone.status] || milestoneStatusStyles.pending
                      return (
                        <div key={milestone.id} className="relative">
                          {/* Dot */}
                          <div
                            className={`absolute -left-[1.125rem] top-1 w-4 h-4 rounded-full ${status.dot} ring-2 ring-white`}
                          />
                          <div className="ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-body font-semibold text-on-surface-primary">
                                {milestone.title}
                              </h4>
                              <span className={`text-xs font-body font-medium ${status.label}`}>
                                {milestone.status === 'completed' ? '已完成' : milestone.status === 'delayed' ? '延期' : '进行中'}
                              </span>
                            </div>
                            <p className="text-xs font-body text-on-surface-tertiary font-mono mb-1">
                              {milestone.date}
                            </p>
                            {milestone.description && (
                              <p className="text-xs font-body text-on-surface-secondary">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Evolution Timeline (12 cols) */}
          <div className="col-span-12">
            <div className="bg-surface-elevated rounded-xl p-6">
              <Timeline
                events={project.timeline}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Team Member Add Modal */}
      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMemberModal(false)}
        >
          <div
            className="bg-surface-elevated rounded-2xl shadow-xl border border-outline w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline">
              <h3 className="text-base font-heading font-semibold text-on-surface-primary">添加团队成员</h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-tertiary hover:bg-surface-container hover:text-on-surface-primary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <img
                  src={newMemberName.trim()
                    ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newMemberName.trim())}`
                    : 'https://api.dicebear.com/7.x/initials/svg?seed=?'}
                  alt="头像预览"
                  className="w-20 h-20 rounded-full bg-surface-base ring-2 ring-outline"
                />
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">
                  姓名 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="输入姓名，如：张明"
                  className="w-full px-3 py-2 bg-surface-base border border-outline rounded-xl text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                />
              </div>

              {/* Role Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-2">
                  职位 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="输入职位，如：项目经理"
                  className="w-full px-3 py-2 bg-surface-base border border-outline rounded-xl text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline bg-surface-base/50">
              <button
                onClick={() => setShowMemberModal(false)}
                className="px-4 py-2 border border-outline rounded-xl text-sm font-body text-on-surface-primary hover:bg-surface-container transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim() || !newMemberRole.trim()}
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-body font-medium hover:shadow-glow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
