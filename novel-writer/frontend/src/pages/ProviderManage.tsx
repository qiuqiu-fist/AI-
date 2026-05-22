import { useEffect, useState } from 'react'
import { Card, Button, Table, Modal, Form, Input, InputNumber, Select, Switch, message, Tag, Space, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { providerApi } from '../api/providers'
import { AIConfig, ProviderType } from '../types'

export default function ProviderManage() {
  const [configs, setConfigs] = useState<AIConfig[]>([])
  const [types, setTypes] = useState<ProviderType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [testing, setTesting] = useState<number | null>(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    try {
      const [cfgResp, typesResp] = await Promise.all([
        providerApi.list(),
        providerApi.listTypes(),
      ])
      setConfigs(cfgResp.data)
      setTypes(typesResp.data)
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await providerApi.update(editingId, values)
      } else {
        await providerApi.create(values)
      }
      message.success(editingId ? '更新成功' : '添加成功')
      setModalOpen(false)
      form.resetFields()
      setEditingId(null)
      loadData()
    } catch (e: unknown) {
      if ((e as Error).message) message.error((e as Error).message)
    }
  }

  const openEdit = (config: AIConfig) => {
    setEditingId(config.id)
    form.setFieldsValue(config)
    setModalOpen(true)
  }

  const handleTest = async (id: number) => {
    setTesting(id)
    try {
      const resp = await providerApi.test(id)
      message.success(resp.data.message)
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setTesting(null)
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'display_name', key: 'display_name' },
    {
      title: '类型', dataIndex: 'provider_name', key: 'provider_name',
      render: (v: string) => types.find(t => t.name === v)?.display_name || v,
    },
    {
      title: '默认', dataIndex: 'is_default', key: 'is_default',
      render: (v: boolean) => v ? <Tag color="blue">默认</Tag> : null,
    },
    {
      title: '状态', dataIndex: 'enabled', key: 'enabled',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '已启用' : '已禁用'}</Tag>,
    },
    { title: '模型', dataIndex: 'model_name', key: 'model_name' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, r: AIConfig) => (
        <Space>
          <Button type="link" onClick={() => openEdit(r)}>编辑</Button>
          <Button type="link" loading={testing === r.id} onClick={() => handleTest(r.id)}>测试</Button>
          {!r.is_default && (
            <Button type="link" onClick={async () => {
              await providerApi.setDefault(r.id)
              message.success('已设为默认')
              loadData()
            }}>设为默认</Button>
          )}
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await providerApi.delete(r.id)
            message.success('删除成功')
            loadData()
          }}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const providerType = Form.useWatch('provider_name', form)

  return (
    <div>
      <Card
        title="AI 来源管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>添加 AI 来源</Button>}
      >
        <Table dataSource={configs} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editingId ? '编辑 AI 来源' : '添加 AI 来源'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingId(null) }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="provider_name" label="类型" rules={[{ required: true }]}>
            <Select options={types.map(t => ({ value: t.name, label: t.display_name }))} />
          </Form.Item>
          <Form.Item name="display_name" label="显示名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="api_base_url" label="API 地址">
            <Input placeholder={providerType === 'ollama' ? 'http://localhost:11434' : 'https://api.deepseek.com'} />
          </Form.Item>
          <Form.Item name="api_key" label="API Key">
            <Input.Password placeholder="留空则不修改" />
          </Form.Item>
          <Form.Item name="model_name" label="模型名">
            <Input placeholder={providerType === 'deepseek' ? 'deepseek-chat' : '留空使用默认'} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="max_tokens" label="最大 Token">
              <InputNumber min={256} max={32768} />
            </Form.Item>
            <Form.Item name="temperature" label="温度">
              <InputNumber min={0} max={2} step={0.1} />
            </Form.Item>
            <Form.Item name="top_p" label="Top P">
              <InputNumber min={0} max={1} step={0.1} />
            </Form.Item>
          </Space>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}