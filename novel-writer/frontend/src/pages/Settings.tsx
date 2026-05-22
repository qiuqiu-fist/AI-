import { useEffect, useState } from 'react'
import { Card, Descriptions, Spin, message } from 'antd'
import { systemApi } from '../api/system'
import { SystemStatus } from '../types'

export default function Settings() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const resp = await systemApi.status()
        setStatus(resp.data)
      } catch (e: unknown) {
        message.error((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />
  if (!status) return <div>无法获取系统状态</div>

  return (
    <div>
      <Card title="系统信息">
        <Descriptions column={2}>
          <Descriptions.Item label="应用名称">{status.app_name}</Descriptions.Item>
          <Descriptions.Item label="版本">{status.version}</Descriptions.Item>
          <Descriptions.Item label="数据库大小">{status.db_size}</Descriptions.Item>
          <Descriptions.Item label="书籍数量">{status.books_count}</Descriptions.Item>
          <Descriptions.Item label="章节数量">{status.chapters_count}</Descriptions.Item>
          <Descriptions.Item label="活跃定时任务">{status.active_schedules}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="使用说明" style={{ marginTop: 16 }}>
        <ol style={{ lineHeight: 2, fontSize: 14 }}>
          <li><strong>添加 AI 来源</strong> — 在「AI 来源」页面添加 DeepSeek / Ollama / OpenAI 兼容接口的 API 配置</li>
          <li><strong>创建项目</strong> — 在「我的项目」页面新建一个书籍项目，填写书名和简介</li>
          <li><strong>配置主题</strong> — 在项目详情页设置小说类型、大纲、角色、世界观等</li>
          <li><strong>手动生成</strong> — 点击「生成下一章」触发 AI 写作</li>
          <li><strong>自动定时</strong> — 开启定时生成并设置时间，应用运行时每天自动生成</li>
          <li><strong>导出内容</strong> — 支持导出为 Markdown、TXT 或 Word 格式到指定文件夹</li>
          <li><strong>文件夹配置</strong> — 在输出文件夹中放置 novel-config.json 可覆盖网页配置</li>
        </ol>
      </Card>
    </div>
  )
}