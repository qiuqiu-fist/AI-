import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Form, Input, Select, Switch, TimePicker,
  message, Spin, Row, Col, Space,
} from 'antd'
import {
  SettingOutlined, FileTextOutlined, LeftOutlined, SaveOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { bookApi } from '../api/books'
import { Book } from '../types'

export default function BookSettings() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadBook = async () => {
    try {
      const resp = await bookApi.get(Number(bookId))
      setBook(resp.data)
      form.setFieldsValue({
        ...resp.data,
        schedule_time: resp.data.schedule_enabled
          ? dayjs(resp.data.schedule_time, 'HH:mm')
          : undefined,
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
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate(`/books/${bookId}`)}
            style={{ color: '#64748b' }}
          />
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
            title={
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                基本信息
              </span>
            }
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
              <Form.Item name="daily_chapters" label="每日生成章节数">
                <Select options={[
                  { value: 1, label: '1 章' },
                  { value: 2, label: '2 章' },
                  { value: 3, label: '3 章' },
                  { value: 5, label: '5 章' },
                  { value: 10, label: '10 章' },
                ]} style={{ width: 160 }} />
              </Form.Item>
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
                <Switch />
              </Form.Item>
              <Form.Item name="schedule_time" label="定时时间（精确到分钟）">
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
              fontSize: 13, color: '#065f46', marginBottom: 8,
            }}>
              <ClockCircleOutlined style={{ fontSize: 14 }} />
              定时开启后将按设定时间自动生成章节
            </div>

            {book.schedule_enabled && (
              <div style={{
                padding: '10px 12px', background: '#fffbeb',
                borderRadius: 8, fontSize: 13, color: '#92400e',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ClockCircleOutlined />
                每日 {book.schedule_time || '09:00'} 自动生成 {book.daily_chapters || 1} 章
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