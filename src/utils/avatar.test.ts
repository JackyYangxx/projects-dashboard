import { describe, it, expect } from 'vitest'
import { generateAvatarUrl } from './avatar'

describe('generateAvatarUrl', () => {
  it('returns a dicebear URL with the encoded name', () => {
    const url = generateAvatarUrl('张三')
    expect(url).toContain('api.dicebear.com')
    expect(url).toContain('initials/svg')
    expect(url).toContain('seed=')
    expect(url).toContain(encodeURIComponent('张三'))
  })

  it('encodes special characters in the name', () => {
    const url = generateAvatarUrl('hello world')
    expect(url).toContain('hello%20world')
  })

  it('returns a valid URL format', () => {
    const url = generateAvatarUrl('test')
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com\/7\.x\/initials\/svg\?seed=/)
  })

  it('handles empty string name', () => {
    const url = generateAvatarUrl('')
    expect(url).toContain('seed=')
    expect(() => new URL(url)).not.toThrow()
  })
})
