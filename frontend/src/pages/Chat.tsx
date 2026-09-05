import { CSSProperties, useEffect, useRef, useState } from 'react'
import { Button, Card, Input, Space, Spin, Tag, Typography } from 'antd'
import { askQuestion } from '../api/client'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

const glass = (rgba: string): CSSProperties => ({
  background: rgba,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
})

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
    <div
      style={{
        height: '100%',
        width: '100%',
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 24px',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, minHeight: 0 }}>
          {messages.length === 0 && (
            <div
              style={{
                ...glass('rgba(255,255,255,0.6)'),
                padding: '16px 24px',
                borderRadius: 10,
                maxWidth: 420,
                margin: '60px auto 0',
                textAlign: 'center',
              }}
            >
              <Typography.Text>在下方输入问题，我会基于你导入的资料回答</Typography.Text>
            </div>
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
                  ...glass(m.role === 'user' ? 'rgba(230,244,255,0.7)' : 'rgba(255,255,255,0.75)'),
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
        <div
          style={{
            ...glass('rgba(255,255,255,0.55)'),
            padding: 8,
            borderRadius: 10,
          }}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={send}
              placeholder="输入你的问题…"
              disabled={loading}
              style={{ background: 'transparent' }}
            />
            <Button type="primary" onClick={send} loading={loading}>
              发送
            </Button>
          </Space.Compact>
        </div>
      </div>
    </div>
  )
}
