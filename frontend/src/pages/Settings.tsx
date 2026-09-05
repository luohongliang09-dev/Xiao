import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Space, Tag, Typography, message } from 'antd'
import {
  ModelConfig,
  Settings,
  TestResult,
  getSettings,
  saveSettings,
  testSettings,
} from '../api/client'

interface SectionProps {
  title: string
  desc: string
  value: ModelConfig
  onChange: (v: ModelConfig) => void
}

function ConfigSection({ title, desc, value, onChange }: SectionProps) {
  const set = (key: keyof ModelConfig, v: string) => onChange({ ...value, [key]: v })
  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        {desc}
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>Base URL（接口地址）</div>
          <Input
            value={value.base_url}
            onChange={(e) => set('base_url', e.target.value)}
            placeholder="https://api.siliconflow.cn/v1"
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>API Key</div>
          <Input.Password
            value={value.api_key}
            onChange={(e) => set('api_key', e.target.value)}
            placeholder="sk-xxx"
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13 }}>模型名</div>
          <Input
            value={value.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder="例如 BAAI/bge-m3"
          />
        </div>
      </Space>
    </Card>
  )
}

export default function SettingsPage() {
  const [embedding, setEmbedding] = useState<ModelConfig>({ base_url: '', api_key: '', model: '' })
  const [chat, setChat] = useState<ModelConfig>({ base_url: '', api_key: '', model: '' })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  useEffect(() => {
    getSettings()
      .then((s) => {
        setEmbedding(s.embedding)
        setChat(s.chat)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({ embedding, chat })
      message.success('已保存，下次问答即生效')
    } catch (e: any) {
      message.error(`保存失败：${e?.response?.data?.detail || e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    try {
      setResult(await testSettings({ embedding, chat }))
    } catch (e: any) {
      message.error(`测试失败：${e?.response?.data?.detail || e.message}`)
    } finally {
      setTesting(false)
    }
  }

  const renderStatus = (key: 'embedding' | 'chat', label: string) => {
    if (!result) return null
    const r = result[key]
    const extra = r.latency_ms != null ? ` · ${r.latency_ms}ms` : ''
    return (
      <div style={{ marginTop: 4 }}>
        <Tag color={r.ok ? 'green' : 'red'}>
          {label}：{r.ok ? `可用${extra}` : '失败'}
        </Tag>
        {!r.ok && r.error && (
          <Typography.Text type="danger" style={{ fontSize: 12, marginLeft: 4 }}>
            {r.error}
          </Typography.Text>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
        <Typography.Title level={4}>性能设置</Typography.Title>
        <Typography.Paragraph type="secondary">
          可分别更换 Embedding（向量化）与对话模型所使用的 API 和模型。保存后立即生效，无需重启。
        </Typography.Paragraph>
        <Alert
          type="warning"
          showIcon
          message="更换 Embedding 模型后，需重新导入文档（旧向量的维度不匹配）"
          style={{ marginBottom: 16 }}
        />

        <ConfigSection
          title="Embedding 模型（向量化）"
          desc="负责把文档和问题转成向量，用于检索。"
          value={embedding}
          onChange={setEmbedding}
        />
        <ConfigSection
          title="对话模型（生成回答）"
          desc="负责根据检索到的资料生成回答。"
          value={chat}
          onChange={setChat}
        />

        <Space>
          <Button type="primary" onClick={handleTest} loading={testing}>
            测试连接
          </Button>
          <Button onClick={handleSave} loading={saving}>
            保存设置
          </Button>
        </Space>

        <div style={{ marginTop: 12 }}>
          {renderStatus('embedding', 'Embedding')}
          {renderStatus('chat', '对话')}
        </div>
      </div>
    </div>
  )
}
