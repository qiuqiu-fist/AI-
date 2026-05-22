import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Table, Tag, Space, Form, Input, Select, Switch, TimePicker, InputNumber,
  Tabs, message, Spin, Row, Col, Modal,
} from 'antd'
import dayjs from 'dayjs'
import { bookApi } from '../api/books'
import { chapterApi, GenerationStatus } from '../api/chapters'
import { Book, Chapter } from '../types'

export default function BookDetail() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [form] = Form.useForm()

  const loadBook = async () => {
    try {
      const [bookResp, chaptersResp] = await Promise.all([
        bookApi.get(Number(bookId)),
        chapterApi.list(Number(bookId)),
      ])
      setBook(bookResp.data)
      setChapters(chaptersResp.data)
      form.setFieldsValue({
        ...bookResp.data,
        schedule_time: bookResp.data.schedule_enabled
          ? dayjs(bookResp.data.schedule_time, 'HH:mm')
          : undefined,
      })
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBook() }, [bookId])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResp = await chapterApi.getGenerationStatus(Number(bookId))
        setGenerationStatus(statusResp.data)
        
        if (statusResp.data.status === 'success' || statusResp.data.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setGenerating(false)
          
          if (statusResp.data.status === 'success') {
            message.success('章节生成成功')
            loadBook()
          } else {
            message.error(statusResp.data.message)
          }
        }
      } catch (e) {
        console.error('轮询状态失败:', e)
      }
    }, 2000)
  }

  const handleSave = async () => {
    try {
      const values = form.getFieldsValue()
      const data = {
        ...values,
        schedule_time: values.schedule_time
          ? dayjs(values.schedule_time).format('HH:mm')
          : '09:00',
      }
      await bookApi.update(Number(bookId), data)
      message.success('保存成功')
      loadBook()
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setGenerationStatus({ status: 'running', message: '正在启动生成任务...' })
      await chapterApi.generate(Number(bookId))
      startPolling()
    } catch (e: unknown) {
      setGenerating(false)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      message.error((e as Error).message)
    }
  }

  const handleExportAll = async () => {
    try {
      await chapterApi.exportAll(Number(bookId))
      message.success('全书导出成功')
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  const handleExportChapter = async (ch: Chapter) => {
    try {
      await chapterApi.export(Number(bookId), ch.id)
      message.success('导出成功')
      loadBook()
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  const chapterColumns = [
    { title: '章节号', dataIndex: 'chapter_number', key: 'chapter_number', width: 80 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => (
        <Tag color={s === 'exported' ? 'green' : s === 'generated' ? 'blue' : 'default'}>
          {s === 'exported' ? '已导出' : s === 'generated' ? '已生成' : '草稿'}
        </Tag>
      ),
    },
    { title: '字数', dataIndex: 'word_count', key: 'word_count' },
    { title: '日期', dataIndex: 'generated_date', key: 'generated_date' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, ch: Chapter) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/books/${bookId}/chapters/${ch.id}`)}>
            查看
          </Button>
          <Button type="link" onClick={() => handleExportChapter(ch)}>导出</Button>
        </Space>
      ),
    },
  ]

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />
  if (!book) return <div>书籍不存在</div>

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="章节列表" extra={
            <Space>
              <Button 
                type="primary" 
                onClick={handleGenerate} 
                loading={generating}
                disabled={generating}
              >
                {generating ? '生成中...' : '生成下一章'}
              </Button>
              {generating && generationStatus && (
                <span style={{ color: '#1890ff', fontSize: '12px' }}>
                  {generationStatus.message}
                </span>
              )}
              <Button onClick={handleExportAll}>导出全书</Button>
            </Space>
          }>
            <Table dataSource={chapters} columns={chapterColumns} rowKey="id" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="项目设置" extra={<Button type="primary" onClick={handleSave}>保存</Button>}>
            <Form form={form} layout="vertical">
              <Form.Item name="title" label="书名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="author" label="作者">
                <Input />
              </Form.Item>
              <Form.Item name="description" label="简介">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="output_format" label="输出格式">
                <Select options={[
                  { value: 'md', label: 'Markdown' },
                  { value: 'txt', label: '纯文本' },
                  { value: 'docx', label: 'Word' },
                ]} />
              </Form.Item>
              <Form.Item name="output_folder" label="输出文件夹">
                <Input placeholder="留空使用默认路径" />
              </Form.Item>
              <Form.Item name="schedule_enabled" label="启用定时生成" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="schedule_time" label="定时时间">
                <TimePicker format="HH:mm" />
              </Form.Item>
              <Form.Item name="daily_chapters" label="每天生成章数">
                <InputNumber min={1} max={10} defaultValue={1} style={{ width: '100%' }} />
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card title="主题配置" style={{ marginTop: 16 }}>
        <Tabs items={[
          {
            key: 'basic', label: '基础设定',
            children: (
              <Form layout="vertical">
                <Form.Item label="小说类型 (genre)">
                  <Input value={book.theme_config?.genre} onChange={(e) => {
                    setBook({ ...book, theme_config: { ...book.theme_config, genre: e.target.value } })
                  }} placeholder="玄幻、科幻、言情等" />
                </Form.Item>
                <Form.Item label="写作风格 (style)">
                  <Input value={book.theme_config?.style} onChange={(e) => {
                    setBook({ ...book, theme_config: { ...book.theme_config, style: e.target.value } })
                  }} placeholder="中国古典仙侠、西方奇幻等" />
                </Form.Item>
                <Form.Item label="语调 (tone)">
                  <Input value={book.theme_config?.tone} onChange={(e) => {
                    setBook({ ...book, theme_config: { ...book.theme_config, tone: e.target.value } })
                  }} placeholder="轻松、严肃、幽默等" />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'outline', label: '故事大纲',
            children: (
              <Form.Item label="大纲">
                <Input.TextArea rows={8}
                  value={book.theme_config?.outline}
                  onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, outline: e.target.value } })}
                  placeholder="输入故事大纲..." />
              </Form.Item>
            ),
          },
          {
            key: 'world', label: '世界观',
            children: (
              <Form.Item label="世界观设定">
                <Input.TextArea rows={8}
                  value={book.theme_config?.world_setting}
                  onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, world_setting: e.target.value } })}
                  placeholder="输入世界观设定..." />
              </Form.Item>
            ),
          },
          {
            key: 'characters', label: '角色设定',
            children: (
              <Form.Item label="角色列表（JSON 格式）">
                <Input.TextArea rows={8}
                  value={JSON.stringify(book.theme_config?.characters || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const chars = JSON.parse(e.target.value)
                      setBook({ ...book, theme_config: { ...book.theme_config, characters: chars } })
                    } catch { /* ignore */ }
                  }}
                  placeholder='[{"name":"张三","role":"主角","description":"..."}]' />
              </Form.Item>
            ),
          },
        ]} />
        <Button type="primary" onClick={async () => {
          try {
            await bookApi.update(Number(bookId), { theme_config: book.theme_config })
            message.success('主题配置已保存')
          } catch (e: unknown) {
            message.error((e as Error).message)
          }
        }}>保存主题配置</Button>
      </Card>
    </div>
  )
}