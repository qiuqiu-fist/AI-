import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Button, Tag, Spin, message, Progress } from 'antd'
import {
  BookOutlined,
  ScheduleOutlined,
  PlusOutlined,
  RightOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { bookApi } from '../api/books'
import { systemApi } from '../api/system'
import { Book, SystemStatus } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)
  const loadAttemptRef = useRef(0)

  const loadData = useCallback(async (showRefresh = false) => {
    const attempt = ++loadAttemptRef.current
    if (showRefresh) setRefreshing(true)
    try {
      const [booksResp, statusResp] = await Promise.all([
        bookApi.list(),
        systemApi.status(),
      ])
      if (attempt !== loadAttemptRef.current) return
      setBooks(booksResp.data)
      setStatus(statusResp.data)
      setRetryCount(0)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e: unknown) {
      const err = e as Error
      if (attempt === loadAttemptRef.current) {
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1)
          setTimeout(() => loadData(showRefresh), 2000 * (retryCount + 1))
        } else {
          message.error(err.message || '加载失败，请检查后端服务是否运行')
        }
      }
    } finally {
      if (attempt === loadAttemptRef.current) {
        setLoading(false)
        if (showRefresh) setRefreshing(false)
      }
    }
  }, [retryCount])

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    const timer = setInterval(() => loadData(true), 30000)
    return () => clearInterval(timer)
  }, [loadData])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />

  const totalWords = status?.total_words || 0
  const bookCount = status?.books_count || books.length
  const chapterCount = status?.chapters_count || 0

  const todayChapters = 0

  const oldestDate = books.length > 0
    ? books.reduce((earliest, b) =>
        b.created_at && (!earliest || b.created_at < earliest) ? b.created_at : earliest,
        books[0]?.created_at || ''
      )
    : ''
  const daysSinceFirst = oldestDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(oldestDate).getTime()) / 86400000))
    : 1
  const dailyAvg = bookCount > 0 ? Math.round(totalWords / daysSinceFirst) : 0

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdfa 50%, #fffbeb 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 14, color: '#6366f1', fontWeight: 600, marginBottom: 4 }}>
            ✦ 整体数据概览
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>
            共 {bookCount} 个项目 · {chapterCount} 个章节
          </div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
            累计创作 {totalWords.toLocaleString()} 字
            {bookCount > 0 && (
              <span> · 日均 {dailyAvg.toLocaleString()} 字</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockCircleOutlined style={{ fontSize: 11 }} />
            数据更新于 {lastUpdated || '首次加载'}
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => loadData(true)}
              style={{ fontSize: 11, padding: 0 }}
            >
              刷新
            </Button>
          </div>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate('/books')}
          style={{ borderRadius: 10, height: 44, paddingInline: 24, fontWeight: 600 }}
        >
          新建项目
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { title: '书籍总数', value: bookCount, trend: `活跃 ${books.filter(b => b.status === 'active').length} 个`, color: '#6366f1', bg: '#eef2ff', icon: '📚' },
          { title: '章节总数', value: chapterCount, trend: `今日新增 ${todayChapters} 章`, color: '#10b981', bg: '#f0fdfa', icon: '📄' },
          { title: '定时任务', value: status?.active_schedules || 0, trend: `${books.filter(b => b.schedule_enabled).length} 个项目已启用`, color: '#f59e0b', bg: '#fffbeb', icon: '⏰' },
          { title: '总创作字数', value: totalWords, trend: `日均 ${dailyAvg.toLocaleString()} 字`, color: '#ec4899', bg: '#fce7f3', icon: '📝' },
        ].map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card className="fade-in" style={{ animationDelay: `${(i + 1) * 0.1}s`, borderRadius: 12 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: card.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12, fontSize: 20,
                }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                </div>
                <Statistic title={card.title} value={card.value} valueStyle={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }} />
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                  {card.trend}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row style={{ marginTop: 24 }} gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOutlined style={{ color: '#6366f1' }} />
                项目总览
              </span>
            }
            extra={
              <Button type="link" onClick={() => navigate('/books')} style={{ fontSize: 13 }}>
                查看全部 <RightOutlined />
              </Button>
            }
            style={{ borderRadius: 12 }}
          >
            {books.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>还没有创建项目</div>
                <div style={{ fontSize: 14, marginBottom: 20 }}>点击上方「新建项目」开始创作之旅</div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/books')}>
                  立即创建
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {books.slice(0, 5).map(book => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/books/${book.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '14px 16px', borderRadius: 10,
                      background: '#fafafa', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.transform = 'translateX(4px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: '#eef2ff', color: '#6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, flexShrink: 0,
                    }}>
                      {book.title.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {book.title}
                        <Tag color={book.status === 'active' ? 'green' : book.status === 'paused' ? 'orange' : 'default'}
                          style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4, lineHeight: '20px' }}>
                          {book.status === 'active' ? '进行中' : book.status === 'paused' ? '已暂停' : '已完成'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 16 }}>
                        <span>{book.theme_config?.target_words || '?'} 字/章</span>
                        {book.schedule_enabled && (
                          <span>⏰ {(() => {
                            const mode = book.schedule_mode || 'daily'
                            const ch = book.daily_chapters || 1
                            if (mode === 'daily') return `每天 ${book.schedule_time} · ${ch} 章`
                            if (mode === 'interval_days') return `每${book.schedule_interval || 1}天${book.schedule_time} · ${ch}章`
                            if (mode === 'interval_minutes') return `每${book.schedule_interval || 30}分钟 · ${ch}章`
                            return ''
                          })()}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 12 }}>
                      详情 <RightOutlined style={{ fontSize: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileTextOutlined style={{ color: '#10b981' }} />
                创作数据
              </span>
            }
            style={{ borderRadius: 12 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined style={{ color: '#10b981', fontSize: 11 }} />
                  活跃项目数
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                  {books.filter(b => b.status === 'active').length}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>/ {bookCount} 总数</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>总创作字数</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                  {totalWords.toLocaleString()}
                </div>
                <Progress
                  percent={Math.min(100, Math.round((totalWords / 100000) * 100))}
                  size="small"
                  format={() => `${Math.round(totalWords / 1000)}K / 100K 目标`}
                  strokeColor={{ from: '#6366f1', to: '#06b6d4' }}
                  style={{ marginTop: 8 }}
                />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  项目运行 {daysSinceFirst} 天 · 日均 {dailyAvg.toLocaleString()} 字
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>定时生成</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                  {books.filter(b => b.schedule_enabled).length}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>个项目已启用</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                快速入口
              </span>
            }
            style={{ borderRadius: 12, marginTop: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                block
                icon={<BookOutlined />}
                onClick={() => navigate('/books')}
                style={{ height: 44, borderRadius: 10, textAlign: 'left', justifyContent: 'flex-start', fontWeight: 500 }}
              >
                浏览全部项目
              </Button>
              <Button
                block
                icon={<ScheduleOutlined />}
                onClick={() => navigate('/history')}
                style={{ height: 44, borderRadius: 10, textAlign: 'left', justifyContent: 'flex-start', fontWeight: 500 }}
              >
                查看生成历史
              </Button>
              <Button
                block
                icon={<ClockCircleOutlined />}
                onClick={() => navigate('/settings')}
                style={{ height: 44, borderRadius: 10, textAlign: 'left', justifyContent: 'flex-start', fontWeight: 500 }}
              >
                定时任务设置
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}