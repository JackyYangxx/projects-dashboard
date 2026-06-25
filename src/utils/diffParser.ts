export type DiffLineType = 'add' | 'del' | 'context'

export interface ParsedDiffLine {
  num: number
  type: DiffLineType
  content: string
}

export interface ParsedHunk {
  startLine: number
  lines: ParsedDiffLine[]
}

export interface ParsedFile {
  path: string
  additions: number
  deletions: number
  hunks: ParsedHunk[]
}

export interface ParsedDiff {
  files: ParsedFile[]
}

const FILE_HEADER_RE = /^diff --git a\/(.+?) b\/(.+?)$/
const HUNK_HEADER_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/

export function parseDiff(raw: string): ParsedDiff {
  const files: ParsedFile[] = []
  if (!raw || !raw.trim()) return { files }

  const lines = raw.split('\n')
  let currentFile: ParsedFile | null = null
  let currentHunk: ParsedHunk | null = null
  let lineCursor = 0

  for (const rawLine of lines) {
    const fileMatch = rawLine.match(FILE_HEADER_RE)
    if (fileMatch) {
      currentFile = {
        path: fileMatch[2],
        additions: 0,
        deletions: 0,
        hunks: [],
      }
      currentHunk = null
      files.push(currentFile)
      continue
    }

    const hunkMatch = rawLine.match(HUNK_HEADER_RE)
    if (hunkMatch) {
      if (!currentFile) continue
      currentHunk = {
        startLine: parseInt(hunkMatch[1], 10),
        lines: [],
      }
      lineCursor = currentHunk.startLine
      currentFile.hunks.push(currentHunk)
      continue
    }

    if (!currentFile || !currentHunk) continue

    if (rawLine.startsWith('+')) {
      const content = rawLine.slice(1).replace(/\r$/, '')
      currentHunk.lines.push({ num: lineCursor, type: 'add', content })
      currentFile.additions += 1
      lineCursor += 1
    } else if (rawLine.startsWith('-')) {
      const content = rawLine.slice(1).replace(/\r$/, '')
      currentHunk.lines.push({ num: lineCursor, type: 'del', content })
      currentFile.deletions += 1
    } else if (rawLine.startsWith(' ')) {
      const content = rawLine.slice(1).replace(/\r$/, '')
      currentHunk.lines.push({ num: lineCursor, type: 'context', content })
      lineCursor += 1
    } else if (rawLine.startsWith('\\')) {
      // "\ No newline at end of file" — skip
      continue
    }
  }

  return { files: files.filter(f => f.hunks.length > 0) }
}