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

        {/* Editor stats bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 16px', height: 40,
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontSize: 13, color: '#64748b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#10b981', display: 'inline-block',
            }} />
            已自动保存
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            📏 <span style={{ color: '#1e293b', fontWeight: 600 }}>{(chapter?.content || '').length}</span> 字
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            🔄 {chapter?.ai_provider || '-'}
          </div>
        </div>

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

        {/* Writing goal */}
        <div style={{
          marginTop: 16, padding: 16, background: '#fafafa',
          borderRadius: 8, border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>今日写作目标</span>
            <span><strong>{(chapter?.content || '').length}</strong> / 2,000 字</span>
          </div>
          <div style={{
            height: 4, background: '#e2e8f0', borderRadius: 2,
            marginTop: 8, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
              width: `${Math.min(100, ((chapter?.content || '').length / 2000) * 100)}%`,
              transition: 'width 0.5s',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12, color: '#64748b', marginTop: 6,
          }}>
            <span>目标达成 {Math.round(Math.min(100, ((chapter?.content || '').length / 2000) * 100))}%</span>
            <span>还差 {Math.max(0, 2000 - (chapter?.content || '').length)} 字</span>
          </div>
        </div>
      </Card>
    </div>
  )
}