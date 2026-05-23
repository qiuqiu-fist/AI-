import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Tag, Space, message, Spin, Modal, InputNumber, Tooltip, Form, Input,
  Progress, Typography, Tabs, Table, Statistic, Row, Col,
} from 'antd'
import {
  LeftOutlined, PlusOutlined, ExportOutlined, OrderedListOutlined,
  ThunderboltOutlined, BookOutlined, SettingOutlined,
  CloseCircleOutlined, CheckCircleOutlined, LoadingOutlined,
  ClockCircleOutlined, SyncOutlined,
} from '@ant-design/icons'
import { chapterApi, GenerationStatus, getGenerationEventsUrl, GenerationLogItem, GenerationStats } from '../api/chapters'
import { Chapter } from '../types'

const { Text } = Typography

const MAX_POLL_ATTEMPTS = 75
const GENERATION_TIMEOUT_MS = 300_000
const POLL_INTERVAL = 1500

function estimatedProgress(startedAt: string | undefined): number {
  if (!startedAt) return 5
  const elapsed = Date.now() - new Date(startedAt).getTime()
  if (elapsed <= 0) return 5
  const ratio = Math.min(elapsed / GENERATION_TIMEOUT_MS, 0.95)
  return Math.round(ratio * 100)
}

function genPhaseLabel(progress: number): string {
  if (progress < 15) return '启动生成任务'
  if (progress < 30) return 'AI 读取上下文'
  if (progress < 80) return 'AI 创作中'
  if (progress < 90) return '整理输出内容'
  return '完成中'
}

function combinedProgress(serverProgress: number | undefined, startedAt: string | undefined): number {
  if (serverProgress && serverProgress > 0) return serverProgress
  return estimatedProgress(startedAt)
}

export default function ChapterListPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const [genProgress, setGenProgress] = useState(0)
  const [genElapsed, setGenElapsed] = useState(0)
  const [genTimedOut, setGenTimedOut] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const genStartRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchCount, setBatchCount] = useState(3)
  const [batchStartFrom, setBatchStartFrom] = useState(1)
  const [batchTitles, setBatchTitles] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [batchCancel, setBatchCancel] = useState(false)
  const [batchDoneCount, setBatchDoneCount] = useState(0)
  const [activeTab, setActiveTab] = useState('chapters')
  const [historyItems, setHistoryItems] = useState<GenerationLogItem[]>([])
  const [historyStats, setHistoryStats] = useState<GenerationStats | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const batchPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const loadChapters = async () => {
    try {
      const resp = await chapterApi.list(Number(bookId))
      setChapters(resp.data)
    } catch (e: unknown) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChapters() }, [bookId])

  const cleanupGen = useCallback(() => {
    if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null }
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (batchPollRef.current) { clearInterval(batchPollRef.current); batchPollRef.current = null }
    pollCountRef.current = 0
    genStartRef.current = 0
  }, [])

  useEffect(() => {
    return () => cleanupGen()
  }, [cleanupGen])

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    const es = new EventSource(getGenerationEventsUrl(Number(bookId)))
    eventSourceRef.current = es

    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setGenerationStatus(prev => ({
          ...prev,
          status: 'running',
          message: data.message || 'AI 正在创作中',
          started_at: data.started_at || prev?.started_at,
          progress: data.progress,
        }))
        setGenProgress(data.progress || 0)
      } catch {}
    })

    es.addEventListener('done', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        es.close()
        eventSourceRef.current = null
        setGenerating(false)
        setGenProgress(100)
        if (data.status === 'success') {
          message.success('章节生成成功')
          loadChapters()
        } else {
          message.error(data.message || '生成失败')
        }
      } catch {}
    })

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      startPolling()
    }
  }, [bookId, loadChapters])

  const startProgressTimer = () => {
    genStartRef.current = Date.now()
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - genStartRef.current
      setGenElapsed(elapsed)
      setGenProgress(combinedProgress(generationStatus?.progress, generationStatus?.started_at))
    }, 1000)
  }

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollCountRef.current = 0
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        cleanupGen()
        setGenerating(false)
        setGenTimedOut(true)
        message.warning('生成状态查询超时，请刷新页面查看结果')
        return
      }
      try {
        const statusResp = await chapterApi.getGenerationStatus(Number(bookId))
        setGenerationStatus(statusResp.data)
        if (statusResp.data.started_at) {
          setGenProgress(combinedProgress(statusResp.data.progress, statusResp.data.started_at))
        }
        if (statusResp.data.status === 'success' || statusResp.data.status === 'failed') {
          cleanupGen()
          setGenerating(false)
          setGenProgress(100)
          if (statusResp.data.status === 'success') {
            message.success('章节生成成功')
            loadChapters()
          } else {
            message.error(statusResp.data.message || '生成失败')
          }
        }
      } catch (e) {
        pollCountRef.current += 10
        if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
          cleanupGen()
          setGenerating(false)
          setGenTimedOut(true)
        }
      }
    }, POLL_INTERVAL)
  }

  const handleCancelGen = () => {
    cleanupGen()
    setGenerating(false)
    setBatchRunning(false)
    setBatchModalOpen(false)
    setGenTimedOut(false)
    message.info('已取消生成')
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const resp = await chapterApi.getGenerationHistory(Number(bookId))
      setHistoryItems(resp.data.items)
      setHistoryStats(resp.data.stats)
    } catch {}
    setHistoryLoading(false)
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setGenProgress(0)
      setGenElapsed(0)
      setGenTimedOut(false)
      setGenerationStatus({ status: 'running', message: '正在启动生成任务...' })
      startProgressTimer()
      await chapterApi.generate(Number(bookId))
      await new Promise(resolve => setTimeout(resolve, 1500))
      connectSSE()
    } catch (e: unknown) {
      cleanupGen()
      setGenerating(false)
      message.error((e as Error).message)
    }
  }

  const handleBatchGenerate = async () => {
    try {
      setBatchRunning(true)
      setBatchCancel(false)
      setBatchDoneCount(0)
      setBatchProgress({ current: 0, total: batchCount })
      setGenerating(true)
      setGenElapsed(0)
      setGenTimedOut(false)
      setGenerationStatus({ status: 'running', message: `启动批量生成 ${batchCount} 章...` })
      startProgressTimer()

      await chapterApi.generateBatch(Number(bookId), batchCount)
      await new Promise(resolve => setTimeout(resolve, 1500))

      let seenDone = new Set<number>()
      const maxWaitLoop = 200
      for (let i = 0; i < maxWaitLoop; i++) {
        if (batchCancel) break
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
        const resp = await chapterApi.getGenerationStatus(Number(bookId))
        setGenerationStatus(resp.data)
        if (resp.data.status === 'success' && resp.data.chapter_id) {
          seenDone.add(resp.data.chapter_id)
        }
        setBatchDoneCount(seenDone.size)
        const pct = Math.min(Math.round((seenDone.size / batchCount) * 100), 99)
        setGenProgress(pct)
        setBatchProgress({ current: Math.min(seenDone.size + 1, batchCount), total: batchCount })
        if (resp.data.status !== 'running') {
          break
        }
      }
      finishBatch()
    } catch (e: unknown) {
      finishBatch()
      message.error((e as Error).message)
    }
  }

  const finishBatch = () => {
    if (batchPollRef.current) { clearInterval(batchPollRef.current); batchPollRef.current = null }
    cleanupGen()
    setBatchRunning(false)
    setGenerating(false)
    setBatchModalOpen(false)
    setGenProgress(100)
    if (!batchCancel) {
      message.success(`批量生成完成，共 ${batchCount} 章`)
    }
    loadChapters()
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

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m${sec}s` : `${sec}s`
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
          <Button icon={<SettingOutlined />} onClick={() => navigate(`/books/${bookId}/settings`)}>项目设置</Button>
          <Button icon={<BookOutlined />} onClick={() => navigate(`/books/${bookId}/themes`)}>创作设定</Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={key => {
            setActiveTab(key)
            if (key === 'history') loadHistory()
          }}
          items={[
            {
              key: 'chapters',
              label: <span><OrderedListOutlined /> 章节列表</span>,
              children: (
                <>
                  {/* Generation Progress Bar */}
                  {(generating || genTimedOut) && (
                    <div style={{
                      marginBottom: 16, padding: '16px 20px',
                      borderRadius: 10,
                      background: genTimedOut
                        ? 'linear-gradient(135deg, #fef2f2, #fff)'
                        : 'linear-gradient(135deg, #eef2ff, #f0fdfa)',
                      border: `1px solid ${genTimedOut ? '#fecaca' : '#c7d2fe'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {genTimedOut ? (
                            <CloseCircleOutlined style={{ fontSize: 16, color: '#ef4444' }} />
                          ) : genProgress >= 100 ? (
                            <CheckCircleOutlined style={{ fontSize: 16, color: '#10b981' }} />
                          ) : (
                            <LoadingOutlined style={{ fontSize: 16, color: '#6366f1' }} />
                          )}
                          <div>
                            <Text strong style={{ fontSize: 14, color: genTimedOut ? '#dc2626' : '#4f46e5' }}>
                              {genTimedOut ? '生成状态查询超时' : genProgress >= 100 ? '生成完成' : '正在生成章节'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                              {genTimedOut ? '请刷新页面查看结果' : `${formatElapsed(genElapsed)}`}
                            </Text>
                          </div>
                        </div>
                        <Space size="small">
                          {!genTimedOut && (
                            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={handleCancelGen}>
                              取消
                            </Button>
                          )}
                          {genTimedOut && (
                            <Button size="small" onClick={() => { setGenTimedOut(false); loadChapters() }}>
                              刷新状态
                            </Button>
                          )}
                        </Space>
                      </div>
                      {!genTimedOut && (
                        <>
                          <Progress
                            percent={genProgress}
                            strokeColor={{ from: '#6366f1', to: '#06b6d4' }}
                            trailColor="#e0e7ff"
                            size="small"
                            format={() => `${genProgress}%`}
                          />
                          <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{genPhaseLabel(genProgress)}</span>
                            <span>{generationStatus?.message || 'AI 正在创作中'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <Space>
                      <Tooltip title="批量生成多章，可设置数量和标题">
                        <Button icon={<ThunderboltOutlined />} disabled={generating || batchRunning} onClick={() => {
                          setBatchCount(3)
                          setBatchStartFrom(chapters.length + 1)
                          setBatchTitles('')
                          setBatchModalOpen(true)
                        }}>
                          批量生成
                        </Button>
                      </Tooltip>
                      <Button type="primary" onClick={handleGenerate} loading={generating} disabled={generating || batchRunning} icon={<PlusOutlined />}>
                        {generating ? '生成中...' : '生成下一章'}
                      </Button>
                      <Button onClick={handleExportAll} icon={<ExportOutlined />}>导出全书</Button>
                    </Space>
                  </div>

                  {/* Chapter List or Empty State */}
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
                            <Button type="link" size="small" onClick={() => navigate(`/books/${bookId}/chapters/${ch.id}`)}>编辑</Button>
                            <Button type="link" size="small" onClick={() => handleExportChapter(ch)}>导出</Button>
                          </Space>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'history',
              label: <span><ClockCircleOutlined /> 生成历史</span>,
              children: (
                <>
                  {historyStats && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="总生成次数" value={historyStats.total} suffix="次" />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="成功" value={historyStats.success} valueStyle={{ color: '#10b981' }} suffix={`/ ${historyStats.total}`} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="成功率" value={historyStats.success_rate} precision={1} suffix="%" valueStyle={{ color: historyStats.success_rate >= 80 ? '#10b981' : '#f59e0b' }} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="平均耗时" value={historyStats.avg_duration_seconds} suffix="秒" />
                        </Card>
                      </Col>
                    </Row>
                  )}
                  <Table
                    dataSource={historyItems}
                    rowKey="id"
                    loading={historyLoading}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    columns={[
                      {
                        title: '开始时间', dataIndex: 'started_at', key: 'started_at', width: 160,
                        render: (v: string) => v ? new Date(v).toLocaleString() : '-',
                      },
                      {
                        title: '耗时', dataIndex: 'duration_seconds', key: 'duration', width: 80,
                        render: (v: number | null) => v != null ? `${v}s` : '-',
                      },
                      {
                        title: 'AI 模型', key: 'model', width: 160,
                        render: (_: unknown, r: GenerationLogItem) => `${r.ai_provider || '-'} / ${r.model_name || '-'}`,
                      },
                      {
                        title: '状态', dataIndex: 'status', key: 'status', width: 100,
                        render: (s: string) => {
                          const map: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
                            success: { color: 'success', icon: <CheckCircleOutlined />, text: '成功' },
                            failed: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
                            running: { color: 'processing', icon: <SyncOutlined spin />, text: '运行中' },
                          }
                          const m = map[s] || { color: 'default', icon: null, text: s }
                          return <Tag icon={m.icon} color={m.color}>{m.text}</Tag>
                        },
                      },
                      {
                        title: '错误信息', dataIndex: 'error_message', key: 'error', ellipsis: true,
                        render: (v: string) => v ? <Tooltip title={v}><span style={{ color: '#ef4444' }}>{v.length > 30 ? v.slice(0, 30) + '...' : v}</span></Tooltip> : '-',
                      },
                    ]}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Batch Generation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#6366f1' }} />
            <span>{batchRunning ? '批量生成中' : '批量生成章节'}</span>
          </div>
        }
        open={batchModalOpen}
        onCancel={() => !batchRunning && setBatchModalOpen(false)}
        closable={!batchRunning}
        maskClosable={!batchRunning}
        footer={
          batchRunning
            ? [
                <Button key="cancel" danger icon={<CloseCircleOutlined />} onClick={() => {
                  setBatchCancel(true)
                  message.info('正在取消...')
                }}>
                  取消剩余生成
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setBatchModalOpen(false)}>取消</Button>,
                <Button key="gen" type="primary" onClick={handleBatchGenerate} icon={<ThunderboltOutlined />}>
                  开始批量生成
                </Button>,
              ]
        }
        width={520}
      >
        <div style={{ padding: '8px 0' }}>
          {batchRunning ? (
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <LoadingOutlined style={{ fontSize: 18, color: '#6366f1' }} />
                <Text strong>
                  正在生成第 {batchProgress.current}/{batchProgress.total} 章
                </Text>
              </div>
              <Progress
                percent={Math.round((batchProgress.current / batchProgress.total) * 100)}
                strokeColor={{ from: '#6366f1', to: '#06b6d4' }}
                trailColor="#e0e7ff"
                format={() => `${batchProgress.current}/${batchProgress.total}`}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                {batchCancel ? '正在等待当前生成完成后停止...' : 'AI 正在创作中，请稍候...'}
              </div>
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