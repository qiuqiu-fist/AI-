import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Form, Input, Tabs, message, Spin, Row, Col,
  Modal, Space, Empty,
} from 'antd'
import {
  BookOutlined, LeftOutlined, SaveOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, UserOutlined,
  OrderedListOutlined, SettingOutlined,
} from '@ant-design/icons'
import { bookApi } from '../api/books'
import { Book, Character } from '../types'

type CharFormData = { name: string; role: string; description: string }

export default function ThemeConfigPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [charModalOpen, setCharModalOpen] = useState(false)
  const [editingChar, setEditingChar] = useState<{ index: number } | null>(null)
  const [charForm] = Form.useForm<CharFormData>()

  const loadBook = async () => {
    try {
      const resp = await bookApi.get(Number(bookId))
      setBook(resp.data)
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBook() }, [bookId])

  const chars: Character[] = book?.theme_config?.characters || []

  const updateChars = (newChars: Character[]) => {
    if (!book) return
    setBook({ ...book, theme_config: { ...book.theme_config, characters: newChars } })
  }

  const openCharModal = (index?: number) => {
    if (index !== undefined) {
      const c = chars[index]
      setEditingChar({ index })
      charForm.setFieldsValue({ name: c.name || '', role: c.role || '', description: c.description || '' })
    } else {
      setEditingChar(null)
      charForm.resetFields()
    }
    setCharModalOpen(true)
  }

  const saveChar = () => {
    const values = charForm.getFieldsValue()
    const newChars = [...chars]
    if (editingChar !== null) {
      newChars[editingChar.index] = { ...newChars[editingChar.index], ...values }
    } else {
      newChars.push({ name: values.name, role: values.role, description: values.description })
    }
    updateChars(newChars)
    setCharModalOpen(false)
  }

  const deleteChar = (index: number) => {
    Modal.confirm({
      title: '确定删除此角色？',
      icon: null,
      content: `即将删除「${chars[index]?.name}」`,
      onOk: () => {
        const newChars = chars.filter((_, i) => i !== index)
        updateChars(newChars)
      },
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await bookApi.update(Number(bookId), { theme_config: book!.theme_config })
      message.success('创作设定已保存')
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
              <BookOutlined style={{ color: '#6366f1' }} />
              创作设定
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {book.title} — 配置小说的创作元素
            </div>
          </div>
        </div>
        <Space>
          <Button icon={<OrderedListOutlined />} onClick={() => navigate(`/books/${bookId}/chapters`)}>
            章节管理
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存全部
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  基础设定
                </span>
              ),
              children: (
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="小说类型 (genre)">
                        <Input
                          value={book.theme_config?.genre}
                          onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, genre: e.target.value } })}
                          placeholder="玄幻、科幻、言情等"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="写作风格 (style)">
                        <Input
                          value={book.theme_config?.style}
                          onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, style: e.target.value } })}
                          placeholder="中国古典仙侠、西方奇幻等"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="语调 (tone)">
                        <Input
                          value={book.theme_config?.tone}
                          onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, tone: e.target.value } })}
                          placeholder="轻松、严肃、幽默等"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: 'outline',
              label: '故事大纲',
              children: (
                <Form.Item label="大纲">
                  <Input.TextArea
                    rows={12}
                    value={book.theme_config?.outline}
                    onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, outline: e.target.value } })}
                    placeholder="输入故事大纲..."
                    style={{ fontFamily: 'inherit' }}
                  />
                </Form.Item>
              ),
            },
            {
              key: 'world',
              label: '世界观',
              children: (
                <Form.Item label="世界观设定">
                  <Input.TextArea
                    rows={12}
                    value={book.theme_config?.world_setting}
                    onChange={(e) => setBook({ ...book, theme_config: { ...book.theme_config, world_setting: e.target.value } })}
                    placeholder="输入世界观设定..."
                    style={{ fontFamily: 'inherit' }}
                  />
                </Form.Item>
              ),
            },
            {
              key: 'characters',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  角色设定
                </span>
              ),
              children: (
                <div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0f0f0',
                  }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>
                      共 {chars.length} 个角色
                    </span>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => openCharModal()}>
                      添加角色
                    </Button>
                  </div>
                  {chars.length === 0 ? (
                    <Empty
                      description="还没有角色，点击「添加角色」创建"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '40px 0' }}
                    >
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openCharModal()}>
                        添加第一个角色
                      </Button>
                    </Empty>
                  ) : (
                    <Row gutter={[12, 12]}>
                      {chars.map((ch, idx) => (
                        <Col xs={24} sm={12} key={idx}>
                          <div style={{
                            display: 'flex', gap: 14, padding: 16,
                            borderRadius: 10, background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            transition: 'all 0.2s',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#f0f0f0' }}
                          >
                            <div style={{
                              width: 44, height: 44, borderRadius: 10,
                              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0,
                            }}>
                              {(ch.name || '?').charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 2 }}>
                                {ch.name || '未命名角色'}
                                {ch.role && (
                                  <span style={{
                                    marginLeft: 8, fontSize: 11, fontWeight: 500,
                                    padding: '1px 8px', borderRadius: 10,
                                    background: '#ede9fe', color: '#5b21b6',
                                  }}>
                                    {ch.role}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginTop: 4, wordBreak: 'break-word' }}>
                                {ch.description || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>暂无描述</span>}
                              </div>
                              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openCharModal(idx)}>
                                  编辑
                                </Button>
                                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteChar(idx)}>
                                  删除
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#6366f1' }} />
            <span>{editingChar !== null ? '编辑角色' : '添加角色'}</span>
          </div>
        }
        open={charModalOpen}
        onOk={saveChar}
        onCancel={() => setCharModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Form form={charForm} layout="vertical" style={{ paddingTop: 8 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入角色姓名' }]}>
            <Input placeholder="例如：张三" />
          </Form.Item>
          <Form.Item name="role" label="身份">
            <Input placeholder="例如：主角、配角、反派" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={4} placeholder="描述角色的性格、外貌、背景故事等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}