import { useEffect, useState } from 'react'
import { Button, Popconfirm, Space, Table, Typography, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import {
  Document,
  deleteDocument,
  ingestFile,
  listDocuments,
  updateDocument,
} from '../api/client'

const { Dragger } = Upload

export default function UploadPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    try {
      setDocs(await listDocuments())
    } catch (e) {
      // 后端未启动时静默
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleUpload = async (file: File) => {
    setLoading(true)
    try {
      const res = await ingestFile(file)
      message.success(`导入成功：${res.filename}（${res.chunk_count} 个切片）`)
      await refresh()
    } catch (e: any) {
      message.error(`导入失败：${e?.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
    return false
  }

  const handleUpdate = async (id: number, file: File) => {
    setLoading(true)
    try {
      const res = await updateDocument(id, file)
      message.success(`已更新：${res.filename}（${res.chunk_count} 个切片）`)
      await refresh()
    } catch (e: any) {
      message.error(`更新失败：${e?.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
    return false
  }

  const handleDelete = async (id: number) => {
    setLoading(true)
    try {
      await deleteDocument(id)
      message.success('已删除')
      await refresh()
    } catch (e: any) {
      message.error(`删除失败：${e?.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: '文件名', dataIndex: 'filename' },
    { title: '切片数', dataIndex: 'chunk_count' },
    { title: '导入时间', dataIndex: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Document) => (
        <Space>
          <Upload accept=".txt,.md" showUploadList={false} beforeUpload={(f) => handleUpdate(record.id, f)}>
            <Button size="small" type="link">
              更新
            </Button>
          </Upload>
          <Popconfirm title="确定删除该文档？其切片也会一并清除" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            导入资料
          </Typography.Title>
          <Typography.Text type="secondary">
            支持 .txt / .md 文件，上传后自动解析、切片、向量化入库
          </Typography.Text>
        </div>
        <Dragger accept=".txt,.md" showUploadList={false} beforeUpload={handleUpload} disabled={loading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">单个或多个 .txt / .md 文件</p>
        </Dragger>
        <Table rowKey="id" dataSource={docs} columns={columns} loading={loading} pagination={false} />
      </div>
    </div>
  )
}
