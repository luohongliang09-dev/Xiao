import { Layout, Menu } from 'antd'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Upload from './pages/Upload'
import Chat from './pages/Chat'

const { Header, Content } = Layout

function App() {
  const location = useLocation()
  const selected = location.pathname.startsWith('/chat') ? 'chat' : 'upload'
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginRight: 32, fontSize: 18, whiteSpace: 'nowrap' }}>
          RAG 知识库问答
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selected]}
          items={[
            { key: 'upload', label: <Link to="/">导入资料</Link> },
            { key: 'chat', label: <Link to="/chat">智能问答</Link> },
          ]}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ flex: 1, minHeight: 0 }}>
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </Layout>
  )
}

export default App
