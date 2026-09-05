import { CSSProperties, useEffect, useRef, useState } from 'react'
import { Button, Card, Input, Space, Spin, Tag, Typography } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { askQuestionStream } from '../api/client'
import { CommanderAvatar, ShipGirlAvatar } from '../components/PixelAvatar'

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

const STORAGE_KEY = 'rag_chat_history'

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Msg[]) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        // 过滤掉尚未生成内容的空占位消息，并防抖写入
        const cleaned = messages.filter((m) => m.content !== '')
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
      } catch {
        // 存储失败时忽略
      }
    }, 300)
    return () => clearTimeout(t)
  }, [messages])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    // 先加入用户消息 + 空的助手占位气泡
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }])
    setLoading(true)

    let acc = ''

    const patchLast = (fn: (last: Msg) => Msg) => {
      setMessages((m) => {
        const copy = [...m]
        const last = copy[copy.length - 1]
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = fn(last)
        }
        return copy
      })
    }

    try {
      await askQuestionStream(q, history, {
        onDelta: (text) => {
          acc += text
          patchLast((last) => ({ ...last, content: acc }))
        },
        onSources: (s) => {
          patchLast((last) => ({ ...last, sources: s }))
        },
        onDone: () => {},
        onError: (msg) => {
          patchLast((last) => ({ ...last, content: last.content || `出错了：${msg}` }))
        },
      })
    } catch (e: any) {
      patchLast((last) => ({
        ...last,
        content: last.content || `出错了：${e?.message || e}`,
      }))
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setMessages([])
    setInput('')
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
        <div className="transparent-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, minHeight: 0 }}>
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
                gap: 10,
                alignItems: 'flex-start',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {m.role === 'user' ? <CommanderAvatar /> : <ShipGirlAvatar />}
              <Card
                style={{
                  maxWidth: 'calc(100% - 54px)',
                  ...glass(m.role === 'user' ? 'rgba(230,244,255,0.7)' : 'rgba(255,255,255,0.75)'),
                }}
                styles={{ body: { padding: 12 } }}
              >
                <div className="md-content">
                  {m.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{m.content}</ReactMarkdown>
                  ) : (
                    <Spin size="small" />
                  )}
                </div>
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
          <div ref={bottomRef} />
        </div>
        <div
          style={{
            ...glass('rgba(255,255,255,0.55)'),
            padding: 8,
            borderRadius: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          <Button onClick={clear} disabled={messages.length === 0 || loading}>
            清空
          </Button>
          <Space.Compact style={{ flex: 1 }}>
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
