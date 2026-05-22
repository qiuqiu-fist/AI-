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

      <Modal title="新建项目" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="书名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="author" label="作者">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="output_format" label="输出格式" initialValue="md">
            <Select options={[
              { value: 'md', label: 'Markdown' },
              { value: 'txt', label: '纯文本' },
              { value: 'docx', label: 'Word' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}