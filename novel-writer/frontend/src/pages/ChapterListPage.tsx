import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Tag, Space, message, Spin, Modal, InputNumber, Tooltip, Form, Input,
} from 'antd'
import {
  LeftOutlined, PlusOutlined, ExportOutlined, OrderedListOutlined,
  ThunderboltOutlined, BookOutlined, SettingOutlined,
} from '@ant-design/icons'
import { chapterApi, GenerationStatus } from '../api/chapters'
import { Chapter } from '../types'

export default function ChapterListPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchCount, setBatchCount] = useState(3)
  const [batchStartFrom, setBatchStartFrom] = useState(1)
  const [batchTitles, setBatchTitles] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  const loadChapters = async () => {
    try {
      const resp = await chapterApi.list(Number(bookId))
      setChapters(resp.data)
    } catch (e: unknown) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChapters() }, [bookId])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResp = await chapterApi.getGenerationStatus(Number(bookId))
        setGenerationStatus(statusResp.data)
        if (statusResp.data.status === 'success' || statusResp.data.status === 'failed') {
          if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
          setGenerating(false)
          if (statusResp.data.status === 'success') { message.success('章节生成成功'); loadChapters() }
          else message.error(statusResp.data.message)
        }
      } catch (e) { console.error('轮询失败:', e) }
    }, 2000)
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setGenerationStatus({ status: 'running', message: '正在启动生成任务...' })
      await chapterApi.generate(Number(bookId))
      startPolling()
    } catch (e: unknown) {
      setGenerating(false)
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
      message.error((e as Error).message)
    }
  }

  const handleBatchGenerate = async () => {
    try {
      setBatchRunning(true)
      setBatchProgress({ current: 0, total: batchCount })
      for (let i = 0; i < batchCount; i++) {
        setBatchProgress({ current: i + 1, total: batchCount })
        setGenerationStatus({ status: 'running', message: `第 ${i + 1}/${batchCount} 章` })
        await chapterApi.generate(Number(bookId))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      setBatchRunning(false)
      setBatchModalOpen(false)
      message.success(`成功触发 ${batchCount} 章生成`)
      loadChapters()
    } catch (e: unknown) {
      setBatchRunning(false)
      message.error((e as Error).message)
    }
  }

  const handleExportAll = async () => {
    try {
      await chapterApi.exportAll(Number(bookId))
      message.success('全书导出成功')
    } catch (e: unknown) { message.error((e as Error).message) }
  }

  const handleExportChapter = async (ch: Chapter) => {
    try {
      await chapterApi.export(Number(bookId), ch.id)
      message.success('导出成功')
    } catch (e: unknown) { message.error((e as Error).message) }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 120 }} />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => navigate(`/books/${bookId}`)} style={{ color: '#64748b' }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <OrderedListOutlined style={{ color: '#6366f1' }} />
              章节管理
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              共 {chapters.length} 章 · 管理章节的生成、编辑和导出
            </div>
          </div>
        </div>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => navigate(`/books/${bookId}/settings`)}>
            项目设置
          </Button>
          <Button icon={<BookOutlined />} onClick={() => navigate(`/books/${bookId}/themes`)}>
            创作设定
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space>
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
          {generating && generationStatus && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #eef2ff, #f0fdfa)',
              border: '1px solid #c7d2fe', borderRadius: 8, padding: '6px 12px',
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
        </div>

        {chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>还没有章节</div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>点击「生成下一章」开始创作你的故事</div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate} loading={generating}>
              生成第一章
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chapters.map((ch, idx) => (
              <div key={ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: '#fafafa', borderRadius: 8,
                cursor: 'pointer', transition: 'all 0.2s',
                borderLeft: `3px solid ${ch.status === 'exported' ? '#10b981' : '#6366f1'}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: '#eef2ff', color: '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {String(ch.chapter_number || (idx + 1)).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                    {ch.title || `第 ${ch.chapter_number || idx + 1} 章`}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 12, alignItems: 'center' }}>
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
          <Button key="cancel" disabled={batchRunning} onClick={() => setBatchModalOpen(false)}>取消</Button>,
          <Button key="gen" type="primary" loading={batchRunning} disabled={batchRunning}
            onClick={handleBatchGenerate} icon={<ThunderboltOutlined />}>
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
              <div style={{ fontSize: 13, color: '#64748b' }}>AI 正在创作中，请稍候...</div>
            </div>
          ) : (
            <Form layout="vertical">
              <Form.Item label="生成数量" help="每次最多可批量生成 10 章">
                <InputNumber min={1} max={10} value={batchCount} onChange={v => setBatchCount(v || 1)} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="起始章节号">
                <InputNumber min={1} value={batchStartFrom} onChange={v => setBatchStartFrom(v || 1)} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="章节标题（可选）" help="每行一个标题，留空使用自动编号">
                <Input.TextArea rows={4} value={batchTitles} onChange={e => setBatchTitles(e.target.value)}
                  placeholder={'第一章：初入江湖\n第二章：神秘邂逅\n第三章：风云突变'} />
              </Form.Item>
            </Form>
          )}
        </div>
      </Modal>
    </div>
  )
}