import React from 'react'
import TruncatedText from './TruncatedText'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  growth?: number
  progress?: number
  progressLabel?: string
  icon?: string
  variant?: 'default' | 'accent'
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  growth,
  progress,
  progressLabel,
  icon,
  variant = 'default',
}) => {
  const isAccent = variant === 'accent'

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-float cursor-pointer ${
      isAccent
        ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/20'
        : 'bg-white border border-outline shadow-card hover:shadow-elevated'
    }`}>
      {/* Background glow effect for accent variant */}
      {isAccent && (
        <>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </>
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-body ${isAccent ? 'text-white/80' : 'text-on-surface-secondary'} mb-1`}>
            {title}
          </p>
          <p className={`text-2xl font-heading font-bold tabular-nums ${isAccent ? 'text-white' : 'text-on-surface-primary'}`}>
            <TruncatedText text={String(value)} maxChars={12} className="inline" />
          </p>
          {subtitle && (
            <p className={`text-xs font-body mt-1 ${isAccent ? 'text-white/70' : 'text-on-surface-tertiary'}`}>
              <TruncatedText text={subtitle} maxChars={20} />
            </p>
          )}
          {growth !== undefined && !isAccent && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-body font-medium ${
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
          {growth !== undefined && isAccent && (
            <div className="flex items-center gap-1 mt-2 text-xs font-body font-medium text-white/90">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>{Math.abs(growth)}%</span>
              <span className="text-white/70">较上月</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            isAccent
              ? 'bg-white/20 shadow-lg'
              : 'bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-100'
          }`}>
            <span className={`material-symbols-outlined ${isAccent ? 'text-white' : 'text-primary-500'} text-xl`}>
              {icon}
            </span>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-body mb-1.5">
            <span className={isAccent ? 'text-white/80' : 'text-on-surface-secondary'}>
              {progressLabel || '执行率'}
            </span>
            <span className={`font-heading font-semibold tabular-nums ${isAccent ? 'text-white' : 'text-primary-500'}`}>
              {progress}%
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isAccent ? 'bg-white/30' : 'bg-surface-base'}`}>
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                isAccent
                  ? 'bg-white'
                  : 'bg-gradient-to-r from-primary-500 to-accent-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsCard
