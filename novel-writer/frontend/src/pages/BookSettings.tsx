import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Form, Input, Select, Switch, TimePicker,
  message, Spin, Row, Col, Space, InputNumber, Radio,
} from 'antd'
import {
  SettingOutlined, FileTextOutlined, LeftOutlined, SaveOutlined, ClockCircleOutlined,
  CalendarOutlined, FieldTimeOutlined, HourglassOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { bookApi } from '../api/books'
import { Book } from '../types'

dayjs.extend(customParseFormat)

function parseScheduleTime(val: string | undefined): dayjs.Dayjs | undefined {
  if (!val) return undefined
  if (val.includes(':')) return dayjs(val, 'HH:mm')
  return dayjs(val + ':00', 'HH:mm')
}

function scheduleSummary(book: Book): string {
  if (!book.schedule_enabled) return '定时生成未启用'
  const chapters = book.daily_chapters || 1
  const mode = book.schedule_mode || 'daily'
  if (mode === 'daily') return `每天 ${book.schedule_time || '09:00'} 生成 ${chapters} 章`
  if (mode === 'interval_days') return `每 ${book.schedule_interval || 1} 天 · ${book.schedule_time || '09:00'} 生成 ${chapters} 章`
  if (mode === 'interval_minutes') return `每隔 ${book.schedule_interval || 30} 分钟生成 ${chapters} 章`
  return ''
}

const scheduleRadios = [
  { value: 'daily', label: <span><CalendarOutlined style={{ marginRight: 4 }} />每日定时</span> },
  { value: 'interval_days', label: <span><HourglassOutlined style={{ marginRight: 4 }} />间隔天数</span> },
  { value: 'interval_minutes', label: <span><FieldTimeOutlined style={{ marginRight: 4 }} />间隔分钟</span> },
]

export default function BookSettings() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<'daily' | 'interval_days' | 'interval_minutes'>('daily')
  const [form] = Form.useForm()
  const [scheduleEnabled, setScheduleEnabled] = useState(false)

  const loadBook = async () => {
    try {
      const resp = await bookApi.get(Number(bookId))
      setBook(resp.data)
      setScheduleMode(resp.data.schedule_mode || 'daily')
      setScheduleEnabled(resp.data.schedule_enabled || false)
      form.setFieldsValue({
        title: resp.data.title,
        author: resp.data.author,
        description: resp.data.description,
        output_format: resp.data.output_format,
        output_folder: resp.data.output_folder,
        schedule_enabled: resp.data.schedule_enabled,
        schedule_mode: resp.data.schedule_mode || 'daily',
        schedule_time: resp.data.schedule_enabled && (resp.data.schedule_mode || 'daily') !== 'interval_minutes'
          ? parseScheduleTime(resp.data.schedule_time)
          : undefined,
        schedule_interval: resp.data.schedule_interval || 30,
        daily_chapters: resp.data.daily_chapters || 1,
      })
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBook() }, [bookId])

  const handleSave = async () => {
    try {
      setSaving(true)
      const values = form.getFieldsValue()

      const formattedTime = scheduleMode === 'interval_minutes' || !values.schedule_time
        ? '09:00'
        : dayjs(values.schedule_time).format('HH:mm')

      const data: Record<string, unknown> = {
        title: values.title,
        author: values.author,
        description: values.description,
        output_format: values.output_format,
        output_folder: values.output_folder,
        schedule_enabled: values.schedule_enabled,
        schedule_mode: scheduleMode,
        schedule_time: formattedTime,
        schedule_interval: values.schedule_interval || 30,
        daily_chapters: values.daily_chapters || 1,
      }

      await bookApi.update(Number(bookId), data)
      message.success('保存成功')
      loadBook()
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />
  if (!book) return <div>书籍不存在</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => navigate(`/books/${bookId}`)} style={{ color: '#64748b' }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <SettingOutlined style={{ color: '#6366f1' }} />
              项目设置
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {book.title} — 管理基本信息和定时生成配置
            </div>
          </div>
        </div>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          保存设置
        </Button>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card
            title={<span style={{ fontSize: 15, fontWeight: 600 }}>基本信息</span>}
            style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="title" label="书名" rules={[{ required: true, message: '请输入书名' }]}>
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
                <Input.TextArea rows={3} placeholder="简单描述一下你的小说" />
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
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <span style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                定时生成
              </span>
            }
            style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <Form form={form} layout="vertical">
              <Form.Item name="schedule_enabled" label="启用定时生成" valuePropName="checked">
                <Switch onChange={(v) => setScheduleEnabled(v)} />
              </Form.Item>

              {scheduleEnabled && (
                <>
                  <Form.Item name="schedule_mode" label="生成模式">
                    <Radio.Group
                      options={scheduleRadios}
                      optionType="button"
                      buttonStyle="solid"
                      onChange={(e) => setScheduleMode(e.target.value)}
                    />
                  </Form.Item>

                  {scheduleMode !== 'interval_minutes' && (
                    <Form.Item name="schedule_time" label="执行时间">
                      <TimePicker
                        format="HH:mm"
                        minuteStep={1}
                        style={{ width: '100%' }}
                        use12Hours={false}
                      />
                    </Form.Item>
                  )}

                  {scheduleMode === 'interval_days' && (
                    <Form.Item name="schedule_interval" label="间隔天数">
                      <InputNumber min={1} max={90} step={1} style={{ width: '100%' }}
                        placeholder="1" addonAfter="天" />
                    </Form.Item>
                  )}

                  {scheduleMode === 'interval_minutes' && (
                    <Form.Item name="schedule_interval" label="间隔分钟">
                      <InputNumber min={5} max={1440} step={5} style={{ width: '100%' }}
                        placeholder="30" addonAfter="分钟" />
                    </Form.Item>
                  )}

                  <Form.Item name="daily_chapters" label={scheduleMode === 'interval_minutes' ? '每次生成章数' : '每次生成章数'}>
                    <InputNumber min={1} max={50} step={1} style={{ width: '100%' }}
                      placeholder="1" />
                  </Form.Item>
                </>
              )}
            </Form>

            {scheduleEnabled && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 8, fontSize: 13,
                background: '#fffbeb', color: '#92400e',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ClockCircleOutlined />
                {(() => {
                  if (scheduleMode === 'daily') return `每天 ${form.getFieldValue('schedule_time') ? dayjs(form.getFieldValue('schedule_time')).format('HH:mm') : book.schedule_time || '09:00'} 生成 ${form.getFieldValue('daily_chapters') || 1} 章`
                  if (scheduleMode === 'interval_days') return `每 ${form.getFieldValue('schedule_interval') || 1} 天 · ${form.getFieldValue('schedule_time') ? dayjs(form.getFieldValue('schedule_time')).format('HH:mm') : book.schedule_time || '09:00'} 生成 ${form.getFieldValue('daily_chapters') || 1} 章`
                  if (scheduleMode === 'interval_minutes') return `每隔 ${form.getFieldValue('schedule_interval') || 30} 分钟生成 ${form.getFieldValue('daily_chapters') || 1} 章`
                  return ''
                })()}
              </div>
            )}

            {!scheduleEnabled && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, fontSize: 13,
                background: '#f8fafc', color: '#94a3b8',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ClockCircleOutlined />
                定时生成未启用，开启后可选择模式
              </div>
            )}
          </Card>

          <Space style={{ marginTop: 16, width: '100%' }} direction="vertical">
            <Button block onClick={() => navigate(`/books/${bookId}/chapters`)}>
              管理章节
            </Button>
            <Button block onClick={() => navigate(`/books/${bookId}/themes`)}>
              创作设定
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  )
}