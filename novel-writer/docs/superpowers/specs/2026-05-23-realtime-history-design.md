# SSE 实时推送 + 生成历史记录与统计 设计文档

## 概述

实现 CHANGELOG.md 中「后续改进计划」的两个未完成项：
1. SSE 实时推送替代前端轮询
2. 生成历史记录与统计

已在 v2.0.0 完成：进度百分比显示、批量生成、预览编辑

## 1. SSE 实时推送

### 后端

- 新增 `GET /api/books/{book_id}/generation-events` SSE 端点
- 使用 FastAPI `StreamingResponse` + `text/event-stream`
- 新增内存级 `EventBus` 单例：每个 book_id 对应一个 `asyncio.Queue`
- `_run_generation` / `generate_chapter` 在更新 progress 时同时向对应 Queue 推送事件
- SSE 事件格式：
  - `event: progress` → `{"progress": int, "status": str, "message": str, "started_at": str}`
  - `event: done` → `{"status": "success"|"failed", "chapter_id": int|null, "message": str}`
- 客户端断开时自动清理

### 前端

- 使用浏览器原生 `EventSource` API（零额外依赖）
- 生成开始时连接 SSE，收到 `done` 事件后关闭
- 不再启动 1.5s 轮询 `setInterval`
- 保留 `startPolling()` 作为 SSE fallback（SSE 连接失败时退化到轮询）
- `EventBus` 在 Python 内存中，非持久化

## 2. 生成历史记录

### 后端

- 新增 `GET /api/books/{book_id}/generation-history?limit=50`
- 返回 `{ items: GenerationLog[], stats: Stats }`
- stats 包含：total, success, failed, success_rate, avg_duration_seconds
- GenerationLog 新增 `duration_seconds` 计算字段（completed_at - started_at）

### 前端

- ChapterListPage 新增 Tabs 组件：`章节列表 | 生成历史`
- 历史 Tab：Ant Design Table 展示
  - 列：开始时间、耗时、AI 模型、状态（Tag）、错误信息（Tooltip）
  - 顶部统计卡片：总生成次数、成功率、平均耗时
- 保留章节列表原有 UI 不变

## 架构

```
[Frontend EventSource] ← SSE stream ← [Backend StreamingResponse]
                                          ↕ EventBus (asyncio.Queue)
                                    [_run_generation → generate_chapter]
                                          ↕ DB
                                    [GenerationLog table]

[Frontend History Tab] ← HTTP GET ← [Backend /generation-history]
```

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `backend/app/services/event_bus.py` | 新建：EventBus 单例管理 SSE 队列 |
| `backend/app/routers/chapters.py` | 新增 SSE 端点 + history 端点，_run_generation 推送事件 |
| `backend/app/services/generator.py` | 在 _set_progress 中增加 EventBus 推送 |
| `frontend/src/api/chapters.ts` | 新增 getGenerationHistory API |
| `frontend/src/pages/ChapterListPage.tsx` | 新增 Tabs、SSE 连接、历史表格 |
| `CHANGELOG.md` | 标记已完成的计划项 |