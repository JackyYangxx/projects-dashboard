// Agent Web Worker Manager — singleton lifecycle for the code-review agent worker.
// Worker has its own message channel; all message types share it.
//
// Types are imported from ./messageTypes when available (Task 4 deliverable).
// If that module is not yet present, minimal local placeholders are used so this
// file type-checks in isolation. Once messageTypes.ts lands, the real types will
// take over via a single import update.

// Minimal local placeholders (replaced when ./messageTypes is available)
type WorkerInMessage = Record<string, unknown>
type WorkerOutMessage = { type: string; [key: string]: unknown }

type MessageHandler = (msg: WorkerOutMessage) => void

let worker: Worker | null = null
let handlers: Set<MessageHandler> = new Set()
let pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void }> = new Map()

function createWorker(): Worker {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

  w.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
    const msg = event.data
    // Handle DB request responses
    if (msg.type === 'agent:db-response' || msg.type === 'agent:db-batch-done') {
      const dbMsg = msg as WorkerOutMessage & { requestId: string; result?: unknown; error?: string }
      const pending = pendingRequests.get(dbMsg.requestId)
      if (pending) {
        pendingRequests.delete(dbMsg.requestId)
        if (msg.type === 'agent:db-batch-done' && dbMsg.error) {
          pending.reject(new Error(dbMsg.error))
        } else {
          pending.resolve(msg.type === 'agent:db-response' ? dbMsg.result : undefined)
        }
      }
      return
    }
    // Forward to registered handlers
    handlers.forEach(h => h(msg))
  }

  w.onerror = (event: ErrorEvent) => {
    console.error('[AgentWorker] Worker error:', event.error)
    handlers.forEach(h =>
      h({ type: 'agent:error', taskId: '', error: event.error?.message || 'Unknown worker error' })
    )
    // Reconnect: terminate the broken worker and recreate
    try { w.terminate() } catch {}
    if (worker === w) {
      worker = null
      worker = createWorker()
    }
  }

  return w
}

export function initAgentWorker(): Worker {
  if (worker) return worker
  worker = createWorker()
  return worker
}

export function getAgentWorker(): Worker | null {
  return worker
}

export function sendToWorker(msg: WorkerInMessage): void {
  worker?.postMessage(msg)
}

export function subscribeToWorker(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function terminateAgentWorker(): void {
  worker?.terminate()
  worker = null
  handlers.clear()
  pendingRequests.clear()
}
