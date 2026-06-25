import { describe, it, expect } from 'vitest'
import { parseDiff } from './diffParser'

describe('parseDiff', () => {
  it('returns empty result for empty input', () => {
    expect(parseDiff('')).toEqual({ files: [] })
  })

  it('returns empty result for whitespace-only input', () => {
    expect(parseDiff('   \n\n  ')).toEqual({ files: [] })
  })

  it('parses a single-file added-line diff', () => {
    const diff = [
      'diff --git a/utils/cache.ts b/utils/cache.ts',
      'index 0000..1111 100644',
      '--- a/utils/cache.ts',
      '+++ b/utils/cache.ts',
      '@@ -0,0 +1,2 @@',
      '+const cache = new Map()',
      '+cache.set("k", v)',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('utils/cache.ts')
    expect(result.files[0].hunks).toHaveLength(1)
    expect(result.files[0].hunks[0].startLine).toBe(1)
    expect(result.files[0].hunks[0].lines).toEqual([
      { num: 1, type: 'add', content: 'const cache = new Map()' },
      { num: 2, type: 'add', content: 'cache.set("k", v)' },
    ])
  })

  it('parses multi-file diff with mixed add/del/context', () => {
    const diff = [
      'diff --git a/api/users.ts b/api/users.ts',
      '--- a/api/users.ts',
      '+++ b/api/users.ts',
      '@@ -10,3 +10,5 @@',
      ' unchanged',
      '-removed line',
      '+added line 1',
      '+added line 2',
      ' unchanged after',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files[0].hunks[0].startLine).toBe(10)
    expect(result.files[0].hunks[0].lines.map(l => l.type)).toEqual([
      'context', 'del', 'add', 'add', 'context',
    ])
    expect(result.files[0].hunks[0].lines.map(l => l.num)).toEqual([
      10, 11, 11, 12, 13,
    ])
  })

  it('parses multiple files', () => {
    const diff = [
      'diff --git a/a.ts b/a.ts',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      'diff --git a/b.ts b/b.ts',
      '--- a/b.ts',
      '+++ b/b.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files.map(f => f.path)).toEqual(['a.ts', 'b.ts'])
  })

  it('computes +/- stats per file', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '--- a/x.ts',
      '+++ b/x.ts',
      '@@ -1,2 +1,3 @@',
      ' ctx',
      '-del',
      '+add1',
      '+add2',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files[0].additions).toBe(2)
    expect(result.files[0].deletions).toBe(1)
  })

  it('handles malformed diff gracefully (no hunk header)', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '+++ b/x.ts',
      '+some line without hunk header',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files).toEqual([])
  })

  it('strips trailing CR from line content', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '--- a/x.ts',
      '+++ b/x.ts',
      '@@ -0,0 +1 @@',
      '+const x = 1',
    ].join('\n')

    const result = parseDiff(diff)
    expect(result.files[0].hunks[0].lines[0].content).toBe('const x = 1')
  })
})