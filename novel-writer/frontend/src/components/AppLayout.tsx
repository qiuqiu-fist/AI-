import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout } from 'antd'
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
        width={260}
        style={{
          background: 'linear-gradient(180deg, #0f0d2e 0%, #1a1744 100%)',
          borderRight: 'none',
          position: 'relative',
        }}
      >
        {!collapsed && (
          <div style={{
            padding: '20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 16, position: 'relative',
            }}>
              <span>作</span>
              <div style={{
                width: 10, height: 10, background: '#10b981',
                border: '2px solid #1a1744', borderRadius: '50%',
                position: 'absolute', bottom: -2, right: -2,
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>创作者</div>
              <div style={{ color: '#9b97c4', fontSize: 12 }}>今日已写 0 字</div>
            </div>
          </div>
        )}
        <div style={{ padding: '8px 0' }}>
          {menuItems.map(item => {
            const isSelected = selectedKey === item.key
            return (
              <div
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '12px 0' : '12px 24px',
                  cursor: 'pointer',
                  color: isSelected ? '#c7d2fe' : '#9b97c4',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))'
                    : 'transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  fontSize: 14,
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = '#e0e0ff'
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#9b97c4'
                  }
                }}
              >
                {isSelected && !collapsed && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3, height: 20,
                    background: '#6366f1',
                    borderRadius: '0 3px 3px 0',
                  }} />
                )}
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            )
          })}
        </div>
        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8,
          }}>
            {[
              { value: '0', label: '项目' },
              { value: '0', label: '章节' },
              { value: '0', label: '字数' },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, padding: 8, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', textAlign: 'center',
              }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{stat.value}</div>
                <div style={{ color: '#9b97c4', fontSize: 10 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </Sider>
      <Layout>
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}