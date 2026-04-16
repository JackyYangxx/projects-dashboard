import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  growth?: number
  progress?: number
  progressLabel?: string
  icon?: string
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  growth,
  progress,
  progressLabel,
  icon,
}) => {
  return (
    <div className="bg-surface-elevated rounded-lg p-5 shadow-surface">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-body text-on-surface-secondary mb-1">{title}</p>
          <p className="text-2xl font-heading font-bold text-on-surface-primary">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs font-body text-on-surface-tertiary mt-1">{subtitle}</p>
          )}
          {growth !== undefined && (
            <div
              className={`flex items-center gap-1 mt-1 text-xs font-body ${
                growth >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {growth >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span>{Math.abs(growth)}%</span>
              <span className="text-on-surface-tertiary">较上月</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-500 text-xl">
              {icon}
            </span>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-body mb-1.5">
            <span className="text-on-surface-secondary">
              {progressLabel || '执行率'}
            </span>
            <span className="text-on-surface-primary font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsCard
