import initSqlJs, { Database } from 'sql.js'
import { seedProjects } from '../data/seedData'

let db: Database | null = null
let dbPromise: Promise<Database> | null = null
let seeded = false

export async function initDatabase(): Promise<Database> {
  // Return existing promise if already initializing
  if (dbPromise) return dbPromise

  dbPromise = doInitDatabase()
  return dbPromise
}

async function doInitDatabase(): Promise<Database> {
  if (db) return db

  console.log('[DB] Loading WASM...')

  let wasmBinary: ArrayBuffer | undefined
  if (window.electronAPI?.getWasmBinary) {
    try {
      console.log('[DB] Using IPC to get WASM binary')
      const binary = await window.electronAPI.getWasmBinary()
      const uint8 = new Uint8Array(binary)
      wasmBinary = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)
      console.log('[DB] WASM loaded via IPC, binary size:', wasmBinary.byteLength)
    } catch (err) {
      console.warn('[DB] IPC wasm load failed, falling back to fetch:', err)
    }
  }
  if (!wasmBinary) {
    console.log('[DB] Using fetch for WASM')
    const wasmUrl = window.location.origin + '/sql-wasm.wasm'
    const wasmResponse = await fetch(wasmUrl)
    wasmBinary = await wasmResponse.arrayBuffer()
    console.log('[DB] WASM loaded via fetch, binary size:', wasmBinary.byteLength)
  }

  const SQL = await initSqlJs({ wasmBinary })
  console.log('[DB] SQL.js initialized')

  // Try to load existing database from disk
  let savedBuffer: Uint8Array | null = null
  if (window.electronAPI?.loadDatabase) {
    try {
      const loaded = await window.electronAPI.loadDatabase()
      if (loaded) {
        savedBuffer = new Uint8Array(loaded)
        console.log('[DB] Loaded saved database from disk, size:', savedBuffer.byteLength)
      }
    } catch (err) {
      console.warn('[DB] Failed to load saved database:', err)
    }
  }

  db = savedBuffer ? new SQL.Database(savedBuffer) : new SQL.Database()
  console.log('[DB] Database created' + (savedBuffer ? ' (from disk)' : ' (in-memory)'))

  // Create projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT '',
      name TEXT NOT NULL,
      product_line TEXT DEFAULT '',
      status TEXT DEFAULT 'ongoing',
      tag TEXT DEFAULT '',
      total_amount REAL DEFAULT 0,
      used_amount REAL DEFAULT 0,
      progress INTEGER DEFAULT 0,
      sub_progress TEXT DEFAULT '{}',
      notes TEXT DEFAULT '',
      note_history TEXT DEFAULT '[]',
      team TEXT DEFAULT '[]',
      scope TEXT DEFAULT '[]',
      milestones TEXT DEFAULT '[]',
      timeline TEXT DEFAULT '[]',
      leader TEXT DEFAULT '',
      repositories TEXT DEFAULT '[]',
      ext1 TEXT DEFAULT '',
      ext2 TEXT DEFAULT '',
      ext3 TEXT DEFAULT '',
      ext4 TEXT DEFAULT '',
      ext5 TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    )
  `)
  console.log('[DB] Table created')

  // Migration: convert old repository/branch columns to repositories JSON array
  try {
    const colCheck = db.exec("PRAGMA table_info(projects)")
    const columnNames = colCheck[0]?.values.map((row) => row[1] as string) || []
    if (columnNames.includes('repository') && !columnNames.includes('repositories')) {
      console.log('[DB] Migrating repository/branch to repositories JSON array...')
      db.run("ALTER TABLE projects ADD COLUMN repositories TEXT DEFAULT '[]'")
      const oldRows = db.exec("SELECT id, repository, branch FROM projects")
      for (const row of oldRows[0]?.values || []) {
        const [rid, oldRepo, oldBranch] = row as [string, string, string]
        const repos = oldRepo
          ? JSON.stringify([{ id: crypto.randomUUID(), url: oldRepo, branch: oldBranch || 'main' }])
          : '[]'
        db.run("UPDATE projects SET repositories = ? WHERE id = ?", [repos, rid])
      }
      console.log('[DB] Migration complete')
    }
  } catch (err) {
    console.error('[DB] Migration failed:', err)
  }

  // Create mcp_services table
  db.run(`
    CREATE TABLE IF NOT EXISTS mcp_services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      auth_header TEXT DEFAULT '',
      tools TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    )
  `)

  // Create skills table
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    )
  `)

  // Create code_reviews table
  db.run(`
    CREATE TABLE IF NOT EXISTS code_reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      file_path TEXT DEFAULT '',
      line_range TEXT DEFAULT '',
      ai_trace TEXT DEFAULT '',
      created_at TEXT
    )
  `)

  // Create llm_config table
  db.run(`
    CREATE TABLE IF NOT EXISTS llm_config (
      id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      model_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      api_type TEXT DEFAULT 'anthropic',
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    )
  `)

  // Migration: add api_type column to existing llm_config rows (idempotent)
  try {
    db.run(`ALTER TABLE llm_config ADD COLUMN api_type TEXT DEFAULT 'anthropic'`)
  } catch {
    // Column already exists — safe to ignore on re-init.
  }

  // Create mr_review_records table
  db.run(`
    CREATE TABLE IF NOT EXISTS mr_review_records (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      mr_id TEXT NOT NULL,
      mr_title TEXT NOT NULL,
      mr_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      diff TEXT DEFAULT '',
      issues TEXT DEFAULT '[]',
      reviewed_at TEXT,
      created_at TEXT
    )
  `)

  // Migration: add diff column to existing tables (idempotent)
  try {
    db.run(`ALTER TABLE mr_review_records ADD COLUMN diff TEXT DEFAULT ''`)
  } catch {
    // SQLite throws "duplicate column name" when column already exists; safe to ignore on re-init.
  }

  // Create review_reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS review_reports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_ids TEXT NOT NULL,
      total_mr_count INTEGER DEFAULT 0,
      total_issue_count INTEGER DEFAULT 0,
      issues_preview TEXT DEFAULT '',
      created_at TEXT
    )
  `)

  // Create budget_sources table
  db.run(`
    CREATE TABLE IF NOT EXISTS budget_sources (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      label TEXT NOT NULL,
      amount REAL DEFAULT 0,
      used_amount REAL DEFAULT 0,
      date TEXT DEFAULT '',
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Migration: add task_id column to mr_review_records (idempotent)
  try {
    db.run('ALTER TABLE mr_review_records ADD COLUMN task_id TEXT')
  } catch {
    // Column already exists — safe to ignore on re-init.
  }

  // Create agent_rules table
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      examples_good TEXT DEFAULT '[]',
      examples_bad TEXT DEFAULT '[]',
      severity TEXT NOT NULL DEFAULT 'warning',
      scope TEXT NOT NULL DEFAULT 'global',
      project_id TEXT,
      file_patterns TEXT DEFAULT '[]',
      match_patterns TEXT DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Create agent_memories table
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT DEFAULT '',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      project_id TEXT,
      file_pattern TEXT,
      source_review_id TEXT,
      occurrence_count INTEGER DEFAULT 1,
      confidence REAL DEFAULT 0.5,
      last_accessed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Create review_tasks table
  db.run(`
    CREATE TABLE IF NOT EXISTS review_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      phase TEXT,
      progress REAL DEFAULT 0,
      total_mr_count INTEGER DEFAULT 0,
      completed_mr_count INTEGER DEFAULT 0,
      total_issue_count INTEGER DEFAULT 0,
      summary TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Create agent_reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_reports (
      id TEXT PRIMARY KEY,
      time_range_start TEXT NOT NULL,
      time_range_end TEXT NOT NULL,
      project_ids TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      stats_json TEXT DEFAULT '{}',
      top_issues_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Load seed data if database is empty
  if (!seeded) {
    const result = db.exec('SELECT COUNT(*) as count FROM projects')
    const count = result[0]?.values[0]?.[0] as number || 0
    console.log('[DB] Current project count:', count, 'seeded flag:', seeded)

    if (count === 0 && !savedBuffer) {
      console.log('[DB] Seeding', seedProjects.length, 'projects...')
      const now = new Date().toISOString()
      for (const project of seedProjects) {
        db.run(
          `INSERT INTO projects (
            id, project_id, name, product_line, status, tag, total_amount, used_amount,
            progress, sub_progress, notes, note_history, team, scope, milestones, timeline, leader, repositories, ext1, ext2, ext3, ext4, ext5, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            project.projectId || '',
            project.name,
            project.productLine,
            project.status,
            JSON.stringify(project.tags || []),
            project.totalAmount,
            project.usedAmount,
            project.progress,
            JSON.stringify(project.subProgress),
            project.notes,
            JSON.stringify(project.noteHistory || []),
            JSON.stringify(project.team),
            JSON.stringify(project.scope),
            JSON.stringify(project.milestones || []),
            JSON.stringify(project.timeline),
            project.leader,
            JSON.stringify(project.repositories || []),
            '',
            '',
            '',
            '',
            '',
            now,
            now,
          ]
        )
        console.log('[DB] Inserted:', project.name)
      }
      console.log('[DB] Seed complete, seeded flag set to true')
      persistDatabase()
    } else {
      console.log('[DB] Skipping seed, count != 0')
    }

    // Seed built-in agent rules if table is empty
    const ruleCountResult = db.exec('SELECT COUNT(*) as c FROM agent_rules')
    const ruleCount = (ruleCountResult[0]?.values[0]?.[0] as number) || 0
    if (ruleCount === 0) {
      console.log('[DB] Seeding built-in agent rules...')
      const builtinRules = [
        { name: '避免 any 类型', severity: 'warning', category: '通用', content: '使用具体的 TypeScript 类型而非 any。any 类型会绕过类型检查，导致潜在的类型错误。', matchPatterns: [':\\s*any\\b'], filePatterns: ['*.ts', '*.tsx'], examplesGood: ['const user: User = fetchUser()'], examplesBad: ['const user: any = fetchUser()'] },
        { name: '避免 dangerouslySetInnerHTML', severity: 'critical', category: '通用', content: '直接使用 dangerouslySetInnerHTML 或 innerHTML 赋值可能导致 XSS 攻击。使用 React 安全渲染或 DOMPurify。', matchPatterns: ['dangerouslySetInnerHTML', '\\.innerHTML\\s*='], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['<div>{userContent}</div>', '<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />'], examplesBad: ['document.getElementById(\'content\').innerHTML = userInput', '<div dangerouslySetInnerHTML={{ __html: userInput }} />'] },
        { name: '避免 eval()/new Function()', severity: 'critical', category: '通用', content: '使用 eval() 或 new Function() 执行动态代码存在严重安全风险（代码注入）。', matchPatterns: ['eval\\(.*\\)', 'new Function\\('], filePatterns: ['*.ts', '*.tsx', '*.js', '*.jsx'], examplesGood: ['const result = JSON.parse(data)'], examplesBad: ['const result = eval("(" + data + ")")'] },
        { name: 'useEffect 缺少依赖项或未清理', severity: 'warning', category: '通用', content: 'useEffect 应声明所有依赖项，并在需要时返回 cleanup 函数。缺少依赖项可能导致使用过期闭包值，缺少 cleanup 可能导致内存泄漏。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['useEffect(() => { const id = setInterval(fn, 1000); return () => clearInterval(id); }, [fn])'], examplesBad: ['useEffect(() => { fetchData() }) // 无依赖数组，每次渲染都执行'] },
        { name: '循环/条件中调用 Hooks', severity: 'critical', category: '通用', content: 'React Hooks 必须在组件顶层调用，不能在条件语句、循环或嵌套函数中使用。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['const [count, setCount] = useState(0); if (count > 0) { /* ... */ }'], examplesBad: ['if (condition) { const [count, setCount] = useState(0) }'] },
        { name: '大列表未使用虚拟滚动', severity: 'suggestion', category: 'PC Web', content: '渲染超过 500 项的列表时应使用虚拟滚动，避免创建大量 DOM 节点导致性能问题。', matchPatterns: ['\\.map\\(.*=>'], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['<VirtualList items={data} itemHeight={40} />'], examplesBad: ['{data.map(item => <Row key={item.id} {...item} />)} // data 可能有 1000+ 项'] },
        { name: '图片未设置懒加载', severity: 'suggestion', category: 'PC Web', content: '图片应设置 loading="lazy" 以延迟加载视口外的图片，减少初始页面加载时间。', matchPatterns: ['<img(?!.*loading=)'], filePatterns: ['*.tsx', '*.jsx', '*.html'], examplesGood: ['<img src={url} alt="..." loading="lazy" />'], examplesBad: ['<img src={url} alt="..." />'] },
        { name: '未处理接口竞态', severity: 'warning', category: 'PC Web', content: '在 useEffect 中发起异步请求时，应使用 AbortController 或 cleanup flag 取消请求，避免组件卸载后更新状态。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['useEffect(() => { const ctrl = new AbortController(); fetch(url, { signal: ctrl.signal }).then(setData); return () => ctrl.abort() }, [])'], examplesBad: ['useEffect(() => { fetch(url).then(setData) }, [])'] },
        { name: '未使用 ResizeObserver', severity: 'warning', category: '大屏', content: '大屏场景下应使用 ResizeObserver 监听容器尺寸变化，而非 window.resize 事件，以获得更精确的尺寸响应。', matchPatterns: [], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['const observer = new ResizeObserver(entries => { /* update size */ }); observer.observe(containerRef.current)'], examplesBad: ['window.addEventListener(\'resize\', handleResize)'] },
        { name: '动画帧性能隐患', severity: 'suggestion', category: '大屏', content: 'requestAnimationFrame 中的回调应保持轻量。嵌套或连续的 rAF 可能导致主线程阻塞。', matchPatterns: ['requestAnimationFrame'], filePatterns: ['*.tsx', '*.tsx', '*.js'], examplesGood: ['const animate = () => { /* single lightweight update */; rafId = requestAnimationFrame(animate) }'], examplesBad: ['requestAnimationFrame(() => { requestAnimationFrame(() => { /* heavy work */ }) })'] },
        { name: '图表未按需加载', severity: 'suggestion', category: '大屏', content: 'ECharts 等大型图表库应动态导入（React.lazy + Suspense），减少首屏 JS bundle 体积。', matchPatterns: ['import.*echarts', 'import.*chart'], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['const Chart = React.lazy(() => import(\'./Chart\'))'], examplesBad: ['import * as echarts from \'echarts\' // 顶层静态导入'] },
        { name: '未使用 touch 事件兼容', severity: 'warning', category: '移动', content: '移动端应同时处理 click 和 touch 事件，仅使用 click 会有 300ms 延迟。使用 onTouchEnd 或 CSS touch-action。', matchPatterns: ['onClick(?!.*onTouch)'], filePatterns: ['*.tsx', '*.jsx'], examplesGood: ['<button onClick={fn} onTouchEnd={fn}>...</button>'], examplesBad: ['<button onClick={fn}>...</button> // 移动端 300ms 延迟'] },
        { name: 'viewport 设置不当', severity: 'warning', category: '移动', content: '应正确设置 viewport meta 标签以支持响应式布局，避免固定宽度导致横滚。', matchPatterns: ['<meta.*viewport'], filePatterns: ['*.html', '*.tsx'], examplesGood: ['<meta name="viewport" content="width=device-width, initial-scale=1.0" />'], examplesBad: ['<meta name="viewport" content="width=1024" />'] },
        { name: '点击区域 < 44x44px', severity: 'suggestion', category: '移动', content: '移动端可点击元素的最小尺寸应为 44x44px（iOS HIG），过小的点击区域降低可用性。', matchPatterns: [], filePatterns: ['*.css', '*.scss', '*.tsx'], examplesGood: ['.btn { min-width: 44px; min-height: 44px }'], examplesBad: ['.btn { width: 24px; height: 24px }'] },
        { name: '敏感数据存 localStorage', severity: 'warning', category: '安全', content: '不应将 token、密码、个人信息等敏感数据存储在 localStorage 中，因其可被 XSS 攻击读取。', matchPatterns: ['localStorage\\.setItem'], filePatterns: ['*.ts', '*.tsx', '*.js'], examplesGood: ['// 使用 httpOnly cookie 存储 token'], examplesBad: ['localStorage.setItem(\'token\', userToken)'] },
        { name: '第三方脚本未 SRI', severity: 'suggestion', category: '安全', content: '加载第三方 CDN 脚本时应添加 integrity 属性（Subresource Integrity），防止 CDN 被篡改。', matchPatterns: ['<script.*src=(?!.*integrity)'], filePatterns: ['*.html'], examplesGood: ['<script src="..." integrity="sha384-..." crossorigin="anonymous"></script>'], examplesBad: ['<script src="https://cdn.example.com/lib.js"></script>'] },
      ]

      for (const rule of builtinRules) {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        db.run(
          `INSERT INTO agent_rules (id, name, description, content, examples_good, examples_bad, severity, scope, file_patterns, match_patterns, enabled, is_builtin, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'global', ?, ?, 1, 1, ?, ?)`,
          [id, rule.name, '', rule.content, JSON.stringify(rule.examplesGood), JSON.stringify(rule.examplesBad), rule.severity, JSON.stringify(rule.filePatterns), JSON.stringify(rule.matchPatterns), now, now]
        )
      }
      console.log('[DB] Built-in agent rules seeded:', builtinRules.length)
      persistDatabase()
    } else {
      console.log('[DB] Skipping agent rules seed, count:', ruleCount)
    }

    seeded = true
  } else {
    console.log('[DB] Skipping seed, already seeded')
  }

  // Migrate projects without budget_sources: create a default source from totalAmount/usedAmount
  const existingProjects = db.exec('SELECT id, total_amount, used_amount FROM projects')
  const existingSources = db.exec('SELECT DISTINCT project_id FROM budget_sources')
  const projectsWithSources = new Set((existingSources[0]?.values || []).map(row => row[0] as string))
  const projectRows = existingProjects[0]?.values || []

  for (const row of projectRows) {
    const projectId = row[0] as string
    const totalAmount = row[1] as number
    const usedAmount = row[2] as number

    if (!projectsWithSources.has(projectId)) {
      const now = new Date().toISOString()
      db.run(`
        INSERT INTO budget_sources (id, project_id, label, amount, used_amount, date, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), projectId, '默认来源', totalAmount || 0, usedAmount || 0, now.slice(0, 10), null, now, now])
    }
  }

  // Verify
  const verifyResult = db.exec('SELECT COUNT(*) as count FROM projects')
  const verifyCount = verifyResult[0]?.values[0]?.[0] as number || 0
  console.log('[DB] Final project count:', verifyCount)

  return db
}

export function getDatabase(): Database | null {
  return db
}

export function persistDatabase(): void {
  if (!db || !window.electronAPI?.saveDatabase) return
  try {
    const data = db.export()
    window.electronAPI.saveDatabase(Array.from(data))
    console.log('[DB] Database persisted to disk')
  } catch (err) {
    console.error('[DB] Failed to persist database:', err)
  }
}

export type { Database }
