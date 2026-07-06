import { useProjectStore } from '@/store/projectStore'

interface Props {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function ProjectSelector({ selectedIds, onChange }: Props) {
  const { projects } = useProjectStore()
  const ongoingProjects = projects.filter(p => p.status === 'ongoing')

  const allSelected = ongoingProjects.length > 0 && ongoingProjects.every(p => selectedIds.includes(p.id))
  const someSelected = ongoingProjects.some(p => selectedIds.includes(p.id))

  const toggleAll = () => {
    if (allSelected) {
      onChange([])
    } else {
      onChange(ongoingProjects.map(p => p.id))
    }
  }

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="bg-surface-elevated border border-outline rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline bg-surface-secondary">
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={toggleAll}
                className="w-4 h-4"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">项目名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">仓库地址</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">分支</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">ProjectId</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-secondary">备注</th>
          </tr>
        </thead>
        <tbody>
          {ongoingProjects.map(project => (
            <tr key={project.id} className="border-b border-outline hover:bg-surface-secondary/50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(project.id)}
                  onChange={() => toggleOne(project.id)}
                  className="w-4 h-4"
                />
              </td>
              <td className="px-4 py-3 text-sm font-medium text-on-surface-primary">{project.name}</td>
              <td className="px-4 py-3 text-sm text-on-surface-tertiary">
                {project.repositories.length > 0
                  ? project.repositories.map((repo, i) => (
                      <div key={repo.id} className={i > 0 ? 'mt-0.5' : ''}>
                        {repo.code && (
                          <span className="text-xs font-mono text-on-surface-tertiary border border-outline px-1 py-0.5 rounded mr-1">
                            {repo.code}
                          </span>
                        )}
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-500 hover:underline text-xs"
                        >
                          {repo.url}
                        </a>
                      </div>
                    ))
                  : <span className="text-on-surface-tertiary">—</span>}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-on-surface-secondary">
                {project.repositories.length > 0
                  ? project.repositories.map((repo, i) => (
                      <div key={repo.id} className={i > 0 ? 'mt-0.5' : ''}>{repo.branch || '—'}</div>
                    ))
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-on-surface-secondary">
                {project.repositories.length > 0
                  ? project.repositories.map((repo, i) => (
                      <div key={repo.id} className={i > 0 ? 'mt-0.5' : ''}>{repo.projectId || '—'}</div>
                    ))
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-on-surface-secondary">
                {project.repositories.length > 0
                  ? project.repositories.map((repo, i) => (
                      <div key={repo.id} className={i > 0 ? 'mt-0.5' : ''}>{repo.note || '—'}</div>
                    ))
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ongoingProjects.length === 0 && (
        <div className="p-4 text-center text-sm text-on-surface-tertiary">暂无进行中的项目</div>
      )}
    </div>
  )
}