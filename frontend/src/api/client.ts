import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export interface IngestResult {
  filename: string
  document_id?: number
  chunk_count: number
  error?: string
}

export interface Document {
  id: number
  filename: string
  chunk_count: number
  created_at: string
}

export interface ChatResult {
  answer: string
  sources: string[]
  contexts: string[]
}

export async function ingestFile(file: File): Promise<IngestResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/ingest', form)
  return data
}

export async function listDocuments(): Promise<Document[]> {
  const { data } = await client.get('/documents')
  return data
}

export async function deleteDocument(id: number): Promise<{ deleted: boolean }> {
  const { data } = await client.delete(`/documents/${id}`)
  return data
}

export async function updateDocument(id: number, file: File): Promise<IngestResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.put(`/documents/${id}`, form)
  return data
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function askQuestion(question: string, history?: ChatMessage[]): Promise<ChatResult> {
  const { data } = await client.post('/chat', { question, history: history ?? [] })
  return data
}

export interface StreamHandlers {
  onDelta: (text: string) => void
  onSources: (sources: string[]) => void
  onDone: () => void
  onError: (msg: string) => void
}

/** 流式问答：通过 SSE 逐字接收回答 */
export async function askQuestionStream(
  question: string,
  history: ChatMessage[],
  handlers: StreamHandlers,
): Promise<void> {
  const resp = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history: history ?? [] }),
  })

  if (!resp.ok || !resp.body) {
    let detail = `HTTP ${resp.status}`
    try {
      const j = await resp.json()
      detail = j.detail || detail
    } catch {
      // 忽略
    }
    throw new Error(detail)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        const evt = JSON.parse(payload)
        if (evt.type === 'delta') handlers.onDelta(evt.content ?? '')
        else if (evt.type === 'sources') handlers.onSources(evt.sources ?? [])
        else if (evt.type === 'done') handlers.onDone()
        else if (evt.type === 'error') handlers.onError(evt.message ?? '未知错误')
      } catch {
        // 忽略无法解析的事件
      }
    }
  }
}

export async function checkHealth() {
  const { data } = await client.get('/health')
  return data
}

export interface ModelConfig {
  base_url: string
  api_key: string
  model: string
}

export interface Settings {
  embedding: ModelConfig
  chat: ModelConfig
}

export interface TestResult {
  embedding: { ok: boolean; dim?: number; latency_ms?: number; error?: string }
  chat: { ok: boolean; latency_ms?: number; error?: string }
}

export async function getSettings(): Promise<Settings> {
  const { data } = await client.get('/settings')
  return data
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const { data } = await client.put('/settings', settings)
  return data
}

export async function testSettings(settings: Settings): Promise<TestResult> {
  const { data } = await client.post('/settings/test', settings)
  return data
}

export interface DescribeResult {
  description: string
  filename: string
  document_id?: number
  chunk_count: number
  error?: string
}

export async function describeImage(file: File): Promise<DescribeResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/vision/describe', form)
  return data
}
