import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Tag, message, Spin, Row, Col, Space,
} from 'antd'
import {
  SettingOutlined, OrderedListOutlined, BookOutlined,
  RightOutlined, ClockCircleOutlined, EditOutlined,
} from '@ant-design/icons'
import { bookApi } from '../api/books'
import { chapterApi } from '../api/chapters'
import { Book, Chapter } from '../types'

export default function BookDetail() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [bookResp, chaptersResp] = await Promise.all([
          bookApi.get(Number(bookId)),
          chapterApi.list(Number(bookId)),
        ])
        setBook(bookResp.data)
        setChapters(chaptersResp.data)
      } catch (e: unknown) {
        message.error((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [bookId])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />
  if (!book) return <div>书籍不存在</div>

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0)
  const exportedChapters = chapters.filter(ch => ch.status === 'exported').length
  const todayChapters = chapters.filter(ch =>
    ch.created_at && new Date(ch.created_at).toDateString() === new Date().toDateString()
  ).length

  const navCards = [
    {
      key: 'chapters',
      icon: <OrderedListOutlined style={{ fontSize: 28 }} />,
      title: '章节管理',
      desc: `共 ${chapters.length} 章 · ${exportedChapters} 章已导出`,
      action: () => navigate(`/books/${bookId}/chapters`),
      color: '#6366f1',
      bg: '#eef2ff',
    },
    {
      key: 'settings',
      icon: <SettingOutlined style={{ fontSize: 28 }} />,
      title: '项目设置',
      desc: '基本信息 · 定时生成 · 输出配置',
      action: () => navigate(`/books/${bookId}/settings`),
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      key: 'themes',
      icon: <BookOutlined style={{ fontSize: 28 }} />,
      title: '创作设定',
      desc: '小说类型 · 大纲 · 世界观 · 角色',
      action: () => navigate(`/books/${bookId}/themes`),
      color: '#10b981',
      bg: '#f0fdfa',
    },
  ]

  const recentChapters = chapters.slice(-3).reverse()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card
        style={{
          borderRadius: 12, marginBottom: 24,
          background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdfa 50%, #fffbeb 100%)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 22, flexShrink: 0,
            }}>
              {book.title.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                {book.title}
                <Tag color={book.status === 'active' ? 'green' : book.status === 'paused' ? 'orange' : 'default'}
                  style={{ fontSize: 11, padding: '1px 10px', borderRadius: 4, lineHeight: '22px' }}>
                  {book.status === 'active' ? '进行中' : book.status === 'paused' ? '已暂停' : '已完成'}
                </Tag>
              </div>
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                {book.author ? `${book.author} · ` : ''}
                {book.description || '暂无简介'}
              </div>
            </div>
          </div>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => chapters.length > 0
              ? navigate(`/books/${bookId}/chapters/${chapters[chapters.length - 1].id}`)
              : navigate(`/books/${bookId}/chapters`)}
            style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
          >
            {chapters.length > 0 ? '继续写作' : '开始创作'}
          </Button>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { value: chapters.length, label: '总章节', color: '#6366f1', bg: '#eef2ff' },
          { value: totalWords.toLocaleString(), label: '总字数', color: '#10b981', bg: '#f0fdfa' },
          { value: todayChapters, label: '今日新增', color: '#f59e0b', bg: '#fffbeb' },
          { value: exportedChapters, label: '已导出', color: '#06b6d4', bg: '#ecfeff' },
        ].map((stat, i) => (
          <Col xs={12} sm={6} key={stat.label}>
            <div style={{
              padding: 16, borderRadius: 10, background: stat.bg,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {navCards.map(card => (
          <Col xs={24} sm={8} key={card.key}>
            <Card
              hoverable
              onClick={card.action}
              style={{
                borderRadius: 12, height: '100%',
                transition: 'all 0.2s',
              }}
              bodyStyle={{ padding: 24 }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: card.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, color: card.color,
              }}>
                {card.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                {card.title}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                {card.desc}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: card.color, fontWeight: 500 }}>
                进入 <RightOutlined style={{ fontSize: 11 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {book.schedule_enabled && (
        <Card style={{ marginTop: 24, borderRadius: 10, background: '#fffbeb' }} bodyStyle={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
            <ClockCircleOutlined />
            定时任务已启用 · 每日 {book.schedule_time || '09:00'} 自动生成 {book.daily_chapters || 1} 章
          </div>
        </Card>
      )}

      {recentChapters.length > 0 && (
        <Card
          title={<span style={{ fontWeight: 600, fontSize: 15 }}>最近章节</span>}
          style={{ marginTop: 24, borderRadius: 10 }}
          extra={
            <Button type="link" size="small" onClick={() => navigate(`/books/${bookId}/chapters`)}>
              查看全部 <RightOutlined />
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentChapters.map(ch => (
              <div
                key={ch.id}
                onClick={() => navigate(`/books/${bookId}/chapters/${ch.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  background: '#fafafa', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fafafa' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#eef2ff', color: '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 11, flexShrink: 0,
                }}>
                  {String(ch.chapter_number).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#334155' }}>
                  {ch.title || `第 ${ch.chapter_number} 章`}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{ch.word_count || 0} 字</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}