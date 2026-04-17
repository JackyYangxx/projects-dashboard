import React from 'react'
import type { Project } from '../types/index'

interface ProjectTableProps {
  projects: Project[]
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onView?: (project: Project) => void
}

const MONTHS = ['全部', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const STATUS_OPTIONS = ['全部', '进行中', '已完成', '暂停中']

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onEdit,
  onDelete,
  onView,
}) => {
  const [monthFilter, setMonthFilter] = React.useState('全部')
  const [statusFilter, setStatusFilter] = React.useState('全部')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [filteredProjects, setFilteredProjects] = React.useState(projects)
  const pageSize = 10

  React.useEffect(() => {
    let result = projects

    if (statusFilter !== '全部') {
      const statusMap: Record<string, Project['status']> = {
        '进行中': 'ongoing',
        '已完成': 'completed',
        '暂停中': 'paused',
      }
      const targetStatus = statusMap[statusFilter]
      if (targetStatus) {
        result = result.filter((p) => p.status === targetStatus)
      }
    }

    if (monthFilter !== '全部') {
      const monthIdx = MONTHS.indexOf(monthFilter)
      result = result.filter((p) => {
        const date = new Date(p.createdAt)
        return date.getMonth() + 1 === monthIdx
      })
    }

    setFilteredProjects(result)
    setCurrentPage(1)
  }, [projects, monthFilter, statusFilter])

  const totalPages = Math.ceil(filteredProjects.length / pageSize)
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `¥${(amount / 100000000).toFixed(2)}亿`
    }
    if (amount >= 10000) {
      return `¥${(amount / 10000).toFixed(0)}万`
    }
    return `¥${amount.toLocaleString()}`
  }

  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      ongoing: 'bg-primary-50 text-primary-600 border border-primary-200',
      completed: 'bg-success/10 text-success border border-success/20',
      paused: 'bg-warning/10 text-warning border border-warning/20',
    }
    const labels = { ongoing: '进行中', completed: '已完成', paused: '暂停中' }
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-body font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const getBudgetRate = (used: number, total: number) => {
    if (total === 0) return '0%'
    const rate = Math.round((used / total) * 100)
    return `${rate}%`
  }

  const handleDelete = (project: Project) => {
    if (window.confirm(`确定要删除项目 "${project.name}" 吗？此操作不可撤销。`)) {
      onDelete?.(project)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card border border-outline overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-outline bg-gradient-to-r from-surface-base to-white/50">
        <select
          id="monthFilter"
          name="monthFilter"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          aria-label="按月份筛选"
          className="px-3 py-2 bg-white border border-outline rounded-xl text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-colors"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          id="statusFilter"
          name="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="按状态筛选"
          className="px-3 py-2 bg-white border border-outline rounded-xl text-sm font-body text-on-surface-primary focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-colors"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setMonthFilter('全部')
            setStatusFilter('全部')
          }}
          className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm font-body font-medium hover:shadow-glow-sm transition-all duration-200 cursor-pointer"
        >
          重置筛选
        </button>

        <div className="ml-auto text-sm font-body text-on-surface-secondary">
          <span className="font-mono text-primary-500 font-medium">{filteredProjects.length}</span> 个项目
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-outline bg-surface-base/50">
              <th scope="col" className="text-left px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                项目名称
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                产品线
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                负责人
              </th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                总金额
              </th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                已使用
              </th>
              <th scope="col" className="text-center px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                预算执行率
              </th>
              <th scope="col" className="text-center px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="text-center px-4 py-3 text-xs font-body font-semibold text-on-surface-secondary uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center px-4 py-12 text-sm font-body text-on-surface-tertiary">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-on-surface-tertiary">inbox</span>
                    <span>暂无项目数据</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedProjects.map((project, idx) => (
                <tr
                  key={project.id}
                  className={`border-b border-outline-variant transition-colors duration-150 hover:bg-primary-50/50 ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-surface-base/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-body font-medium text-on-surface-primary">
                        {project.name}
                      </p>
                      {project.tag && (
                        <p className="text-xs font-body text-on-surface-tertiary mt-0.5">
                          {project.tag}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-secondary">
                    {project.productLine}
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-secondary">
                    {project.team[0]?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-primary text-right font-medium tabular-nums">
                    {formatAmount(project.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-on-surface-secondary text-right tabular-nums">
                    {formatAmount(project.usedAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-base rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-[width] duration-300"
                          style={{
                            width: `${getBudgetRate(project.usedAmount, project.totalAmount)}`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-body text-on-surface-secondary tabular-nums">
                        {getBudgetRate(project.usedAmount, project.totalAmount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(project.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onView?.(project)}
                        aria-label={`查看 ${project.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-tertiary hover:bg-primary-50 hover:text-primary-500 transition-all duration-150 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                      <button
                        onClick={() => onEdit?.(project)}
                        aria-label={`编辑 ${project.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-tertiary hover:bg-primary-50 hover:text-primary-500 transition-all duration-150 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        aria-label={`删除 ${project.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-tertiary hover:bg-error/10 hover:text-error transition-all duration-150 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-outline bg-gradient-to-r from-surface-base to-white/50">
          <p className="text-sm font-body text-on-surface-secondary">
            第 <span className="font-mono text-primary-500 font-medium">{(currentPage - 1) * pageSize + 1}</span>-
            <span className="font-mono text-primary-500 font-medium">{Math.min(currentPage * pageSize, filteredProjects.length)}</span> 条，共 <span className="font-mono text-primary-500 font-medium">{filteredProjects.length}</span> 条
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="上一页"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-body text-on-surface-secondary hover:bg-primary-50 hover:text-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} aria-label="更多页码" className="w-8 h-8 flex items-center justify-center text-sm font-body text-on-surface-tertiary">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    aria-label={`第 ${p} 页`}
                    aria-current={currentPage === p ? 'page' : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-body transition-all duration-150 cursor-pointer ${
                      currentPage === p
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-sm'
                        : 'text-on-surface-secondary hover:bg-primary-50 hover:text-primary-500'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="下一页"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-body text-on-surface-secondary hover:bg-primary-50 hover:text-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectTable
