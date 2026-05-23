# SSE 实时推送 + 生成历史记录与统计 实现计划

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 SSE 实时推送替代前端轮询 + 生成历史记录与统计

**Architecture:**
- 后端新增 EventBus 内存单例，`generate_chapter` 更新进度时通过 EventBus 推送事件，SSE 端点从 EventBus 读取并流式推送
- 后端新增 `/generation-history` REST 端点，返回 GenerationLog 列表 + 聚合统计
- 前端使用浏览器原生 `EventSource` 替代 `setInterval` 轮询，保留轮询为 fallback
- 前端 ChapterListPage 新增 Tabs 切换（章节列表 | 生成历史）

**Tech Stack:** FastAPI StreamingResponse, browser EventSource (no extra deps), Ant Design Tabs + Table + Statistic

---

### Task 1: EventBus 服务

**Files:**
- Create: `backend/app/services/event_bus.py`

- [ ] **Step 1: Create EventBus singleton**

```python
import asyncio
from typing import Dict


class EventBus:
    _instance: "EventBus | None" = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._queues: Dict[int, asyncio.Queue] = {}
        return cls._instance

    def subscribe(self, book_id: int) -> asyncio.Queue:
        if book_id not in self._queues:
            self._queues[book_id] = asyncio.Queue()
        return self._queues[book_id]

    def unsubscribe(self, book_id: int):
        self._queues.pop(book_id, None)

    async def publish(self, book_id: int, event: str, data: dict):
        q = self._queues.get(book_id)
        if q:
            await q.put((event, data))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/event_bus.py
git commit -m "feat: add EventBus singleton for SSE real-time push"
```

---

### Task 2: 后端 SSE 端点 + 历史端点

**Files:**
- Modify: `backend/app/routers/chapters.py`

- [ ] **Step 1: Add SSE streaming endpoint**

Add import at top:
```python
from fastapi.responses import StreamingResponse
from app.services.event_bus import EventBus
import json
```

Add SSE endpoint:
```python
@router.get("/books/{book_id}/generation-events")
async def generation_events(book_id: int):
    event_bus = EventBus()

    async def event_stream():
        queue = event_bus.subscribe(book_id)
        try:
            while True:
                event, data = await queue.get()
                yield f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                if event == "done":
                    break
        finally:
            event_bus.unsubscribe(book_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
```

- [ ] **Step 2: Add generation history endpoint**

```python
@router.get("/books/{book_id}/generation-history")
def get_generation_history(book_id: int, limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(GenerationLog).filter(
        GenerationLog.book_id == book_id
    ).order_by(GenerationLog.started_at.desc()).limit(limit).all()

    items = []
    for log in logs:
        duration = None
        if log.started_at and log.completed_at:
            duration = int((log.completed_at - log.started_at).total_seconds())
        items.append({
            "id": log.id,
            "status": log.status,
            "progress": log.progress or 0,
            "ai_provider": log.ai_provider,
            "model_name": log.model_name,
            "chapter_id": log.chapter_id,
            "error_message": log.error_message,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
            "duration_seconds": duration,
        })

    total = len(logs)
    success_count = sum(1 for l in logs if l.status == "success")
    failed_count = sum(1 for l in logs if l.status == "failed")
    durations = [i["duration_seconds"] for i in items if i["duration_seconds"]]

    stats = {
        "total": total,
        "success": success_count,
        "failed": failed_count,
        "success_rate": round((success_count / total * 100) if total > 0 else 0, 1),
        "avg_duration_seconds": round(sum(durations) / len(durations), 1) if durations else 0,
    }

    return {"items": items, "stats": stats}
```

- [ ] **Step 3: Update `_run_generation` to publish SSE events**

```python
async def _run_generation(book_id: int):
    db = SessionLocal()
    event_bus = EventBus()
    try:
        await generate_chapter(book_id, db)
        event_bus.publish(book_id, "done", {"status": "success", "message": "生成成功"})
    except Exception:
        try:
            log = db.query(GenerationLog).filter(
                GenerationLog.book_id == book_id,
                GenerationLog.status == "running"
            ).order_by(GenerationLog.started_at.desc()).first()
            if log:
                log.status = "failed"
                log.error_message = "后台生成失败"
                log.completed_at = datetime.datetime.utcnow()
                db.commit()
        except Exception:
            pass
        event_bus.publish(book_id, "done", {"status": "failed", "message": "后台生成失败"})
    finally:
        db.close()
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/chapters.py
git commit -m "feat: add SSE endpoint and generation-history API"
```

---

### Task 3: generator.py 集成 EventBus 推送

**Files:**
- Modify: `backend/app/services/generator.py`

- [ ] **Step 1: Add EventBus import and update `_set_progress` to also push SSE events**

```python
from app.services.event_bus import EventBus
```

Update `_set_progress` to accept `book_id` and push events:
```python
_event_bus = EventBus()

def _set_progress(db: Session, log_id: int, book_id: int, progress: int):
    db.query(GenerationLog).filter(GenerationLog.id == log_id).update(
        {"progress": progress}
    )
    db.commit()
    _event_bus.publish(book_id, "progress", {
        "progress": progress,
        "status": "running",
    })
```

Update all `_set_progress` calls to pass `book_id`:
```python
_set_progress(db, log_id, book_id, 15)
_set_progress(db, log_id, book_id, 30)
# ... etc
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/generator.py
git commit -m "feat: integrate EventBus progress push into generator"
```

---

### Task 4: 前端 API 更新

**Files:**
- Modify: `frontend/src/api/chapters.ts`

- [ ] **Step 1: Add `getGenerationHistory` API and SSE URL helper**

```typescript
export const chapterApi = {
  // ... existing methods ...
  getGenerationHistory: (bookId: number, limit = 50) =>
    client.get<{ items: GenerationLogItem[]; stats: GenerationStats }>(
      `/books/${bookId}/generation-history?limit=${limit}`
    ),
}

export interface GenerationLogItem {
  id: number
  status: string
  progress: number
  ai_provider: string
  model_name: string
  chapter_id: number | null
  error_message: string
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
}

export interface GenerationStats {
  total: number
  success: number
  failed: number
  success_rate: number
  avg_duration_seconds: number
}

export function getGenerationEventsUrl(bookId: number): string {
  return `${window.location.protocol}//${window.location.host}/api/books/${bookId}/generation-events`
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/chapters.ts
git commit -m "feat: add generation history API and SSE URL helper"
```

---

### Task 5: 前端 SSE 连接替换轮询

**Files:**
- Modify: `frontend/src/pages/ChapterListPage.tsx`

- [ ] **Step 1: Add EventSource import and SSE ref**

```typescript
import { chapterApi, GenerationStatus, getGenerationEventsUrl, GenerationLogItem, GenerationStats } from '../api/chapters'

const eventSourceRef = useRef<EventSource | null>(null)
```

- [ ] **Step 2: Replace polling with SSE in `handleGenerate`**

```typescript
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
```

Update `handleGenerate`:
```typescript
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
```

Update `cleanupGen`:
```typescript
const cleanupGen = useCallback(() => {
  if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null }
  if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
  if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
  if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  if (batchPollRef.current) { clearInterval(batchPollRef.current); batchPollRef.current = null }
  pollCountRef.current = 0
  genStartRef.current = 0
}, [])
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ChapterListPage.tsx
git commit -m "feat: replace polling with SSE real-time push for generation status"
```

---

### Task 6: 前端历史 Tab 页面

**Files:**
- Modify: `frontend/src/pages/ChapterListPage.tsx`

- [ ] **Step 1: Add Tabs, history state, and data loading**

Add imports (if not already imported):
```typescript
import { Tabs, Table, Statistic, Row, Col, Tooltip } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons'
```

Add state:
```typescript
const [activeTab, setActiveTab] = useState('chapters')
const [historyItems, setHistoryItems] = useState<GenerationLogItem[]>([])
const [historyStats, setHistoryStats] = useState<GenerationStats | null>(null)
const [historyLoading, setHistoryLoading] = useState(false)
```

Add load function:
```typescript
const loadHistory = async () => {
  setHistoryLoading(true)
  try {
    const resp = await chapterApi.getGenerationHistory(Number(bookId))
    setHistoryItems(resp.data.items)
    setHistoryStats(resp.data.stats)
  } catch {}
  setHistoryLoading(false)
}
```

- [ ] **Step 2: Wrap content in Tabs component**

Replace the outer wrapping:
```tsx
return (
  <div style={{ maxWidth: 900, margin: '0 auto' }}>
    {/* ...header unchanged... */}
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
                {/* existing progress bar */}
                {/* existing toolbar */}
                {/* existing chapter list */}
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
                    <Col span={6}><Card><Statistic title="总生成次数" value={historyStats.total} suffix="次" /></Card></Col>
                    <Col span={6}><Card><Statistic title="成功" value={historyStats.success} valueStyle={{ color: '#10b981' }} suffix={`/ ${historyStats.total}`} /></Card></Col>
                    <Col span={6}><Card><Statistic title="成功率" value={historyStats.success_rate} precision={1} suffix="%" valueStyle={{ color: historyStats.success_rate >= 80 ? '#10b981' : '#f59e0b' }} /></Card></Col>
                    <Col span={6}><Card><Statistic title="平均耗时" value={historyStats.avg_duration_seconds} suffix="秒" /></Card></Col>
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
  </div>
)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ChapterListPage.tsx
git commit -m "feat: add generation history tab with stats and table"
```

---

### Task 7: 更新 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update 后续改进计划 to mark completed items**

Replace:
```
### 后续改进计划

1. [ ] 添加WebSocket支持，实现真正的实时推送
2. [ ] 添加生成进度百分比显示
3. [ ] 添加生成历史记录和统计
4. [ ] 支持批量生成多个章节
5. [ ] 添加生成内容的预览和编辑功能
```

With:
```
### 后续改进计划

- [x] 添加WebSocket支持，实现真正的实时推送 （v3.0.0 已实现 SSE 实时推送）
- [x] 添加生成进度百分比显示 （v2.0.0 已实现）
- [x] 添加生成历史记录和统计 （v3.0.0 已实现）
- [x] 支持批量生成多个章节 （v2.0.0 已实现）
- [x] 添加生成内容的预览和编辑功能 （v1.0.0 已实现）
```

Also add new version section at top:
```
## SSE 实时推送 + 生成历史统计 (v3.0.0)

### 新增功能

#### 1. SSE 实时推送
- **文件**: `backend/app/services/event_bus.py`, `backend/app/routers/chapters.py`, `backend/app/services/generator.py`, `frontend/src/pages/ChapterListPage.tsx`
- **功能**:
  - 使用 SSE (Server-Sent Events) 替代前端 1.5s 轮询，实现真正的实时推送
  - EventBus 内存单例管理各书籍的订阅队列
  - 生成进度变化立即推送至前端，无延迟
  - 前端使用浏览器原生 EventSource API，零额外依赖
  - SSE 断开时自动退化到轮询模式

#### 2. 生成历史记录与统计
- **文件**: `backend/app/routers/chapters.py`, `frontend/src/pages/ChapterListPage.tsx`
- **功能**:
  - 章节管理页新增「生成历史」Tab 页
  - 展示每次生成的详细记录（开始时间、耗时、AI 模型、状态、错误信息）
  - 顶部统计卡片：总生成次数、成功数、成功率、平均耗时
  - 支持分页浏览历史记录
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v3.0.0 SSE + history features"
```

---

### Task 8: 验证编译

- [ ] **Step 1: Frontend TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: exit code 0

- [ ] **Step 2: Backend Python compile check**

Run: `python -m py_compile backend/app/services/event_bus.py && python -m py_compile backend/app/routers/chapters.py && python -m py_compile backend/app/services/generator.py`
Expected: exit code 0

- [ ] **Step 3: Frontend production build**

Run: `cd frontend && npx vite build`
Expected: exit code 0

---

### Task 9: 推送到 Git

- [ ] **Step 1: Push to remote**

```bash
cd /workspace/novel-writer && git push origin main
```