import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Button, List, Tag, Spin, message } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  PlusOutlined,
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

  return (
    <div>
      <Row gutter={[16, 16]}>
        {[
          { title: '书籍总数', value: status?.books_count || 0, trend: '↑ ' + (status?.books_count || 0) + ' 本月新增', color: '#6366f1', bg: '#eef2ff', icon: '📚' },
          { title: '章节总数', value: status?.chapters_count || 0, trend: '↑ ' + (status?.chapters_count || 0) + ' 本周生成', color: '#10b981', bg: '#f0fdfa', icon: '📄' },
          { title: '定时任务', value: status?.active_schedules || 0, trend: '● ' + (status?.active_schedules || 0) + ' 进行中', color: '#f59e0b', bg: '#fffbeb', icon: '⏰' },
          { title: '总字数', value: status?.total_words || 0, trend: '↑ 日均 ' + Math.round((status?.total_words || 0) / Math.max(1, (status?.books_count || 1))) + '', color: '#ec4899', bg: '#fce7f3', icon: '📝' },
        ].map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card className="fade-in" style={{ animationDelay: `${(i + 1) * 0.1}s` }}>
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
                <div style={{ color: '#10b981', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {card.trend}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row style={{ marginTop: 24 }} gutter={[16, 16]}>
        <Col span={24}>
          <Card title="⏱ 最近活动">
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
              {books && books.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>有 {books.length} 个活跃项目</div>
                  <div style={{ fontSize: 14 }}>继续你的创作之旅</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>还没有生成记录</div>
                  <div style={{ fontSize: 14 }}>创建一个项目，开始你的创作之旅</div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 24 }} gutter={[16, 16]}>
        <Col span={16}>
          <Card title="本周写作趋势">
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              height: 160, paddingTop: 16,
            }}>
              {[
                { day: '周一', chapters: 3 },
                { day: '周二', chapters: 2 },
                { day: '周三', chapters: 5 },
                { day: '周四', chapters: 1 },
                { day: '周五', chapters: 6 },
                { day: '周六', chapters: 3 },
                { day: '今日', chapters: 0 },
              ].map((d, i) => (
                <div key={d.day} style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6,
                }}>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    height: Math.max(4, d.chapters * 16),
                    background: 'linear-gradient(180deg, #6366f1, #818cf8)',
                    position: 'relative', minHeight: 4,
                    transition: 'height 0.5s',
                    opacity: i === 6 ? 0.5 : 1,
                  }}>
                    <div style={{
                      position: 'absolute', top: -18, left: '50%',
                      transform: 'translateX(-50%)', fontSize: 11,
                      fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap',
                    }}>{d.chapters}章</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="创作数据">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>写作天数</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>0 天</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>总字数</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>0</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>日均产量</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>0 字</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card
            title="我的项目"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/books')}>
                新建项目
              </Button>
            }
          >
            <List
              dataSource={books}
              renderItem={(book) => (
                <List.Item
                  actions={[
                    <Button type="link" onClick={() => navigate(`/books/${book.id}`)}>
                      详情
                    </Button>,
                    <Button type="link" onClick={async () => {
                      try {
                        await chapterApi.generate(book.id)
                        message.success('生成任务已触发')
                      } catch (e: unknown) {
                        message.error((e as Error).message)
                      }
                    }}>
                      生成本章
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        {book.title}
                        <Tag color={book.status === 'active' ? 'green' : book.status === 'paused' ? 'orange' : 'default'} style={{ marginLeft: 8 }}>
                          {book.status === 'active' ? '进行中' : book.status === 'paused' ? '已暂停' : '已完成'}
                        </Tag>
                      </span>
                    }
                    description={book.description || '暂无描述'}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}