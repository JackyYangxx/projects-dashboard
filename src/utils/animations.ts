import { animate, stagger, createTimer, utils } from 'animejs'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Animate a number counting from 0 to target.
 * Used for stat card values.
 */
export const animateCountUp = (
  element: HTMLElement,
  target: number,
  options: { duration?: number; decimals?: number; suffix?: string; prefix?: string } = {}
) => {
  if (prefersReducedMotion()) {
    element.textContent = `${options.prefix ?? ''}${target}${options.suffix ?? ''}`
    return
  }
  const { duration = 1200, decimals = 0, suffix = '', prefix = '' } = options
  const obj = { value: 0 }
  animate(obj, {
    value: target,
    duration,
    ease: 'out(3)',
    onUpdate: () => {
      element.textContent = `${prefix}${obj.value.toFixed(decimals)}${suffix}`
    },
  })
}

/**
 * Animate a progress bar's width from 0 to target%.
 * Looks for a child div to set width on.
 */
export const animateProgress = (
  container: HTMLElement,
  targetPercent: number,
  options: { duration?: number; delay?: number } = {}
) => {
  if (prefersReducedMotion()) return
  const { duration = 900, delay = 0 } = options
  const fill = container.querySelector<HTMLElement>('[data-progress-fill]')
    ?? container.firstElementChild as HTMLElement | null
  if (!fill) return
  fill.style.width = '0%'
  animate(fill, {
    width: `${targetPercent}%`,
    duration,
    delay,
    ease: 'out(2)',
  })
}

/**
 * Stagger entrance for a list of children.
 * Fades in and slides up.
 */
export const animateStaggerIn = (
  container: HTMLElement,
  selector: string,
  options: { delay?: number; staggerMs?: number; distance?: number } = {}
) => {
  if (prefersReducedMotion()) return
  const { delay = 0, staggerMs = 60, distance = 12 } = options
  const items = container.querySelectorAll<HTMLElement>(selector)
  if (items.length === 0) return
  animate(items, {
    opacity: [0, 1],
    translateY: [distance, 0],
    duration: 500,
    delay: stagger(staggerMs, { start: delay }),
    ease: 'out(3)',
  })
}

/**
 * Soft scale-up entrance for cards.
 */
export const animateFadeIn = (
  element: HTMLElement,
  options: { delay?: number; duration?: number; distance?: number } = {}
) => {
  if (prefersReducedMotion()) return
  const { delay = 0, duration = 500, distance = 16 } = options
  animate(element, {
    opacity: [0, 1],
    translateY: [distance, 0],
    scale: [0.98, 1],
    duration,
    delay,
    ease: 'out(3)',
  })
}

/**
 * Ambient floating orbs in the background.
 * Subtle, non-distracting — sits behind everything (-z-10).
 */
export const startAmbientOrbs = (container: HTMLElement) => {
  if (prefersReducedMotion()) return
  const orbs = container.querySelectorAll<HTMLElement>('[data-orb]')
  if (orbs.length === 0) return

  orbs.forEach((orb, i) => {
    animate(orb, {
      translateX: [
        { to: 40, duration: 8000 + i * 1200 },
        { to: -30, duration: 7000 + i * 1000 },
        { to: 0, duration: 6000 + i * 800 },
      ],
      translateY: [
        { to: -30, duration: 7000 + i * 1100 },
        { to: 40, duration: 8000 + i * 900 },
        { to: 0, duration: 7000 + i * 1300 },
      ],
      scale: [
        { to: 1.1, duration: 6000 },
        { to: 0.95, duration: 5000 },
        { to: 1, duration: 6000 },
      ],
      loop: true,
      ease: 'inOutSine',
    })
  })
}

/**
 * Subtle pulse for the logo / brand mark.
 */
export const animateLogoPulse = (element: HTMLElement) => {
  if (prefersReducedMotion()) return
  animate(element, {
    boxShadow: [
      '0 0 0 1px rgba(16,185,129,0.3), 0 0 20px rgba(16,185,129,0.15)',
      '0 0 0 1px rgba(16,185,129,0.5), 0 0 30px rgba(16,185,129,0.35)',
      '0 0 0 1px rgba(16,185,129,0.3), 0 0 20px rgba(16,185,129,0.15)',
    ],
    duration: 2400,
    loop: true,
    ease: 'inOutSine',
  })
}

/**
 * "Online" status dot — single ping pulse, then steady.
 */
export const animateStatusDot = (element: HTMLElement) => {
  if (prefersReducedMotion()) return
  animate(element, {
    scale: [1, 1.4, 1],
    opacity: [0.9, 0.4, 0.9],
    duration: 1800,
    loop: true,
    ease: 'inOutSine',
  })
}

export { createTimer, utils }
