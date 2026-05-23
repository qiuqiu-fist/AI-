import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Tag, Space, Form, Input, Select, Switch, TimePicker,
  Tabs, message, Spin, Row, Col, Modal, Tooltip, InputNumber,
} from 'antd'
import {
  SettingOutlined, BookOutlined, ClockCircleOutlined,
  FileTextOutlined, PlusOutlined, ExportOutlined,
  OrderedListOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { bookApi } from '../api/books'
import { chapterApi, GenerationStatus } from '../api/chapters'
import { Book, Chapter, Character } from '../types'

export default function BookDetail() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [form] = Form.useForm()

  // Batch generation state
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchCount, setBatchCount] = useState(3)
  const [batchStartFrom, setBatchStartFrom] = useState(1)
  const [batchTitles, setBatchTitles] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

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

  const handleBatchGenerate = async () => {
    try {
      setBatchRunning(true)
      setBatchProgress({ current: 0, total: batchCount })
      const titles = batchTitles
        .split(/[,，\n]/)
        .map(t => t.trim())
        .filter(Boolean)

      for (let i = 0; i < batchCount; i++) {
        setBatchProgress({ current: i + 1, total: batchCount })
        setGenerationStatus({ status: 'running', message: `正在生成第 ${i + 1}/${batchCount} 章...` })
        await chapterApi.generate(Number(bookId))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setBatchRunning(false)
      setBatchModalOpen(false)
      message.success(`成功触发 ${batchCount} 章生成任务`)
      loadBook()
    } catch (e: unknown) {
      setBatchRunning(false)
      message.error((e as Error).message)
    }
  }

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div style={{
      fontSize: 17, fontWeight: 700, color: '#1e293b',
      display: 'flex', alignItems: 'center', gap: 10,
      paddingBottom: 12, marginBottom: 16,
      borderBottom: '2px solid #eef2ff',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'linear-gradient(135deg, #eef2ff, #f0fdfa)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: '#6366f1',
      }}>
        {icon}
      </div>
      {title}
    </div>
  )

  const subTitle = (title: string) => (
    <div style={{
      fontSize: 14, fontWeight: 600, color: '#475569',
      marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
      {title}
    </div>
  )

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

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />
  if (!book) return <div>书籍不存在</div>

  return (
    <div>
      {/* 一级标题：项目设置 */}
      {sectionTitle(<SettingOutlined />, '项目设置')}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {subTitle('基本信息')}
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="title" label="书名" rules={[{ required: true }]}>
                    <Input placeholder="输入小说书名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="author" label="作者">
                    <Input placeholder="作者名称" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="简介">
                <Input.TextArea rows={2} placeholder="简单描述一下你的小说" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="output_format" label="输出格式">
                    <Select options={[
                      { value: 'md', label: 'Markdown' },
                      { value: 'txt', label: '纯文本' },
                      { value: 'docx', label: 'Word' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="output_folder" label="输出文件夹">
                    <Input placeholder="留空使用默认路径" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <Button type="primary" onClick={handleSave} icon={<FileTextOutlined />}>保存设置</Button>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {subTitle('定时生成')}
            <Form form={form} layout="vertical">
              <Form.Item name="schedule_enabled" label="启用定时生成" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="schedule_time" label="定时时间（含分钟）">
                <TimePicker
                  format="HH:mm"
                  minuteStep={1}
                  style={{ width: '100%' }}
                  use12Hours={false}
                />
              </Form.Item>
            </Form>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', background: '#f0fdf4', borderRadius: 8,
              fontSize: 13, color: '#065f46',
            }}>
              <ClockCircleOutlined style={{ fontSize: 14 }} />
              今日已生成 {chapters.filter(ch =>
                ch.created_at && new Date(ch.created_at).toDateString() === new Date().toDateString()
              ).length} 章
            </div>
          </Card>

          {book.schedule_enabled && (
            <div style={{
              marginTop: 8, padding: '8px 14px', background: '#fffbeb',
              borderRadius: 8, fontSize: 12, color: '#92400e',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ClockCircleOutlined />
              定时任务已启用，每日 {book.schedule_time || '09:00'} 自动生成 {book.daily_chapters || 1} 章
            </div>
          )}
        </Col>
      </Row>

      {/* 一级标题：章节管理 */}
      <div style={{ marginTop: 32 }}>
        {sectionTitle(<OrderedListOutlined />, '章节管理')}
        <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              共 {chapters.length} 章
            </div>
            <Space>
              {generating && generationStatus && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #eef2ff, #f0fdfa)',
                  border: '1px solid #c7d2fe', borderRadius: 8,
                  padding: '6px 12px',
                }}>
                  <div style={{
                    width: 16, height: 16,
                    border: '2px solid #eef2ff', borderTopColor: '#6366f1',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#4f46e5' }}>生成中</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{generationStatus?.message || 'AI 创作中'}</div>
                  </div>
                </div>
              )}
              <Tooltip title="批量生成多章，可设置数量和标题">
                <Button icon={<ThunderboltOutlined />} onClick={() => {
                  setBatchCount(3)
                  setBatchStartFrom(chapters.length + 1)
                  setBatchTitles('')
                  setBatchModalOpen(true)
                }}>
                  批量生成
                </Button>
              </Tooltip>
              <Button type="primary" onClick={handleGenerate} loading={generating} disabled={generating} icon={<PlusOutlined />}>
                {generating ? '生成中...' : '生成下一章'}
              </Button>
              <Button onClick={handleExportAll} icon={<ExportOutlined />}>导出全书</Button>
            </Space>
          </div>

          {chapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📖</div>
              <div style={{ fontWeight: 500 }}>还没有章节，点击「生成下一章」开始创作</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', background: '#fafafa', borderRadius: 8,
                    cursor: 'pointer', transition: 'all 0.2s',
                    borderLeft: `3px solid ${ch.status === 'exported' ? '#10b981' : '#6366f1'}`,
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = '#eef2ff'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = '#fafafa'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: '#eef2ff', color: '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12, flexShrink: 0,
                  }}>
                    {String(ch.chapter_number || (chapters.indexOf(ch) + 1)).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {ch.title || `第 ${ch.chapter_number || chapters.indexOf(ch) + 1} 章`}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Tag style={{ fontSize: 10, padding: '0 8px', lineHeight: '20px', borderRadius: 4, margin: 0 }}>
                        {ch.status === 'exported' ? '已导出' : '已生成'}
                      </Tag>
                      <span>{ch.word_count || 0} 字</span>
                      {ch.created_at && <span>{new Date(ch.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Space size="small">
                    <Button type="link" size="small" onClick={() => navigate(`/books/${bookId}/chapters/${ch.id}`)}>
                      编辑
                    </Button>
                    <Button type="link" size="small" onClick={() => handleExportChapter(ch)}>
                      导出
                    </Button>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 一级标题：创作设定 */}
      <div style={{ marginTop: 32 }}>
        {sectionTitle(<BookOutlined />, '创作设定')}
        <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Tabs items={[
            {
              key: 'basic', label: '基础设定',
              children: (
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="小说类型 (genre)">
                        <Input value={book.theme_config?.genre} onChange={(e) => {
                          setBook({ ...book, theme_config: { ...book.theme_config, genre: e.target.value } })
                        }} placeholder="玄幻、科幻、言情等" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="写作风格 (style)">
                        <Input value={book.theme_config?.style} onChange={(e) => {
                          setBook({ ...book, theme_config: { ...book.theme_config, style: e.target.value } })
                        }} placeholder="中国古典仙侠、西方奇幻等" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="语调 (tone)">
                        <Input value={book.theme_config?.tone} onChange={(e) => {
                          setBook({ ...book, theme_config: { ...book.theme_config, tone: e.target.value } })
                        }} placeholder="轻松、严肃、幽默等" />
                      </Form.Item>
                    </Col>
                  </Row>
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
                <Form.Item label="角色列表">
                  <Input.TextArea rows={8}
                    value={(() => {
                      const chars = book.theme_config?.characters
                      if (!chars || !Array.isArray(chars) || chars.length === 0) return ''
                      return chars.map(c =>
                        `姓名：${c.name || ''}\n身份：${c.role || ''}\n描述：${c.description || ''}`
                      ).join('\n---\n')
                    })()}
                    onChange={(e) => {
                      const text = e.target.value.trim()
                      if (!text) { setBook({ ...book, theme_config: { ...book.theme_config, characters: [] } }); return }
                      const blocks = text.split(/---+/).map(b => b.trim()).filter(Boolean)
                      const chars = blocks.map(block => {
                        const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
                        const char: Record<string, string> = {}
                        for (const line of lines) {
                          const sep = line.includes('：') ? '：' : ':'
                          const idx = line.indexOf(sep)
                          if (idx > 0) {
                            const key = line.slice(0, idx).trim()
                            const val = line.slice(idx + sep.length).trim()
                            if (key === '姓名' || key === 'name') char.name = val
                            else if (key === '身份' || key === 'role') char.role = val
                            else if (key === '描述' || key === 'description') char.description = val
                          }
                        }
                        return char
                      })
                      setBook({ ...book, theme_config: { ...book.theme_config, characters: chars as unknown as Character[] } })
                    }}
                    placeholder={"格式：\n姓名：张三\n身份：主角\n描述：一个勇敢的少年\n---\n姓名：李四\n身份：配角\n描述：神秘的老者"}
                    style={{ fontFamily: 'monospace' }} />
                </Form.Item>
              ),
            },
          ]} />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={async () => {
              try {
                await bookApi.update(Number(bookId), { theme_config: book.theme_config })
                message.success('创作设定已保存')
              } catch (e: unknown) {
                message.error((e as Error).message)
              }
            }} icon={<FileTextOutlined />}>保存创作设定</Button>
          </div>
        </Card>
      </div>

      {/* Batch Generation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#6366f1' }} />
            <span>批量生成章节</span>
          </div>
        }
        open={batchModalOpen}
        onCancel={() => !batchRunning && setBatchModalOpen(false)}
        footer={[
          <Button key="cancel" disabled={batchRunning} onClick={() => setBatchModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="generate"
            type="primary"
            loading={batchRunning}
            disabled={batchRunning}
            onClick={handleBatchGenerate}
            icon={<ThunderboltOutlined />}
          >
            {batchRunning ? `生成中 ${batchProgress.current}/${batchProgress.total}` : '开始批量生成'}
          </Button>,
        ]}
        width={520}
      >
        <div style={{ padding: '8px 0' }}>
          {batchRunning ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 48, height: 48, margin: '0 auto 16px',
                border: '3px solid #eef2ff', borderTopColor: '#6366f1',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 8 }}>
                正在生成第 {batchProgress.current}/{batchProgress.total} 章
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                AI 正在创作中，请稍候...
              </div>
            </div>
          ) : (
            <Form layout="vertical">
              <Form.Item label="生成数量" help="每次最多可批量生成 10 章">
                <InputNumber
                  min={1}
                  max={10}
                  value={batchCount}
                  onChange={v => setBatchCount(v || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="起始章节号">
                <InputNumber
                  min={1}
                  value={batchStartFrom}
                  onChange={v => setBatchStartFrom(v || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="章节标题（可选）" help="每行一个标题，留空则使用自动编号">
                <Input.TextArea
                  rows={4}
                  value={batchTitles}
                  onChange={e => setBatchTitles(e.target.value)}
                  placeholder={'第一章：初入江湖\n第二章：神秘邂逅\n第三章：风云突变'}
                />
              </Form.Item>
            </Form>
          )}
        </div>
      </Modal>
    </div>
  )
}