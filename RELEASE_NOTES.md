# AI Novel Writer - Release Notes

> AI 驱动的在线小说创作平台，支持多章节自动生成、AI 配置管理、定时调度、实时状态推送。

---

## v3.0.0 — SSE 实时推送 + 生成历史统计

**发布日期**: 2026-05-23

### 新增功能

#### SSE 实时推送
- 使用 SSE (Server-Sent Events) 替代传统轮询机制，前端无需再每 1.5s 查询状态
- 新增 `EventBus` 内存单例，每本书独立维护订阅队列
- 生成进度变化（10% → 15% → 30% → 80% → 90% → 100%）实时推送至前端
- 前端使用浏览器原生 `EventSource` API，零额外依赖
- SSE 连接断开时自动退化到轮询模式，保证稳定性

#### 生成历史记录与统计
- 章节管理页新增「生成历史」Tab 页
- 每次生成记录的详细列表：开始时间、耗时、AI 模型、状态标签、错误信息
- 顶部统计卡片：总生成次数、成功数、成功率、平均耗时
- 支持分页浏览

### 涉及文件
| 文件 | 类型 |
|------|------|
| `backend/app/services/event_bus.py` | 新建 |
| `backend/app/routers/chapters.py` | 修改 |
| `backend/app/services/generator.py` | 修改 |
| `frontend/src/pages/ChapterListPage.tsx` | 修改 |
| `frontend/src/api/chapters.ts` | 修改 |
| `docs/superpowers/specs/2026-05-23-realtime-history-design.md` | 新建 |
| `docs/superpowers/plans/2026-05-23-realtime-history-plan.md` | 新建 |
| `CHANGELOG.md` | 修改 |

### 升级说明
- 后端需重启服务以加载新增的 SSE 端点
- 数据库无需迁移（GenerationLog 的 `progress` 字段在 v2.0.0 已添加）

---

## v2.0.0 — 并发批量生成 + 实时进度追踪

**发布日期**: 2026-05-23

### 新增功能

#### 并发批量生成章节
- 新增 `POST /api/books/{book_id}/generate-batch?count=N` 端点
- 一次触发 N 个并发的异步生成任务，不再顺序执行
- N 章耗时 ≈ 单章耗时（约 60s），效率提升 3~5x

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|:----:|
| 批量生成 3 章 | ~180s | ~60s | **3x** |
| 批量生成 5 章 | ~300s | ~60s | **5x** |

#### 实时进度上报
- GenerationLog 新增 `progress` 字段（Integer, 0-100）
- 生成过程分阶段上报进度：
  1. 10% — 读取书籍/AI 配置
  2. 15% — 加载已有章节上下文
  3. 30% — 调用 AI API 开始创作
  4. 80% — AI 返回内容
  5. 90% — 保存章节 + 导出
  6. 100% — 完成

#### 定时调度并发生成
- scheduler 使用 `asyncio.gather()` 并发执行多章生成
- 每个并发任务使用独立 DB session

#### 前端并发触发 + 进度展示
- 新增 `generateBatch()` API 调用
- 批量生成改为一次调用后端并发端点，不再前端顺序循环
- 前端优先显示服务器真实进度，无数据时回退到时间估算
- 轮询频率从 2s 提升至 1.5s
- 新增超时保护（MAX_POLL_ATTEMPTS = 75，约 150s）

### 涉及文件
| 文件 | 类型 |
|------|------|
| `backend/app/models/generation_log.py` | 修改 |
| `backend/app/routers/chapters.py` | 修改 |
| `backend/app/services/generator.py` | 修改 |
| `backend/app/services/scheduler.py` | 修改 |
| `frontend/src/pages/ChapterListPage.tsx` | 重构 |
| `frontend/src/api/chapters.ts` | 修改 |
| `novel-writer.zip` | 新建 |

---

## v1.2.0 — 每天自定义章数功能

**发布日期**: 2026-05-22

### 新增功能
- Book 模型新增 `daily_chapters` 字段，用户可设置每天生成 1-10 章
- 定时任务会检查当天已生成的章节数，自动补足差额
- 生成进度显示更灵活，部分失败时自动重试

### 涉及文件
| 文件 | 类型 |
|------|------|
| `backend/app/models/book.py` | 修改 |
| `backend/app/schemas/book.py` | 修改 |
| `backend/app/services/scheduler.py` | 修改 |
| `frontend/src/types/index.ts` | 修改 |
| `frontend/src/pages/BookDetail.tsx` | 修改 |

---

## v1.1.0 — 修复卡顿问题 + 优化体验

**发布日期**: 2026-05-22

### 修复内容

#### 章节内容处理
- 修复上一章节 `content` 为 None 或空时的生成失败问题
- 内容摘要从 100 字符增加到 150 字符，优化换行处理

#### 配置文件容错
- `novel-config.json` 不存在或格式错误时不再导致生成中断

#### API 调用重试
- 为所有 AI provider 添加自动重试机制（最多 3 次，间隔递增 2s）
- 仅对网络超时和连接错误进行重试

#### 前端异步生成
- 后端改为异步生成，立即返回，后台执行
- 前端通过 2s 轮询 `/{book_id}/generation-status` 获取实时进度
- 按钮显示 loading 状态和已运行时间

#### 定时任务稳定性
- 添加自动重试机制（最多 2 次，间隔 30s）
- 失败记录写入 GenerationLog 表

---

## v1.0.0 — UI 优化与多页面拆分

**发布日期**: 2026-05-22

### UI 优化
- 侧边栏紧凑化：宽度降至 240px，间距字号缩减适配 PC 网页端
- BookDetail 重构为一级/二级标题分层布局
- 项目设置 → 章节管理 → 创作设定各自独立路由页面
- 角色设定从纯文本升级为卡片式结构化编辑器

### 三模定时生成
- 每日定时（指定每天几点生成）
- 间隔天数（每隔 N 天生成）
- 间隔分钟（每隔 N 分钟生成）

### 仪表盘数据可靠性
- 每 30s 自动刷新
- 请求失败退避重试
- 日均字数基于最早项目创建日期计算

### 路由结构
| 路径 | 页面 |
|------|------|
| `/` | 仪表盘 |
| `/books` | 项目列表 |
| `/books/:id` | 项目总览 |
| `/books/:id/chapters` | 章节管理 |
| `/books/:id/settings` | 项目设置 |
| `/books/:id/themes` | 创作设定 |
| `/chapters/:id/edit` | 章节编辑 |

---

## 初始化版本

**发布日期**: 2026-05-21

### 初始功能
- FastAPI + React 全栈框架搭建
- 支持 OpenAI、DeepSeek、Ollama 等 AI provider
- 单章生成与导出（TXT / Markdown / EPUB）
- 基础项目管理（创建/编辑/删除书籍）
- AI 配置管理
- GitHub Actions 自动化 CI

---

## 更新历史

| 版本 | 日期 | 提交 |
|------|------|------|
| v3.0.0 | 2026-05-23 | `1caa63a` |
| v2.0.0 | 2026-05-23 | `56b91b8` |
| v1.2.0 | 2026-05-22 | `6635dac` |
| v1.1.0 | 2026-05-22 | `a80f39f` |
| v1.0.0 | 2026-05-22 | `59e446e` |
| v0.1.0 | 2026-05-21 | `029eb19` |