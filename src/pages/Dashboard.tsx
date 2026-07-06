import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { type IconName } from '@/components/Icon'
import * as XLSX from 'xlsx'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import ProjectTable from '@/components/ProjectTable'
import { useProjectStore } from '@/store/projectStore'
import { upsert } from '@/db/projectDao'
import { STATUS_LABELS, STATUS_MAP, VALID_STATUSES, IMPORT_REQUIRED_HEADERS } from '@/constants/project'
import { animateStaggerIn, animateFadeIn } from '@/utils/animations'
import type { Project } from '@/types'

type StatusFilter = 'all' | Project['status']

const STATUS_CHIPS: { key: StatusFilter; label: string; icon: IconName }[] = [
  { key: 'all', label: '全部', icon: 'apps' },
  { key: 'ongoing', label: '进行中', icon: 'play_circle' },
  { key: 'completed', label: '已完成', icon: 'check_circle' },
  { key: 'paused', label: '已暂停', icon: 'pause_circle' },
]

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { projects, isLoading, loadProjects, setFilteredProjectIds } = useProjectStore()
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ongoing')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const headerRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const tagMenuRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Close import / status / month menus when clicking outside
  useEffect(() => {
    if (!showImportMenu && !showStatusMenu && !showTagMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showImportMenu && !target.closest('.import-menu-container')) {
        setShowImportMenu(false)
      }
      if (showStatusMenu && statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setShowStatusMenu(false)
      }
      if (showTagMenu && tagMenuRef.current && !tagMenuRef.current.contains(target)) {
        setShowTagMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showImportMenu, showStatusMenu, showTagMenu])

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    projects.forEach(p => p.tags?.forEach(t => { if (t) tagSet.add(t) }))
    return Array.from(tagSet).sort()
  }, [projects])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    let result = projects
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }
    if (tagFilter.length > 0) {
      result = result.filter((p) => tagFilter.some(t => p.tags?.includes(t)))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.leader.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [projects, statusFilter, tagFilter, searchQuery])

  // Sync filtered IDs for prev/next nav
  useEffect(() => {
    if (projects.length > 0) {
      setFilteredProjectIds(filteredProjects.map(p => p.id))
    }
  }, [filteredProjects, projects.length, setFilteredProjectIds])

  // Background removed (Notion/Linear clean style) — keep ref to avoid unused warning
  void glowRef

  // Stagger entrance for hero / stats / filter / table
  useEffect(() => {
    if (isLoading) return
    if (headerRef.current) animateFadeIn(headerRef.current, { delay: 0, duration: 450 })
    if (statsRef.current) {
      animateStaggerIn(statsRef.current, '[data-stagger]', { delay: 200, staggerMs: 80 })
    }
    if (filterRef.current) animateFadeIn(filterRef.current, { delay: 450, duration: 400 })
  }, [isLoading])

  useEffect(() => {
    if (!isLoading && projects.length > 0 && tableRef.current) {
      animateFadeIn(tableRef.current, { delay: 600, duration: 500 })
    }
  }, [isLoading, projects.length])

  // Stats
  const totalCount = projects.length
  const ongoingCount = projects.filter((p) => p.status === 'ongoing').length
  const totalBudget = projects.reduce((sum, p) => sum + p.totalAmount, 0)
  const usedBudget = projects.reduce((sum, p) => sum + p.usedAmount, 0)
  const budgetExecutionRate = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0

  const thisWeekDueCount = projects.filter((p) => {
    if (p.status !== 'ongoing') return false
    const updatedDate = new Date(p.updatedAt)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays <= 7
  }).length

  const handleView = (project: { id: string }) => {
    navigate(`/project/${project.id}`)
  }
  const handleEdit = (project: { id: string }) => {
    navigate(`/project/${project.id}?edit=true`)
  }
  const handleDelete = (project: { id: string }) => {
    useProjectStore.getState().deleteProject(project.id)
  }
  const handleStatusChange = (_project: Project, status: Project['status']) => {
    useProjectStore.getState().updateProject(_project.id, { status })
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      document.body.removeChild(input)
      if (!file) return

      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

          if (json.length === 0) {
            alert('Excel 文件为空')
            return
          }

          const headers = Object.keys(json[0])
          const missing = IMPORT_REQUIRED_HEADERS.filter(h => !headers.includes(h))
          if (missing.length > 0) {
            alert(`缺少必要字段：${missing.join(', ')}`)
            return
          }

          let successCount = 0
          let skipCount = 0

          for (const row of json) {
            const name = String(row['项目名称'] || '').trim()
            const projectCode = String(row['项目编号'] || '').trim()
            const leader = String(row['开发责任人'] || row['负责人'] || '').trim()
            if (!name || !leader) { skipCount++; continue }

            const statusLabel = String(row['状态'] || '').trim()
            const statusKey = statusLabel ? (STATUS_MAP[statusLabel as keyof typeof STATUS_MAP] || (VALID_STATUSES.includes(statusLabel as typeof VALID_STATUSES[number]) ? statusLabel : null)) : null
            if (statusLabel && !statusKey) { skipCount++; continue }

            const progress = Number(row['项目进展']) || 0
            const totalAmount = Number(row['总预算']) || 0
            const usedAmount = Number(row['已用预算']) || 0

            upsert({
              projectId: projectCode,
              status: (statusKey || 'ongoing') as Project['status'],
              name,
              productLine: String(row['产品线'] || ''),
              leader,
              progress,
              totalAmount,
              usedAmount,
              repositories: (() => {
                const repos: import('@/types').Repository[] = []
                for (let i = 1; i <= 3; i++) {
                  const url = String(row[`代码仓${i}`] || '').trim()
                  if (url) {
                    repos.push({
                      id: crypto.randomUUID(),
                      code: String(row[`代码仓编码${i}`] || '').trim() || undefined,
                      projectId: String(row[`代码仓ProjectId${i}`] || '').trim() || undefined,
                      url,
                      branch: String(row[`分支${i}`] || 'main').trim(),
                      note: String(row[`备注${i}`] || '').trim() || undefined,
                    })
                  }
                }
                return repos
              })(),
              tags: String(row['标签'] || '').split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
              subProgress: {
                architecture: Number(row['进展_架构']) || 0,
                uiux: Number(row['进展_UIUX']) || 0,
                engineering: Number(row['进展_工程']) || 0,
                qa: Number(row['进展_QA']) || 0,
              },
              notes: String(row['备注'] || ''),
              noteHistory: row['备注历史'] ? JSON.parse(String(row['备注历史'])) : [],
              team: row['团队成员'] ? JSON.parse(String(row['团队成员'])) : [],
              scope: row['范围项'] ? JSON.parse(String(row['范围项'])) : [],
              milestones: row['里程碑'] ? JSON.parse(String(row['里程碑'])) : [],
              timeline: row['时间线'] ? JSON.parse(String(row['时间线'])) : [],
            })
            successCount++
          }

          loadProjects()
          alert(`导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条`)
        } catch {
          alert('文件解析失败，请确认是有效的 Excel 文件')
        }
      }
      reader.readAsArrayBuffer(file)
    }
    input.click()
  }

  const handleDownloadTemplate = () => {
    const requiredHeaders = ['项目名称', '项目编号', '产品线', '开发责任人', '总预算', '已用预算']
    const optionalHeaders = ['代码仓1', '分支1', '备注1', '代码仓2', '分支2', '备注2', '代码仓3', '分支3', '备注3']
    const headerRow = [
      ...requiredHeaders,
      ...optionalHeaders,
    ]
    const sampleRow = ['示例项目', 'PRJ-2026-001', '示例产品线', '张三', 100000, 50000, '', '', '', '', '', '', '', '']
    const wsData = [headerRow, sampleRow]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    for (let col = 0; col < requiredHeaders.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 1, c: col })
      if (!ws[cellRef]) ws[cellRef] = {}
      ws[cellRef].s = { fill: { fgColor: { rgb: 'E0E0E0' } } }
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '导入模版')
    XLSX.writeFile(wb, '导入模版.xlsx')
  }

  const handleExport = () => {
    const exportData = projects.map(p => ({
      '项目编号': p.projectId || '',
      '项目名称': p.name,
      '产品线': p.productLine,
      '开发责任人': p.leader,
      '状态': STATUS_LABELS[p.status],
      '项目进展': p.progress,
      '总预算': p.totalAmount,
      '已用预算': p.usedAmount,
      '预算执行率': p.totalAmount > 0 ? Math.round((p.usedAmount / p.totalAmount) * 100) : 0,
      ...((): Record<string, string> => {
        const cols: Record<string, string> = {}
        p.repositories.forEach((r, i) => {
          const n = i + 1
          cols[`代码仓编码${n}`] = r.code || ''
          cols[`代码仓${n}`] = r.url
          cols[`分支${n}`] = r.branch || ''
          cols[`备注${n}`] = r.note || ''
          cols[`代码仓ProjectId${n}`] = r.projectId || ''
        })
        return cols
      })(),
      '标签': p.tags.join(', '),
      '进展_架构': p.subProgress.architecture,
      '进展_UIUX': p.subProgress.uiux,
      '进展_工程': p.subProgress.engineering,
      '进展_QA': p.subProgress.qa,
      '备注': p.notes,
      '备注历史': JSON.stringify(p.noteHistory),
      '团队成员': JSON.stringify(p.team),
      '范围项': JSON.stringify(p.scope),
      '里程碑': JSON.stringify(p.milestones),
      '时间线': JSON.stringify(p.timeline),
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '项目列表')
    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `projects_${date}.xlsx`)
  }

  const isEmpty = !isLoading && projects.length === 0
  const isFilteredEmpty = !isLoading && projects.length > 0 && filteredProjects.length === 0

  return (
    <div className="min-h-screen">
      <Header title="项目看板" />

      <main className="p-5 lg:p-7 xl:p-8 max-w-[1920px] mx-auto">
          {/* Hero */}
          <div ref={headerRef} className="flex items-end justify-between mb-6 gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-heading font-bold text-on-surface-primary tracking-tight mb-1">
                项目看板
              </h1>
              <p className="text-sm font-body text-on-surface-secondary">
                跟踪从立项到落地的每个节点 · 当前 <span className="font-mono font-semibold text-primary-600 tabular-nums">{totalCount}</span> 个项目
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 items-stretch">
            <div data-stagger className="h-full">
              <StatsCard
                title="项目总数"
                value={totalCount}
                subtitle={`本周更新 ${thisWeekDueCount} 个项目`}
                icon="folder_open"
                tone="blue"
              />
            </div>
            <div data-stagger className="h-full">
              <StatsCard
                title="进行中"
                value={ongoingCount}
                subtitle={`占总项目的 ${totalCount > 0 ? Math.round((ongoingCount / totalCount) * 100) : 0}%`}
                icon="pending_actions"
                tone="green"
              />
            </div>
            <div data-stagger className="h-full">
              <StatsCard
                title="预算执行率"
                value={`${budgetExecutionRate}%`}
                progress={budgetExecutionRate}
                progressLabel="全局预算执行"
                icon="account_balance_wallet"
                progressVariant="ring"
                tone="amber"
              />
            </div>
          </div>

          {/* Filter + Action bar */}
          {!isLoading && (
            <div ref={filterRef} className="mb-3 flex flex-wrap items-center gap-2 relative z-10">
              {projects.length > 0 ? (
                <>
                  {/* Status filter */}
                  <div ref={statusMenuRef} className="relative">
                    <button
                      onClick={() => {
                        setShowStatusMenu(v => !v)
                        setShowTagMenu(false)
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-body border transition-colors cursor-pointer ${
                        statusFilter !== 'all'
                          ? 'bg-primary-50 border-primary-200 text-primary-700'
                          : 'bg-white border-outline text-on-surface-secondary hover:border-primary-300'
                      }`}
                    >
                      <Icon name="filter" size={14} className={statusFilter !== 'all' ? 'text-primary-500' : 'text-on-surface-tertiary'} />
                      <span>状态：{statusFilter === 'all' ? '全部' : STATUS_LABELS[statusFilter]}</span>
                      <Icon name="chevron_down" size={14} className="opacity-60" />
                    </button>
                    {showStatusMenu && (
                      <div className="absolute z-[60] mt-1 w-40 bg-white border border-outline rounded-md shadow-lg py-1">
                        {STATUS_CHIPS.map((s) => (
                          <button
                            key={s.key}
                            onClick={() => {
                              setStatusFilter(s.key)
                              setShowStatusMenu(false)
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm font-body hover:bg-primary-50 flex items-center gap-2 cursor-pointer ${
                              statusFilter === s.key ? 'text-primary-600 font-medium bg-primary-50/50' : 'text-on-surface-primary'
                            }`}
                          >
                            <Icon name={s.icon} size={14} className={statusFilter === s.key ? 'text-primary-500' : 'text-on-surface-tertiary'} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tag filter */}
                  <div ref={tagMenuRef} className="relative">
                    <button
                      onClick={() => {
                        setShowTagMenu(v => !v)
                        setShowStatusMenu(false)
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-body border transition-colors cursor-pointer ${
                        tagFilter.length > 0
                          ? 'bg-primary-50 border-primary-200 text-primary-700'
                          : 'bg-white border-outline text-on-surface-secondary hover:border-primary-300'
                      }`}
                    >
                      <span>标签：{tagFilter.length > 0 ? tagFilter.join(', ') : '全部'}</span>
                      <Icon name="chevron_down" size={14} className="opacity-60" />
                    </button>
                    {showTagMenu && (
                      <div className="absolute z-[60] mt-1 w-44 max-h-64 overflow-y-auto bg-white border border-outline rounded-md shadow-lg py-1">
                        {allTags.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-on-surface-tertiary">暂无标签</div>
                        ) : (
                          allTags.map((tag) => {
                            const isSelected = tagFilter.includes(tag)
                            return (
                              <button
                                key={tag}
                                onClick={() => {
                                  setTagFilter(prev =>
                                    isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                  )
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm font-body hover:bg-primary-50 cursor-pointer flex items-center gap-2 ${
                                  isSelected ? 'text-primary-600 font-medium bg-primary-50/50' : 'text-on-surface-primary'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-outline'}`}>
                                  {isSelected && <Icon name="fact_check" size={12} className="text-white" />}
                                </span>
                                {tag}
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-tertiary pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜索项目名称、开发责任人..."
                      className="w-52 h-9 pl-8 pr-3 bg-white border border-outline rounded-md text-sm font-body text-on-surface-primary placeholder:text-on-surface-tertiary focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-on-surface-tertiary hover:text-on-surface-primary rounded transition-colors"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>

                  {(statusFilter !== 'all' || tagFilter.length > 0 || searchQuery) && (
                    <button
                      onClick={() => { setStatusFilter('all'); setTagFilter([]); setSearchQuery('') }}
                      className="inline-flex items-center gap-1 px-2 h-9 text-xs font-body text-on-surface-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Icon name="filter_alt_off" size={12} />
                      清除筛选
                    </button>
                  )}

                  <span className="text-xs font-body text-on-surface-tertiary ml-1">
                    共 <span className="font-mono font-semibold text-primary-600 tabular-nums">{filteredProjects.length}</span> 条结果
                  </span>
                </>
              ) : (
                <span className="text-xs font-body text-on-surface-tertiary">
                  暂无项目，可通过导入或新增项目开始
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {/* Import split button */}
                <div className="relative import-menu-container flex group">
                  <button
                    onClick={handleImport}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-white border border-outline text-on-surface-secondary rounded-l-md text-sm font-body font-medium group-hover:border-primary-300 group-hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap border-r-0"
                  >
                    <Icon name="upload_file" size={14} />
                    导入
                  </button>
                  <button
                    onClick={() => setShowImportMenu(v => !v)}
                    className="inline-flex items-center justify-center w-7 h-9 bg-white border border-outline text-on-surface-secondary rounded-r-md group-hover:border-primary-300 group-hover:text-primary-600 transition-colors cursor-pointer border-l-0"
                  >
                    <Icon name="chevron_down" size={12} className="opacity-60" />
                  </button>
                  {showImportMenu && (
                    <div className="absolute z-[60] right-0 top-full mt-1 w-44 bg-white border border-outline rounded-md shadow-lg py-1">
                      <button
                        onClick={() => { setShowImportMenu(false); handleImport() }}
                        className="w-full text-left px-3 py-1.5 text-sm font-body hover:bg-primary-50 text-on-surface-primary cursor-pointer flex items-center gap-2"
                      >
                        <Icon name="upload_file" size={14} className="text-on-surface-tertiary" />
                        导入项目
                      </button>
                      <button
                        onClick={() => { setShowImportMenu(false); handleDownloadTemplate() }}
                        className="w-full text-left px-3 py-1.5 text-sm font-body hover:bg-primary-50 text-on-surface-primary cursor-pointer flex items-center gap-2"
                      >
                        <Icon name="download" size={14} className="text-on-surface-tertiary" />
                        下载导入模版
                      </button>
                    </div>
                  )}
                </div>

                {/* Export */}
                <button
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-1.5 w-[96px] h-9 px-3 bg-white border border-outline text-on-surface-secondary rounded-md text-sm font-body font-medium hover:border-primary-300 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Icon name="download" size={14} />
                  导出
                </button>
              </div>
            </div>
          )}

          {/* Project table */}
          {isLoading ? (
            <div className="relative z-0 bg-white rounded-lg p-12 flex flex-col items-center justify-center gap-3 border border-outline shadow-card">
              <Icon name="progress_activity" spin className="text-primary-500" size={24} />
              <span className="text-sm font-body text-on-surface-secondary">加载中…</span>
            </div>
          ) : isEmpty ? (
            <div className="bg-white rounded-lg p-12 flex flex-col items-center justify-center gap-3 border border-dashed border-outline">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 ring-1 ring-primary-100 flex items-center justify-center">
                <Icon name="folder_open" size={28} className="text-primary-600" />
              </div>
              <div className="text-center max-w-sm">
                <p className="text-base font-heading font-semibold text-on-surface-primary mb-1">
                  开始你的第一个项目
                </p>
                <p className="text-sm font-body text-on-surface-tertiary mb-5">
                  在这里跟踪从立项到落地的全流程节点，所有数据保存在本地。
                </p>
                <button
                  onClick={() => navigate('/project/new')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors shadow-sm cursor-pointer"
                >
                  <Icon name="add" size={16} />
                  新增项目
                </button>
              </div>
            </div>
          ) : (
            <div ref={tableRef}>
              {isFilteredEmpty ? (
                <div className="bg-white rounded-lg p-12 flex flex-col items-center justify-center gap-3 border border-dashed border-outline">
                  <Icon name="filter_alt_off" size={28} className="text-on-surface-tertiary" />
                  <div className="text-center">
                    <p className="text-sm font-body text-on-surface-primary mb-1">没有匹配的项目</p>
                    <p className="text-xs font-body text-on-surface-tertiary">试试调整筛选条件或搜索关键词</p>
                  </div>
                  <button
                    onClick={() => { setStatusFilter('all'); setTagFilter([]); setSearchQuery('') }}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-body text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                  >
                    清除筛选
                  </button>
                </div>
              ) : (
                <div className="relative z-0">
                  <ProjectTable
                    projects={filteredProjects}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              )}
            </div>
          )}
        </main>
    </div>
  )
}

export default Dashboard
