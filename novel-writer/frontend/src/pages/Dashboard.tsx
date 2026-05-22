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
        <Col span={6}>
          <Card>
            <Statistic title="书籍总数" value={status?.books_count || 0} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="章节总数" value={status?.chapters_count || 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="定时任务" value={status?.active_schedules || 0} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="数据库" value={status?.db_size || '0 B'} />
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