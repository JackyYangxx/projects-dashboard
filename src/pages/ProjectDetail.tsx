import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useProjectStore } from '@/store/projectStore'
import Icon from '@/components/Icon'
import ProgressSlider from '@/components/ProgressSlider'
import RichEditor from '@/components/RichEditor'
import PrevNextNav from '@/components/PrevNextNav'
import { STATUS_LABELS, VALID_STATUSES } from '@/constants/project'
import type { BudgetSource, Project, Repository } from '@/types'
import { getAllBudgetSources, insertBudgetSource, updateBudgetSource, deleteBudgetSource } from '@/db/budgetSourceDao'

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getProjectById, updateProject, filteredProjectIds } = useProjectStore()
  const project = id ? getProjectById(id) : undefined

  const currentIndex = project ? filteredProjectIds.indexOf(project.id) : -1
  // displayIndex is 1-based (for user-facing counter), validated to be within bounds
  const displayIndex = (currentIndex >= 0 && currentIndex < filteredProjectIds.length)
    ? currentIndex + 1
    : 0
  const prevId = currentIndex > 0 ? filteredProjectIds[currentIndex - 1] : undefined
  const nextId = currentIndex >= 0 && currentIndex < filteredProjectIds.length - 1 ? filteredProjectIds[currentIndex + 1] : undefined

  const [isReadOnly, setIsReadOnly] = useState(true)
  // Only set initial isReadOnly from URL on first mount, not on subsequent renders
  useEffect(() => {
    setIsReadOnly(searchParams.get('edit') !== 'true')
  }, []) // Empty deps = only runs once on mount
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('')
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set())
  // Default: expand only the newest note history entry when project loads or new entry added
  useEffect(() => {
    if (project?.noteHistory && project.noteHistory.length > 0) {
      const latestId = project.noteHistory[project.noteHistory.length - 1].id
      setExpandedHistoryIds(new Set([latestId]))
    }
  }, [project?.noteHistory])
  const [isEditingTotalBudget, setIsEditingTotalBudget] = useState(false)
  const [totalBudgetInput, setTotalBudgetInput] = useState('')
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [newMilestoneStatus, setNewMilestoneStatus] = useState<'pending' | 'completed' | 'delayed'>('pending')
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('')
  const [editRepos, setEditRepos] = useState<Repository[]>([])
  const [budgetSources, setBudgetSources] = useState<BudgetSource[]>([])
  const [isEditingTag, setIsEditingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [isEditingStatus, setIsEditingStatus] = useState(false)

  // Reset milestone form state when modal closes
  useEffect(() => {
    if (!showMilestoneModal) {
      setNewMilestoneTitle('')
      setNewMilestoneDate(new Date().toISOString().slice(0, 10))
      setNewMilestoneStatus('pending')
      setNewMilestoneDescription('')
    }
  }, [showMilestoneModal])

  // Initialize repo edit state when project loads
  useEffect(() => {
    if (project) {
      setEditRepos(
        project.repositories.length > 0
          ? project.repositories.map(r => ({ ...r }))
          : [{ id: crypto.randomUUID(), url: '', branch: 'main' }]
      )
    }
  }, [project])

  // Load budget sources when project changes
  useEffect(() => {
    if (project) {
      const sources = getAllBudgetSources(project.id)
      setBudgetSources(sources)
    }
  }, [project])

  const addBudgetSource = () => {
    if (!project) return
    const newSource = insertBudgetSource({
      id: '',
      projectId: project.id,
      label: '新来源',
      amount: 0,
      usedAmount: 0,
      date: new Date().toISOString().slice(0, 10),
      note: undefined,
    })
    setBudgetSources([...budgetSources, newSource])
  }

  const updateSource = (id: string, updates: Partial<BudgetSource>) => {
    updateBudgetSource(id, updates)
    setBudgetSources(budgetSources.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeSource = (id: string) => {
    if (budgetSources.length <= 1) return
    deleteBudgetSource(id)
    setBudgetSources(budgetSources.filter(s => s.id !== id))
  }

  const handleSourceLabelChange = (id: string, label: string) => updateSource(id, { label })
  const handleSourceAmountChange = (id: string, amount: number) => updateSource(id, { amount })

  const totalBudget = useMemo(() => budgetSources.reduce((sum, s) => sum + s.amount, 0), [budgetSources])
  const acquisitionPercent = useMemo(() => {
    if (!project || project.totalAmount <= 0) return 0
    return Math.min(100, Math.round((totalBudget / project.totalAmount) * 100))
  }, [totalBudget, project])

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

  const handleAddMilestone = () => {
    if (!project || !newMilestoneTitle.trim() || !newMilestoneDate.trim()) return
    const newMilestone = {
      id: crypto.randomUUID(),
      title: newMilestoneTitle.trim(),
      date: newMilestoneDate.trim(),
      status: newMilestoneStatus,
      description: newMilestoneDescription.trim() || undefined,
    }
    updateProject(project.id, { milestones: [...project.milestones, newMilestone] })
    setNewMilestoneTitle('')
    setNewMilestoneDate('')
    setNewMilestoneStatus('pending')
    setNewMilestoneDescription('')
    setShowMilestoneModal(false)
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <Icon name="search_off" size={48} className="text-on-surface-tertiary mb-4" />
          <h2 className="text-xl font-heading font-semibold text-on-surface-primary mb-2">
            项目不存在
          </h2>
          <p className="text-sm font-body text-on-surface-secondary mb-6">
            未找到 ID 为 "{id}" 的项目
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center h-9 px-3 bg-primary-500 text-white rounded-md text-sm font-body font-medium hover:bg-primary-600 transition-colors"
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
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="h-14 bg-white border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-md text-on-surface-secondary hover:bg-surface-hover hover:text-on-surface-primary transition-colors"
          title="返回仪表盘"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="h-5 w-px bg-outline" />
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-heading font-semibold text-on-surface-primary truncate">
            {project.name}
          </h1>
          {isEditingTag ? (
            <input
              type="text"
              value={tagInput}
              autoFocus
              onChange={e => setTagInput(e.target.value)}
              onBlur={() => {
                updateProject(project.id, { tag: tagInput, updatedAt: new Date().toISOString() })
                setIsEditingTag(false)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setIsEditingTag(false)
              }}
              className="w-28 h-7 px-2 bg-white border border-primary-400 rounded text-xs font-body text-on-surface-primary focus:outline-none focus:ring-2 focus:ring-primary-500/15"
            />
          ) : (
            <span
              onClick={() => {
                if (isReadOnly) return
                setTagInput(project.tag)
                setIsEditingTag(true)
              }}
              className={`px-2 py-0.5 rounded text-xs font-body font-medium flex-shrink-0 ${
                project.tag
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-on-surface-tertiary border border-dashed border-outline'
              } ${!isReadOnly ? 'cursor-pointer hover:bg-primary-100 hover:border-primary-300' : ''}`}
            >
              {project.tag || '添加标签'}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIsReadOnly((prev) => !prev)}
            title={isReadOnly ? '切换到编辑模式' : '切换到查看模式'}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-body font-medium border transition-colors ${
              isReadOnly
                ? 'bg-white border-outline text-on-surface-secondary hover:border-primary-300 hover:text-primary-600'
                : 'bg-primary-500 border-primary-500 text-white hover:bg-primary-600 hover:border-primary-600'
            }`}
          >
            <Icon name={isReadOnly ? 'edit' : 'visibility'} size={15} />
            {isReadOnly ? '编辑' : '编辑中'}
          </button>
          {isEditingStatus ? (
            <select
              value={project.status}
              autoFocus
              onChange={e => {
                updateProject(project.id, { status: e.target.value as Project['status'], updatedAt: new Date().toISOString() })
                setIsEditingStatus(false)
              }}
              onBlur={() => setIsEditingStatus(false)}
              className="h-7 px-2 bg-white border border-primary-400 rounded text-xs font-body font-medium text-on-surface-primary focus:outline-none focus:ring-2 focus:ring-primary-500/15"
            >
              {VALID_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          ) : (
            <span
              onClick={() => { if (!isReadOnly) setIsEditingStatus(true) }}
              className={`inline-flex items-center px-2 h-7 rounded-md text-xs font-body font-medium border ${
                project.status === 'ongoing'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : project.status === 'completed'
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
              } ${!isReadOnly ? 'cursor-pointer hover:opacity-80' : ''}`}
            >
              {STATUS_LABELS[project.status]}
            </span>
          )}
          <span className="text-xs font-body text-on-surface-tertiary font-mono">
            {project.projectId ? `${project.projectId} · ` : ''}#{project.id.slice(0, 8)}
          </span>
        </div>
      </nav>

      {/* Main Content - Bento Grid */}
      <main className="max-w-[1920px] mx-auto w-full p-5 lg:p-7 xl:p-8 flex-1 pb-[60px] lg:pb-[60px] xl:pb-[60px]">
        <div className="grid grid-cols-12 gap-4 xl:gap-6">
          {/* Left column - main content */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
          {/* Row 0: Repository Info Card */}
          <div className="col-span-12">
            <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="folder_copy" size={16} />
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">代码仓信息</h3>
              </div>

              {!isReadOnly ? (
                <div className="space-y-3">
                  {editRepos.map((repo, idx) => (
                    <div key={repo.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={repo.url}
                          onChange={e => {
                            const next = [...editRepos]
                            next[idx] = { ...next[idx], url: e.target.value }
                            setEditRepos(next)
                            updateProject(project.id, { repositories: next.filter(r => r.url.trim()), updatedAt: new Date().toISOString() })
                          }}
                          className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-mono text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                          placeholder="https://github.com/org/repo"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={repo.branch}
                          onChange={e => {
                            const next = [...editRepos]
                            next[idx] = { ...next[idx], branch: e.target.value }
                            setEditRepos(next)
                            updateProject(project.id, { repositories: next.filter(r => r.url.trim()), updatedAt: new Date().toISOString() })
                          }}
                          className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-mono text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                          placeholder="main"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={repo.note || ''}
                          onChange={e => {
                            const next = [...editRepos]
                            next[idx] = { ...next[idx], note: e.target.value }
                            setEditRepos(next)
                            updateProject(project.id, { repositories: next.filter(r => r.url.trim()), updatedAt: new Date().toISOString() })
                          }}
                          className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                          placeholder="备注（可选）"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center pt-0.5">
                        {editRepos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = editRepos.filter((_, i) => i !== idx)
                              setEditRepos(next)
                              updateProject(project.id, { repositories: next.filter(r => r.url.trim()), updatedAt: new Date().toISOString() })
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-tertiary hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="删除此代码仓"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...editRepos, { id: crypto.randomUUID(), url: '', branch: 'main' }]
                      setEditRepos(next)
                      updateProject(project.id, { repositories: next.filter(r => r.url.trim()), updatedAt: new Date().toISOString() })
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 border border-dashed border-outline rounded-md text-xs font-body text-on-surface-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    <Icon name="add" size={14} />
                    添加代码仓
                  </button>
                </div>
              ) : (
                <div className="text-sm font-body text-on-surface-primary">
                  {project.repositories.length > 0 ? (
                    <div className="space-y-2">
                      {project.repositories.map(repo => (
                        <div key={repo.id} className="flex items-center gap-2 py-1.5 px-3 bg-surface-base rounded-md">
                          <Icon name="folder_copy" size={14} className="text-on-surface-tertiary flex-shrink-0" />
                          <span className="font-mono text-xs">{repo.url}</span>
                          <span className="text-on-surface-tertiary">@</span>
                          <span className="font-mono text-xs">{repo.branch || '—'}</span>
                          {project.projectId && (
                            <span className="text-xs font-mono text-on-surface-tertiary ml-auto border border-outline px-1.5 py-0.5 rounded">
                              {project.projectId}
                            </span>
                          )}
                          {repo.note && (
                            <span className="text-xs text-on-surface-tertiary ml-2">({repo.note})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-on-surface-tertiary">未设置代码仓</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 1: Progress - full width */}
          <div className="col-span-12">
            <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
              <ProgressSlider
                value={project.progress}
                subProgress={project.subProgress}
                onChange={handleProgressChange}
                onSubProgressChange={handleSubProgressChange}
                onReset={() => {
                  updateProject(project.id, {
                    progress: 0,
                    subProgress: { architecture: 0, uiux: 0, engineering: 0, qa: 0 },
                    updatedAt: new Date().toISOString(),
                  })
                }}
                lastUpdated={formatDate(project.updatedAt)}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Milestones - standalone row below Progress */}
          <div className="col-span-12">
            <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-body font-medium text-on-surface-secondary flex items-center gap-2">
                  <Icon name="timeline" size={16} />
                  里程碑
                </h3>
                <div className="flex items-center gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={() => setShowMilestoneModal(true)}
                      className="inline-flex items-center h-7 px-2.5 bg-primary-500 text-white rounded-md text-xs font-body font-medium hover:bg-primary-600 transition-colors gap-1"
                    >
                      <Icon name="add" size={14} />
                      添加里程碑
                    </button>
                  )}
                  <span className="text-xs font-body text-on-surface-tertiary">
                    {project.milestones.length} 个里程碑
                  </span>
                </div>
              </div>

              {project.milestones.length === 0 ? (
                <div className="py-6 text-center">
                  <Icon name="timeline" size={24} className="text-on-surface-tertiary mb-2" />
                  <p className="text-sm font-body text-on-surface-tertiary">暂无里程碑</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-outline" />
                  <div className="space-y-5">
                    {project.milestones.map((milestone) => {
                      const status = milestoneStatusStyles[milestone.status] || milestoneStatusStyles.pending
                      return (
                        <div key={milestone.id} className="relative">
                          <div
                            className={`absolute -left-[1.4375rem] top-1 w-4 h-4 rounded-full ${status.dot} ring-2 ring-white`}
                          />
                          <div className="ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-body font-semibold text-on-surface-primary">
                                {milestone.title}
                              </h4>
                              <span className={`inline-flex items-center px-1.5 h-5 rounded text-[10px] font-body font-medium ${
                                milestone.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : milestone.status === 'delayed'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-primary-50 text-primary-700 border border-primary-200'
                              }`}>
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

          {/* Row 1b: Budget Stats - full width standalone row */}
          <div className="col-span-12">
            <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
              <h3 className="text-sm font-body font-medium text-on-surface-secondary flex items-center gap-2 mb-4">
                <Icon name="account_balance_wallet" size={16} />
                预算统计
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col">
                  <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2 max-h-[400px]">
                {budgetSources.map((source) => (
                  isReadOnly ? (
                    <div key={source.id} className="bg-surface-hover/40 rounded-md p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-body font-medium text-on-surface-primary truncate" title={source.label}>
                          {source.label || '未命名来源'}
                        </span>
                        <span className="text-sm font-heading font-semibold text-on-surface-primary tabular-nums whitespace-nowrap">
                          {formatCurrency(source.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-body text-on-surface-tertiary">
                        <span className="font-mono whitespace-nowrap">{source.date || '—'}</span>
                        {source.note && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="truncate" title={source.note}>{source.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={source.id} className="bg-surface-hover/40 rounded-md p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={source.label}
                          title={source.label}
                          placeholder="来源名称"
                          onChange={(e) => handleSourceLabelChange(source.id, e.target.value)}
                          className="flex-1 min-w-0 h-7 bg-white border border-outline rounded px-2 text-xs font-body text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                        />
                        <input
                          type="number"
                          value={source.amount || ''}
                          title={String(source.amount)}
                          placeholder="金额"
                          onChange={(e) => handleSourceAmountChange(source.id, Number(e.target.value) || 0)}
                          className="w-20 h-7 bg-white border border-outline rounded px-2 text-xs font-heading font-semibold text-on-surface-primary text-right tabular-nums focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                        />
                        <input
                          type="date"
                          value={source.date}
                          onChange={(e) => updateSource(source.id, { date: e.target.value })}
                          className="w-32 h-7 bg-white border border-outline rounded px-2 text-xs font-body text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                        />
                        <button
                          onClick={() => removeSource(source.id)}
                          disabled={budgetSources.length <= 1}
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-on-surface-tertiary hover:text-error hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          <Icon name="delete" size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          value={source.note ?? ''}
                          placeholder="备注（可选）"
                          onChange={(e) => updateSource(source.id, { note: e.target.value || undefined })}
                          className="flex-1 min-w-0 h-7 bg-white border border-outline rounded px-2 text-xs font-body text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>
                {!isReadOnly && (
                  <button
                    onClick={addBudgetSource}
                    className="mt-3 w-full h-8 border border-dashed border-outline rounded-md text-xs font-body text-on-surface-tertiary hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Icon name="add" size={12} />
                    添加来源
                  </button>
                )}
              </div>

              {/* Right column: stats + pie chart */}
              <div className="lg:col-span-1 flex flex-col">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - acquisitionPercent / 100)}
                        className="text-primary-500 transition-all"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-heading font-bold text-primary-600 tabular-nums">{acquisitionPercent}%</span>
                      <span className="text-[10px] font-body text-on-surface-tertiary mt-0.5">获取率</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-outline">
                  <div>
                    <p className="text-xs font-body text-on-surface-tertiary mb-1">已获取</p>
                    <p className="w-full text-right text-lg font-heading font-semibold text-on-surface-primary tabular-nums px-2">
                      {formatCurrency(totalBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-body text-on-surface-tertiary mb-1">总预算</p>
                    {isEditingTotalBudget ? (
                      <input
                        type="number"
                        value={totalBudgetInput}
                        autoFocus
                        onChange={(e) => setTotalBudgetInput(e.target.value)}
                        onBlur={() => {
                          const v = Number(totalBudgetInput) || 0
                          updateProject(project.id, { totalAmount: v, updatedAt: new Date().toISOString() })
                          setIsEditingTotalBudget(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            ;(e.target as HTMLInputElement).blur()
                          }
                          if (e.key === 'Escape') {
                            setIsEditingTotalBudget(false)
                          }
                        }}
                        className="w-full h-9 bg-white border border-primary-400 rounded px-2 text-lg font-heading font-semibold text-on-surface-primary text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          if (isReadOnly) return
                          setTotalBudgetInput(String(project.totalAmount))
                          setIsEditingTotalBudget(true)
                        }}
                        disabled={isReadOnly}
                        title={isReadOnly ? '' : '点击编辑'}
                        className={`w-full text-right text-lg font-heading font-semibold text-on-surface-primary tabular-nums px-2 ${isReadOnly ? '' : 'hover:bg-surface-hover rounded -mx-2 cursor-text'}`}
                      >
                        {formatCurrency(project.totalAmount)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Row 3: Strategic Team - standalone row */}
          <div className="col-span-12">
            <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-body font-medium text-on-surface-secondary">战略团队</h3>
                <span className="text-xs font-body text-on-surface-tertiary">
                  {project.team.length} 名成员
                </span>
              </div>

              {project.team.length === 0 ? (
                <div className="py-6 text-center">
                  <Icon name="group_off" size={24} className="text-on-surface-tertiary mb-2" />
                  <p className="text-sm font-body text-on-surface-tertiary">暂无团队成员</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {project.team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2.5 bg-surface-hover/50 rounded-md"
                    >
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full bg-white"
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
                    </div>
                  ))}
                </div>
              )}

              {!isReadOnly && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="mt-4 w-full h-9 border border-dashed border-outline rounded-md text-sm font-body text-on-surface-tertiary hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <Icon name="add" size={14} />
                添加成员
              </button>
              )}
            </div>
          </div>
          </div>

          {/* Right column - project notes (fixed height, scrollable history, editor at bottom) */}
          <div className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:flex lg:flex-col pr-1">
              {/* Note History Accordion - takes remaining space, scrollable */}
              {project.noteHistory.length > 0 && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide mb-4">
                  <div className="bg-white border border-outline rounded-lg overflow-hidden shadow-card">
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-surface-hover/40 transition-colors"
                    onClick={() => {
                      if (expandedHistoryIds.size > 0) {
                        setExpandedHistoryIds(new Set())
                      } else {
                        const latestId = project.noteHistory[project.noteHistory.length - 1]?.id
                        setExpandedHistoryIds(latestId ? new Set([latestId]) : new Set())
                      }
                    }}
                  >
                    <h3 className="text-sm font-body font-medium text-on-surface-secondary">
                      笔记历史
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body text-on-surface-tertiary">
                        {project.noteHistory.length} 条记录
                      </span>
                      <Icon
                        name="chevron_left"
                        size={18}
                        className={`transition-transform duration-200 ${expandedHistoryIds.size > 0 ? '-rotate-90' : ''}`}
                      />
                    </div>
                  </div>
                  {expandedHistoryIds.size > 0 && (
                    <div className="border-t border-outline">
                      {project.noteHistory.slice().reverse().map((entry) => (
                        <div
                          key={entry.id}
                          className="border-b border-outline-variant last:border-b-0"
                        >
                          <div
                            className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-hover/40 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const next = new Set(expandedHistoryIds)
                              if (next.has(entry.id)) {
                                next.delete(entry.id)
                              } else {
                                next.add(entry.id)
                              }
                              setExpandedHistoryIds(next)
                            }}
                          >
                            <span className="text-xs font-mono text-on-surface-tertiary">
                              {formatDate(entry.createdAt)}
                            </span>
                            <Icon
                              name="chevron_left"
                              size={16}
                              className={`transition-transform duration-200 ${expandedHistoryIds.has(entry.id) ? '-rotate-90' : ''}`}
                            />
                          </div>
                          {expandedHistoryIds.has(entry.id) && (
                            <div
                              className="px-5 pb-4 text-sm font-body text-on-surface-secondary"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(entry.content, { async: false })) }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* Project Notes Card - always visible */}
              <div className="flex-shrink-0">
              <div className="bg-white border border-outline rounded-lg p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-body font-medium text-on-surface-secondary flex items-center gap-2">
                    <Icon name="edit" size={16} />
                    项目笔记
                  </h3>
                </div>
                {isReadOnly ? (
                  <RichEditor value={project.notes || ''} readOnly placeholder="" />
                ) : (
                  <>
                    <RichEditor
                      value={project.notes || ''}
                      onChange={handleNotesChange}
                      placeholder="在此记录项目进展、关键决策和重要事项..."
                    />
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <button
                        onClick={() => {
                          updateProject(project.id, { notes: '', updatedAt: new Date().toISOString() })
                        }}
                        className="inline-flex items-center h-9 px-3 border border-outline rounded-md text-sm font-body text-on-surface-primary hover:bg-surface-hover transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          if (!project.notes || !project.notes.trim()) return
                          const { addNoteHistory } = useProjectStore.getState()
                          addNoteHistory(project.id, project.notes)
                        }}
                        disabled={!project.notes || !project.notes.trim()}
                        className="inline-flex items-center h-9 px-3 bg-primary-500 text-white rounded-md text-sm font-body font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        保存历史
                      </button>
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Prev/Next Navigation - fixed at bottom within right panel */}
      <div className="fixed bottom-0 left-64 right-0 z-10">
        <div className="max-w-[1920px] mx-auto w-full">
          <PrevNextNav
            prevId={prevId}
            nextId={nextId}
            currentIndex={displayIndex}
            total={filteredProjectIds.length}
            onPrev={() => prevId && navigate(`/project/${prevId}`)}
            onNext={() => nextId && navigate(`/project/${nextId}`)}
          />
        </div>
      </div>

      {/* Team Member Add Modal */}
      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm"
          onClick={() => setShowMemberModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl border border-outline w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
              <h3 className="text-base font-heading font-semibold text-on-surface-primary">添加团队成员</h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-surface-hover hover:text-on-surface-primary transition-colors"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <img
                  src={newMemberName.trim()
                    ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newMemberName.trim())}`
                    : 'https://api.dicebear.com/7.x/initials/svg?seed=?'}
                  alt="头像预览"
                  className="w-20 h-20 rounded-full bg-surface-hover ring-2 ring-outline"
                />
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-1.5">
                  姓名 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="输入姓名，如：张明"
                  className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors"
                />
              </div>

              {/* Role Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-1.5">
                  职位 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="输入职位，如：项目经理"
                  className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline bg-surface-hover/30">
              <button
                onClick={() => setShowMemberModal(false)}
                className="inline-flex items-center h-9 px-3 border border-outline rounded-md text-sm font-body text-on-surface-primary hover:bg-surface-hover transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim() || !newMemberRole.trim()}
                className="inline-flex items-center h-9 px-3 bg-primary-500 text-white rounded-md text-sm font-body font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Add Modal */}
      {showMilestoneModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm"
          onClick={() => setShowMilestoneModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl border border-outline w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
              <h3 className="text-base font-heading font-semibold text-on-surface-primary">添加里程碑</h3>
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-surface-hover hover:text-on-surface-primary transition-colors"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-1.5">
                  标题 <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="输入里程碑标题，如：需求分析完成"
                  className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors"
                />
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-1.5">
                  日期 <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors"
                />
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-1.5">
                  状态
                </label>
                <select
                  value={newMilestoneStatus}
                  onChange={(e) => setNewMilestoneStatus(e.target.value as 'pending' | 'completed' | 'delayed')}
                  className="w-full h-9 px-3 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors"
                >
                  <option value="pending">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="delayed">延期</option>
                </select>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-body font-medium text-on-surface-secondary mb-1.5">
                  描述
                </label>
                <textarea
                  value={newMilestoneDescription}
                  onChange={(e) => setNewMilestoneDescription(e.target.value)}
                  placeholder="输入里程碑描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline bg-surface-hover/30">
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="inline-flex items-center h-9 px-3 border border-outline rounded-md text-sm font-body text-on-surface-primary hover:bg-surface-hover transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddMilestone}
                disabled={!newMilestoneTitle.trim() || !newMilestoneDate.trim()}
                className="inline-flex items-center h-9 px-3 bg-primary-500 text-white rounded-md text-sm font-body font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
