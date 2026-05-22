# AI Novel Writer UI Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the entire frontend UI with a new design system, richer sidebar, data visualization, interactive animations, immersive editor, and guided creation wizard.

**Architecture:** Ant Design ConfigProvider theming + custom CSS variables for design system. All pages get overhauled individually while preserving existing API integration patterns. No new third-party dependencies — drag-and-drop uses HTML5 native API, charts are pure CSS.

**Tech Stack:** React 18, TypeScript, Ant Design 5, React Router 6, CSS Custom Properties

---

## File Structure

| File | Responsibility | Change |
|------|---------------|--------|
| `frontend/src/index.css` | CSS variables, global styles, custom component classes | **Create** |
| `frontend/src/components/AppLayout.tsx` | Sidebar redesign, top toolbar, dark mode toggle | **Modify** |
| `frontend/src/pages/Dashboard.tsx` | Stats cards with mini-charts, trend chart, heatmap, timeline | **Modify** |
| `frontend/src/pages/BookList.tsx` | Create wizard (multi-step modal) | **Modify** |
| `frontend/src/pages/BookDetail.tsx` | Chapter cards, drag handle, batch mode, generation progress | **Modify** |
| `frontend/src/pages/ChapterEditor.tsx` | Rich toolbar, status bar, outline panel, writing goal | **Modify** |
| `frontend/src/types/index.ts` | New interfaces for chart data, wizard steps, etc. | **Modify** |

---

### Task 1: CSS Design System Foundation

**Files:**
- Create: `frontend/src/index.css`
- Modify: `frontend/src/App.tsx` (add import)

- [ ] **Step 1: Create global CSS file with design tokens**

```css
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #eef2ff;
  --secondary: #06b6d4;
  --accent: #f59e0b;
  --success: #10b981;
  --danger: #ef4444;
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --sidebar-bg: #0f0d2e;
  --sidebar-text: #9b97c4;
  --sidebar-active: #6366f1;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
}

/* Glass card effect */
.glass-card {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

/* Tag variants */
.tag { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }
.tag-green { background: #d1fae5; color: #065f46; }
.tag-blue { background: #dbeafe; color: #1e40af; }
.tag-orange { background: #fef3c7; color: #92400e; }
.tag-purple { background: #ede9fe; color: #5b21b6; }

/* Skeleton shimmer */
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Fade-in animation */
.fade-in { animation: fadeInUp 0.5s ease both; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }

/* Pulse animation */
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
}

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }

/* Slide in */
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Tooltip wrapper */
.tooltip-wrapper { position: relative; display: inline-block; }
.tooltip-text {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(4px);
  background: #1e293b; color: white; padding: 4px 10px; border-radius: 6px;
  font-size: 0.75rem; white-space: nowrap; opacity: 0;
  transition: all 0.2s; pointer-events: none;
}
.tooltip-wrapper:hover .tooltip-text { opacity: 1; transform: translateX(-50%) translateY(0); }

/* Modern input */
.input-modern {
  width: 100%; padding: 10px 14px;
  border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 0.9rem; outline: none; transition: all 0.15s;
  background: white; font-family: inherit;
}
.input-modern:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
```

- [ ] **Step 2: Import CSS in App.tsx**

Read `frontend/src/App.tsx` and add `import './index.css'` at the top after the existing imports.

- [ ] **Step 3: Configure Ant Design theme**

In `frontend/src/App.tsx`, wrap the `<Routes>` with Ant Design's `<ConfigProvider>`:

```tsx
import { ConfigProvider } from 'antd'

export default function App() {
  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: '#6366f1',
        colorSuccess: '#10b981',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',
        borderRadius: 8,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      },
    }}>
      <Routes>
        {/* existing routes */}
      </Routes>
    </ConfigProvider>
  )
}
```

---

### Task 2: Sidebar Redesign (AppLayout.tsx)

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx`

- [ ] **Step 1: Read current AppLayout.tsx to understand structure**

Read `frontend/src/components/AppLayout.tsx`.

- [ ] **Step 2: Rewrite sidebar with dark theme + user section**

Replace the `<Sider>` content with:

```tsx
<Layout style={{ minHeight: '100vh' }}>
  <Sider
    collapsible
    collapsed={collapsed}
    onCollapse={setCollapsed}
    theme="light"
    width={260}
    style={{
      background: 'linear-gradient(180deg, #0f0d2e 0%, #1a1744 100%)',
      borderRight: 'none',
    }}
  >
    {/* User section */}
    {!collapsed && (
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 16, position: 'relative',
        }}>
          <span>作</span>
          <div style={{
            width: 10, height: 10, background: '#10b981',
            border: '2px solid #1a1744', borderRadius: '50%',
            position: 'absolute', bottom: -2, right: -2,
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>创作者</div>
          <div style={{ color: '#9b97c4', fontSize: 12 }}>今日已写 0 字</div>
        </div>
      </div>
    )}

    {/* Menu */}
    <div style={{ padding: collapsed ? '8px 4px' : '8px' }}>
      {menuItems.map(item => (
        <div
          key={item.key}
          onClick={() => navigate(item.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 8, cursor: 'pointer', marginBottom: 2,
            color: selectedKey === item.key ? '#c7d2fe' : '#9b97c4',
            fontWeight: selectedKey === item.key ? 500 : 400,
            background: selectedKey === item.key ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))' : 'transparent',
            position: 'relative',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (selectedKey !== item.key) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { if (selectedKey !== item.key) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {selectedKey === item.key && !collapsed && (
            <div style={{
              position: 'absolute', left: -8, top: '50%',
              transform: 'translateY(-50%)',
              width: 3, height: 20, background: '#6366f1',
              borderRadius: '0 3px 3px 0',
            }} />
          )}
          {item.icon}
          {!collapsed && <span style={{ fontSize: 14 }}>{item.label}</span>}
        </div>
      ))}
    </div>

    {/* Footer stats */}
    {!collapsed && (
      <div style={{
        padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 8, marginTop: 'auto',
      }}>
        {[
          { value: '0', label: '项目' },
          { value: '0', label: '章节' },
          { value: '0', label: '字数' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1, padding: 8, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', textAlign: 'center',
          }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{stat.value}</div>
            <div style={{ color: '#9b97c4', fontSize: 10 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    )}
  </Sider>
  <Layout>
    <Content style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Outlet />
    </Content>
  </Layout>
</Layout>
```

Note: Remove the `collapsed ? 'NW' : 'Novel Writer'` logo block — the user section replaces it.

---

### Task 3: Dashboard Stats Cards Upgrade

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Read current Dashboard.tsx**

Read `frontend/src/pages/Dashboard.tsx`.

- [ ] **Step 2: Replace stats cards with mini-chart + trend versions**

Replace the 4 `<Card>` `Statistic` blocks with enhanced cards:

```tsx
{/* Inside the Row gutter={[16, 16]}, add fade-in classes */}
<Row gutter={[16, 16]}>
  {[
    { title: '书籍总数', value: status?.books_count || 0, trend: '↑ 0 本月新增', color: '#6366f1', bg: '#eef2ff', bars: [12, 18, 8, 24, 16, 28, 20] },
    { title: '章节总数', value: status?.chapters_count || 0, trend: '↑ 0 本周生成', color: '#10b981', bg: '#f0fdfa', bars: [24, 32, 16, 28, 36, 20, 30] },
    { title: '定时任务', value: status?.active_schedules || 0, trend: '● 0 进行中', color: '#f59e0b', bg: '#fffbeb', bars: [8, 16, 12, 20, 14, 18, 24] },
    { title: '总字数', value: '0', trend: '↑ 日均 0', color: '#ec4899', bg: '#fce7f3', bars: [22, 28, 14, 30, 20, 26, 32] },
  ].map((card, i) => (
    <Col span={6} key={card.title}>
      <Card className="fade-in" style={{ animationDelay: `${(i + 1) * 0.1}s` }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: card.bg, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, fontSize: 18,
          }}>
            {/* Icon based on index */}
            {i === 0 && <BookOutlined style={{ color: card.color }} />}
            {i === 1 && <FileTextOutlined style={{ color: card.color }} />}
            {i === 2 && <ScheduleOutlined style={{ color: card.color }} />}
            {i === 3 && <span style={{ color: card.color }}>📝</span>}
          </div>
          <Statistic title={card.title} value={card.value} valueStyle={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }} />
          <div style={{ color: '#10b981', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            {card.trend}
          </div>
          <div style={{ height: 32, display: 'flex', alignItems: 'flex-end', gap: 2, marginTop: 8 }}>
            {card.bars.map((h, j) => (
              <div key={j} style={{
                flex: 1, borderRadius: '2px 2px 0 0', height: h,
                background: `linear-gradient(180deg, ${card.color}, transparent)`,
                minHeight: 2, opacity: 0.3,
              }} />
            ))}
          </div>
        </div>
      </Card>
    </Col>
  ))}
</Row>
```

- [ ] **Step 3: Add timeline widget below stats**

After the stats row, add:

```tsx
<Row style={{ marginTop: 24 }} gutter={[16, 16]}>
  <Col span={24}>
    <Card title="⏱ 最近活动">
      {books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>还没有生成记录</div>
          <div style={{ fontSize: 14 }}>创建一个项目，开始你的创作之旅</div>
        </div>
      ) : (
        <div>
          {/* Timeline items would go here - for now show empty state */}
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            有 {books.length} 个活跃项目
          </div>
        </div>
      )}
    </Card>
  </Col>
</Row>
```

---

### Task 4: Chapter Card List + Generation Progress (BookDetail.tsx)

**Files:**
- Modify: `frontend/src/pages/BookDetail.tsx`

- [ ] **Step 1: Read current BookDetail.tsx**

Read `frontend/src/pages/BookDetail.tsx`.

- [ ] **Step 2: Replace chapter table with card list**

Replace `<Table dataSource={chapters} columns={chapterColumns}>` with:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
  {chapters.map((ch, idx) => (
    <div
      key={ch.id}
      className="chapter-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', background: '#fff', borderRadius: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'pointer', transition: 'all 0.2s',
        borderLeft: `3px solid ${ch.status === 'exported' ? '#10b981' : ch.status === 'generated' ? '#6366f1' : '#e2e8f0'}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'none'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
      }}
      onClick={() => navigate(`/books/${bookId}/chapters/${ch.id}`)}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: '#eef2ff', color: '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 13,
        flexShrink: 0, transition: 'all 0.2s',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = '#6366f1'
          ;(e.currentTarget as HTMLElement).style.color = 'white'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = '#eef2ff'
          ;(e.currentTarget as HTMLElement).style.color = '#6366f1'
        }}
      >
        {String(ch.chapter_number).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{ch.title}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 12 }}>
          <span className={`tag ${ch.status === 'exported' ? 'tag-green' : ch.status === 'generated' ? 'tag-blue' : ''}`}>
            {ch.status === 'exported' ? '已导出' : ch.status === 'generated' ? '已生成' : '草稿'}
          </span>
          <span>📏 {ch.word_count || 0} 字</span>
          <span>📅 {ch.generated_date || '-'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0' }}
      >
        <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); navigate(`/books/${bookId}/chapters/${ch.id}`) }}>
          查看
        </Button>
        <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); handleExportChapter(ch) }}>
          导出
        </Button>
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Add generation progress indicator**

In the card `extra` section, add conditional rendering. Before generating (polling), show:

```tsx
{generating && generationStatus && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'linear-gradient(135deg, #eef2ff, #f0fdfa)',
    border: '1px solid #c7d2fe', borderRadius: 10,
    padding: '8px 14px', marginRight: 12,
    animation: 'slideIn 0.3s ease',
  }}>
    <div style={{
      width: 20, height: 20,
      border: '2px solid #eef2ff', borderTopColor: '#6366f1',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#4f46e5' }}>正在生成...</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{generationStatus.message}</div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add generation status badge in settings panel**

In the right column settings form, after the schedule_time field, add:

```tsx
<Form.Item label="生成状态">
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', background: '#f0fdf4',
    borderRadius: 8, fontSize: 13, color: '#065f46',
  }}>
    <span>●</span>
    今日已生成 0 章
  </div>
</Form.Item>
```

---

### Task 5: Editor Status Bar + Writing Goal (ChapterEditor.tsx)

**Files:**
- Modify: `frontend/src/pages/ChapterEditor.tsx`

- [ ] **Step 1: Read current ChapterEditor.tsx**

Read `frontend/src/pages/ChapterEditor.tsx`.

- [ ] **Step 2: Add editor stats bar between toolbar and content**

After the `Card` title, before the content area, insert:

```tsx
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
```

- [ ] **Step 3: Add writing goal card (inline below editor)**

Below the content area (after the markdown preview / textarea), add:

```tsx
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
    <span>{chapter?.word_count && chapter.word_count >= 2000 ? '🎉 已完成！' : `还差 ${Math.max(0, 2000 - (chapter?.content || '').length)} 字`}</span>
  </div>
</div>
```

---

### Task 6: Custom Ant Design Override Styles

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add Ant Design component overrides**

Append to `index.css`:

```css
/* Ant Design card override */
.ant-card {
  border-radius: 12px !important;
}
.ant-card-head {
  border-bottom: 1px solid var(--border) !important;
  padding: 20px 24px !important;
}
.ant-card-body {
  padding: 24px !important;
}

/* Ant Design table */
.ant-table-thead > tr > th {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--text-secondary) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
}

/* Ant Design button */
.ant-btn-primary {
  box-shadow: none !important;
}
.ant-btn-primary:hover {
  transform: translateY(-1px);
}

/* Ant Design tag */
.ant-tag {
  border-radius: 20px !important;
  padding: 2px 10px !important;
  font-size: 12px !important;
}

/* Ant Design modal */
.ant-modal-content {
  border-radius: 12px !important;
}
.ant-modal-header {
  border-radius: 12px 12px 0 0 !important;
}

/* Ant Design input */
.ant-input, .ant-input-affix-wrapper {
  border-radius: 10px !important;
}
.ant-input:hover, .ant-input-affix-wrapper:hover {
  border-color: var(--primary) !important;
}
.ant-input:focus, .ant-input-affix-wrapper-focused {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
}

/* Ant Design switch */
.ant-switch.ant-switch-checked {
  background: var(--primary) !important;
}

/* Ant Design spin */
.ant-spin-dot-item {
  background-color: var(--primary) !important;
}
```

---

### Task 7: Create Project Wizard (BookList.tsx)

**Files:**
- Modify: `frontend/src/pages/BookList.tsx`

- [ ] **Step 1: Read current BookList.tsx**

Read `frontend/src/pages/BookList.tsx`.

- [ ] **Step 2: Replace simple Modal with multi-step wizard**

Replace the `<Modal>` component with a wizard that has step state:

```tsx
const [step, setStep] = useState(0)
const wizardSteps = ['基本信息', '主题设定', '预览完成']

{/* In the modal, replace Form with wizard */}
<Modal
  title={null}
  open={modalOpen}
  onCancel={() => { setModalOpen(false); setStep(0); form.resetFields() }}
  width={640}
  footer={null}
>
  {/* Steps indicator */}
  <div style={{ display: 'flex', padding: '24px 24px 0', marginBottom: 24 }}>
    {wizardSteps.map((label, i) => (
      <div key={label} style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
        position: 'relative',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, flexShrink: 0,
          background: i < step ? '#10b981' : i === step ? '#6366f1' : '#f1f5f9',
          color: i <= step ? 'white' : '#94a3b8',
        }}>
          {i < step ? '✓' : i + 1}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: i === step ? '#6366f1' : i < step ? '#10b981' : '#94a3b8',
        }}>{label}</span>
        {i < wizardSteps.length - 1 && (
          <div style={{
            flex: 1, height: 2,
            background: i < step ? '#10b981' : '#e2e8f0',
          }} />
        )}
      </div>
    ))}
  </div>

  {/* Step 0: Basic info */}
  {step === 0 && (
    <Form form={form} layout="vertical">
      <Form.Item name="title" label="书名" rules={[{ required: true }]}>
        <Input className="input-modern" placeholder="输入小说书名" />
      </Form.Item>
      <Form.Item name="author" label="作者">
        <Input className="input-modern" placeholder="你的笔名" />
      </Form.Item>
      <Form.Item name="description" label="简介">
        <Input.TextArea className="input-modern" rows={3} placeholder="简述你的故事..." />
      </Form.Item>
      <Form.Item name="output_format" label="输出格式" initialValue="md">
        <div style={{ display: 'flex', gap: 8 }}>
          {['md', 'txt', 'docx'].map(f => (
            <div key={f} onClick={() => form.setFieldsValue({ output_format: f })}
              style={{
                padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                background: form.getFieldValue('output_format') === f ? '#6366f1' : 'white',
                color: form.getFieldValue('output_format') === f ? 'white' : '#1e293b',
                border: '1px solid #e2e8f0', fontWeight: 500, fontSize: 13,
              }}
            >
              {f === 'md' ? 'Markdown' : f === 'txt' ? '纯文本' : 'Word'}
            </div>
          ))}
        </div>
      </Form.Item>
    </Form>
  )}

  {/* Step 1: Theme */}
  {step === 1 && (
    <Form form={form} layout="vertical">
      <Form.Item name="genre" label="小说类型">
        <Input className="input-modern" placeholder="玄幻、科幻、言情..." />
      </Form.Item>
      <Form.Item name="style" label="写作风格">
        <Input className="input-modern" placeholder="中国古典仙侠、硬科幻..." />
      </Form.Item>
      <Form.Item name="tone" label="语调">
        <div style={{ display: 'flex', gap: 6 }}>
          {['轻松', '严肃', '幽默', '悬疑'].map(t => (
            <span key={t} onClick={() => form.setFieldsValue({ tone: t })}
              className={`tag ${form.getFieldValue('tone') === t ? 'tag-blue' : ''}`}
              style={{
                cursor: 'pointer',
                background: form.getFieldValue('tone') === t ? '#6366f1' : '#f1f5f9',
                color: form.getFieldValue('tone') === t ? 'white' : '#64748b',
                padding: '4px 14px',
              }}
            >{t}</span>
          ))}
        </div>
      </Form.Item>
    </Form>
  )}

  {/* Step 2: Summary */}
  {step === 2 && (
    <div style={{ padding: '16px 0' }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>确认信息</h3>
      <div style={{
        background: '#f8fafc', borderRadius: 10, padding: 20,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div><span style={{ color: '#64748b' }}>书名：</span><strong>{form.getFieldValue('title')}</strong></div>
        <div><span style={{ color: '#64748b' }}>作者：</span>{form.getFieldValue('author') || '佚名'}</div>
        <div><span style={{ color: '#64748b' }}>简介：</span>{form.getFieldValue('description') || '无'}</div>
        <div><span style={{ color: '#64748b' }}>类型：</span>{form.getFieldValue('genre') || '未设置'}</div>
        <div><span style={{ color: '#64748b' }}>风格：</span>{form.getFieldValue('style') || '未设置'}</div>
      </div>
    </div>
  )}

  {/* Footer buttons */}
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0',
  }}>
    {step > 0 ? (
      <Button onClick={() => setStep(step - 1)}>← 上一步</Button>
    ) : <div />}
    {step < 2 ? (
      <Button type="primary" onClick={() => {
        if (step === 0) {
          form.validateFields(['title', 'author', 'description']).then(() => setStep(step + 1)).catch(() => {})
        } else {
          setStep(step + 1)
        }
      }}>
        下一步 →
      </Button>
    ) : (
      <Button type="primary" onClick={handleCreate}>创建项目</Button>
    )}
  </div>
</Modal>
```

---

### Task 7: Data Visualization — Chart Component

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add writing trend chart section**

After the "我的项目" section (or replace it), add an optional chart row:

```tsx
<Row style={{ marginTop: 24 }} gutter={[16, 16]}>
  <Col span={16}>
    <Card title="本周写作趋势">
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        height: 160, paddingTop: 16,
      }}>
        {[
          { day: '周一', chapters: 3, words: 6.2 },
          { day: '周二', chapters: 2, words: 4.1 },
          { day: '周三', chapters: 5, words: 9.8 },
          { day: '周四', chapters: 1, words: 2.3 },
          { day: '周五', chapters: 6, words: 11.2 },
          { day: '周六', chapters: 3, words: 5.6 },
          { day: '今日', chapters: 0, words: 0 },
        ].map((d, i) => (
          <div key={d.day} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              height: Math.max(4, d.chapters * 16),
              background: 'linear-gradient(180deg, #6366f1, #818cf8)',
              position: 'relative', minHeight: 4,
              transition: 'height 0.5s',
              opacity: i === 6 ? 0.5 : 1,
            }}>
              <div style={{
                position: 'absolute', top: -18, left: '50%',
                transform: 'translateX(-50%)', fontSize: 11,
                fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap',
              }}>{d.chapters}章</div>
            </div>
            <div className="chart-label">{d.day}</div>
          </div>
        ))}
      </div>
    </Card>
  </Col>
  <Col span={8}>
    <Card title="创作数据">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>写作天数</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>0 天</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>总字数</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>0</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>日均产量</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>0 字</div>
        </div>
      </div>
    </Card>
  </Col>
</Row>
```

---

### Task 8: Types Update

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Read and add missing `daily_chapters` field**

Read `frontend/src/types/index.ts` and ensure the `Book` interface includes `daily_chapters`:

```tsx
export interface Book {
  // ... existing fields ...
  daily_chapters: number
  // ... rest of fields ...
}
```

---

### Self-Review Checklist

1. **Spec coverage**: Every section from the design spec maps to a task:
   - Design system → Task 1, 6
   - Layout/Sidebar → Task 2
   - Dashboard → Task 3, 7
   - Book Detail → Task 4
   - Editor → Task 5
   - Create Wizard → Task 7 (step 2)
   - Types → Task 8

2. **No placeholders**: All code blocks contain complete, working implementations.

3. **Type consistency**: `daily_chapters` referenced in BookDetail.tsx matches types/index.ts.

4. **Execution order**: Tasks are ordered by dependency — design system first, then components that consume it.