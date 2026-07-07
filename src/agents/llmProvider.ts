// src/agents/llmProvider.ts — LLM Provider abstraction for the code-review agent

export interface ChatParams {
  systemPrompt: string
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
}

export interface ChatResponse {
  content: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface LLMProvider {
  chat(params: ChatParams): Promise<ChatResponse>
  estimateTokens(text: string): number
}

/**
 * Estimate token count for mixed-language text.
 * English/code: ~4 chars per token; Chinese: ~1.5 chars per token (each char is denser).
 */
function estimateMixedTokens(text: string): number {
  if (!text) return 0
  let enChars = 0
  let zhChars = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    // CJK Unified Ideographs (incl. Extension A blocks commonly used)
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      zhChars++
    } else {
      enChars++
    }
  }
  return Math.ceil(enChars / 4 + zhChars / 1.5)
}

export class OpenAIProvider implements LLMProvider {
  constructor(private config: { modelUrl: string; apiKey: string; modelName: string }) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    const messages = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ]
    let res: Response
    try {
      res = await fetch(this.config.modelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages,
          max_tokens: params.maxTokens,
          temperature: 0.1,
        }),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'network error'
      throw new Error(`OpenAI request failed: ${msg}`)
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`OpenAI API error ${res.status}: ${errBody.slice(0, 200)}`)
    }
    const data = await res.json()
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  }

  estimateTokens(text: string): number {
    return estimateMixedTokens(text)
  }
}

export class AnthropicProvider implements LLMProvider {
  constructor(private config: { modelUrl: string; apiKey: string; modelName: string }) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    let res: Response
    try {
      res = await fetch(this.config.modelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.modelName,
          system: params.systemPrompt,
          messages: params.messages,
          max_tokens: params.maxTokens || 4096,
          temperature: 0.1,
        }),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'network error'
      throw new Error(`Anthropic request failed: ${msg}`)
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 200)}`)
    }
    const data = await res.json()
    return {
      content: data.content?.[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    }
  }

  estimateTokens(text: string): number {
    return estimateMixedTokens(text)
  }
}

export class MockProvider implements LLMProvider {
  async chat(params: ChatParams): Promise<ChatResponse> {
    // Deterministic regex-based mock: same input -> same output.
    const lastMsg = params.messages[params.messages.length - 1]?.content || ''
    const hasInnerHTML = /\.innerHTML\s*=|dangerouslySetInnerHTML/.test(lastMsg)
    const hasAny = /:\s*any\b/.test(lastMsg)
    const hasEval = /eval\(/.test(lastMsg)

    const issues: Array<Record<string, string>> = []
    if (hasInnerHTML) {
      issues.push({
        severity: 'critical',
        title: '避免直接使用 innerHTML/dangerouslySetInnerHTML',
        description: '可能导致 XSS 攻击，应使用 DOMPurify 或 React 安全渲染',
        filePath: 'unknown',
        codeSnippet: lastMsg.slice(0, 100),
      })
    }
    if (hasAny) {
      issues.push({
        severity: 'warning',
        title: '避免使用 any 类型',
        description: '应使用具体类型以利用 TypeScript 类型检查',
        filePath: 'unknown',
        codeSnippet: lastMsg.slice(0, 100),
      })
    }
    if (hasEval) {
      issues.push({
        severity: 'critical',
        title: '避免使用 eval()',
        description: 'eval() 存在代码注入风险',
        filePath: 'unknown',
        codeSnippet: lastMsg.slice(0, 100),
      })
    }

    return {
      content: JSON.stringify(issues),
      usage: { promptTokens: 1000, completionTokens: 200, totalTokens: 1200 },
    }
  }

  estimateTokens(text: string): number {
    return estimateMixedTokens(text)
  }
}

export interface LLMProviderConfig {
  modelUrl: string
  apiKey: string
  modelName: string
  apiType: 'openai' | 'anthropic' | 'mock'
}

export function getProviderByApiType(apiType: 'openai' | 'anthropic' | 'mock', config: LLMProviderConfig): LLMProvider {
  if (apiType === 'anthropic') return new AnthropicProvider(config)
  if (apiType === 'mock') return new MockProvider()
  return new OpenAIProvider(config)
}