import { describe, it, expect } from 'vitest'
import { parseIssuesFromResponse } from '../codeReviewStore'

describe('parseIssuesFromResponse', () => {
  it('parses a plain JSON array', () => {
    const text = '[{"severity":"warning","title":"t1","description":"d1","filePath":"a.ts","codeSnippet":""}]'
    const result = parseIssuesFromResponse(text)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('t1')
    expect(result[0].severity).toBe('warning')
  })

  it('extracts JSON followed by trailing prose containing "]"', () => {
    const text = '[{"severity":"critical","title":"t1","description":"d1","filePath":"a.ts","codeSnippet":""}]\n\nSee also [docs] for more info.'
    const result = parseIssuesFromResponse(text)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('t1')
    expect(result[0].severity).toBe('critical')
  })

  it('handles nested objects/arrays in values', () => {
    const text = '[{"severity":"warning","title":"t1","description":"d1","filePath":"a.ts","codeSnippet":"line [0]"}]'
    const result = parseIssuesFromResponse(text)
    expect(result).toHaveLength(1)
    expect(result[0].codeSnippet).toBe('line [0]')
  })

  it('picks the first balanced array when multiple "[" appear before JSON', () => {
    const text = 'Note: see [README] and also [{ "severity":"warning","title":"only","description":"d","filePath":"f","codeSnippet":"" }]'
    const result = parseIssuesFromResponse(text)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('only')
  })

  it('returns [] when no "[" is in text', () => {
    const result = parseIssuesFromResponse('no brackets here')
    expect(result).toEqual([])
  })

  it('returns [] for malformed JSON inside the array', () => {
    const text = '[{ not valid json'
    const result = parseIssuesFromResponse(text)
    expect(result).toEqual([])
  })

  it('handles JSON array with prose before it', () => {
    const text = 'Here are the issues I found:\n[{"severity":"warning","title":"t1","description":"d1","filePath":"a.ts","codeSnippet":""}]'
    const result = parseIssuesFromResponse(text)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('t1')
  })

  it('handles whitespace and newlines around JSON', () => {
    const text = '\n\n  [{"severity":"warning","title":"t1","description":"d1","filePath":"a.ts","codeSnippet":""}]  \n\n'
    const result = parseIssuesFromResponse(text)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('t1')
  })
})