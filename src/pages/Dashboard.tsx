import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'
import ProjectTable from '@/components/ProjectTable'
import { useProjectStore } from '@/store/projectStore'

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
            <button
              onClick={() => navigate('/project/new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-body font-medium hover:shadow-glow-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary-500/20"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              新增项目
            </button>
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
