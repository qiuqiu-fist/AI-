import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  ApiOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/books', icon: <BookOutlined />, label: '我的项目' },
  { key: '/providers', icon: <ApiOutlined />, label: 'AI 来源' },
  { key: '/history', icon: <HistoryOutlined />, label: '生成历史' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const selectedKey = '/' + location.pathname.split('/')[1]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={200}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold',
          color: '#1677ff',
          borderBottom: '1px solid #f0f0f0',
        }}>
          {collapsed ? 'NW' : 'Novel Writer'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}