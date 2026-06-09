import React, { useEffect, useRef } from 'react'
import TruncatedText from './TruncatedText'
import Icon, { IconName } from './Icon'
import { animateCountUp, animateProgress } from '@/utils/animations'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  growth?: number
  progress?: number
  progressLabel?: string
  icon?: IconName
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
  const valueRef = useRef<HTMLSpanElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)

  // Count-up for numeric or numeric-string values
  useEffect(() => {
    if (!valueRef.current) return
    if (typeof value === 'number') {
      animateCountUp(valueRef.current, value, { duration: 1100 })
    } else {
      // Try to extract a leading number and suffix
      const match = String(value).match(/^([\d,.]+)(.*)$/)
      if (match) {
        const num = Number(match[1].replace(/,/g, ''))
        if (!Number.isNaN(num)) {
          const suffix = match[2]
          animateCountUp(valueRef.current, num, { duration: 1100, suffix })
        } else {
          valueRef.current.textContent = String(value)
        }
      } else {
        valueRef.current.textContent = String(value)
      }
    }
  }, [value])

  // Progress bar grow
  useEffect(() => {
    if (progress !== undefined && progressFillRef.current) {
      animateProgress(progressFillRef.current, progress, { duration: 1100, delay: 300 })
    }
  }, [progress])

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 h-full flex flex-col transition-all duration-200 hover:shadow-elevated cursor-pointer group ${
      isAccent
        ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-elevated'
        : 'bg-white border border-outline shadow-card'
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
            <span ref={valueRef} className="inline">0</span>
          </p>
          {growth !== undefined && !isAccent && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-body font-medium ${
                growth >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              <Icon name={growth >= 0 ? 'trending_up' : 'trending_down'} className="text-sm" />
              <span>{Math.abs(growth)}%</span>
              <span className="text-on-surface-tertiary">较上月</span>
            </div>
          )}
          {growth !== undefined && isAccent && (
            <div className="flex items-center gap-1 mt-2 text-xs font-body font-medium text-white/90">
              <Icon name="trending_up" className="text-sm" />
              <span>{Math.abs(growth)}%</span>
              <span className="text-white/70">较上月</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
            isAccent
              ? 'bg-white/20 shadow-lg'
              : 'bg-primary-50 border border-primary-100'
          }`}>
            <Icon name={icon} className={`text-base ${isAccent ? 'text-white' : 'text-primary-600'}`} />
          </div>
        )}
      </div>

      <div className="mt-auto">
        {subtitle && (
          <p className={`text-xs font-body pt-4 ${isAccent ? 'text-white/70' : 'text-on-surface-tertiary'}`}>
            <TruncatedText text={subtitle} maxChars={20} />
          </p>
        )}
        {progress !== undefined && (
          <div className="pt-4">
            <div className="flex items-center justify-between text-xs font-body mb-1.5">
              <span className={isAccent ? 'text-white/80' : 'text-on-surface-secondary'}>
                {progressLabel || '执行率'}
              </span>
              <span className={`font-heading font-semibold tabular-nums ${isAccent ? 'text-white' : 'text-primary-600'}`}>
                {progress}%
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isAccent ? 'bg-white/30' : 'bg-surface-base'}`}>
              <div
                ref={progressFillRef}
                data-progress-fill
                className={`h-full rounded-full ${
                  isAccent
                    ? 'bg-white'
                    : 'bg-gradient-to-r from-primary-500 to-primary-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsCard
