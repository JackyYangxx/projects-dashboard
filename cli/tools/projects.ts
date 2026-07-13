import { findAll, findById, findByName, create, update, remove } from '../dao/projectDao'
import type { CreateProjectInput } from '../dao/projectDao'

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

function ok(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

function err(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}

export async function handleList(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const projects = findAll({
      status: args.status as string | undefined,
      productLine: args.productLine as string | undefined,
      search: args.search as string | undefined,
    })
    return ok(projects)
  } catch (e) {
    return err(e instanceof Error ? e.message : '查询项目列表失败')
  }
}

export async function handleGet(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    let project: ReturnType<typeof findById>
    if (args.id) {
      project = findById(args.id as string)
    } else if (args.name) {
      project = findByName(args.name as string)
    } else {
      return err('请提供 id 或 name 参数')
    }
    if (!project) return err('项目不存在')
    return ok(project)
  } catch (e) {
    return err(e instanceof Error ? e.message : '查询项目失败')
  }
}

export async function handleCreate(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const missing: string[] = []
    if (!args.name) missing.push('name')
    if (!args.productLine) missing.push('productLine')
    if (!args.leader) missing.push('leader')
    if (missing.length > 0) {
      return err(`缺少必填字段: ${missing.join(', ')}`)
    }

    const input: CreateProjectInput = {
      name: args.name as string,
      productLine: args.productLine as string,
      leader: args.leader as string,
      status: args.status as string | undefined,
      progress: args.progress as number | undefined,
      totalAmount: args.totalAmount as number | undefined,
      usedAmount: args.usedAmount as number | undefined,
      tags: args.tags as string[] | undefined,
      projectId: args.projectId as string | undefined,
      repositories: args.repositories as CreateProjectInput['repositories'],
      notes: args.notes as string | undefined,
    }

    const project = create(input)
    return ok(project)
  } catch (e) {
    return err(e instanceof Error ? e.message : '创建项目失败')
  }
}

export async function handleUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    if (!args.id) return err('缺少 id 参数')

    const { id, ...updates } = args
    const project = update(id as string, updates as Record<string, unknown>)
    return ok(project)
  } catch (e) {
    return err(e instanceof Error ? e.message : '更新项目失败')
  }
}

export async function handleDelete(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    if (!args.id) return err('缺少 id 参数')
    remove(args.id as string)
    return ok({ success: true })
  } catch (e) {
    return err(e instanceof Error ? e.message : '删除项目失败')
  }
}
