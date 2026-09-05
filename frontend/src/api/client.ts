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

export async function checkHealth() {
  const { data } = await client.get('/health')
  return data
}
