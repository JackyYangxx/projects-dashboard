import React from 'react'
import type { TimelineEvent } from '../types/index'

interface TimelineProps {
  events: TimelineEvent[]
  viewMode?: 'monthly' | 'quarterly'
  onViewModeChange?: (mode: 'monthly' | 'quarterly') => void
}

const Timeline: React.FC<TimelineProps> = ({
  events,
  viewMode = 'monthly',
  onViewModeChange,
}) => {
  const getNodeState = (event: TimelineEvent) => {
    if (event.isActive) return 'active'
    if (event.isCompleted) return 'completed'
    return 'pending'
  }

  const nodeStateStyles = {
    active: {
      dot: 'bg-gradient-to-br from-primary-400 to-accent-400 shadow-lg shadow-primary-500/20',
      line: 'bg-gradient-to-b from-primary-500 to-accent-500',
      label: 'text-primary-500',
      badge: 'bg-primary-50 text-primary-600 border border-primary-200',
      activeBadge: 'bg-accent-50 text-accent-600 border border-accent-200',
    },
    completed: {
      dot: 'bg-success',
      line: 'bg-success',
      label: 'text-success',
      badge: 'bg-success/10 text-success border border-success/20',
      activeBadge: 'bg-success/10 text-success border border-success/20',
    },
    pending: {
      dot: 'bg-surface-base border-2 border-outline',
      line: 'bg-outline',
      label: 'text-on-surface-tertiary',
      badge: 'bg-surface-base text-on-surface-tertiary border border-outline',
      activeBadge: 'bg-surface-base text-on-surface-tertiary border border-outline',
    },
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-body font-medium text-on-surface-secondary">演进历程</h3>
        <div className="flex items-center bg-surface-base rounded-xl p-0.5 border border-outline">
          <button
            onClick={() => onViewModeChange?.('monthly')}
            aria-pressed={viewMode === 'monthly'}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all duration-150 cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-sm'
                : 'text-on-surface-secondary hover:text-on-surface-primary'
            }`}
          >
            按月
          </button>
          <button
            onClick={() => onViewModeChange?.('quarterly')}
            aria-pressed={viewMode === 'quarterly'}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all duration-150 cursor-pointer ${
              viewMode === 'quarterly'
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-sm'
                : 'text-on-surface-secondary hover:text-on-surface-primary'
            }`}
          >
            按季度
          </button>
        </div>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-sm font-body text-on-surface-tertiary">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl">timeline</span>
            <span>暂无时间线数据</span>
          </div>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line with gradient */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500 via-accent-500 to-outline" />

          <div className="space-y-6">
            {events.map((event, index) => {
              const state = getNodeState(event)
              const styles = nodeStateStyles[state]

              return (
                <div key={index} className="relative">
                  {/* Node */}
                  <div
                    className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full ${styles.dot}`}
                  />

                  {/* Content */}
                  <div className="ml-2">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className={`text-xs font-mono font-medium ${styles.label}`}>
                        {event.date}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-body ${styles.badge}`}>
                        v{event.version}
                      </span>
                      {event.isActive && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-body font-medium ${styles.activeBadge}`}>
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-body font-medium text-on-surface-primary">
                      {event.title}
                    </p>
                    {event.items.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {event.items.map((item, itemIdx) => (
                          <li
                            key={itemIdx}
                            className="flex items-start gap-2 text-xs font-body text-on-surface-secondary"
                          >
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Timeline
