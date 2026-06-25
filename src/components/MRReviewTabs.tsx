import { useState } from 'react'
import Icon from './Icon'
import type { MRReviewRecord } from '@/types'
import { MRReviewResult } from './MRReviewResult'

interface Props {
  recordsByProject: Map<string, MRReviewRecord[]>
  onViewOnline: (url: string) => void
}

export default function MRReviewTabs({ recordsByProject, onViewOnline }: Props) {
  const projectNames = Array.from(recordsByProject.keys())
  const [activeProject, setActiveProject] = useState(projectNames[0] || '')
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'suggestion'>('all')

  const records = recordsByProject.get(activeProject) || []
  const filtered = filter === 'all' ? records : records.filter(r =>
    r.issues.some(i => i.severity === filter)
  )

  const issueCounts = {
    all: records.reduce((sum, r) => sum + r.issues.length, 0),
    critical: records.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0),
    warning: records.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0),
    suggestion: records.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'suggestion').length, 0),
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {projectNames.map(name => {
          const count = recordsByProject.get(name)?.reduce((sum, r) => sum + r.issues.length, 0) || 0
          return (
            <button
              key={name}
              onClick={() => setActiveProject(name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeProject === name
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-secondary text-on-surface-secondary hover:bg-surface-container'
              }`}
            >
              {name} ({count})
            </button>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'critical', 'warning', 'suggestion'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === f
                ? f === 'critical' ? 'bg-red-500 text-white'
                  : f === 'warning' ? 'bg-yellow-500 text-white'
                  : f === 'suggestion' ? 'bg-blue-500 text-white'
                  : 'bg-primary-500 text-white'
                : 'bg-surface-secondary text-on-surface-secondary'
            }`}
          >
            {f === 'all' ? '全部' : f === 'critical' ? '严重' : f === 'warning' ? '警告' : '建议'} ({issueCounts[f]})
          </button>
        ))}
      </div>

      {/* MR List */}
      <div className="space-y-3">
        {filtered.map(record => (
          <div key={record.id} className="bg-surface-elevated border border-outline rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                record.issues.some(i => i.severity === 'critical') ? 'bg-red-500'
                  : record.issues.some(i => i.severity === 'warning') ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{record.mrTitle}</div>
                <div className="text-xs text-on-surface-tertiary mt-1 flex items-center gap-2">
                  <a href={record.mrUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                    {record.mrUrl}
                  </a>
                  <span>|</span>
                  <span>{record.issues.length} 个问题</span>
                </div>
                <MRReviewResult record={record} />
              </div>
              <button
                onClick={() => onViewOnline(record.mrUrl)}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary rounded-lg text-xs text-primary-500 hover:bg-surface-container"
              >
                <Icon name="open_in_new" size={14} />
                查看线上
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-on-surface-tertiary text-center py-8">暂无问题记录</div>
        )}
      </div>
    </div>
  )
}