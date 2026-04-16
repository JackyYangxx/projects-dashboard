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
      dot: 'bg-primary-500 ring-4 ring-primary-500/20',
      line: 'bg-primary-500',
      label: 'text-primary-500',
    },
    completed: {
      dot: 'bg-success',
      line: 'bg-success',
      label: 'text-success',
    },
    pending: {
      dot: 'bg-outline',
      line: 'bg-outline',
      label: 'text-on-surface-tertiary',
    },
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-body font-medium text-on-surface-secondary">演进历程</h3>
        <div className="flex items-center bg-surface-base rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange?.('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-body font-medium transition-colors ${
              viewMode === 'monthly'
                ? 'bg-surface-elevated text-on-surface-primary shadow-sm'
                : 'text-on-surface-secondary hover:text-on-surface-primary'
            }`}
          >
            按月
          </button>
          <button
            onClick={() => onViewModeChange?.('quarterly')}
            className={`px-3 py-1.5 rounded-md text-xs font-body font-medium transition-colors ${
              viewMode === 'quarterly'
                ? 'bg-surface-elevated text-on-surface-primary shadow-sm'
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
          暂无时间线数据
        </div>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-outline" />

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
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs font-body font-medium ${styles.label}`}>
                        {event.date}
                      </span>
                      <span className="px-1.5 py-0.5 bg-surface-container rounded text-xs font-body text-on-surface-secondary">
                        v{event.version}
                      </span>
                      {event.isActive && (
                        <span className="px-1.5 py-0.5 bg-primary-500/10 rounded text-xs font-body text-primary-500 font-medium">
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
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-on-surface-tertiary flex-shrink-0" />
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
