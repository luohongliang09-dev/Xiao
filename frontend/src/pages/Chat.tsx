import { useEffect, useRef, useState } from 'react'
import { Button, Card, Input, Space, Spin, Tag, Typography } from 'antd'
import { askQuestion } from '../api/client'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await askQuestion(q)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `出错了：${e?.response?.data?.detail || e.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {messages.length === 0 && (
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 80 }}>
            在下方输入问题，我会基于你导入的资料回答
          </Typography.Paragraph>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Card
              style={{
                maxWidth: '80%',
                background: m.role === 'user' ? '#e6f4ff' : '#fff',
              }}
              styles={{ body: { padding: 12 } }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              {m.sources && m.sources.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {m.sources.map((s) => (
                    <Tag key={s} color="blue">
                      来源：{s}
                    </Tag>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ))}
        {loading && <Spin style={{ marginLeft: 12 }} />}
        <div ref={bottomRef} />
      </div>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={send}
          placeholder="输入你的问题…"
          disabled={loading}
        />
        <Button type="primary" onClick={send} loading={loading}>
          发送
        </Button>
      </Space.Compact>
    </div>
  )
}
