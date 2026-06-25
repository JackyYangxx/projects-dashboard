import { describe, it, expect } from 'vitest'
import { resolveIssues } from './issueResolver'
import type { ParsedDiff } from './diffParser'
import type { AIResponseIssue } from './issueResolver'

const parsedDiff: ParsedDiff = {
  files: [
    {
      path: 'utils/cache.ts',
      additions: 2,
      deletions: 0,
      hunks: [
        {
          startLine: 1,
          lines: [
            { num: 1, type: 'add', content: 'const cache = new Map()' },
            { num: 2, type: 'add', content: 'cache.set("k", v)' },
          ],
        },
      ],
    },
    {
      path: 'api/users.ts',
      additions: 1,
      deletions: 1,
      hunks: [
        {
          startLine: 10,
          lines: [
            { num: 10, type: 'context', content: 'function fetchUser(id) {' },
            { num: 11, type: 'del', content: 'return fetch(url)' },
            { num: 11, type: 'add', content: 'return await fetch(url)' },
          ],
        },
      ],
    },
  ],
}

describe('resolveIssues', () => {
  it('resolves exact single-line snippet to added line', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: '可能内存泄漏',
        description: 'cache 没有清理',
        filePath: 'utils/cache.ts',
        codeSnippet: 'cache.set("k", v)',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBe(2)
    expect(resolved.resolved).toBe(true)
  })

  it('strips +/-/space prefix when AI includes it', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'test',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: '+ cache.set("k", v)',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBe(2)
  })

  it('normalizes whitespace differences', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'test',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: '  cache.set("k", v)  ',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBe(2)
  })

  it('marks issue as unresolved when snippet not found', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'not found',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: 'doesNotExist()',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.lineNumber).toBeUndefined()
    expect(resolved.resolved).toBe(false)
  })

  it('handles multi-line snippets joined by \n', () => {
    const diff: ParsedDiff = {
      files: [
        {
          path: 'foo.ts',
          additions: 3,
          deletions: 0,
          hunks: [
            {
              startLine: 1,
              lines: [
                { num: 1, type: 'add', content: 'function foo() {' },
                { num: 2, type: 'add', content: '  doX()' },
                { num: 3, type: 'add', content: '}' },
              ],
            },
          ],
        },
      ],
    }
    const issues: AIResponseIssue[] = [
      {
        severity: 'critical',
        title: 'multi',
        description: 'test',
        filePath: 'foo.ts',
        codeSnippet: 'function foo() {\n  doX()\n}',
      },
    ]
    const [resolved] = resolveIssues(issues, diff)
    expect(resolved.lineNumber).toBe(1)
  })

  it('fuzzy-matches when 1 char differs', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'warning',
        title: 'fuzzy',
        description: 'test',
        filePath: 'utils/cache.ts',
        codeSnippet: 'cache.set("k", x)', // x instead of v
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.resolved).toBe(true)
    expect(resolved.lineNumber).toBe(2)
  })

  it('preserves empty codeSnippet as unresolved with filePath only', () => {
    const issues: AIResponseIssue[] = [
      {
        severity: 'suggestion',
        title: 'general',
        description: 'architectural',
        filePath: 'utils/cache.ts',
        codeSnippet: '',
      },
    ]
    const [resolved] = resolveIssues(issues, parsedDiff)
    expect(resolved.resolved).toBe(false)
    expect(resolved.lineNumber).toBeUndefined()
  })

  it('returns the same number of issues as input', () => {
    const issues: AIResponseIssue[] = [
      { severity: 'warning', title: 'a', description: '', filePath: 'utils/cache.ts', codeSnippet: 'const cache = new Map()' },
      { severity: 'warning', title: 'b', description: '', filePath: 'unknown.ts', codeSnippet: 'foo' },
    ]
    const resolved = resolveIssues(issues, parsedDiff)
    expect(resolved).toHaveLength(2)
  })
})
