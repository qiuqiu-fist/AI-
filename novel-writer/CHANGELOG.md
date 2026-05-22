# 修复和改进日志

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

1. [ ] 添加WebSocket支持，实现真正的实时推送
2. [ ] 添加生成进度百分比显示
3. [ ] 添加生成历史记录和统计
4. [ ] 支持批量生成多个章节
5. [ ] 添加生成内容的预览和编辑功能
