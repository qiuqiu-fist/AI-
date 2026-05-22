import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Table, Tag, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { bookApi } from '../api/books'
import { chapterApi } from '../api/chapters'
import { Book } from '../types'

export default function BookList() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(0)
  const wizardSteps = ['基本信息', '主题设定', '预览完成']
  const [form] = Form.useForm()

  const loadBooks = async () => {
    try {
      const resp = await bookApi.list()
      setBooks(resp.data)
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBooks() }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await bookApi.create(values)
      message.success('创建成功')
      setModalOpen(false)
      form.resetFields()
      loadBooks()
    } catch (e: unknown) {
      if ((e as Error).message) message.error((e as Error).message)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await bookApi.delete(id)
      message.success('删除成功')
      loadBooks()
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  const columns = [
    { title: '书名', dataIndex: 'title', key: 'title' },
    { title: '作者', dataIndex: 'author', key: 'author' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'active' ? 'green' : s === 'paused' ? 'orange' : 'default'}>
          {s === 'active' ? '进行中' : s === 'paused' ? '已暂停' : '已完成'}
        </Tag>
      ),
    },
    {
      title: '定时', key: 'schedule',
      render: (_: unknown, r: Book) => r.schedule_enabled ? `每天 ${r.schedule_time}` : '未开启',
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, r: Book) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/books/${r.id}`)}>详情</Button>
          <Button type="link" onClick={async () => {
            try {
              await chapterApi.generate(r.id)
              message.success('生成任务已触发')
            } catch (e: unknown) {
              message.error((e as Error).message)
            }
          }}>生成</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="我的项目"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建项目</Button>}
      >
        <Table dataSource={books} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal title={null} open={modalOpen} footer={null} width={640} onCancel={() => { setModalOpen(false); setStep(0); }}>
        {/* Steps indicator */}
        <div style={{ display: 'flex', padding: '24px 24px 0', marginBottom: 24 }}>
          {wizardSteps.map((label, i) => (
            <div key={label} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              position: 'relative',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
                background: i < step ? '#10b981' : i === step ? '#6366f1' : '#f1f5f9',
                color: i <= step ? 'white' : '#94a3b8',
                transition: 'all 0.3s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: i === step ? '#6366f1' : i < step ? '#10b981' : '#94a3b8',
              }}>{label}</span>
              {i < wizardSteps.length - 1 && (
                <div style={{
                  flex: 1, height: 2,
                  background: i < step ? '#10b981' : '#e2e8f0',
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical">
            {step === 0 && (
              <>
                <Form.Item name="title" label="书名" rules={[{ required: true }]}>
                  <Input placeholder="输入小说书名" />
                </Form.Item>
                <Form.Item name="author" label="作者">
                  <Input placeholder="输入作者名称" />
                </Form.Item>
                <Form.Item name="description" label="简介">
                  <Input.TextArea rows={3} placeholder="简单描述一下你的小说" />
                </Form.Item>
                <Form.Item name="output_format" label="输出格式" initialValue="md">
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { value: 'md', label: 'Markdown' },
                      { value: 'txt', label: '纯文本' },
                      { value: 'docx', label: 'Word' },
                    ].map(opt => (
                      <div key={opt.value} onClick={() => form.setFieldsValue({ output_format: opt.value })}
                        style={{
                          flex: 1, padding: '8px 0', textAlign: 'center', cursor: 'pointer',
                          borderRadius: 6, border: '2px solid',
                          borderColor: form.getFieldValue('output_format') === opt.value ? '#6366f1' : '#e2e8f0',
                          color: form.getFieldValue('output_format') === opt.value ? '#6366f1' : '#64748b',
                          fontWeight: form.getFieldValue('output_format') === opt.value ? 600 : 400,
                          background: form.getFieldValue('output_format') === opt.value ? '#eef2ff' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                      >{opt.label}</div>
                    ))}
                  </div>
                </Form.Item>
              </>
            )}

            {step === 1 && (
              <>
                <Form.Item name="genre" label="小说类型" initialValue="玄幻">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['玄幻', '科幻', '都市', '历史', '仙侠', '悬疑', '言情', '轻小说'].map(g => (
                      <Tag key={g} onClick={() => form.setFieldsValue({ genre: g })}
                        style={{
                          padding: '4px 16px', cursor: 'pointer', margin: 0, fontSize: 13,
                          border: '2px solid',
                          borderColor: form.getFieldValue('genre') === g ? '#6366f1' : '#e2e8f0',
                          color: form.getFieldValue('genre') === g ? '#6366f1' : '#64748b',
                          background: form.getFieldValue('genre') === g ? '#eef2ff' : 'transparent',
                          borderRadius: 20,
                        }}
                      >{g}</Tag>
                    ))}
                  </div>
                </Form.Item>
                <Form.Item name="writing_style" label="写作风格" initialValue="平实">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['平实', '华丽', '幽默', '细腻', '简洁', '诗意'].map(s => (
                      <Tag key={s} onClick={() => form.setFieldsValue({ writing_style: s })}
                        style={{
                          padding: '4px 16px', cursor: 'pointer', margin: 0, fontSize: 13,
                          border: '2px solid',
                          borderColor: form.getFieldValue('writing_style') === s ? '#6366f1' : '#e2e8f0',
                          color: form.getFieldValue('writing_style') === s ? '#6366f1' : '#64748b',
                          background: form.getFieldValue('writing_style') === s ? '#eef2ff' : 'transparent',
                          borderRadius: 20,
                        }}
                      >{s}</Tag>
                    ))}
                  </div>
                </Form.Item>
                <Form.Item name="tone" label="语调" initialValue="轻松">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['轻松', '严肃', '温暖', '冷峻', '悬疑', '热血'].map(t => (
                      <Tag key={t} onClick={() => form.setFieldsValue({ tone: t })}
                        style={{
                          padding: '4px 16px', cursor: 'pointer', margin: 0, fontSize: 13,
                          border: '2px solid',
                          borderColor: form.getFieldValue('tone') === t ? '#6366f1' : '#e2e8f0',
                          color: form.getFieldValue('tone') === t ? '#6366f1' : '#64748b',
                          background: form.getFieldValue('tone') === t ? '#eef2ff' : 'transparent',
                          borderRadius: 20,
                        }}
                      >{t}</Tag>
                    ))}
                  </div>
                </Form.Item>
              </>
            )}

            {step === 2 && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>确认项目信息</div>
                {[
                  { label: '书名', value: form.getFieldValue('title') },
                  { label: '作者', value: form.getFieldValue('author') || '（未填）' },
                  { label: '简介', value: form.getFieldValue('description') || '（未填）' },
                  { label: '输出格式', value: ({ md: 'Markdown', txt: '纯文本', docx: 'Word' } as Record<string, string>)[form.getFieldValue('output_format')] },
                  { label: '小说类型', value: form.getFieldValue('genre') },
                  { label: '写作风格', value: form.getFieldValue('writing_style') },
                  { label: '语调', value: form.getFieldValue('tone') },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', padding: '10px 16px', marginBottom: 8,
                    background: '#f8fafc', borderRadius: 8,
                  }}>
                    <span style={{ width: 80, color: '#64748b', fontSize: 13 }}>{item.label}</span>
                    <span style={{ color: '#1e293b', fontWeight: 500, fontSize: 13 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </Form>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0',
          padding: '16px 24px 0',
        }}>
          {step > 0 ? (
            <Button onClick={() => setStep(step - 1)}>← 上一步</Button>
          ) : <div />}
          {step < 2 ? (
            <Button type="primary" onClick={() => {
              if (step === 0) {
                form.validateFields(['title']).then(() => setStep(step + 1)).catch(() => {})
              } else {
                setStep(step + 1)
              }
            }}>
              下一步 →
            </Button>
          ) : (
            <Button type="primary" onClick={handleCreate}>创建项目</Button>
          )}
        </div>
      </Modal>
    </div>
  )
}