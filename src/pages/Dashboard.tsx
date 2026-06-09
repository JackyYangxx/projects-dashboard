import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/Icon'
import * as XLSX from 'xlsx'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import ProjectTable from '@/components/ProjectTable'
import { useProjectStore } from '@/store/projectStore'
import { upsert } from '@/db/projectDao'
import { STATUS_LABELS, IMPORT_REQUIRED_HEADERS } from '@/constants/project'
import { startAmbientOrbs, animateStaggerIn, animateFadeIn, animateFlowingCurves, animateParticles, animateConicRotation } from '@/utils/animations'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { projects, isLoading, loadProjects, setFilteredProjectIds } = useProjectStore()
  const [showImportMenu, setShowImportMenu] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const orbsContainerRef = useRef<HTMLDivElement>(null)
  const conicRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Close import menu when clicking outside
  useEffect(() => {
    if (!showImportMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.import-menu-container')) {
        setShowImportMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showImportMenu])

  // Set initial filtered project IDs when projects load
  useEffect(() => {
    if (projects.length > 0) {
      setFilteredProjectIds(projects.map(p => p.id))
    }
  }, [projects, setFilteredProjectIds])

  // Ambient background animation: orbs + flowing curves + particles + conic
  useEffect(() => {
    if (!orbsContainerRef.current) return
    startAmbientOrbs(orbsContainerRef.current)
    animateFlowingCurves(orbsContainerRef.current)
    animateParticles(orbsContainerRef.current)
    if (conicRef.current) {
      animateConicRotation(conicRef.current)
    }
  }, [])

  // Stagger entrance for header, stats, and table once data is ready
  useEffect(() => {
    if (isLoading) return
    if (headerRef.current) animateFadeIn(headerRef.current, { delay: 0, duration: 450 })
    if (statsRef.current) {
      animateStaggerIn(statsRef.current, '[data-stagger]', { delay: 100, staggerMs: 80 })
    }
  }, [isLoading])

  useEffect(() => {
    if (!isLoading && projects.length > 0 && tableRef.current) {
      animateFadeIn(tableRef.current, { delay: 350, duration: 500 })
    }
  }, [isLoading, projects.length])

  const handleFilteredProjectsChange = (ids: string[]) => {
    setFilteredProjectIds(ids)
  }

  // Calculate stats
  const totalCount = projects.length
  const ongoingCount = projects.filter((p) => p.status === 'ongoing').length
  const totalBudget = projects.reduce((sum, p) => sum + p.totalAmount, 0)
  const usedBudget = projects.reduce((sum, p) => sum + p.usedAmount, 0)
  const budgetExecutionRate =
    totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0

  // Count projects due this week
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

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
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
            const leader = String(row['负责人'] || '').trim()
            if (!name || !leader) { skipCount++; continue }

            const progress = Number(row['项目进展']) || 0
            const totalAmount = Number(row['总预算']) || 0
            const usedAmount = Number(row['已用预算']) || 0

            upsert({
              name,
              productLine: String(row['产品线'] || ''),
              leader,
              progress,
              totalAmount,
              usedAmount,
              repository: String(row['代码仓'] || ''),
              branch: String(row['分支'] || ''),
              tag: String(row['标签'] || ''),
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
    const requiredHeaders = ['项目名称', '产品线', '负责人', '总预算', '已用预算']
    const optionalHeaders = ['代码仓', '分支']

    // Build header row with * suffix for required fields
    const headerRow = [
      ...requiredHeaders.map(h => `${h}*`),
      ...optionalHeaders
    ]

    // Build sample row with placeholder values
    const sampleRow = [
      '示例项目', '示例产品线', '张三', 100000, 50000,
      '', ''
    ]

    const wsData = [headerRow, sampleRow]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Apply gray background to required field cells in sample row (column B-G, row 2)
    // B=1, C=2, D=3, E=4, F=5, G=6 (0-indexed)
    for (let col = 0; col < 5; col++) {
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
      '项目名称': p.name,
      '产品线': p.productLine,
      '负责人': p.leader,
      '状态': STATUS_LABELS[p.status],
      '项目进展': p.progress,
      '总预算': p.totalAmount,
      '已用预算': p.usedAmount,
      '预算执行率': p.totalAmount > 0 ? Math.round((p.usedAmount / p.totalAmount) * 100) : 0,
      '代码仓': p.repository || '',
      '分支': p.branch || '',
      '标签': p.tag,
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

  return (
    <div className="min-h-screen bg-surface-base relative">
      {/* Ambient dynamic background — orbs + conic + curves + particles + grid */}
      <div ref={orbsContainerRef} className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Layer 1: subtle base gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/40 via-surface-base to-accent-50/20" />

        {/* Layer 2: slow rotating conic gradient */}
        <div
          ref={conicRef}
          data-conic
          className="absolute top-1/2 left-1/2 w-[180vmax] h-[180vmax] -translate-x-1/2 -translate-y-1/2 blur-3xl"
          style={{
            opacity: 0.35,
            background:
              'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(46,107,184,0.45) 50deg, transparent 120deg, rgba(6,182,212,0.3) 190deg, transparent 260deg, rgba(46,107,184,0.35) 330deg, transparent 360deg)',
          }}
        />

        {/* Layer 3: flowing SVG curves */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="curve-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(46,107,184,0)" />
              <stop offset="50%" stopColor="rgba(46,107,184,0.5)" />
              <stop offset="100%" stopColor="rgba(46,107,184,0)" />
            </linearGradient>
            <linearGradient id="curve-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(6,182,212,0)" />
              <stop offset="50%" stopColor="rgba(6,182,212,0.4)" />
              <stop offset="100%" stopColor="rgba(6,182,212,0)" />
            </linearGradient>
            <linearGradient id="curve-3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(90,135,201,0)" />
              <stop offset="50%" stopColor="rgba(90,135,201,0.35)" />
              <stop offset="100%" stopColor="rgba(90,135,201,0)" />
            </linearGradient>
          </defs>
          <path data-flow d="M-100,360 Q480,200 960,380 T2020,320" stroke="url(#curve-1)" strokeWidth="1.5" fill="none" />
          <path data-flow d="M-100,540 Q600,380 1200,580 T2200,500" stroke="url(#curve-2)" strokeWidth="1.2" fill="none" />
          <path data-flow d="M-100,720 Q500,560 1100,760 T2100,680" stroke="url(#curve-3)" strokeWidth="1" fill="none" />
        </svg>

        {/* Layer 4: floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 28 }).map((_, i) => {
            const left = (i * 37 + 13) % 100
            const top = (i * 53 + 27) % 100
            const size = i % 3 === 0 ? 2 : 1
            return (
              <div
                key={i}
                data-particle
                className="absolute rounded-full bg-primary-400"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size * 4}px`,
                  height: `${size * 4}px`,
                  opacity: 0.4,
                  boxShadow: i % 4 === 0 ? '0 0 8px rgba(46,107,184,0.7)' : undefined,
                }}
              />
            )
          })}
        </div>

        {/* Layer 5: large blurred orbs (animated by startAmbientOrbs) */}
        <div
          data-orb
          className="absolute top-[8%] left-[12%] w-[440px] h-[440px] bg-gradient-to-br from-primary-300/45 to-primary-500/20 rounded-full blur-3xl"
        />
        <div
          data-orb
          className="absolute top-[55%] right-[6%] w-[380px] h-[380px] bg-gradient-to-br from-accent-300/40 to-primary-300/20 rounded-full blur-3xl"
        />
        <div
          data-orb
          className="absolute bottom-[3%] left-[32%] w-[320px] h-[320px] bg-gradient-to-br from-primary-400/40 to-accent-300/20 rounded-full blur-3xl"
        />

        {/* Layer 6: grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(46, 107, 184, 0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(46, 107, 184, 0.4) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <Sidebar />

      <div className="ml-64">
        <Header title="项目概览" />

        <main className="p-6 relative z-10">
          {/* Page title */}
          <div ref={headerRef} className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-on-surface-primary">
                业务概览
              </h1>
              <p className="text-sm font-body text-on-surface-tertiary mt-1">
                实时监控项目状态与预算执行
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative import-menu-container">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowImportMenu(!showImportMenu) }}
                  className="flex items-center justify-center gap-1.5 w-[104px] px-3 py-2 bg-white border border-outline text-on-surface-primary rounded-lg text-sm font-body font-medium hover:bg-surface-hover hover:border-outline-strong transition-all duration-200 cursor-pointer"
                >
                  <Icon name="upload_file" size={16} />
                  导入
                  <Icon name="expand_more" size={16} className="ml-0.5" />
                </button>
                {showImportMenu && (
                  <div className="absolute top-full left-0 mt-1.5 bg-white border border-outline rounded-xl shadow-elevated z-50 min-w-[160px] py-1 overflow-hidden">
                    <button
                      onClick={() => { handleImport(); setShowImportMenu(false) }}
                      className="w-full px-4 py-2 text-left text-sm font-body text-on-surface-primary hover:bg-surface-hover transition-all duration-200 flex items-center gap-2"
                    >
                      <Icon name="upload_file" size={16} />
                      导入项目
                    </button>
                    <button
                      onClick={() => { handleDownloadTemplate(); setShowImportMenu(false) }}
                      className="w-full px-4 py-2 text-left text-sm font-body text-on-surface-primary hover:bg-surface-hover transition-all duration-200 flex items-center gap-2"
                    >
                      下载导入模版
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 w-[104px] px-3 py-2 bg-white border border-outline text-on-surface-primary rounded-lg text-sm font-body font-medium hover:bg-surface-hover hover:border-outline-strong transition-all duration-200 cursor-pointer"
              >
                <Icon name="download" size={16} />
                导出
              </button>

              <button
                onClick={() => navigate('/project/new')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-body font-medium hover:shadow-glow-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-200 cursor-pointer shadow-elevated"
              >
                <Icon name="add" size={16} />
                新增项目
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div ref={statsRef} className="grid grid-cols-3 gap-4 mb-6 items-stretch">
            <div data-stagger className="h-full">
              <StatsCard
                title="项目总数"
                value={totalCount}
                subtitle={`本周更新 ${thisWeekDueCount} 个项目`}
                icon="folder_open"
              />
            </div>
            <div data-stagger className="h-full">
              <StatsCard
                title="进行中"
                value={ongoingCount}
                subtitle={`占总项目的 ${totalCount > 0 ? Math.round((ongoingCount / totalCount) * 100) : 0}%`}
                icon="pending_actions"
              />
            </div>
            <div data-stagger className="h-full">
              <StatsCard
                title="预算执行率"
                value={`${budgetExecutionRate}%`}
                progress={budgetExecutionRate}
                progressLabel="全局预算执行"
                icon="account_balance_wallet"
              />
            </div>
          </div>

          {/* Project table */}
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-4 border border-outline shadow-card">
              <div className="relative">
                <Icon name="progress_activity" spin className="text-primary-500" />
              </div>
              <span className="text-sm font-body text-on-surface-secondary">加载中...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-4 border border-outline border-dashed shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                <Icon name="folder_open" className="text-primary-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-body text-on-surface-secondary mb-1">暂无项目</p>
                <p className="text-xs font-body text-on-surface-tertiary">点击上方按钮创建第一个项目</p>
              </div>
            </div>
          ) : (
            <div ref={tableRef}>
              <ProjectTable
                projects={projects}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onFilteredProjectsChange={handleFilteredProjectsChange}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard
