// src/agents/ruleEngine.ts
import type { AgentRule, RuleMatch } from '@/types/agent'
import type { ParsedDiff } from '@/utils/diffParser'

export type { RuleMatch }

/**
 * Resolve the effective rule set for a given project by letting
 * project-scope rules override global-scope rules with the same name.
 * Disabled rules are excluded.
 */
export function resolveEffectiveRules(rules: AgentRule[], projectId?: string): AgentRule[] {
  const enabled = rules.filter(r => r.enabled)
  const byName = new Map<string, AgentRule>()
  // Seed with globals first
  for (const r of enabled) {
    if (r.scope === 'global') byName.set(r.name, r)
  }
  // Project-scope overrides by name
  for (const r of enabled) {
    if (r.scope === 'project' && (!projectId || r.projectId === projectId)) {
      byName.set(r.name, r)
    }
  }
  return Array.from(byName.values())
}

export function matchGlob(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true // empty = match all
  return patterns.some(p => {
    const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
    return regex.test(filePath)
  })
}

export function matchRules(
  parsedDiff: ParsedDiff,
  rules: AgentRule[]
): RuleMatch[] {
  const matches: RuleMatch[] = []

  for (const file of parsedDiff.files) {
    for (const rule of rules) {
      if (!rule.enabled) continue
      if (!matchGlob(file.path, rule.filePatterns)) continue
      if (rule.matchPatterns.length === 0) continue // LLM-only rule

      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'context') continue
          for (const pattern of rule.matchPatterns) {
            try {
              const regex = new RegExp(pattern, 'i')
              if (regex.test(line.content)) {
                matches.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  severity: rule.severity,
                  filePath: file.path,
                  matchedLine: line.num,
                  matchedContent: line.content.trim(),
                })
              }
            } catch (err) {
              // Invalid regex, skip
              console.warn(`[ruleEngine] invalid regex pattern in rule "${rule.name}":`, pattern, err)
            }
          }
        }
      }
    }
  }

  return matches
}

export function buildRuleContextPrompt(rules: AgentRule[]): string {
  if (rules.length === 0) return ''
  const lines = ['## 评审规则', '', '请根据以下规则审查代码：', '']
  for (const rule of rules) {
    lines.push(`### ${rule.name} [${rule.severity}]`)
    lines.push(rule.content)
    if (rule.examplesGood.length > 0) {
      lines.push('正面示例：')
      rule.examplesGood.forEach(e => lines.push(`  ${e}`))
    }
    if (rule.examplesBad.length > 0) {
      lines.push('反面示例：')
      rule.examplesBad.forEach(e => lines.push(`  ${e}`))
    }
    lines.push('')
  }
  return lines.join('\n')
}