import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Tag, message } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  ApiOutlined,
  HistoryOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  ReadOutlined,
  EditOutlined,
  OrderedListOutlined,
} from '@ant-design/icons'
import { bookApi } from '../api/books'
import { systemApi } from '../api/system'

const { Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/books', icon: <BookOutlined />, label: '我的项目' },
  { key: '/providers', icon: <ApiOutlined />, label: 'AI 来源' },
  { key: '/history', icon: <HistoryOutlined />, label: '生成历史' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

const pageTitles: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  '/dashboard': { label: '数据概览', icon: <DashboardOutlined />, desc: '查看所有项目和创作数据的统计摘要' },
  '/books': { label: '我的项目', icon: <BookOutlined />, desc: '管理所有小说项目，从创建到完成的完整流程' },
  '/providers': { label: 'AI 来源管理', icon: <ApiOutlined />, desc: '配置 AI 写作服务提供商和模型参数' },
  '/history': { label: '生成历史', icon: <HistoryOutlined />, desc: '查看 AI 写作生成的完整记录' },
  '/settings': { label: '系统设置', icon: <SettingOutlined />, desc: '管理应用配置、模板和偏好设置' },
}

const subNavItems = [
  { key: 'list', icon: <UnorderedListOutlined />, label: '项目列表', getPath: () => '/books', isActive: (s: string[]) => s.length === 1, showLevel: 0 },
  { key: 'detail', icon: <ReadOutlined />, label: '项目总览', getPath: (id: string) => `/books/${id}`, isActive: (s: string[]) => s.length === 2, showLevel: 1 },
  { key: 'chapters', icon: <OrderedListOutlined />, label: '章节管理', getPath: (id: string) => `/books/${id}/chapters`, isActive: (s: string[]) => s.length >= 3 && s[2] === 'chapters', showLevel: 2 },
  { key: 'settings', icon: <SettingOutlined />, label: '项目设置', getPath: (id: string) => `/books/${id}/settings`, isActive: (s: string[]) => s.length >= 3 && s[2] === 'settings', showLevel: 2 },
  { key: 'themes', icon: <BookOutlined />, label: '创作设定', getPath: (id: string) => `/books/${id}/themes`, isActive: (s: string[]) => s.length >= 3 && s[2] === 'themes', showLevel: 2 },
  { key: 'editor', icon: <EditOutlined />, label: '章节编辑', getPath: (id: string) => `/books/${id}/chapters/${id}`, isActive: (s: string[]) => s.length >= 4, showLevel: 3 },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [subTitle, setSubTitle] = useState('')
  const [subTag, setSubTag] = useState('')
  const [stats, setStats] = useState({ books: '0', chapters: '0', words: '0' })

  const segments = location.pathname.split('/').filter(Boolean)
  const rootKey = '/' + segments[0]
  const currentPage = pageTitles[rootKey]
  const inSubPage = rootKey === '/books' && segments.length >= 2

  useEffect(() => {
    if (rootKey === '/books' && segments.length >= 3) {
      setSubTitle(`章节 #${segments[2]}`)
      setSubTag('三级页面')
    } else if (rootKey === '/books' && segments.length >= 2) {
      setSubTitle(`项目 #${segments[1]}`)
      setSubTag('二级页面')
    } else {
      setSubTitle('')
      setSubTag('')
    }
  }, [location.pathname])

  useEffect(() => {
    (async () => {
      try {
        const [booksResp, statusResp] = await Promise.all([
          bookApi.list(),
          systemApi.status(),
        ])
        const books = booksResp.data
        const status = statusResp.data
        setStats({
          books: String(status?.books_count || books.length),
          chapters: String(status?.chapters_count || 0),
          words: (status?.total_words || 0).toLocaleString(),
        })
      } catch {
        message.error('加载统计数据失败')
      }
    })()
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={240}
        style={{
          background: 'linear-gradient(180deg, #0f0d2e 0%, #1a1744 100%)',
          borderRight: 'none',
          position: 'relative',
        }}
      >
        {!collapsed && (
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 15, position: 'relative',
            }}>
              <span>作</span>
              <div style={{
                width: 8, height: 8, background: '#10b981',
                border: '2px solid #1a1744', borderRadius: '50%',
                position: 'absolute', bottom: -1, right: -1,
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>创作者</div>
              <div style={{ color: '#9b97c4', fontSize: 11 }}>今日已写 0 字</div>
            </div>
          </div>
        )}
        <div style={{ padding: '6px 0' }}>
          {menuItems.map(item => {
            const isSelected = rootKey === item.key
            return (
              <div key={item.key}>
                <div
                  onClick={() => navigate(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: collapsed ? '10px 0' : '9px 20px',
                    cursor: 'pointer',
                    color: isSelected ? '#c7d2fe' : '#9b97c4',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))'
                      : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    fontSize: 13,
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
                      width: 3, height: 16,
                      background: '#6366f1',
                      borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                  {isSelected && !collapsed && inSubPage && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 10,
                      color: '#a5b4fc', opacity: 0.7,
                    }}>
                      · 子页面
                    </span>
                  )}
                </div>

                {isSelected && !collapsed && inSubPage && (
                  <div style={{
                    padding: '2px 0 4px 44px',
                    display: 'flex', flexDirection: 'column', gap: 1,
                  }}>
                    {subNavItems.map(sub => {
                      const showItem = segments.length > sub.showLevel
                      if (!showItem) return null
                      const isSubActive = sub.isActive(segments)
                      const bookSegment = segments[1]
                      return (
                        <div
                          key={sub.key}
                          onClick={() => {
                            const p = sub.getPath(bookSegment)
                            navigate(p)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                            fontSize: 12,
                            color: isSubActive ? '#c7d2fe' : '#9b97c4',
                            background: isSubActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            if (!isSubActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          }}
                          onMouseLeave={e => {
                            if (!isSubActive) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <span style={{ fontSize: 12 }}>{sub.icon}</span>
                          <span>{sub.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 6,
          }}>
            {[
              { value: stats.books, label: '项目' },
              { value: stats.chapters, label: '章节' },
              { value: stats.words, label: '字数' },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, padding: '5px 4px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', textAlign: 'center',
              }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{stat.value}</div>
                <div style={{ color: '#9b97c4', fontSize: 9 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </Sider>
      <Layout>
        <Content style={{ padding: 0, background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
          {currentPage && (
            <div style={{
              padding: '20px 24px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#eef2ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: '#6366f1',
                }}>
                  {currentPage.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: 20, fontWeight: 700, color: '#1e293b',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {currentPage.label}
                    {subTag && (
                      <Tag style={{
                        fontSize: 11, padding: '1px 8px',
                        background: '#ede9fe', color: '#5b21b6', border: 'none',
                        borderRadius: 4, fontWeight: 500,
                      }}>
                        {subTag}
                      </Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    {subTitle || currentPage.desc}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="page-content" style={{ padding: 24, flex: 1 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}