import { Server } from '@modelcontextprotocol/sdk/server/index'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Result,
} from '@modelcontextprotocol/sdk/types'
import { handleList, handleGet, handleCreate, handleUpdate, handleDelete } from './tools/projects'
import { closeDatabase } from './db'

const server = new Server(
  {
    name: 'projects-dashboard',
    version: '1.0.33',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'projects:list',
      description: '查询项目列表。可按状态、产品线过滤，或按名称搜索。',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ongoing', 'completed', 'paused'], description: '按状态过滤' },
          productLine: { type: 'string', description: '按产品线过滤' },
          search: { type: 'string', description: '按项目名称模糊搜索' },
        },
      },
    },
    {
      name: 'projects:get',
      description: '获取单个项目。通过 id 或 name 查找，id 优先。',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '项目 ID' },
          name: { type: 'string', description: '项目名称' },
        },
      },
    },
    {
      name: 'projects:create',
      description: '创建新项目。自动从 leader 生成默认 team[0]。',
      inputSchema: {
        type: 'object',
        required: ['name', 'productLine', 'leader'],
        properties: {
          name: { type: 'string', description: '项目名称' },
          productLine: { type: 'string', description: '产品线' },
          leader: { type: 'string', description: '开发负责人' },
          status: { type: 'string', enum: ['ongoing', 'completed', 'paused'], description: '项目状态，默认 paused' },
          progress: { type: 'number', description: '整体进度 0-100，默认 0' },
          totalAmount: { type: 'number', description: '总预算' },
          usedAmount: { type: 'number', description: '已用预算' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          projectId: { type: 'string', description: '自定义项目编号' },
          repositories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                branch: { type: 'string' },
                note: { type: 'string' },
              },
            },
            description: '代码仓库列表',
          },
          notes: { type: 'string', description: '备注' },
        },
      },
    },
    {
      name: 'projects:update',
      description: '更新项目。只需传 id 和要更新的字段。',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: '项目 ID' },
          name: { type: 'string', description: '项目名称' },
          productLine: { type: 'string', description: '产品线' },
          leader: { type: 'string', description: '开发负责人' },
          status: { type: 'string', enum: ['ongoing', 'completed', 'paused'], description: '项目状态' },
          progress: { type: 'number', description: '整体进度 0-100' },
          totalAmount: { type: 'number', description: '总预算' },
          usedAmount: { type: 'number', description: '已用预算' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          notes: { type: 'string', description: '备注' },
        },
      },
    },
    {
      name: 'projects:delete',
      description: '删除项目。',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: '项目 ID' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<Result> => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'projects:list':   return handleList(args || {}) as unknown as Result
    case 'projects:get':    return handleGet(args || {}) as unknown as Result
    case 'projects:create': return handleCreate(args || {}) as unknown as Result
    case 'projects:update': return handleUpdate(args || {}) as unknown as Result
    case 'projects:delete': return handleDelete(args || {}) as unknown as Result
    default:
      return { content: [{ type: 'text' as const, text: `未知工具: ${name}` }], isError: true } as unknown as Result
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[MCP] projects-dashboard server started')
}

process.on('exit', () => closeDatabase())
process.on('SIGINT', () => { closeDatabase(); process.exit(0) })
process.on('SIGTERM', () => { closeDatabase(); process.exit(0) })

main().catch((e) => {
  console.error('[MCP] Failed to start server:', e)
  process.exit(1)
})
