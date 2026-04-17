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

  // Count projects due this week (ongoing projects with a recent update or near completion)
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
    navigate(`/project/${project.id}`)
  }

  const handleDelete = (project: { id: string }) => {
    // TODO: implement delete confirmation
    useProjectStore.getState().deleteProject(project.id)
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <Sidebar />

      <div className="ml-64">
        <Header title="项目概览" />

        <main className="p-6">
          {/* Page title */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-heading font-bold text-on-surface-primary">
              业务概览
            </h1>
            <button
              onClick={() => navigate('/project/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-body font-medium hover:bg-primary-600 transition-colors"
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
              subtitle={undefined}
              growth={12}
              icon="folder_open"
            />
            <StatsCard
              title="进行中"
              value={ongoingCount}
              subtitle={`本周更新 ${thisWeekDueCount} 个`}
              icon="pending_actions"
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
            <div className="bg-surface-elevated rounded-lg p-12 flex items-center justify-center">
              <div className="flex items-center gap-3 text-on-surface-secondary">
                <span className="material-symbols-outlined text-xl animate-spin">
                  progress_activity
                </span>
                <span className="text-sm font-body">加载中...</span>
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
