import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input, Space, Spin, message, Descriptions } from 'antd'
import ReactMarkdown from 'react-markdown'
import { chapterApi } from '../api/chapters'
import { Chapter } from '../types'

export default function ChapterEditor() {
  const { bookId, chapterId } = useParams()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const resp = await chapterApi.get(Number(chapterId))
        setChapter(resp.data)
        setContent(resp.data.content)
        setTitle(resp.data.title)
      } catch (e: unknown) {
        message.error((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [chapterId])

  const handleSave = async () => {
    try {
      await chapterApi.update(Number(chapterId), { title, content })
      message.success('保存成功')
      setEditMode(false)
      setChapter((prev) => prev ? { ...prev, title, content } : prev)
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  const handleRegenerate = async () => {
    try {
      await chapterApi.regenerate(Number(chapterId))
      message.success('重新生成成功')
      const resp = await chapterApi.get(Number(chapterId))
      setChapter(resp.data)
      setContent(resp.data.content)
      setTitle(resp.data.title)
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  const handleExport = async () => {
    try {
      await chapterApi.export(Number(bookId), Number(chapterId))
      message.success('导出成功')
    } catch (e: unknown) {
      message.error((e as Error).message)
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />
  if (!chapter) return <div>章节不存在</div>

  return (
    <div>
      <Card title={
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ fontSize: 18, fontWeight: 'bold', border: 'none', outline: 'none' }}
          placeholder="章节标题"
        />
      }
        extra={
          <Space>
            <Button onClick={() => navigate(`/books/${bookId}`)}>返回</Button>
            <Button onClick={handleRegenerate}>重新生成</Button>
            <Button onClick={handleExport}>导出</Button>
            <Button type="primary" onClick={() => setEditMode(!editMode)}>
              {editMode ? '预览' : '编辑'}
            </Button>
            {editMode && <Button type="primary" onClick={handleSave}>保存</Button>}
          </Space>
        }
      >
        <Descriptions size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="AI 来源">{chapter.ai_provider || '-'}</Descriptions.Item>
          <Descriptions.Item label="模型">{chapter.model_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="字数">{chapter.word_count}</Descriptions.Item>
          <Descriptions.Item label="生成日期">{chapter.generated_date}</Descriptions.Item>
        </Descriptions>

        {editMode ? (
          <Input.TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            style={{ fontFamily: 'monospace', fontSize: 14 }}
          />
        ) : (
          <div style={{ padding: '0 16px', lineHeight: 1.8, fontSize: 15 }}>
            <ReactMarkdown>{content || '*暂无内容*'}</ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  )
}