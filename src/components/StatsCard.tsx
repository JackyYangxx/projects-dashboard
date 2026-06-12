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
  progressVariant?: 'linear' | 'ring'
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'cyan'
}

type Tone = NonNullable<StatsCardProps['tone']>

const TONE_BG: Record<Tone, string> = {
  blue: 'bg-blue-50/70',
  green: 'bg-emerald-50/70',
  amber: 'bg-amber-50/70',
  violet: 'bg-violet-50/70',
  cyan: 'bg-cyan-50/70',
}

const TONE_ICON_BG: Record<Tone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}

const TONE_ACCENT: Record<Tone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
}

const TONE_GLOW: Record<Tone, string> = {
  blue: 'rgba(59,130,246,0.22)',
  green: 'rgba(16,185,129,0.20)',
  amber: 'rgba(245,158,11,0.22)',
  violet: 'rgba(139,92,246,0.20)',
  cyan: 'rgba(6,182,212,0.20)',
}

const TONE_PROGRESS: Record<Tone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
}

const TONE_TEXT: Record<Tone, string> = {
  blue: 'text-blue-700',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  violet: 'text-violet-700',
  cyan: 'text-cyan-700',
}

const RING_SIZE = 96
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  growth,
  progress,
  progressLabel,
  icon,
  variant = 'default',
  progressVariant = 'linear',
  tone,
}) => {
  const isAccent = variant === 'accent'
  const hasTone = tone !== undefined
  const valueRef = useRef<HTMLSpanElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const ringFillRef = useRef<SVGCircleElement>(null)
  const ringValueRef = useRef<HTMLSpanElement>(null)

  // Count-up for numeric or numeric-string values
  useEffect(() => {
    if (!valueRef.current) return
    if (typeof value === 'number') {
      animateCountUp(valueRef.current, value, { duration: 1100 })
    } else {
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

  // Linear progress bar grow
  useEffect(() => {
    if (progress === undefined) return
    if (progressVariant === 'linear' && progressFillRef.current) {
      animateProgress(progressFillRef.current, progress, { duration: 1100, delay: 300 })
    }
  }, [progress, progressVariant])

  // Ring progress: animate stroke-dashoffset + center number
  useEffect(() => {
    if (progress === undefined || progressVariant !== 'ring') return
    const safeProgress = Math.max(0, Math.min(100, progress))
    const targetOffset = RING_CIRCUMFERENCE * (1 - safeProgress / 100)

    if (ringFillRef.current) {
      ringFillRef.current.style.transition = 'stroke-dashoffset 1100ms cubic-bezier(0.4, 0, 0.2, 1) 300ms'
      ringFillRef.current.style.strokeDashoffset = String(targetOffset)
    }
    if (ringValueRef.current) {
      ringValueRef.current.textContent = '0'
      const start = performance.now()
      const duration = 1100
      const delay = 300
      const tick = (now: number) => {
        const elapsed = now - start - delay
        if (elapsed < 0) {
          requestAnimationFrame(tick)
          return
        }
        const t = Math.min(1, elapsed / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        const current = Math.round(safeProgress * eased)
        if (ringValueRef.current) ringValueRef.current.textContent = String(current)
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [progress, progressVariant])

  const showRing = progressVariant === 'ring' && progress !== undefined

  return (
    <div
      className={`relative overflow-hidden rounded-lg p-5 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated cursor-pointer group ${
        isAccent
          ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-elevated'
          : hasTone
            ? `${TONE_BG[tone!]} border border-outline shadow-card`
            : 'bg-white border border-outline shadow-card'
      }`}
    >
      {isAccent && (
        <>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </>
      )}
      {hasTone && !isAccent && (
        <>
          <div className={`absolute top-0 left-0 right-0 h-1 ${TONE_ACCENT[tone!]}`} />
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none"
            style={{ background: TONE_GLOW[tone!] }}
            aria-hidden
          />
        </>
      )}

      <div className={`relative flex ${showRing ? 'items-start justify-between gap-4' : 'items-start justify-between'}`}>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-body font-medium tracking-wide uppercase ${isAccent ? 'text-white/75' : 'text-on-surface-tertiary'} mb-2`}>
            {title}
          </p>
          {!showRing && (
            <p className={`text-3xl font-heading font-bold tabular-nums leading-tight ${isAccent ? 'text-white' : 'text-on-surface-primary'}`}>
              <span ref={valueRef} className="inline">0</span>
            </p>
          )}
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
        {showRing ? (
          <div className="relative flex-shrink-0">
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                className="stroke-surface-hover"
                strokeWidth={RING_STROKE}
              />
              <circle
                ref={ringFillRef}
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                className="stroke-primary-500"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
              />
              {/* Shimmer trail: short arc that orbits continuously */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                className="stroke-primary-300"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray="40 800"
                style={{
                  transformOrigin: 'center',
                  transform: 'rotate(0deg)',
                  animation: 'spin 4s linear infinite',
                }}
                opacity={0.6}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                ref={ringValueRef}
                className={`text-2xl font-heading font-bold tabular-nums leading-none ${isAccent ? 'text-white' : 'text-on-surface-primary'}`}
              >
                0
              </span>
              <span className={`text-[10px] font-mono mt-0.5 ${isAccent ? 'text-white/70' : 'text-on-surface-tertiary'}`}>
                %
              </span>
            </div>
          </div>
        ) : icon ? (
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
              isAccent
                ? 'bg-white/20 shadow-lg'
                : hasTone
                  ? TONE_ICON_BG[tone!]
                  : 'bg-primary-50 border border-primary-100'
            }`}
          >
            <Icon
              name={icon}
              className={`text-base ${
                isAccent
                  ? 'text-white'
                  : hasTone
                    ? ''
                    : 'text-primary-600'
              }`}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-auto">
        {subtitle && !showRing && (
          <p className={`text-xs font-body pt-4 ${isAccent ? 'text-white/70' : 'text-on-surface-tertiary'}`}>
            <TruncatedText text={subtitle} maxChars={24} />
          </p>
        )}
        {progressLabel && showRing && (
          <p className={`text-xs font-body pt-4 ${isAccent ? 'text-white/70' : 'text-on-surface-tertiary'}`}>
            {progressLabel}
          </p>
        )}
        {progress !== undefined && progressVariant === 'linear' && (
          <div className="pt-4">
            <div className="flex items-center justify-between text-xs font-body mb-1.5">
              <span className={isAccent ? 'text-white/80' : 'text-on-surface-secondary'}>
                {progressLabel || '执行率'}
              </span>
              <span className={`font-heading font-semibold tabular-nums ${isAccent ? 'text-white' : hasTone ? TONE_TEXT[tone!] : 'text-primary-600'}`}>
                {progress}%
              </span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isAccent ? 'bg-white/30' : 'bg-surface-hover'}`}>
              <div
                ref={progressFillRef}
                data-progress-fill
                className={`h-full rounded-full ${
                  isAccent ? 'bg-white' : hasTone ? TONE_PROGRESS[tone!] : 'bg-primary-500'
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
