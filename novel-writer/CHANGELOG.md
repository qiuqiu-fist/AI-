# 修复和改进日志

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

### 设计文档
- `docs/superpowers/specs/2026-05-23-realtime-history-design.md`

## 并发批量生成 + 实时进度追踪 (v2.0.0)

### 主要改进内容

#### 1. 后端：并发批量生成章节
- **文件**: `backend/app/routers/chapters.py`
- **新增**:
  - `POST /api/books/{book_id}/generate-batch?count=N` — 一次启动 N 个并发异步生成任务
  - 批量生成不再顺序执行，N 章耗时 ≈ 单章耗时（约 60s）
- **效果**: 批量生成 3 章从 ~180s 缩短至 ~60s（3x 提升），生成 5 章从 ~300s 缩短至 ~60s（5x 提升）

#### 2. 后端：实时进度上报
- **文件**:
  - `backend/app/models/generation_log.py` — 新增 `progress` 字段（Integer, 0-100）
  - `backend/app/services/generator.py` — 生成过程分阶段上报进度
  - `backend/app/routers/chapters.py` — `/generation-status` 返回 `progress` 字段
- **进度阶段**:
  - 10%: 读取书籍/AI配置
  - 15%: 加载已有章节上下文
  - 30%: 调用 AI API 开始创作
  - 80%: AI 返回内容
  - 90%: 保存章节 + 导出
  - 100%: 完成

#### 3. 后端：定时调度并发生成
- **文件**: `backend/app/services/scheduler.py`
- **修改**: 每天定时生成多章时，使用 `asyncio.gather()` 并发执行，不再顺序循环
- 新增 `_gen_single_chapter()` 辅助函数，每个并发任务使用独立 DB session

#### 4. 前端：并发批量触发 + 实时进度展示
- **文件**:
  - `frontend/src/api/chapters.ts` — 新增 `generateBatch()` API
  - `frontend/src/pages/ChapterListPage.tsx` — 全面重构批量生成逻辑
- **主要修改**:
  - 批量生成改为一次调用后端并发端点，不再前端顺序循环
  - 优先显示服务器真实进度，无服务器进度时回退到时间估算
  - 轮询频率从 2s 提升至 1.5s
  - 批量进度显示已完成章节数（如 2/3）
  - 新增 `combinedProgress()` 混合进度计算函数
  - `MAX_POLL_ATTEMPTS = 75` 超时保护
  - `batchPollRef` + `batchDoneCount` 状态追踪

### 性能数据对比

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 批量生成 3 章 | ~180s（顺序） | ~60s（并发） | **3x** |
| 批量生成 5 章 | ~300s（顺序） | ~60s（并发） | **5x** |
| 进度展示 | 纯时间估算 | 服务器真实进度 | 准确 |
| 轮询频率 | 2s | 1.5s | 更快 |

### 数据库
- `generation_logs` 表新增 `progress` 列（默认 0），向后兼容无需手动迁移

## 每天自定义章数功能 (v1.2.0)

### 新增功能

#### 1. 每天自定义生成章数
- **文件**:
  - `backend/app/models/book.py` - 添加了`daily_chapters`字段
  - `backend/app/schemas/book.py` - 添加了`daily_chapters`字段
  - `backend/app/services/scheduler.py` - 修改了定时生成逻辑
  - `frontend/src/types/index.ts` - 添加了`daily_chapters`类型定义
  - `frontend/src/pages/BookDetail.tsx` - 添加了章数输入框
- **功能**: 
  - 用户可以设置每天生成1-10章
  - 定时任务会检查今天已生成的章节数，补足到达到设置章数
  - 如果部分失败会自动重试
  - 支持灵活的生成进度显示
- **改进**: 
  - 定时任务更智能，避免重复生成
  - 更详细的日志记录
  - 用户可以按需调整生成频率

## 修复卡顿问题 (v1.1.0)

### 主要修复内容

#### 1. 修复章节内容处理问题
- **文件**: `backend/app/services/generator.py`
- **问题**: 如果上一章节的`content`字段为None或空，会导致生成失败
- **修复**: 添加了`content`字段的null检查和空字符串检查
- **改进**: 将内容摘要从100字符增加到150字符，并更好地处理换行符

#### 2. 配置文件读取错误处理
- **文件**: `backend/app/services/generator.py`
- **问题**: 如果`novel-config.json`文件不存在或格式错误，会导致生成中断
- **修复**: 添加了异常处理，确保即使配置文件有问题也能继续生成

#### 3. API调用重试机制
- **文件**: 
  - `backend/app/services/ai_providers/deepseek.py`
  - `backend/app/services/ai_providers/ollama.py`
  - `backend/app/services/ai_providers/openai_compatible.py`
- **问题**: 网络波动或临时故障会导致整个生成失败
- **修复**: 为所有AI provider添加了自动重试机制
  - 最多重试3次
  - 每次重试间隔2秒（递增）
  - 只对网络超时和连接错误进行重试

#### 4. 前端异步生成和状态显示
- **文件**: 
  - `backend/app/routers/chapters.py`
  - `frontend/src/api/chapters.ts`
  - `frontend/src/pages/BookDetail.tsx`
- **问题**: 用户点击"生成下一章"后需要长时间等待，期间无任何反馈
- **修复**: 
  - 添加了生成状态API，可实时查询生成进度
  - 前端实现2秒轮询机制
  - 按钮在生成过程中显示loading状态
  - 显示实时生成状态（"正在生成中（已运行 X 秒）"）
  - 生成完成后自动刷新章节列表

#### 5. 定时任务稳定性提升
- **文件**: `backend/app/services/scheduler.py`
- **问题**: 定时任务失败后没有任何重试机制
- **修复**: 
  - 添加了定时任务自动重试机制（最多重试2次）
  - 重试间隔30秒
  - 所有失败都会记录到GenerationLog表中
  - 添加了详细的日志记录

### 性能优化

1. **减少前端等待时间**: 用户不再需要等待整个API调用完成
2. **提高生成成功率**: 重试机制大幅提高了网络不稳定时的成功率
3. **更好的用户体验**: 实时显示生成状态，让用户知道发生了什么

### 使用建议

1. **前端优化**: 
   - 如果生成时间过长，可以继续使用系统做其他操作
   - 系统会自动在后台完成生成

2. **定时任务优化**:
   - 建议将定时时间设置在网络稳定的时间段
   - 如果某次生成失败，系统会自动重试

3. **AI配置优化**:
   - 建议使用响应速度较快的API
   - Ollama本地模型可以减少网络延迟

### 后续改进计划

- [x] 添加WebSocket支持，实现真正的实时推送 （v3.0.0 已实现 SSE 实时推送）
- [x] 添加生成进度百分比显示 （v2.0.0 已实现）
- [x] 添加生成历史记录和统计 （v3.0.0 已实现）
- [x] 支持批量生成多个章节 （v2.0.0 已实现）
- [x] 添加生成内容的预览和编辑功能 （v1.0.0 已实现）
