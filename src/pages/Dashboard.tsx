import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import ProjectTable from '@/components/ProjectTable'
import { useProjectStore } from '@/store/projectStore'
import { upsert } from '@/db/projectDao'
import { STATUS_LABELS, IMPORT_REQUIRED_HEADERS } from '@/constants/project'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { projects, isLoading, loadProjects } = useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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

            upsert({ name, productLine: String(row['产品线'] || ''), leader, progress, totalAmount, usedAmount })
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
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '项目列表')
    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `projects_${date}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-surface-base relative overflow-hidden">
      {/* Flowing Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50" />

        {/* Animated gradient blobs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-br from-primary-200/40 to-accent-200/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-4 w-80 h-80 bg-gradient-to-br from-accent-200/40 to-primary-200/30 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-gradient-to-br from-primary-100/50 to-purple-200/30 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <Sidebar />

      <div className="ml-64">
        <Header title="项目概览" />

        <main className="p-6 relative z-10">
          {/* Page title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-on-surface-primary">
                业务概览
              </h1>
              <p className="text-sm font-body text-on-surface-tertiary mt-1">
                实时监控项目状态与预算执行
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-outline text-on-surface-primary rounded-xl text-sm font-body font-medium hover:bg-surface-hover transition-all duration-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">upload_file</span>
                导入
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-outline text-on-surface-primary rounded-xl text-sm font-body font-medium hover:bg-surface-hover transition-all duration-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                导出
              </button>

              <button
                onClick={() => navigate('/project/new')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-body font-medium hover:shadow-glow-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary-500/20"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                新增项目
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatsCard
              title="项目总数"
              value={totalCount}
              subtitle={`本周更新 ${thisWeekDueCount} 个项目`}
              growth={12}
              icon="folder_open"
            />
            <StatsCard
              title="进行中"
              value={ongoingCount}
              subtitle={`占总项目的 ${totalCount > 0 ? Math.round((ongoingCount / totalCount) * 100) : 0}%`}
              icon="pending_actions"
              variant="accent"
            />
            <StatsCard
              title="预算执行率"
              value={`${budgetExecutionRate}%`}
              progress={budgetExecutionRate}
              progressLabel="全局预算执行"
              icon="account_balance_wallet"
            />
          </div>

          {/* Project table */}
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 flex flex-col items-center justify-center gap-4 border border-outline shadow-card">
              <div className="relative">
                <span className="material-symbols-outlined text-4xl text-primary-400 animate-spin">
                  progress_activity
                </span>
              </div>
              <span className="text-sm font-body text-on-surface-secondary">加载中...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 flex flex-col items-center justify-center gap-4 border border-outline border-dashed shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary-500">folder_open</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-body text-on-surface-secondary mb-1">暂无项目</p>
                <p className="text-xs font-body text-on-surface-tertiary">点击上方按钮创建第一个项目</p>
              </div>
            </div>
          ) : (
            <ProjectTable
              projects={projects}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard
