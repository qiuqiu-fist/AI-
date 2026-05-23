import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Button, List, Tag, Spin, message, Progress } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  PlusOutlined,
  RightOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { bookApi } from '../api/books'
import { chapterApi } from '../api/chapters'
import { systemApi } from '../api/system'
import { Book, SystemStatus } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [booksResp, statusResp] = await Promise.all([
        bookApi.list(),
        systemApi.status(),
      ])
      setBooks(booksResp.data)
      setStatus(statusResp.data)
    } catch (e: unknown) {
      const err = e as Error
      message.error(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />

  const totalWords = status?.total_words || 0
  const bookCount = status?.books_count || books.length
  const chapterCount = status?.chapters_count || 0

  return (
    <div>
      {/* 整体数据概览 */}
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
              <span> · 平均每项目约 {Math.round(totalWords / Math.max(1, bookCount)).toLocaleString()} 字</span>
            )}
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

      {/* 数据统计卡片 */}
      <Row gutter={[16, 16]}>
        {[
          { title: '书籍总数', value: bookCount, trend: `共 ${bookCount} 个进行中`, color: '#6366f1', bg: '#eef2ff', icon: '📚' },
          { title: '章节总数', value: chapterCount, trend: `累计 ${chapterCount} 章`, color: '#10b981', bg: '#f0fdfa', icon: '📄' },
          { title: '定时任务', value: status?.active_schedules || 0, trend: `${status?.active_schedules || 0} 个任务进行中`, color: '#f59e0b', bg: '#fffbeb', icon: '⏰' },
          { title: '总创作字数', value: totalWords, trend: `日均 ${bookCount > 0 ? Math.round(totalWords / 7) : 0} 字`, color: '#ec4899', bg: '#fce7f3', icon: '📝' },
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

      {/* 项目总览 + 写作趋势 */}
      <Row style={{ marginTop: 24 }} gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                📋 项目总览
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
                <div style={{ fontSize: 14, marginBottom: 20 }}>点击右上角「新建项目」开始创作之旅</div>
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
                          style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4 }}>
                          {book.status === 'active' ? '进行中' : book.status === 'paused' ? '已暂停' : '已完成'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 12 }}>
                        <span>📏 {book.theme_config?.target_words || '?'} 字/章</span>
                        {book.schedule_enabled && (
                          <span>⏰ 每天 {book.daily_chapters || 1} 章 · {book.schedule_time}</span>
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
          <Card title={<span style={{ fontWeight: 600, fontSize: 16 }}>📊 创作数据</span>} style={{ borderRadius: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>活跃项目数</div>
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
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>定时生成</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
                  {status?.active_schedules || 0}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>个任务进行中</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title={<span style={{ fontWeight: 600, fontSize: 16 }}>⏱ 快速入口</span>} style={{ borderRadius: 12, marginTop: 16 }}>
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