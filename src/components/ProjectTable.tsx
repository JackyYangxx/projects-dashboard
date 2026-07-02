import React, { useEffect } from 'react'
import type { Project } from '../types/index'
import Icon from './Icon'

interface ProjectTableProps {
  projects: Project[]
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onView?: (project: Project) => void
}

const INITIAL_PAGE_SIZE = 20

const STATUS_DOT: Record<Project['status'], string> = {
  ongoing: 'bg-primary-500',
  completed: 'bg-success',
  paused: 'bg-warning',
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onEdit,
  onDelete,
  onView,
}) => {
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const isLoadingMoreRef = React.useRef(false)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null)

  // Reset paging when projects change (filter applied)
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE)
  }, [projects])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true
          setIsLoadingMore(true)
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 20, projects.length))
            isLoadingMoreRef.current = false
            setIsLoadingMore(false)
          }, 300)
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [projects.length])

  const visibleProjects = projects.slice(0, visibleCount)
  const hasMore = visibleCount < projects.length

  const getBudgetRate = (used: number, total: number) => {
    if (total === 0) return 0
    return Math.round((used / total) * 100)
  }

  const handleDelete = (project: Project) => {
    if (window.confirm(`确定要删除项目 "${project.name}" 吗？此操作不可撤销。`)) {
      onDelete?.(project)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-card border border-outline overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed" role="table">
          <colgroup>
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-outline bg-surface-hover">
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary">
                项目
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                产品线
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                负责人
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                进展
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                预算执行
              </th>
              <th scope="col" className="text-left px-4 py-3 text-sm font-body font-semibold text-on-surface-secondary relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                操作
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {visibleProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center px-4 py-12 text-sm font-body text-on-surface-tertiary">
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="inbox" className="text-4xl text-on-surface-tertiary" />
                    <span>暂无项目数据</span>
                  </div>
                </td>
              </tr>
            ) : (
              visibleProjects.map((project) => {
                const budgetRate = getBudgetRate(project.usedAmount, project.totalAmount)
                return (
                <tr
                  key={project.id}
                  data-row
                  onClick={() => onView?.(project)}
                  className="group border-b border-outline-variant/60 last:border-b-0 transition-colors duration-150 hover:bg-primary-50/40 cursor-pointer"
                >
                  <td className="relative px-4 py-2.5">
                    {/* Hover left bar */}
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[project.status]}`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <span
                          className="block text-sm font-body font-medium text-on-surface-primary truncate"
                          title={project.name}
                        >
                          {project.name}
                        </span>
                        {project.tag && (
                          <p className="text-[11px] font-body text-on-surface-tertiary mt-0.5 truncate" title={project.tag}>
                            {project.tag}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <span className="block text-xs font-body text-on-surface-secondary truncate" title={project.productLine || '—'}>
                      {project.productLine || '—'}
                    </span>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <span className="block text-xs font-body text-on-surface-secondary truncate" title={project.leader || '未指定'}>
                      {project.leader || '未指定'}
                    </span>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-body text-on-surface-secondary tabular-nums font-mono w-9 text-right">
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${budgetRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-body text-on-surface-secondary tabular-nums font-mono w-9 text-right">
                        {budgetRate}%
                      </span>
                    </div>
                  </td>
                  <td className="relative px-4 py-2.5 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-px before:border-l before:border-dashed before:border-outline before:content-[''] before:pointer-events-none" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onView?.(project)}
                        aria-label={`查看 ${project.name}`}
                        title="查看"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer"
                      >
                        <Icon name="visibility" size={15} />
                      </button>
                      <button
                        onClick={() => onEdit?.(project)}
                        aria-label={`编辑 ${project.name}`}
                        title="编辑"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        aria-label={`删除 ${project.name}`}
                        title="删除"
                        className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-tertiary hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll sentinel & loading indicator */}
      <div ref={sentinelRef} className="px-4 py-2.5 border-t border-outline bg-surface-subtle/40">
        {isLoadingMore ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <Icon name="progress_activity" className="text-base text-primary-500" spin />
            <span className="text-xs font-body text-on-surface-secondary">加载更多…</span>
          </div>
        ) : hasMore ? (
          <div className="flex items-center justify-center py-1">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary-300 to-transparent" />
          </div>
        ) : projects.length > 0 ? (
          <p className="text-center text-xs font-body leading-tight text-on-surface-tertiary">
            已展示全部 <span className="font-mono text-primary-500 font-medium">{projects.length}</span> 个项目
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default ProjectTable
