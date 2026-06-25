import type { ParsedDiff, ParsedFile } from './diffParser'

export interface AIResponseIssue {
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  filePath: string
  codeSnippet: string
}

export interface ResolvedIssue extends AIResponseIssue {
  id: string
  resolved: boolean
  lineNumber?: number
}

function normalize(s: string): string {
  return s.replace(/^[+\- ]/, '').trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1).fill(0).map((_, i) => i)
  let curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function findExact(snippet: string, file: ParsedFile): number | null {
  const target = normalize(snippet)
  if (!target) return null

  const lines = target.split('\n').map(l => normalize(l))
  if (lines.length === 1) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' && normalize(line.content) === target) {
          return line.num
        }
      }
    }
    return null
  }

  for (const hunk of file.hunks) {
    for (let i = 0; i <= hunk.lines.length - lines.length; i++) {
      let match = true
      for (let k = 0; k < lines.length; k++) {
        if (normalize(hunk.lines[i + k].content) !== lines[k]) {
          match = false
          break
        }
      }
      if (match) return hunk.lines[i].num
    }
  }
  return null
}

function findFuzzy(snippet: string, file: ParsedFile): number | null {
  // Single-line only: matches one snippet line against one hunk line.
  // Multi-line snippets that fail exact match fall through to unresolved.
  const target = normalize(snippet)
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type !== 'add') continue
      const candidate = normalize(line.content)
      if (Math.abs(candidate.length - target.length) > 2) continue
      if (levenshtein(candidate, target) <= 2) return line.num
    }
  }
  return null
}

function makeId(): string {
  return `iss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function resolveIssues(
  issues: AIResponseIssue[],
  parsed: ParsedDiff
): ResolvedIssue[] {
  return issues.map(issue => {
    const file = parsed.files.find(f => f.path === issue.filePath)
    let lineNumber: number | undefined

    if (file && issue.codeSnippet) {
      lineNumber = findExact(issue.codeSnippet, file) ?? undefined
      if (lineNumber === undefined) {
        const fuzzy = findFuzzy(issue.codeSnippet, file)
        if (fuzzy !== null) {
          lineNumber = fuzzy
          console.warn(`[issueResolver] fuzzy-matched snippet for "${issue.title}"`)
        }
      }
    }

    return {
      ...issue,
      id: makeId(),
      lineNumber,
      resolved: lineNumber !== undefined,
    }
  })
}
